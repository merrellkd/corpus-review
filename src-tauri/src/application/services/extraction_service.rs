use std::sync::Arc;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use tracing::{debug, info, warn, error};
use tokio::sync::RwLock;
use std::collections::HashMap;

use crate::domain::extraction::{
    entities::{FileExtraction, ExtractedDocument, OriginalDocument},
    value_objects::{
        DocumentId, ExtractionId, ExtractedDocumentId, ExtractionStatus,
        ExtractionMethod, ProjectId, FilePath
    },
    repositories::{
        DocumentRepository, ExtractionRepository, ExtractedDocumentRepository,
        ExtractionSearchCriteria, ExtractionStatistics, ExtractionPerformanceMetrics, TimeRange
    }
};
use crate::application::dtos::{
    ExtractionStatusDto, ExtractedDocumentDto, SaveResultDto
};
use crate::infrastructure::{
    AppError,
    parsers::{PdfParser, DocxParser, MarkdownParser},
    serializers::ProseMirrorSerializer,
    services::FileSystemService
};

/// Maximum number of concurrent extractions allowed
const MAX_CONCURRENT_EXTRACTIONS: usize = 3;

/// Maximum retry attempts for failed extractions
const MAX_RETRY_ATTEMPTS: u8 = 3;

/// Default timeout for extraction operations (30 minutes)
const DEFAULT_EXTRACTION_TIMEOUT_MINUTES: u32 = 30;

/// Application service for managing document extraction workflows
///
/// This service orchestrates the complete extraction process from original documents
/// to editable .det files. It manages extraction lifecycle, progress tracking,
/// and coordinates between parsers, serializers, and file system operations.
pub struct ExtractionService {
    document_repository: Arc<dyn DocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
    extraction_repository: Arc<dyn ExtractionRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
    extracted_document_repository: Arc<dyn ExtractedDocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
    file_system_service: Arc<FileSystemService>,
    pdf_parser: Arc<PdfParser>,
    docx_parser: Arc<DocxParser>,
    markdown_parser: Arc<MarkdownParser>,
    prosemirror_serializer: Arc<ProseMirrorSerializer>,

    // In-memory tracking of active extractions
    active_extractions: Arc<RwLock<HashMap<ExtractionId, ExtractionProgress>>>,
}

impl ExtractionService {
    /// Creates a new ExtractionService instance
    pub fn new(
        document_repository: Arc<dyn DocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
        extraction_repository: Arc<dyn ExtractionRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
        extracted_document_repository: Arc<dyn ExtractedDocumentRepository<Error = Box<dyn std::error::Error + Send + Sync>>>,
        file_system_service: Arc<FileSystemService>,
        pdf_parser: Arc<PdfParser>,
        docx_parser: Arc<DocxParser>,
        markdown_parser: Arc<MarkdownParser>,
        prosemirror_serializer: Arc<ProseMirrorSerializer>,
    ) -> Self {
        debug!("Creating new ExtractionService instance");
        Self {
            document_repository,
            extraction_repository,
            extracted_document_repository,
            file_system_service,
            pdf_parser,
            docx_parser,
            markdown_parser,
            prosemirror_serializer,
            active_extractions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Starts document extraction with validation and progress tracking
    pub async fn start_document_extraction(
        &self,
        document_id: &DocumentId,
        force_reextract: bool,
    ) -> Result<ExtractionStatusDto, AppError> {
        info!("Starting extraction for document: {} (force: {})", document_id, force_reextract);

        // Validate document exists and is extractable
        let document = self.document_repository
            .find_by_id(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find document: {}", e)))?
            .ok_or_else(|| AppError::document_not_found("Document not found"))?;

        // Check if extraction is already in progress
        if !force_reextract {
            let has_active = self.extraction_repository
                .has_active_extraction(document_id)
                .await
                .map_err(|e| AppError::internal_error(format!("Failed to check active extraction: {}", e)))?;

            if has_active {
                return Err(AppError::extraction_in_progress("Document extraction already in progress"));
            }
        }

        // Validate extractability
        self.validate_document_for_extraction(&document).await?;

        // Check concurrent extraction limit
        let active_count = self.active_extractions.read().await.len();
        if active_count >= MAX_CONCURRENT_EXTRACTIONS {
            return Err(AppError::resource_limit_exceeded("Maximum concurrent extractions reached"));
        }

        // Create extraction entity
        let extraction_id = ExtractionId::new();
        let extraction_method = self.determine_extraction_method(&document).await?;

        let extraction = FileExtraction::create(
            extraction_id.clone(),
            document_id.clone(),
            document.project_id().clone(),
            extraction_method,
            Utc::now(),
        ).map_err(|e| AppError::validation_error(format!("Failed to create extraction: {}", e)))?;

        // Save extraction to repository
        self.extraction_repository
            .save(&extraction)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to save extraction: {}", e)))?;

        // Start extraction process asynchronously
        let progress = ExtractionProgress::new(extraction_id.clone(), document_id.clone());
        self.active_extractions.write().await.insert(extraction_id.clone(), progress);

        // Spawn extraction task
        let service = self.clone();
        let doc = document.clone();
        let ext_id = extraction_id.clone();

        tokio::spawn(async move {
            let result = service.perform_extraction(&doc, &ext_id).await;
            service.handle_extraction_completion(&ext_id, result).await;
        });

        // Return initial status
        Ok(ExtractionStatusDto {
            extraction_id: extraction_id.to_string(),
            document_id: document_id.to_string(),
            status: ExtractionStatus::Pending.to_string(),
            extraction_method: Some(extraction_method.to_string()),
            started_at: extraction.started_at().to_rfc3339(),
            completed_at: None,
            error_message: None,
            progress_percentage: Some(0),
        })
    }

    /// Gets the current status of an extraction
    pub async fn get_extraction_status(
        &self,
        extraction_id: &ExtractionId,
    ) -> Result<ExtractionStatusDto, AppError> {
        debug!("Getting status for extraction: {}", extraction_id);

        // Check if extraction is in active memory first
        if let Some(progress) = self.active_extractions.read().await.get(extraction_id) {
            return Ok(ExtractionStatusDto {
                extraction_id: extraction_id.to_string(),
                document_id: progress.document_id.to_string(),
                status: progress.status.to_string(),
                extraction_method: progress.extraction_method.as_ref().map(|m| m.to_string()),
                started_at: progress.started_at.to_rfc3339(),
                completed_at: progress.completed_at.map(|t| t.to_rfc3339()),
                error_message: progress.error_message.clone(),
                progress_percentage: Some(progress.progress_percentage),
            });
        }

        // Fall back to repository
        let extraction = self.extraction_repository
            .find_by_id(extraction_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find extraction: {}", e)))?
            .ok_or_else(|| AppError::extraction_not_found("Extraction not found"))?;

        Ok(ExtractionStatusDto {
            extraction_id: extraction.id().to_string(),
            document_id: extraction.document_id().to_string(),
            status: extraction.status().to_string(),
            extraction_method: Some(extraction.extraction_method().to_string()),
            started_at: extraction.started_at().to_rfc3339(),
            completed_at: extraction.completed_at().map(|t| t.to_rfc3339()),
            error_message: extraction.error_message().clone(),
            progress_percentage: None, // Repository doesn't store progress
        })
    }

    /// Cancels an in-progress extraction
    pub async fn cancel_extraction(
        &self,
        extraction_id: &ExtractionId,
    ) -> Result<bool, AppError> {
        info!("Cancelling extraction: {}", extraction_id);

        // Check if extraction is active
        let mut active = self.active_extractions.write().await;
        if let Some(mut progress) = active.remove(extraction_id) {
            progress.status = ExtractionStatus::Error;
            progress.error_message = Some("Extraction cancelled by user".to_string());
            progress.completed_at = Some(Utc::now());

            // Update repository
            self.extraction_repository
                .fail_extraction(
                    extraction_id,
                    "Extraction cancelled by user".to_string(),
                    Utc::now(),
                    progress.get_duration_ms(),
                )
                .await
                .map_err(|e| AppError::internal_error(format!("Failed to update cancelled extraction: {}", e)))?;

            Ok(true)
        } else {
            // Check if extraction exists in repository and is cancellable
            let extraction = self.extraction_repository
                .find_by_id(extraction_id)
                .await
                .map_err(|e| AppError::internal_error(format!("Failed to find extraction: {}", e)))?
                .ok_or_else(|| AppError::extraction_not_found("Extraction not found"))?;

            match extraction.status() {
                ExtractionStatus::Pending | ExtractionStatus::Processing => {
                    self.extraction_repository
                        .fail_extraction(
                            extraction_id,
                            "Extraction cancelled by user".to_string(),
                            Utc::now(),
                            None,
                        )
                        .await
                        .map_err(|e| AppError::internal_error(format!("Failed to cancel extraction: {}", e)))?;
                    Ok(true)
                }
                _ => Err(AppError::extraction_not_cancellable("Extraction is not in a cancellable state")),
            }
        }
    }

    /// Gets an extracted document for editing
    pub async fn get_extracted_document(
        &self,
        document_id: &DocumentId,
    ) -> Result<ExtractedDocumentDto, AppError> {
        debug!("Getting extracted document for: {}", document_id);

        // Find the latest completed extraction for this document
        let extraction = self.extraction_repository
            .find_latest_by_document(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find extraction: {}", e)))?
            .ok_or_else(|| AppError::extraction_not_found("No extraction found for document"))?;

        if extraction.status() != &ExtractionStatus::Completed {
            return Err(AppError::extraction_not_completed("Document extraction has not completed successfully"));
        }

        // Find the extracted document
        let extracted_doc = self.extracted_document_repository
            .find_by_original_document(document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find extracted document: {}", e)))?
            .ok_or_else(|| AppError::extracted_document_not_found("Extracted document not found"))?;

        // Load TipTap content from .det file
        let tiptap_content = self.file_system_service
            .read_det_file(extracted_doc.extracted_file_path().as_str())
            .await
            .map_err(|e| AppError::file_system_error(format!("Failed to read .det file: {}", e)))?;

        Ok(ExtractedDocumentDto {
            extracted_document_id: extracted_doc.id().to_string(),
            original_document_id: extracted_doc.original_document_id().to_string(),
            extracted_file_path: extracted_doc.extracted_file_path().as_str().to_string(),
            tiptap_content,
            extraction_method: extracted_doc.extraction_method().to_string(),
            extracted_at: extracted_doc.extracted_at().to_rfc3339(),
            content_preview: extracted_doc.generate_preview(),
            word_count: extracted_doc.stats().word_count,
            character_count: extracted_doc.stats().character_count,
        })
    }

    /// Saves changes to an extracted document
    pub async fn save_extracted_document(
        &self,
        extracted_document_id: &ExtractedDocumentId,
        tiptap_content: serde_json::Value,
    ) -> Result<SaveResultDto, AppError> {
        info!("Saving extracted document: {}", extracted_document_id);

        // Validate TipTap content format
        self.prosemirror_serializer
            .validate_tiptap_content(&tiptap_content)
            .map_err(|e| AppError::invalid_content(format!("Invalid TipTap content: {}", e)))?;

        // Find extracted document
        let mut extracted_doc = self.extracted_document_repository
            .find_by_id(extracted_document_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find extracted document: {}", e)))?
            .ok_or_else(|| AppError::extracted_document_not_found("Extracted document not found"))?;

        // Calculate content statistics
        let content_text = self.prosemirror_serializer
            .extract_plain_text(&tiptap_content)
            .unwrap_or_default();

        let word_count = content_text.split_whitespace().count() as i32;
        let character_count = content_text.chars().count() as i32;

        // Update document with new content and stats
        extracted_doc.update_content(tiptap_content.clone(), word_count, character_count)
            .map_err(|e| AppError::validation_error(format!("Failed to update document content: {}", e)))?;

        // Save TipTap content to .det file
        self.file_system_service
            .write_det_file(extracted_doc.extracted_file_path().as_str(), &tiptap_content)
            .await
            .map_err(|e| AppError::file_system_error(format!("Failed to write .det file: {}", e)))?;

        // Update repository
        self.extracted_document_repository
            .save(&extracted_doc)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to save extracted document: {}", e)))?;

        info!("Successfully saved extracted document: {}", extracted_document_id);

        Ok(SaveResultDto {
            success: true,
            extracted_document_id: extracted_document_id.to_string(),
            saved_at: Utc::now().to_rfc3339(),
            word_count,
            character_count,
            error_message: None,
        })
    }

    /// Gets extraction statistics for a project
    pub async fn get_project_extraction_statistics(
        &self,
        project_id: &ProjectId,
    ) -> Result<ExtractionStatistics, AppError> {
        debug!("Getting extraction statistics for project: {}", project_id);

        self.extraction_repository
            .get_project_statistics(project_id)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to get extraction statistics: {}", e)))
    }

    /// Gets system-wide extraction statistics
    pub async fn get_system_extraction_statistics(&self) -> Result<ExtractionStatistics, AppError> {
        debug!("Getting system extraction statistics");

        self.extraction_repository
            .get_system_statistics()
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to get system statistics: {}", e)))
    }

    /// Gets performance metrics for extractions
    pub async fn get_extraction_performance_metrics(
        &self,
        project_id: Option<&ProjectId>,
        time_range: &TimeRange,
    ) -> Result<ExtractionPerformanceMetrics, AppError> {
        debug!("Getting extraction performance metrics");

        self.extraction_repository
            .get_performance_metrics(project_id, time_range)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to get performance metrics: {}", e)))
    }

    /// Cleanup old completed extractions
    pub async fn cleanup_old_extractions(
        &self,
        older_than: &DateTime<Utc>,
    ) -> Result<usize, AppError> {
        info!("Cleaning up extractions older than: {}", older_than);

        let deleted_count = self.extraction_repository
            .delete_old_completed(older_than)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to cleanup old extractions: {}", e)))?;

        info!("Cleaned up {} old extraction records", deleted_count);
        Ok(deleted_count)
    }

    /// Finds and retries stuck extractions
    pub async fn retry_stuck_extractions(&self) -> Result<Vec<ExtractionId>, AppError> {
        info!("Checking for stuck extractions");

        let stuck_extractions = self.extraction_repository
            .find_stuck_extractions(DEFAULT_EXTRACTION_TIMEOUT_MINUTES)
            .await
            .map_err(|e| AppError::internal_error(format!("Failed to find stuck extractions: {}", e)))?;

        let mut retried = Vec::new();

        for extraction in stuck_extractions {
            if extraction.retry_count() < MAX_RETRY_ATTEMPTS {
                info!("Retrying stuck extraction: {}", extraction.id());

                // Increment retry count
                self.extraction_repository
                    .increment_retry_count(extraction.id())
                    .await
                    .map_err(|e| AppError::internal_error(format!("Failed to increment retry count: {}", e)))?;

                // Restart extraction
                match self.start_document_extraction(extraction.document_id(), true).await {
                    Ok(_) => retried.push(extraction.id().clone()),
                    Err(e) => warn!("Failed to retry stuck extraction {}: {}", extraction.id(), e),
                }
            } else {
                warn!("Extraction {} has exceeded max retry attempts, marking as failed", extraction.id());

                self.extraction_repository
                    .fail_extraction(
                        extraction.id(),
                        "Extraction exceeded maximum retry attempts".to_string(),
                        Utc::now(),
                        None,
                    )
                    .await
                    .map_err(|e| AppError::internal_error(format!("Failed to mark extraction as failed: {}", e)))?;
            }
        }

        info!("Retried {} stuck extractions", retried.len());
        Ok(retried)
    }

    // Private helper methods

    async fn validate_document_for_extraction(&self, document: &OriginalDocument) -> Result<(), AppError> {
        // Check file size (10MB limit)
        if document.file_size_bytes() > 10 * 1024 * 1024 {
            return Err(AppError::file_too_large("File exceeds 10MB size limit"));
        }

        // Check file type
        match document.file_type() {
            crate::domain::extraction::value_objects::DocumentType::Pdf |
            crate::domain::extraction::value_objects::DocumentType::Docx |
            crate::domain::extraction::value_objects::DocumentType::Markdown => Ok(()),
            _ => Err(AppError::unsupported_file_type("File type not supported for extraction")),
        }?;

        // Check file exists and is accessible
        let file_path = std::path::Path::new(document.file_path().as_str());
        if !file_path.exists() {
            return Err(AppError::file_not_accessible("Document file not found"));
        }

        if !file_path.is_file() {
            return Err(AppError::file_not_accessible("Path is not a file"));
        }

        Ok(())
    }

    async fn determine_extraction_method(&self, document: &OriginalDocument) -> Result<ExtractionMethod, AppError> {
        match document.file_type() {
            crate::domain::extraction::value_objects::DocumentType::Pdf => {
                // TODO: Determine if OCR is needed by analyzing PDF content
                Ok(ExtractionMethod::PdfTextExtraction)
            }
            crate::domain::extraction::value_objects::DocumentType::Docx => {
                Ok(ExtractionMethod::DocxStructureExtraction)
            }
            crate::domain::extraction::value_objects::DocumentType::Markdown => {
                Ok(ExtractionMethod::MarkdownConversion)
            }
        }
    }

    async fn perform_extraction(
        &self,
        document: &OriginalDocument,
        extraction_id: &ExtractionId,
    ) -> Result<ExtractedDocument, ExtractionError> {
        info!("Performing extraction for document: {}", document.id());

        // Update status to processing
        self.update_extraction_progress(extraction_id, 10, ExtractionStatus::Processing, None).await;

        // Parse document based on type
        let parsed_content = match document.file_type() {
            crate::domain::extraction::value_objects::DocumentType::Pdf => {
                self.update_extraction_progress(extraction_id, 30, ExtractionStatus::Processing, None).await;
                self.pdf_parser.parse(document.file_path().as_str()).await?
            }
            crate::domain::extraction::value_objects::DocumentType::Docx => {
                self.update_extraction_progress(extraction_id, 30, ExtractionStatus::Processing, None).await;
                self.docx_parser.parse(document.file_path().as_str()).await?
            }
            crate::domain::extraction::value_objects::DocumentType::Markdown => {
                self.update_extraction_progress(extraction_id, 30, ExtractionStatus::Processing, None).await;
                self.markdown_parser.parse(document.file_path().as_str()).await?
            }
        };

        // Convert to TipTap format
        self.update_extraction_progress(extraction_id, 60, ExtractionStatus::Processing, None).await;
        let tiptap_content = self.prosemirror_serializer
            .serialize_to_tiptap(&parsed_content)
            .await?;

        // Generate .det file path
        let det_file_path = format!("{}.det", document.file_path().as_str());

        // Create extracted document entity
        self.update_extraction_progress(extraction_id, 80, ExtractionStatus::Processing, None).await;
        let extracted_doc = ExtractedDocument::create(
            ExtractedDocumentId::new(),
            document.id().clone(),
            FilePath::new(det_file_path.clone())
                .map_err(|e| ExtractionError::ValidationError(format!("Invalid .det file path: {}", e)))?,
            tiptap_content.clone(),
            self.determine_extraction_method(document).await
                .map_err(|e| ExtractionError::ValidationError(format!("Failed to determine extraction method: {}", e)))?,
            Utc::now(),
        ).map_err(|e| ExtractionError::ValidationError(format!("Failed to create extracted document: {}", e)))?;

        // Save .det file
        self.update_extraction_progress(extraction_id, 90, ExtractionStatus::Processing, None).await;
        self.file_system_service
            .write_det_file(&det_file_path, &tiptap_content)
            .await
            .map_err(|e| ExtractionError::FileSystemError(format!("Failed to write .det file: {}", e)))?;

        // Save to repository
        self.extracted_document_repository
            .save(&extracted_doc)
            .await
            .map_err(|e| ExtractionError::RepositoryError(format!("Failed to save extracted document: {}", e)))?;

        self.update_extraction_progress(extraction_id, 100, ExtractionStatus::Completed, None).await;
        Ok(extracted_doc)
    }

    async fn handle_extraction_completion(
        &self,
        extraction_id: &ExtractionId,
        result: Result<ExtractedDocument, ExtractionError>,
    ) {
        let completion_time = Utc::now();

        // Get progress to calculate duration
        let duration_ms = if let Some(progress) = self.active_extractions.read().await.get(extraction_id) {
            Some(progress.get_duration_ms())
        } else {
            None
        };

        match result {
            Ok(_extracted_doc) => {
                info!("Extraction completed successfully: {}", extraction_id);

                if let Err(e) = self.extraction_repository
                    .complete_extraction(extraction_id, &ExtractionStatus::Completed, completion_time, duration_ms)
                    .await
                {
                    error!("Failed to mark extraction as completed: {}", e);
                }
            }
            Err(error) => {
                error!("Extraction failed: {} - {}", extraction_id, error);

                if let Err(e) = self.extraction_repository
                    .fail_extraction(extraction_id, error.to_string(), completion_time, duration_ms)
                    .await
                {
                    error!("Failed to mark extraction as failed: {}", e);
                }
            }
        }

        // Remove from active extractions
        self.active_extractions.write().await.remove(extraction_id);
    }

    async fn update_extraction_progress(
        &self,
        extraction_id: &ExtractionId,
        progress_percentage: i32,
        status: ExtractionStatus,
        error_message: Option<String>,
    ) {
        if let Some(mut progress) = self.active_extractions.write().await.get_mut(extraction_id) {
            progress.progress_percentage = progress_percentage;
            progress.status = status.clone();
            progress.error_message = error_message.clone();

            if matches!(status, ExtractionStatus::Completed | ExtractionStatus::Error) {
                progress.completed_at = Some(Utc::now());
            }
        }

        // Also update repository for persistent status
        if let Err(e) = self.extraction_repository.update_status(extraction_id, &status).await {
            warn!("Failed to update extraction status in repository: {}", e);
        }
    }
}

// Clone implementation for spawning async tasks
impl Clone for ExtractionService {
    fn clone(&self) -> Self {
        Self {
            document_repository: Arc::clone(&self.document_repository),
            extraction_repository: Arc::clone(&self.extraction_repository),
            extracted_document_repository: Arc::clone(&self.extracted_document_repository),
            file_system_service: Arc::clone(&self.file_system_service),
            pdf_parser: Arc::clone(&self.pdf_parser),
            docx_parser: Arc::clone(&self.docx_parser),
            markdown_parser: Arc::clone(&self.markdown_parser),
            prosemirror_serializer: Arc::clone(&self.prosemirror_serializer),
            active_extractions: Arc::clone(&self.active_extractions),
        }
    }
}

// Helper types

/// In-memory progress tracking for active extractions
#[derive(Debug, Clone)]
struct ExtractionProgress {
    extraction_id: ExtractionId,
    document_id: DocumentId,
    status: ExtractionStatus,
    extraction_method: Option<ExtractionMethod>,
    started_at: DateTime<Utc>,
    completed_at: Option<DateTime<Utc>>,
    progress_percentage: i32,
    error_message: Option<String>,
}

impl ExtractionProgress {
    fn new(extraction_id: ExtractionId, document_id: DocumentId) -> Self {
        Self {
            extraction_id,
            document_id,
            status: ExtractionStatus::Pending,
            extraction_method: None,
            started_at: Utc::now(),
            completed_at: None,
            progress_percentage: 0,
            error_message: None,
        }
    }

    fn get_duration_ms(&self) -> Option<i64> {
        self.completed_at
            .or_else(|| Some(Utc::now()))
            .map(|end| (end - self.started_at).num_milliseconds())
    }
}

/// Error types for extraction operations
#[derive(Debug)]
enum ExtractionError {
    ValidationError(String),
    FileSystemError(String),
    ParsingError(String),
    SerializationError(String),
    RepositoryError(String),
}

impl std::fmt::Display for ExtractionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExtractionError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ExtractionError::FileSystemError(msg) => write!(f, "File system error: {}", msg),
            ExtractionError::ParsingError(msg) => write!(f, "Parsing error: {}", msg),
            ExtractionError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            ExtractionError::RepositoryError(msg) => write!(f, "Repository error: {}", msg),
        }
    }
}

impl std::error::Error for ExtractionError {}

// Extension trait for AppError to provide extraction-specific error constructors
impl AppError {
    pub fn document_not_found(message: &str) -> Self {
        AppError::new("DOCUMENT_NOT_FOUND", message, None, false, false)
    }

    pub fn extraction_not_found(message: &str) -> Self {
        AppError::new("EXTRACTION_NOT_FOUND", message, None, false, false)
    }

    pub fn extracted_document_not_found(message: &str) -> Self {
        AppError::new("EXTRACTED_DOCUMENT_NOT_FOUND", message, None, false, false)
    }

    pub fn extraction_in_progress(message: &str) -> Self {
        AppError::new("EXTRACTION_IN_PROGRESS", message, None, true, true)
    }

    pub fn extraction_not_completed(message: &str) -> Self {
        AppError::new("EXTRACTION_NOT_COMPLETED", message, None, true, true)
    }

    pub fn extraction_not_cancellable(message: &str) -> Self {
        AppError::new("EXTRACTION_NOT_CANCELLABLE", message, None, false, true)
    }

    pub fn unsupported_file_type(message: &str) -> Self {
        AppError::new("UNSUPPORTED_FILE_TYPE", message, None, false, true)
    }

    pub fn file_too_large(message: &str) -> Self {
        AppError::new("FILE_TOO_LARGE", message, None, false, true)
    }

    pub fn file_not_accessible(message: &str) -> Self {
        AppError::new("FILE_NOT_ACCESSIBLE", message, None, true, true)
    }

    pub fn invalid_content(message: String) -> Self {
        AppError::new("INVALID_CONTENT", message, None, true, true)
    }

    pub fn resource_limit_exceeded(message: &str) -> Self {
        AppError::new("RESOURCE_LIMIT_EXCEEDED", message, None, true, true)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extraction_constants() {
        assert_eq!(MAX_CONCURRENT_EXTRACTIONS, 3);
        assert_eq!(MAX_RETRY_ATTEMPTS, 3);
        assert_eq!(DEFAULT_EXTRACTION_TIMEOUT_MINUTES, 30);
    }

    #[test]
    fn test_extraction_progress_creation() {
        let extraction_id = ExtractionId::new();
        let document_id = DocumentId::new();
        let progress = ExtractionProgress::new(extraction_id.clone(), document_id.clone());

        assert_eq!(progress.extraction_id, extraction_id);
        assert_eq!(progress.document_id, document_id);
        assert_eq!(progress.status, ExtractionStatus::Pending);
        assert_eq!(progress.progress_percentage, 0);
        assert!(progress.error_message.is_none());
        assert!(progress.completed_at.is_none());
    }

    #[test]
    fn test_extraction_progress_duration() {
        let extraction_id = ExtractionId::new();
        let document_id = DocumentId::new();
        let mut progress = ExtractionProgress::new(extraction_id, document_id);

        // Duration should be calculated even without completion time
        let duration = progress.get_duration_ms();
        assert!(duration.is_some());
        assert!(duration.unwrap() >= 0);

        // Set completion time
        progress.completed_at = Some(Utc::now());
        let duration_with_completion = progress.get_duration_ms();
        assert!(duration_with_completion.is_some());
        assert!(duration_with_completion.unwrap() >= 0);
    }
}