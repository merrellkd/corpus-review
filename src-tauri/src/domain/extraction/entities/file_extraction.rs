use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::extraction::value_objects::{
    DocumentId, ExtractedDocumentId, ExtractionId, ExtractionMethod, ExtractionStatus, ProjectId
};

/// FileExtraction entity - Tracks extraction process state and metadata
///
/// This entity manages the lifecycle of document extraction processes,
/// tracking status, timing, errors, and retry attempts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileExtraction {
    /// Unique identifier for this extraction process
    extraction_id: ExtractionId,
    /// Project context
    project_id: ProjectId,
    /// Source document being extracted
    original_document_id: DocumentId,
    /// Result document (if successful)
    extracted_document_id: Option<ExtractedDocumentId>,
    /// Current processing state
    status: ExtractionStatus,
    /// Processing method used
    extraction_method: ExtractionMethod,
    /// When extraction was started
    started_at: DateTime<Utc>,
    /// When extraction finished (success or error)
    completed_at: Option<DateTime<Utc>>,
    /// Error message if status is Error
    error_message: Option<String>,
    /// Total processing time in milliseconds
    processing_duration: Option<Duration>,
    /// Number of retry attempts made
    retry_count: u8,
}

impl FileExtraction {
    /// Creates a new FileExtraction in Pending state
    pub fn new(
        project_id: ProjectId,
        original_document_id: DocumentId,
        extraction_method: ExtractionMethod,
    ) -> Self {
        Self {
            extraction_id: ExtractionId::new(),
            project_id,
            original_document_id,
            extracted_document_id: None,
            status: ExtractionStatus::Pending,
            extraction_method,
            started_at: Utc::now(),
            completed_at: None,
            error_message: None,
            processing_duration: None,
            retry_count: 0,
        }
    }

    /// Creates FileExtraction with existing ID (for loading from storage)
    #[allow(clippy::too_many_arguments)]
    pub fn with_id(
        extraction_id: ExtractionId,
        project_id: ProjectId,
        original_document_id: DocumentId,
        extracted_document_id: Option<ExtractedDocumentId>,
        status: ExtractionStatus,
        extraction_method: ExtractionMethod,
        started_at: DateTime<Utc>,
        completed_at: Option<DateTime<Utc>>,
        error_message: Option<String>,
        processing_duration: Option<Duration>,
        retry_count: u8,
    ) -> Self {
        Self {
            extraction_id,
            project_id,
            original_document_id,
            extracted_document_id,
            status,
            extraction_method,
            started_at,
            completed_at,
            error_message,
            processing_duration,
            retry_count,
        }
    }

    // Getters
    pub fn extraction_id(&self) -> &ExtractionId {
        &self.extraction_id
    }

    pub fn project_id(&self) -> &ProjectId {
        &self.project_id
    }

    pub fn original_document_id(&self) -> &DocumentId {
        &self.original_document_id
    }

    pub fn extracted_document_id(&self) -> Option<&ExtractedDocumentId> {
        self.extracted_document_id.as_ref()
    }

    pub fn status(&self) -> &ExtractionStatus {
        &self.status
    }

    pub fn extraction_method(&self) -> &ExtractionMethod {
        &self.extraction_method
    }

    pub fn started_at(&self) -> &DateTime<Utc> {
        &self.started_at
    }

    pub fn completed_at(&self) -> Option<&DateTime<Utc>> {
        self.completed_at.as_ref()
    }

    pub fn error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }

    pub fn processing_duration(&self) -> Option<&Duration> {
        self.processing_duration.as_ref()
    }

    pub fn retry_count(&self) -> u8 {
        self.retry_count
    }

    /// Starts processing (transitions from Pending to Processing)
    pub fn start_processing(&mut self) -> Result<(), FileExtractionError> {
        if !self.status.can_transition_to(&ExtractionStatus::Processing) {
            return Err(FileExtractionError::InvalidStatusTransition {
                from: self.status.clone(),
                to: ExtractionStatus::Processing,
            });
        }

        self.status = ExtractionStatus::Processing;
        Ok(())
    }

    /// Completes extraction successfully
    pub fn complete_successfully(
        &mut self,
        extracted_document_id: ExtractedDocumentId,
    ) -> Result<(), FileExtractionError> {
        if !self.status.can_transition_to(&ExtractionStatus::Completed) {
            return Err(FileExtractionError::InvalidStatusTransition {
                from: self.status.clone(),
                to: ExtractionStatus::Completed,
            });
        }

        let now = Utc::now();
        self.status = ExtractionStatus::Completed;
        self.extracted_document_id = Some(extracted_document_id);
        self.completed_at = Some(now);
        self.processing_duration = Some(now - self.started_at);
        self.error_message = None; // Clear any previous error

        Ok(())
    }

    /// Marks extraction as failed with error message
    pub fn fail_with_error(&mut self, error_message: String) -> Result<(), FileExtractionError> {
        if !self.status.can_transition_to(&ExtractionStatus::Error) {
            return Err(FileExtractionError::InvalidStatusTransition {
                from: self.status.clone(),
                to: ExtractionStatus::Error,
            });
        }

        let now = Utc::now();
        self.status = ExtractionStatus::Error;
        self.completed_at = Some(now);
        self.processing_duration = Some(now - self.started_at);
        self.error_message = Some(error_message);

        Ok(())
    }

    /// Retry extraction (resets to Pending status)
    pub fn retry(&mut self) -> Result<(), FileExtractionError> {
        if !self.status.can_retry() {
            return Err(FileExtractionError::CannotRetry);
        }

        if self.retry_count >= Self::MAX_RETRY_COUNT {
            return Err(FileExtractionError::MaxRetriesExceeded);
        }

        self.status = ExtractionStatus::Pending;
        self.retry_count += 1;
        self.started_at = Utc::now();
        self.completed_at = None;
        self.processing_duration = None;
        self.extracted_document_id = None;
        // Keep error message for reference

        Ok(())
    }

    /// Cancels extraction (if possible)
    pub fn cancel(&mut self) -> Result<(), FileExtractionError> {
        if !self.status.can_cancel() {
            return Err(FileExtractionError::CannotCancel);
        }

        let now = Utc::now();
        self.status = ExtractionStatus::Error;
        self.completed_at = Some(now);
        self.processing_duration = Some(now - self.started_at);
        self.error_message = Some("Extraction cancelled by user".to_string());

        Ok(())
    }

    /// Checks if extraction has timed out
    pub fn is_timed_out(&self) -> bool {
        if self.status != ExtractionStatus::Processing {
            return false;
        }

        let elapsed = Utc::now() - self.started_at;
        elapsed > Self::PROCESSING_TIMEOUT
    }

    /// Returns the elapsed time since extraction started
    pub fn elapsed_time(&self) -> Duration {
        match self.completed_at {
            Some(completed) => completed - self.started_at,
            None => Utc::now() - self.started_at,
        }
    }

    /// Returns progress percentage (estimated)
    pub fn progress_percentage(&self) -> Option<u8> {
        match self.status {
            ExtractionStatus::Pending => Some(0),
            ExtractionStatus::Processing => {
                // Simple time-based progress estimation
                let elapsed = self.elapsed_time();
                let expected_duration = self.extraction_method.processing_time_category().time_range().1 as i64;
                let progress = (elapsed.num_seconds() * 100 / expected_duration).min(95) as u8;
                Some(progress)
            }
            ExtractionStatus::Completed => Some(100),
            ExtractionStatus::Error => None,
        }
    }

    /// Returns status summary for UI display
    pub fn status_summary(&self) -> FileExtractionStatusSummary {
        FileExtractionStatusSummary {
            extraction_id: self.extraction_id.clone(),
            status: self.status.clone(),
            progress_percentage: self.progress_percentage(),
            elapsed_time: self.elapsed_time(),
            retry_count: self.retry_count,
            error_message: self.error_message.clone(),
            is_timed_out: self.is_timed_out(),
            can_retry: self.status.can_retry() && self.retry_count < Self::MAX_RETRY_COUNT,
            can_cancel: self.status.can_cancel(),
        }
    }

    /// Validates the extraction state
    pub fn validate(&self) -> Result<(), FileExtractionError> {
        // Check retry count limit
        if self.retry_count > Self::MAX_RETRY_COUNT {
            return Err(FileExtractionError::MaxRetriesExceeded);
        }

        // Check that completed extractions have completion time
        if self.status.is_finished() && self.completed_at.is_none() {
            return Err(FileExtractionError::InvalidState(
                "Finished extraction must have completion time".to_string(),
            ));
        }

        // Check that successful extractions have extracted document ID
        if self.status == ExtractionStatus::Completed && self.extracted_document_id.is_none() {
            return Err(FileExtractionError::InvalidState(
                "Completed extraction must have extracted document ID".to_string(),
            ));
        }

        // Check that error extractions have error message
        if self.status == ExtractionStatus::Error && self.error_message.is_none() {
            return Err(FileExtractionError::InvalidState(
                "Failed extraction must have error message".to_string(),
            ));
        }

        Ok(())
    }

    /// Maximum number of retry attempts allowed
    pub const MAX_RETRY_COUNT: u8 = 3;

    /// Maximum time allowed for processing before considering timed out
    pub const PROCESSING_TIMEOUT: Duration = Duration::minutes(10);
}

/// Status summary for UI display
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FileExtractionStatusSummary {
    pub extraction_id: ExtractionId,
    pub status: ExtractionStatus,
    pub progress_percentage: Option<u8>,
    pub elapsed_time: Duration,
    pub retry_count: u8,
    pub error_message: Option<String>,
    pub is_timed_out: bool,
    pub can_retry: bool,
    pub can_cancel: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum FileExtractionError {
    #[error("Invalid status transition from {from} to {to}")]
    InvalidStatusTransition {
        from: ExtractionStatus,
        to: ExtractionStatus,
    },
    #[error("Cannot retry extraction from current status")]
    CannotRetry,
    #[error("Cannot cancel extraction from current status")]
    CannotCancel,
    #[error("Maximum retry attempts ({}) exceeded", FileExtraction::MAX_RETRY_COUNT)]
    MaxRetriesExceeded,
    #[error("Invalid extraction state: {0}")]
    InvalidState(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_file_extraction() {
        let project_id = ProjectId::new();
        let document_id = DocumentId::new();
        let method = ExtractionMethod::PdfTextExtraction;

        let extraction = FileExtraction::new(project_id, document_id, method);

        assert_eq!(extraction.status(), &ExtractionStatus::Pending);
        assert_eq!(extraction.retry_count(), 0);
        assert!(extraction.extracted_document_id().is_none());
        assert!(extraction.error_message().is_none());
    }

    #[test]
    fn test_start_processing() {
        let mut extraction = create_test_extraction();

        let result = extraction.start_processing();
        assert!(result.is_ok());
        assert_eq!(extraction.status(), &ExtractionStatus::Processing);
    }

    #[test]
    fn test_complete_successfully() {
        let mut extraction = create_test_extraction();
        extraction.start_processing().unwrap();

        let extracted_id = ExtractedDocumentId::new();
        let result = extraction.complete_successfully(extracted_id.clone());

        assert!(result.is_ok());
        assert_eq!(extraction.status(), &ExtractionStatus::Completed);
        assert_eq!(extraction.extracted_document_id(), Some(&extracted_id));
        assert!(extraction.completed_at().is_some());
        assert!(extraction.processing_duration().is_some());
    }

    #[test]
    fn test_fail_with_error() {
        let mut extraction = create_test_extraction();
        extraction.start_processing().unwrap();

        let error_msg = "Test error".to_string();
        let result = extraction.fail_with_error(error_msg.clone());

        assert!(result.is_ok());
        assert_eq!(extraction.status(), &ExtractionStatus::Error);
        assert_eq!(extraction.error_message(), Some(error_msg.as_str()));
        assert!(extraction.completed_at().is_some());
    }

    #[test]
    fn test_retry() {
        let mut extraction = create_test_extraction();
        extraction.start_processing().unwrap();
        extraction.fail_with_error("Test error".to_string()).unwrap();

        let result = extraction.retry();
        assert!(result.is_ok());
        assert_eq!(extraction.status(), &ExtractionStatus::Pending);
        assert_eq!(extraction.retry_count(), 1);
        assert!(extraction.extracted_document_id().is_none());
    }

    #[test]
    fn test_max_retries() {
        let mut extraction = create_test_extraction();

        // Exceed max retries
        for i in 0..=FileExtraction::MAX_RETRY_COUNT {
            extraction.start_processing().unwrap();
            extraction.fail_with_error(format!("Error {}", i)).unwrap();

            if i < FileExtraction::MAX_RETRY_COUNT {
                extraction.retry().unwrap();
            }
        }

        // Should not be able to retry anymore
        let result = extraction.retry();
        assert!(matches!(result, Err(FileExtractionError::MaxRetriesExceeded)));
    }

    #[test]
    fn test_cancel() {
        let mut extraction = create_test_extraction();
        extraction.start_processing().unwrap();

        let result = extraction.cancel();
        assert!(result.is_ok());
        assert_eq!(extraction.status(), &ExtractionStatus::Error);
        assert!(extraction.error_message().unwrap().contains("cancelled"));
    }

    #[test]
    fn test_progress_percentage() {
        let extraction = create_test_extraction();
        assert_eq!(extraction.progress_percentage(), Some(0));

        let mut processing = create_test_extraction();
        processing.start_processing().unwrap();
        let progress = processing.progress_percentage();
        assert!(progress.is_some());
        assert!(progress.unwrap() >= 0);

        let mut completed = create_test_extraction();
        completed.start_processing().unwrap();
        completed.complete_successfully(ExtractedDocumentId::new()).unwrap();
        assert_eq!(completed.progress_percentage(), Some(100));
    }

    #[test]
    fn test_status_summary() {
        let extraction = create_test_extraction();
        let summary = extraction.status_summary();

        assert_eq!(summary.extraction_id, *extraction.extraction_id());
        assert_eq!(summary.status, ExtractionStatus::Pending);
        assert_eq!(summary.retry_count, 0);
        assert!(summary.can_cancel);
    }

    #[test]
    fn test_validation() {
        let extraction = create_test_extraction();
        assert!(extraction.validate().is_ok());

        // Test invalid state: completed without extracted document ID
        let invalid = FileExtraction::with_id(
            ExtractionId::new(),
            ProjectId::new(),
            DocumentId::new(),
            None, // Should have extracted document ID for completed status
            ExtractionStatus::Completed,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            Some(Utc::now()),
            None,
            Some(Duration::seconds(30)),
            0,
        );
        assert!(invalid.validate().is_err());
    }

    fn create_test_extraction() -> FileExtraction {
        FileExtraction::new(
            ProjectId::new(),
            DocumentId::new(),
            ExtractionMethod::PdfTextExtraction,
        )
    }
}