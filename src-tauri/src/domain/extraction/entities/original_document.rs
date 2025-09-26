use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::extraction::value_objects::{
    DocumentId, DocumentType, FilePath, FileName, ProjectId
};

/// OriginalDocument entity - Represents source documents (PDF, DOCX, MD) in project workspace
///
/// This entity represents documents in their original form within the project workspace.
/// It tracks file metadata, location, and basic properties needed for extraction processing.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OriginalDocument {
    /// Unique identifier for this document
    document_id: DocumentId,
    /// Project this document belongs to
    project_id: ProjectId,
    /// Absolute path to the original file
    file_path: FilePath,
    /// Display-friendly file name
    file_name: FileName,
    /// File size in bytes
    file_size_bytes: u64,
    /// Document type (PDF, DOCX, Markdown)
    file_type: DocumentType,
    /// File system creation time
    created_at: DateTime<Utc>,
    /// File system modification time
    modified_at: DateTime<Utc>,
    /// File content hash for change detection
    checksum: String,
}

impl OriginalDocument {
    /// Creates a new OriginalDocument
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        project_id: ProjectId,
        file_path: FilePath,
        file_size_bytes: u64,
        file_type: DocumentType,
        created_at: DateTime<Utc>,
        modified_at: DateTime<Utc>,
        checksum: String,
    ) -> Result<Self, OriginalDocumentError> {
        // Extract file name from path
        let file_name = file_path
            .file_name()
            .ok_or(OriginalDocumentError::InvalidFileName)?
            .to_string();

        // Validate file size
        if !file_type.is_size_acceptable(file_size_bytes) {
            return Err(OriginalDocumentError::FileTooLarge {
                size: file_size_bytes,
                max_size: DocumentType::max_size_bytes(),
            });
        }

        // Validate file type matches extension
        let detected_type = DocumentType::from_path(file_path.as_path());
        if detected_type != Some(file_type.clone()) {
            return Err(OriginalDocumentError::FileTypeMismatch {
                expected: file_type,
                detected: detected_type,
            });
        }

        Ok(Self {
            document_id: DocumentId::new(),
            project_id,
            file_path,
            file_name,
            file_size_bytes,
            file_type,
            created_at,
            modified_at,
            checksum,
        })
    }

    /// Creates OriginalDocument with existing ID (for loading from storage)
    #[allow(clippy::too_many_arguments)]
    pub fn with_id(
        document_id: DocumentId,
        project_id: ProjectId,
        file_path: FilePath,
        file_name: FileName,
        file_size_bytes: u64,
        file_type: DocumentType,
        created_at: DateTime<Utc>,
        modified_at: DateTime<Utc>,
        checksum: String,
    ) -> Self {
        Self {
            document_id,
            project_id,
            file_path,
            file_name,
            file_size_bytes,
            file_type,
            created_at,
            modified_at,
            checksum,
        }
    }

    // Getters
    pub fn document_id(&self) -> &DocumentId {
        &self.document_id
    }

    pub fn project_id(&self) -> &ProjectId {
        &self.project_id
    }

    pub fn file_path(&self) -> &FilePath {
        &self.file_path
    }

    pub fn file_name(&self) -> &FileName {
        &self.file_name
    }

    pub fn file_size_bytes(&self) -> u64 {
        self.file_size_bytes
    }

    pub fn file_type(&self) -> &DocumentType {
        &self.file_type
    }

    pub fn created_at(&self) -> &DateTime<Utc> {
        &self.created_at
    }

    pub fn modified_at(&self) -> &DateTime<Utc> {
        &self.modified_at
    }

    pub fn checksum(&self) -> &str {
        &self.checksum
    }

    /// Alias for document_id() for compatibility
    pub fn id(&self) -> &DocumentId {
        &self.document_id
    }

    /// Update metadata (placeholder implementation)
    pub fn update_metadata(&mut self, _metadata: OriginalDocumentMetadata) -> Result<(), OriginalDocumentError> {
        // TODO: Implement proper metadata update
        // For now, this is a placeholder
        Ok(())
    }

    /// Returns human-readable file size
    pub fn file_size_display(&self) -> String {
        format_file_size(self.file_size_bytes)
    }

    /// Checks if the file exists at the specified path
    pub fn file_exists(&self) -> bool {
        self.file_path.exists()
    }

    /// Checks if the file is readable
    pub fn is_readable(&self) -> bool {
        self.file_path.is_file() && self.file_exists()
    }

    /// Updates the checksum (when file has been modified)
    pub fn update_checksum(&mut self, new_checksum: String) {
        self.checksum = new_checksum;
    }

    /// Updates the modified timestamp
    pub fn update_modified_at(&mut self, new_modified_at: DateTime<Utc>) {
        self.modified_at = new_modified_at;
    }

    /// Checks if the document is suitable for extraction
    pub fn can_extract(&self) -> Result<(), OriginalDocumentError> {
        // Check if file exists and is readable
        if !self.is_readable() {
            return Err(OriginalDocumentError::FileNotReadable);
        }

        // Check file size limit
        if !self.file_type.is_size_acceptable(self.file_size_bytes) {
            return Err(OriginalDocumentError::FileTooLarge {
                size: self.file_size_bytes,
                max_size: DocumentType::max_size_bytes(),
            });
        }

        // Check if document type supports extraction
        if !self.file_type.supports_extraction() {
            return Err(OriginalDocumentError::ExtractionNotSupported);
        }

        Ok(())
    }

    /// Returns the expected extracted file path (.det extension)
    pub fn extracted_file_path(&self) -> FilePath {
        self.file_path.with_det_extension()
    }

    /// Checks if an extracted version already exists
    pub fn has_extracted_version(&self) -> bool {
        self.extracted_file_path().exists()
    }

    /// Returns metadata summary for display
    pub fn metadata_summary(&self) -> OriginalDocumentMetadata {
        OriginalDocumentMetadata {
            file_name: self.file_name.clone(),
            file_type: self.file_type.clone(),
            file_size_display: self.file_size_display(),
            created_at: self.created_at,
            modified_at: self.modified_at,
            has_extracted_version: self.has_extracted_version(),
            can_extract: self.can_extract().is_ok(),
        }
    }
}

/// Metadata summary for UI display
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct OriginalDocumentMetadata {
    pub file_name: FileName,
    pub file_type: DocumentType,
    pub file_size_display: String,
    pub created_at: DateTime<Utc>,
    pub modified_at: DateTime<Utc>,
    pub has_extracted_version: bool,
    pub can_extract: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum OriginalDocumentError {
    #[error("Invalid file name")]
    InvalidFileName,
    #[error("File too large: {size} bytes (max: {max_size} bytes)")]
    FileTooLarge { size: u64, max_size: u64 },
    #[error("File type mismatch: expected {expected}, detected {detected:?}")]
    FileTypeMismatch {
        expected: DocumentType,
        detected: Option<DocumentType>,
    },
    #[error("File is not readable")]
    FileNotReadable,
    #[error("Extraction not supported for this document type")]
    ExtractionNotSupported,
}

/// Formats file size in human-readable format
fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB"];
    const THRESHOLD: f64 = 1024.0;

    if bytes == 0 {
        return "0 B".to_string();
    }

    let bytes_f = bytes as f64;
    let unit_index = (bytes_f.log10() / THRESHOLD.log10()) as usize;
    let unit_index = unit_index.min(UNITS.len() - 1);

    let size = bytes_f / THRESHOLD.powi(unit_index as i32);

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use tempfile::NamedTempFile;

    #[test]
    fn test_new_original_document() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = FilePath::new(temp_file.path().to_path_buf()).unwrap();
        let project_id = ProjectId::new();
        let now = Utc::now();

        let doc = OriginalDocument::new(
            project_id,
            path,
            1024,
            DocumentType::Pdf, // This will fail validation since temp file isn't PDF
            now,
            now,
            "checksum123".to_string(),
        );

        // Should fail due to file type mismatch
        assert!(doc.is_err());
    }

    #[test]
    fn test_file_too_large() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = FilePath::new(temp_file.path().to_path_buf()).unwrap();
        let project_id = ProjectId::new();
        let now = Utc::now();
        let large_size = DocumentType::max_size_bytes() + 1;

        let doc = OriginalDocument::new(
            project_id,
            path,
            large_size,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        );

        assert!(matches!(doc, Err(OriginalDocumentError::FileTooLarge { .. })));
    }

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1024 * 1024), "1.0 MB");
        assert_eq!(format_file_size(1024 * 1024 * 1024), "1.0 GB");
    }

    #[test]
    fn test_extracted_file_path() {
        let doc = create_test_document();
        let extracted_path = doc.extracted_file_path();
        assert!(extracted_path.as_str().ends_with(".det"));
    }

    #[test]
    fn test_can_extract() {
        let doc = create_test_document();
        // Will fail since test file doesn't exist
        assert!(doc.can_extract().is_err());
    }

    #[test]
    fn test_metadata_summary() {
        let doc = create_test_document();
        let metadata = doc.metadata_summary();
        assert_eq!(metadata.file_type, DocumentType::Pdf);
        assert!(!metadata.can_extract); // File doesn't exist
    }

    fn create_test_document() -> OriginalDocument {
        let project_id = ProjectId::new();
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document.pdf"));
        let now = Utc::now();

        OriginalDocument::with_id(
            DocumentId::new(),
            project_id,
            file_path,
            "document.pdf".to_string(),
            1024,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        )
    }
}