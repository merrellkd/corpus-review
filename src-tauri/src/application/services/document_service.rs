use std::sync::Arc;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use tracing::{debug, info, warn, error};

use crate::domain::extraction::{
    entities::{OriginalDocument, OriginalDocumentError},
    value_objects::{DocumentId, DocumentType, FilePath, ProjectId},
    repositories::{DocumentRepository, DocumentSearchCriteria, DocumentSortBy, SortOrder}
};
use crate::application::dtos::{
    OriginalDocumentDto, DocumentDetailsDto, DocumentPreviewDto,
    ExtractionHistoryDto
};
use crate::infrastructure::AppError;

/// Maximum file size allowed for document processing (10MB)
const MAX_FILE_SIZE_BYTES: u64 = 10 * 1024 * 1024;

/// Supported document file extensions
const SUPPORTED_EXTENSIONS: &[&str] = &[".pdf", ".docx", ".md", ".markdown"];

/// Application service for managing original documents
///
/// This service orchestrates operations on OriginalDocument entities,
/// coordinating between domain logic, repository operations, and file system access.
/// It handles document discovery, validation, metadata management, and preview generation.
pub struct DocumentService {
    document_repository: Arc<dyn DocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
}

impl DocumentService {
    /// Creates a new DocumentService instance
    pub fn new(
        document_repository: Arc<dyn DocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
    ) -> Self {
        debug!("Creating new DocumentService instance");
        Self {
            document_repository,
        }
    }

    /// Scans a project directory for supported document files
    ///
    /// Recursively searches through the project source folder to find PDF, DOCX,
    /// and Markdown files. Validates each file for size limits and accessibility.
    /// Returns document DTOs with extraction status information.
    pub async fn scan_project_documents(
        &self,
        project_id: &ProjectId,
        source_folder_path: &str,
    ) -> Result<Vec<OriginalDocumentDto>, AppError> {
        info!("Scanning documents for project: {}", project_id);

        // First, get existing documents from repository to avoid duplicates
        let existing_documents = self.document_repository
            .find_by_project(project_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to load existing documents: {}", e)))?;

        debug!("Found {} existing documents in repository", existing_documents.len());

        // Scan file system for supported document files
        let discovered_files = self.scan_file_system_for_documents(source_folder_path).await?;
        debug!("Discovered {} files in file system", discovered_files.len());

        let mut result_documents = Vec::new();
        let mut new_documents = Vec::new();
        let mut updated_documents = Vec::new();

        for file_info in discovered_files {
            // Check if document already exists in repository
            let existing_doc = existing_documents
                .iter()
                .find(|doc| doc.file_path().as_str() == file_info.path);

            match existing_doc {
                Some(existing) => {
                    // Check if file has been modified since last scan
                    if existing.modified_at() < &file_info.modified_at || existing.checksum() != &file_info.checksum {
                        debug!("Document has been modified: {}", file_info.path);
                        let mut updated_doc = existing.clone();
                        updated_doc.update_metadata(file_info.checksum, file_info.modified_at, file_info.size_bytes)
                            .map_err(|e| AppError::validation_error(format!("Failed to update document metadata: {}", e)))?;

                        updated_documents.push(updated_doc.clone());
                        result_documents.push(self.document_to_dto(&updated_doc).await?);
                    } else {
                        // Document unchanged, use existing
                        result_documents.push(self.document_to_dto(existing).await?);
                    }
                }
                None => {
                    // New document, create entity
                    debug!("Creating new document entity for: {}", file_info.path);
                    let new_document = OriginalDocument::create(
                        DocumentId::new(),
                        project_id.clone(),
                        FilePath::new(file_info.path.clone())
                            .map_err(|e| AppError::validation_error(format!("Invalid file path: {}", e)))?,
                        file_info.file_name,
                        file_info.file_type,
                        file_info.size_bytes,
                        file_info.checksum,
                        Utc::now(),
                        file_info.modified_at,
                    ).map_err(|e| AppError::validation_error(format!("Failed to create document: {}", e)))?;

                    new_documents.push(new_document.clone());
                    result_documents.push(self.document_to_dto(&new_document).await?);
                }
            }
        }

        // Save new and updated documents to repository
        if !new_documents.is_empty() {
            info!("Saving {} new documents", new_documents.len());
            self.document_repository
                .save_batch(&new_documents)
                .await
                .map_err(|e| AppError::internal_error(format!("Failed to save new documents: {}", e)))?;
        }

        if !updated_documents.is_empty() {
            info!("Updating {} modified documents", updated_documents.len());
            for doc in &updated_documents {
                self.document_repository
                    .save(doc)
                    .await
                    .map_err(|e| AppError::internal_error(format!("Failed to update document: {}", e)))?;
            }
        }

        info!("Document scan complete. Found {} total documents", result_documents.len());
        Ok(result_documents)
    }

    /// Gets detailed information about a specific document
    pub async fn get_document_details(
        &self,
        document_id: &DocumentId,
    ) -> Result<DocumentDetailsDto, AppError> {
        debug!("Getting details for document: {}", document_id);

        let document = self.document_repository
            .find_by_id(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find document: {}", e)))?
            .ok_or_else(|| AppError::not_found("Document not found"))?;

        // TODO: Get extraction history from ExtractionRepository
        let extraction_history = Vec::new(); // Placeholder for extraction history

        Ok(DocumentDetailsDto {
            document_id: document.id().to_string(),
            project_id: document.project_id().to_string(),
            file_path: document.file_path().as_str().to_string(),
            file_name: document.file_name().to_string(),
            file_size_bytes: document.file_size_bytes(),
            file_type: document.file_type().to_string(),
            created_at: document.created_at().to_rfc3339(),
            modified_at: document.modified_at().to_rfc3339(),
            has_extraction: false, // TODO: Check if extraction exists
            extraction_status: None, // TODO: Get latest extraction status
            checksum: document.checksum().to_string(),
            extraction_history,
        })
    }

    /// Generates a preview for an original document for read-only viewing
    pub async fn get_document_preview(
        &self,
        document_id: &DocumentId,
    ) -> Result<DocumentPreviewDto, AppError> {
        debug!("Generating preview for document: {}", document_id);

        let document = self.document_repository
            .find_by_id(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find document: {}", e)))?
            .ok_or_else(|| AppError::not_found("Document not found"))?;

        // Validate file still exists and is accessible
        if !std::path::Path::new(document.file_path().as_str()).exists() {
            return Err(AppError::not_found("Document file not found on disk"));
        }

        // Generate preview content based on file type
        let preview_content = self.generate_preview_content(&document).await?;
        let page_count = self.get_page_count(&document).await?;
        let metadata = self.extract_file_metadata(&document).await?;

        Ok(DocumentPreviewDto {
            document_id: document.id().to_string(),
            file_name: document.file_name().to_string(),
            file_type: document.file_type().to_string(),
            file_size_bytes: document.file_size_bytes(),
            preview_content,
            page_count,
            metadata,
        })
    }

    /// Validates if a document can be extracted
    pub async fn validate_extractability(
        &self,
        document_id: &DocumentId,
    ) -> Result<bool, AppError> {
        debug!("Validating extractability for document: {}", document_id);

        let document = self.document_repository
            .find_by_id(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find document: {}", e)))?
            .ok_or_else(|| AppError::not_found("Document not found"))?;

        // Check file size
        if document.file_size_bytes() > MAX_FILE_SIZE_BYTES {
            debug!("Document too large for extraction: {} bytes", document.file_size_bytes());
            return Ok(false);
        }

        // Check file type
        if !matches!(document.file_type(), DocumentType::Pdf | DocumentType::Docx | DocumentType::Markdown) {
            debug!("Unsupported file type for extraction: {:?}", document.file_type());
            return Ok(false);
        }

        // Check file accessibility
        let file_path = std::path::Path::new(document.file_path().as_str());
        if !file_path.exists() || !file_path.is_file() {
            debug!("Document file not accessible: {}", document.file_path().as_str());
            return Ok(false);
        }

        // Check read permissions
        match std::fs::metadata(file_path) {
            Ok(metadata) => {
                if metadata.permissions().readonly() {
                    debug!("Document file is read-only, which is fine for extraction");
                }
                Ok(true)
            }
            Err(e) => {
                warn!("Failed to read file metadata for {}: {}", document.file_path().as_str(), e);
                Ok(false)
            }
        }
    }

    /// Updates document checksum when file has been modified
    pub async fn update_document_checksum(
        &self,
        document_id: &DocumentId,
    ) -> Result<(), AppError> {
        debug!("Updating checksum for document: {}", document_id);

        let document = self.document_repository
            .find_by_id(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find document: {}", e)))?
            .ok_or_else(|| AppError::not_found("Document not found"))?;

        // Calculate new checksum
        let file_path = document.file_path().as_str();
        let new_checksum = self.calculate_file_checksum(file_path).await?;
        let modified_at = self.get_file_modified_time(file_path).await?;

        // Update in repository
        self.document_repository
            .update_checksum(document_id, new_checksum.to_string(), modified_at)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to update checksum: {}", e)))?;

        info!("Updated checksum for document: {}", document_id);
        Ok(())
    }

    /// Gets statistics about documents in a project
    pub async fn get_project_document_statistics(
        &self,
        project_id: &ProjectId,
    ) -> Result<DocumentStatistics, AppError> {
        debug!("Getting document statistics for project: {}", project_id);

        let documents = self.document_repository
            .find_by_project(project_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to load documents: {}", e)))?;

        let total_count = documents.len();
        let total_size = documents.iter().map(|d| d.file_size_bytes()).sum();

        let mut type_counts = std::collections::HashMap::new();
        for doc in &documents {
            *type_counts.entry(doc.file_type().to_string()).or_insert(0) += 1;
        }

        let extractable_count = documents
            .iter()
            .filter(|d| d.file_size_bytes() <= MAX_FILE_SIZE_BYTES)
            .count();

        Ok(DocumentStatistics {
            total_count,
            total_size_bytes: total_size,
            extractable_count,
            type_counts,
        })
    }

    // Private helper methods

    async fn scan_file_system_for_documents(
        &self,
        source_folder: &str,
    ) -> Result<Vec<FileInfo>, AppError> {
        debug!("Scanning file system in: {}", source_folder);

        let mut files = Vec::new();
        let path = std::path::Path::new(source_folder);

        if !path.exists() {
            return Err(AppError::not_found("Source folder not found"));
        }

        self.scan_directory_recursive(path, &mut files).await?;
        Ok(files)
    }

    async fn scan_directory_recursive(
        &self,
        dir_path: &std::path::Path,
        files: &mut Vec<FileInfo>,
    ) -> Result<(), AppError> {
        let entries = std::fs::read_dir(dir_path)
            .map_err(|e| AppError::file_system_error(format!("Cannot read directory {}: {}", dir_path.display(), e)))?;

        for entry in entries {
            let entry = entry
                .map_err(|e| AppError::file_system_error(format!("Failed to read directory entry: {}", e)))?;
            let path = entry.path();

            if path.is_dir() {
                // Recursively scan subdirectories
                self.scan_directory_recursive(&path, files).await?;
            } else if path.is_file() {
                // Check if file has supported extension
                if let Some(extension) = path.extension().and_then(|e| e.to_str()) {
                    let ext_with_dot = format!(".{}", extension.to_lowercase());
                    if SUPPORTED_EXTENSIONS.contains(&ext_with_dot.as_str()) {
                        match self.create_file_info(&path).await {
                            Ok(file_info) => files.push(file_info),
                            Err(e) => {
                                warn!("Failed to process file {}: {}", path.display(), e);
                                // Continue processing other files
                            }
                        }
                    }
                }
            }
        }

        Ok(())
    }

    async fn create_file_info(&self, path: &std::path::Path) -> Result<FileInfo, AppError> {
        let metadata = std::fs::metadata(path)
            .map_err(|e| AppError::file_system_error(format!("Cannot read file metadata for {}: {}", path.display(), e)))?;

        let size_bytes = metadata.len();
        let modified_at = metadata.modified()
            .map_err(|e| AppError::file_system_error(format!("Cannot read modified time for {}: {}", path.display(), e)))?
            .into();

        let file_name = path.file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| AppError::validation_error("Invalid file name"))?
            .to_string();

        let file_type = self.determine_file_type(path)?;
        let checksum = self.calculate_file_checksum(path.to_str().unwrap()).await?;

        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            file_name,
            file_type,
            size_bytes,
            modified_at,
            checksum,
        })
    }

    fn determine_file_type(&self, path: &std::path::Path) -> Result<DocumentType, AppError> {
        let extension = path.extension()
            .and_then(|e| e.to_str())
            .ok_or_else(|| AppError::validation_error("File has no extension"))?
            .to_lowercase();

        match extension.as_str() {
            "pdf" => Ok(DocumentType::Pdf),
            "docx" => Ok(DocumentType::Docx),
            "md" | "markdown" => Ok(DocumentType::Markdown),
            _ => Err(AppError::validation_error(format!("Unsupported file type: {}", extension))),
        }
    }

    async fn calculate_file_checksum(&self, file_path: &str) -> Result<String, AppError> {
        use sha2::{Sha256, Digest};

        let mut file = tokio::fs::File::open(file_path).await
            .map_err(|e| AppError::file_system_error(format!("Cannot open file for checksum: {}", e)))?;

        let mut hasher = Sha256::new();
        let mut buffer = vec![0u8; 8192]; // 8KB buffer

        loop {
            let bytes_read = tokio::io::AsyncReadExt::read(&mut file, &mut buffer).await
                .map_err(|e| AppError::file_system_error(format!("Failed to read file for checksum: {}", e)))?;

            if bytes_read == 0 {
                break;
            }

            hasher.update(&buffer[..bytes_read]);
        }

        let hash = format!("{:x}", hasher.finalize());
        FileChecksum::new(hash).map_err(|e| AppError::validation_error(format!("Invalid checksum: {}", e)))
    }

    async fn get_file_modified_time(&self, file_path: &str) -> Result<DateTime<Utc>, AppError> {
        let metadata = tokio::fs::metadata(file_path).await
            .map_err(|e| AppError::file_system_error(format!("Cannot read file metadata: {}", e)))?;

        Ok(metadata.modified()
            .map_err(|e| AppError::file_system_error(format!("Cannot read modified time: {}", e)))?
            .into())
    }

    async fn document_to_dto(&self, document: &OriginalDocument) -> Result<OriginalDocumentDto, AppError> {
        // TODO: Get extraction status from ExtractionRepository
        let has_extraction = false;
        let extraction_status = None;

        Ok(OriginalDocumentDto {
            document_id: document.id().to_string(),
            project_id: document.project_id().to_string(),
            file_path: document.file_path().as_str().to_string(),
            file_name: document.file_name().to_string(),
            file_size_bytes: document.file_size_bytes(),
            file_type: document.file_type().to_string(),
            created_at: document.created_at().to_rfc3339(),
            modified_at: document.modified_at().to_rfc3339(),
            has_extraction,
            extraction_status,
        })
    }

    async fn generate_preview_content(&self, document: &OriginalDocument) -> Result<String, AppError> {
        match document.file_type() {
            DocumentType::Markdown => {
                // For Markdown files, read and convert to HTML
                let content = tokio::fs::read_to_string(document.file_path().as_str()).await
                    .map_err(|e| AppError::file_system_error(format!("Failed to read markdown file: {}", e)))?;

                // Simple markdown to HTML conversion (in production, use a proper markdown parser)
                Ok(format!("<pre>{}</pre>", html_escape::encode_text(&content)))
            }
            DocumentType::Pdf => {
                // For PDF files, return metadata information
                Ok(format!("<p>PDF Document: {}</p><p>Size: {} bytes</p>",
                    document.file_name(), document.file_size_bytes()))
            }
            DocumentType::Docx => {
                // For DOCX files, return metadata information
                Ok(format!("<p>Word Document: {}</p><p>Size: {} bytes</p>",
                    document.file_name(), document.file_size_bytes()))
            }
        }
    }

    async fn get_page_count(&self, document: &OriginalDocument) -> Result<Option<i32>, AppError> {
        match document.file_type() {
            DocumentType::Pdf => {
                // TODO: Implement PDF page counting
                Ok(Some(1)) // Placeholder
            }
            DocumentType::Docx => {
                // TODO: Implement DOCX page counting
                Ok(Some(1)) // Placeholder
            }
            DocumentType::Markdown => Ok(None), // Markdown doesn't have pages
        }
    }

    async fn extract_file_metadata(&self, document: &OriginalDocument) -> Result<std::collections::HashMap<String, serde_json::Value>, AppError> {
        let mut metadata = std::collections::HashMap::new();

        metadata.insert("file_size".to_string(), serde_json::Value::Number(document.file_size_bytes().into()));
        metadata.insert("file_type".to_string(), serde_json::Value::String(document.file_type().to_string()));
        metadata.insert("checksum".to_string(), serde_json::Value::String(document.checksum().to_string()));

        // Add file-specific metadata based on type
        match document.file_type() {
            DocumentType::Pdf => {
                // TODO: Extract PDF metadata (title, author, creation date, etc.)
            }
            DocumentType::Docx => {
                // TODO: Extract DOCX metadata (title, author, word count, etc.)
            }
            DocumentType::Markdown => {
                // For Markdown, count lines and characters
                if let Ok(content) = tokio::fs::read_to_string(document.file_path().as_str()).await {
                    metadata.insert("line_count".to_string(), serde_json::Value::Number(content.lines().count().into()));
                    metadata.insert("character_count".to_string(), serde_json::Value::Number(content.chars().count().into()));
                }
            }
        }

        Ok(metadata)
    }
}

// Helper types

#[derive(Debug, Clone)]
struct FileInfo {
    path: String,
    file_name: String,
    file_type: DocumentType,
    size_bytes: u64,
    modified_at: DateTime<Utc>,
    checksum: String,
}

/// Statistics about documents in a project
#[derive(Debug, Clone)]
pub struct DocumentStatistics {
    pub total_count: usize,
    pub total_size_bytes: u64,
    pub extractable_count: usize,
    pub type_counts: std::collections::HashMap<String, usize>,
}

// Helper functions for creating specific AppError types
pub(crate) fn not_found_error(message: &str) -> AppError {
    AppError::new("NOT_FOUND", message, None, false, false)
}

pub(crate) fn validation_error(message: String) -> AppError {
    AppError::new("VALIDATION_ERROR", message, None, true, true)
}

pub(crate) fn file_system_error(message: String) -> AppError {
    AppError::new("FILE_SYSTEM_ERROR", message, None, true, true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_supported_extensions() {
        assert!(SUPPORTED_EXTENSIONS.contains(&".pdf"));
        assert!(SUPPORTED_EXTENSIONS.contains(&".docx"));
        assert!(SUPPORTED_EXTENSIONS.contains(&".md"));
        assert!(SUPPORTED_EXTENSIONS.contains(&".markdown"));
    }

    #[test]
    fn test_max_file_size_constant() {
        assert_eq!(MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
    }

    #[test]
    fn test_document_statistics_creation() {
        let stats = DocumentStatistics {
            total_count: 10,
            total_size_bytes: 1024,
            extractable_count: 8,
            type_counts: HashMap::new(),
        };

        assert_eq!(stats.total_count, 10);
        assert_eq!(stats.total_size_bytes, 1024);
        assert_eq!(stats.extractable_count, 8);
    }
}