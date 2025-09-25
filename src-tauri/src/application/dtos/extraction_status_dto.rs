use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::application::dtos::original_document_dto::ExtractionStatus;

/// DTO for current extraction status and progress information
///
/// This provides real-time status updates for active extractions and
/// detailed information about completed or failed extraction attempts.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExtractionStatusDto {
    /// Unique identifier for this extraction attempt
    pub extraction_id: String,

    /// Document being extracted
    pub document_id: String,

    /// Current extraction status
    pub status: ExtractionStatus,

    /// Method used/being used for extraction
    pub extraction_method: Option<ExtractionMethod>,

    /// When the extraction was started
    pub started_at: DateTime<Utc>,

    /// When the extraction was completed (null if still in progress)
    pub completed_at: Option<DateTime<Utc>>,

    /// Error message if extraction failed
    pub error_message: Option<String>,

    /// Current progress percentage (0-100) for in-progress extractions
    pub progress_percentage: Option<i32>,
}

/// Extraction methods supported by the system
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExtractionMethod {
    #[serde(rename = "PdfTextExtraction")]
    PdfTextExtraction,
    #[serde(rename = "PdfOcrExtraction")]
    PdfOcrExtraction,
    #[serde(rename = "DocxStructureExtraction")]
    DocxStructureExtraction,
    #[serde(rename = "MarkdownConversion")]
    MarkdownConversion,
}

impl ExtractionStatusDto {
    /// Create a new ExtractionStatusDto for a pending extraction
    pub fn new_pending(extraction_id: String, document_id: String) -> Self {
        ExtractionStatusDto {
            extraction_id,
            document_id,
            status: ExtractionStatus::Pending,
            extraction_method: None,
            started_at: Utc::now(),
            completed_at: None,
            error_message: None,
            progress_percentage: Some(0),
        }
    }

    /// Create a new ExtractionStatusDto for a processing extraction
    pub fn new_processing(
        extraction_id: String,
        document_id: String,
        extraction_method: ExtractionMethod,
        started_at: DateTime<Utc>,
        progress_percentage: Option<i32>,
    ) -> Self {
        ExtractionStatusDto {
            extraction_id,
            document_id,
            status: ExtractionStatus::Processing,
            extraction_method: Some(extraction_method),
            started_at,
            completed_at: None,
            error_message: None,
            progress_percentage,
        }
    }

    /// Create a new ExtractionStatusDto for a completed extraction
    pub fn new_completed(
        extraction_id: String,
        document_id: String,
        extraction_method: ExtractionMethod,
        started_at: DateTime<Utc>,
        completed_at: DateTime<Utc>,
    ) -> Self {
        ExtractionStatusDto {
            extraction_id,
            document_id,
            status: ExtractionStatus::Completed,
            extraction_method: Some(extraction_method),
            started_at,
            completed_at: Some(completed_at),
            error_message: None,
            progress_percentage: Some(100),
        }
    }

    /// Create a new ExtractionStatusDto for a failed extraction
    pub fn new_error(
        extraction_id: String,
        document_id: String,
        extraction_method: Option<ExtractionMethod>,
        started_at: DateTime<Utc>,
        completed_at: DateTime<Utc>,
        error_message: String,
    ) -> Self {
        ExtractionStatusDto {
            extraction_id,
            document_id,
            status: ExtractionStatus::Error,
            extraction_method,
            started_at,
            completed_at: Some(completed_at),
            error_message: Some(error_message),
            progress_percentage: None,
        }
    }

    /// Check if the extraction is currently in progress
    pub fn is_in_progress(&self) -> bool {
        matches!(self.status, ExtractionStatus::Pending | ExtractionStatus::Processing)
    }

    /// Check if the extraction completed successfully
    pub fn is_completed(&self) -> bool {
        matches!(self.status, ExtractionStatus::Completed)
    }

    /// Check if the extraction failed
    pub fn is_failed(&self) -> bool {
        matches!(self.status, ExtractionStatus::Error)
    }

    /// Get the processing duration in milliseconds if completed
    pub fn processing_duration_ms(&self) -> Option<i64> {
        self.completed_at.map(|completed| {
            (completed - self.started_at).num_milliseconds()
        })
    }

    /// Get the elapsed time in milliseconds (for in-progress or completed)
    pub fn elapsed_time_ms(&self) -> i64 {
        let end_time = self.completed_at.unwrap_or_else(Utc::now);
        (end_time - self.started_at).num_milliseconds()
    }

    /// Get human-readable duration string
    pub fn duration_human(&self) -> String {
        let ms = self.elapsed_time_ms();
        if ms < 1000 {
            format!("{}ms", ms)
        } else if ms < 60_000 {
            format!("{:.1}s", ms as f64 / 1000.0)
        } else {
            let minutes = ms / 60_000;
            let seconds = (ms % 60_000) / 1000;
            format!("{}m {}s", minutes, seconds)
        }
    }

    /// Update progress percentage for in-progress extraction
    pub fn update_progress(&mut self, percentage: i32) {
        if self.is_in_progress() && percentage >= 0 && percentage <= 100 {
            self.progress_percentage = Some(percentage);

            // Automatically transition to Processing if we were Pending
            if matches!(self.status, ExtractionStatus::Pending) && percentage > 0 {
                self.status = ExtractionStatus::Processing;
            }
        }
    }

    /// Mark the extraction as started with a specific method
    pub fn mark_started(&mut self, extraction_method: ExtractionMethod) {
        if matches!(self.status, ExtractionStatus::Pending) {
            self.status = ExtractionStatus::Processing;
            self.extraction_method = Some(extraction_method);
            self.progress_percentage = Some(0);
        }
    }

    /// Mark the extraction as completed successfully
    pub fn mark_completed(&mut self) {
        if self.is_in_progress() {
            self.status = ExtractionStatus::Completed;
            self.completed_at = Some(Utc::now());
            self.progress_percentage = Some(100);
        }
    }

    /// Mark the extraction as failed with an error message
    pub fn mark_failed(&mut self, error_message: String) {
        if self.is_in_progress() {
            self.status = ExtractionStatus::Error;
            self.completed_at = Some(Utc::now());
            self.error_message = Some(error_message);
            self.progress_percentage = None;
        }
    }

    /// Get estimated time remaining based on current progress (for in-progress extractions)
    pub fn estimated_time_remaining_ms(&self) -> Option<i64> {
        if let Some(progress) = self.progress_percentage {
            if self.is_in_progress() && progress > 0 && progress < 100 {
                let elapsed = self.elapsed_time_ms();
                let estimated_total = (elapsed as f64 * 100.0) / progress as f64;
                let remaining = estimated_total - elapsed as f64;
                Some(remaining as i64)
            } else {
                None
            }
        } else {
            None
        }
    }

    /// Get a user-friendly status message
    pub fn status_message(&self) -> String {
        match &self.status {
            ExtractionStatus::None => "Not started".to_string(),
            ExtractionStatus::Pending => "Queued for extraction".to_string(),
            ExtractionStatus::Processing => {
                if let Some(progress) = self.progress_percentage {
                    format!("Processing... ({}%)", progress)
                } else {
                    "Processing...".to_string()
                }
            },
            ExtractionStatus::Completed => format!("Completed in {}", self.duration_human()),
            ExtractionStatus::Error => {
                if let Some(error) = &self.error_message {
                    format!("Failed: {}", error)
                } else {
                    "Failed with unknown error".to_string()
                }
            },
        }
    }
}

impl ExtractionMethod {
    /// Get a human-readable description of the extraction method
    pub fn description(&self) -> &'static str {
        match self {
            ExtractionMethod::PdfTextExtraction => "PDF text extraction (embedded text)",
            ExtractionMethod::PdfOcrExtraction => "PDF OCR extraction (image-based)",
            ExtractionMethod::DocxStructureExtraction => "DOCX structure extraction",
            ExtractionMethod::MarkdownConversion => "Markdown to TipTap conversion",
        }
    }

    /// Get the typical processing time range for this method
    pub fn typical_duration_range(&self) -> (i64, i64) {
        match self {
            ExtractionMethod::PdfTextExtraction => (1000, 10000), // 1-10 seconds
            ExtractionMethod::PdfOcrExtraction => (10000, 60000), // 10-60 seconds
            ExtractionMethod::DocxStructureExtraction => (2000, 15000), // 2-15 seconds
            ExtractionMethod::MarkdownConversion => (500, 3000), // 0.5-3 seconds
        }
    }

    /// Check if this method typically supports progress updates
    pub fn supports_progress_updates(&self) -> bool {
        match self {
            ExtractionMethod::PdfTextExtraction => true,
            ExtractionMethod::PdfOcrExtraction => true,
            ExtractionMethod::DocxStructureExtraction => true,
            ExtractionMethod::MarkdownConversion => false, // Too fast for meaningful progress
        }
    }
}

impl std::fmt::Display for ExtractionMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExtractionMethod::PdfTextExtraction => write!(f, "PDF Text Extraction"),
            ExtractionMethod::PdfOcrExtraction => write!(f, "PDF OCR Extraction"),
            ExtractionMethod::DocxStructureExtraction => write!(f, "DOCX Structure Extraction"),
            ExtractionMethod::MarkdownConversion => write!(f, "Markdown Conversion"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    #[test]
    fn test_new_pending() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let status = ExtractionStatusDto::new_pending(extraction_id.clone(), document_id.clone());

        assert_eq!(status.extraction_id, extraction_id);
        assert_eq!(status.document_id, document_id);
        assert_eq!(status.status, ExtractionStatus::Pending);
        assert!(status.extraction_method.is_none());
        assert!(status.completed_at.is_none());
        assert!(status.error_message.is_none());
        assert_eq!(status.progress_percentage, Some(0));
        assert!(status.is_in_progress());
        assert!(!status.is_completed());
        assert!(!status.is_failed());
    }

    #[test]
    fn test_new_processing() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::minutes(5);
        let method = ExtractionMethod::PdfTextExtraction;

        let status = ExtractionStatusDto::new_processing(
            extraction_id.clone(),
            document_id.clone(),
            method.clone(),
            started_at,
            Some(45),
        );

        assert_eq!(status.extraction_id, extraction_id);
        assert_eq!(status.document_id, document_id);
        assert_eq!(status.status, ExtractionStatus::Processing);
        assert_eq!(status.extraction_method, Some(method));
        assert_eq!(status.started_at, started_at);
        assert!(status.completed_at.is_none());
        assert_eq!(status.progress_percentage, Some(45));
        assert!(status.is_in_progress());
        assert!(!status.is_completed());
        assert!(!status.is_failed());
    }

    #[test]
    fn test_new_completed() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::minutes(5);
        let completed_at = Utc::now();
        let method = ExtractionMethod::PdfTextExtraction;

        let status = ExtractionStatusDto::new_completed(
            extraction_id.clone(),
            document_id.clone(),
            method.clone(),
            started_at,
            completed_at,
        );

        assert_eq!(status.extraction_id, extraction_id);
        assert_eq!(status.status, ExtractionStatus::Completed);
        assert_eq!(status.extraction_method, Some(method));
        assert_eq!(status.completed_at, Some(completed_at));
        assert_eq!(status.progress_percentage, Some(100));
        assert!(!status.is_in_progress());
        assert!(status.is_completed());
        assert!(!status.is_failed());

        let duration = status.processing_duration_ms().unwrap();
        assert!(duration > 0);
    }

    #[test]
    fn test_new_error() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::minutes(2);
        let completed_at = Utc::now();
        let error_message = "File could not be parsed".to_string();
        let method = ExtractionMethod::PdfTextExtraction;

        let status = ExtractionStatusDto::new_error(
            extraction_id.clone(),
            document_id.clone(),
            Some(method.clone()),
            started_at,
            completed_at,
            error_message.clone(),
        );

        assert_eq!(status.extraction_id, extraction_id);
        assert_eq!(status.status, ExtractionStatus::Error);
        assert_eq!(status.extraction_method, Some(method));
        assert_eq!(status.error_message, Some(error_message));
        assert!(status.progress_percentage.is_none());
        assert!(!status.is_in_progress());
        assert!(!status.is_completed());
        assert!(status.is_failed());
    }

    #[test]
    fn test_update_progress() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let mut status = ExtractionStatusDto::new_pending(extraction_id, document_id);
        assert_eq!(status.status, ExtractionStatus::Pending);

        // Update progress should transition from Pending to Processing
        status.update_progress(25);
        assert_eq!(status.status, ExtractionStatus::Processing);
        assert_eq!(status.progress_percentage, Some(25));

        // Further updates should work normally
        status.update_progress(75);
        assert_eq!(status.progress_percentage, Some(75));

        // Invalid progress should be ignored
        status.update_progress(150);
        assert_eq!(status.progress_percentage, Some(75));

        status.update_progress(-10);
        assert_eq!(status.progress_percentage, Some(75));
    }

    #[test]
    fn test_mark_started() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let mut status = ExtractionStatusDto::new_pending(extraction_id, document_id);
        let method = ExtractionMethod::DocxStructureExtraction;

        status.mark_started(method.clone());

        assert_eq!(status.status, ExtractionStatus::Processing);
        assert_eq!(status.extraction_method, Some(method));
        assert_eq!(status.progress_percentage, Some(0));
    }

    #[test]
    fn test_mark_completed() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let mut status = ExtractionStatusDto::new_pending(extraction_id, document_id);
        status.mark_started(ExtractionMethod::PdfTextExtraction);

        // Wait a bit to get meaningful duration
        std::thread::sleep(std::time::Duration::from_millis(10));

        status.mark_completed();

        assert_eq!(status.status, ExtractionStatus::Completed);
        assert!(status.completed_at.is_some());
        assert_eq!(status.progress_percentage, Some(100));

        let duration = status.processing_duration_ms().unwrap();
        assert!(duration > 0);
    }

    #[test]
    fn test_mark_failed() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let mut status = ExtractionStatusDto::new_pending(extraction_id, document_id);
        status.mark_started(ExtractionMethod::PdfTextExtraction);

        let error_message = "Processing failed due to corrupted file".to_string();
        status.mark_failed(error_message.clone());

        assert_eq!(status.status, ExtractionStatus::Error);
        assert!(status.completed_at.is_some());
        assert_eq!(status.error_message, Some(error_message));
        assert!(status.progress_percentage.is_none());
        assert!(status.is_failed());
    }

    #[test]
    fn test_estimated_time_remaining() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let mut status = ExtractionStatusDto::new_processing(
            extraction_id,
            document_id,
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::seconds(20), // 20 seconds elapsed
            Some(25), // 25% complete
        );

        let remaining = status.estimated_time_remaining_ms();
        assert!(remaining.is_some());

        // At 25% complete in 20 seconds, estimated total is 80 seconds
        // So remaining should be about 60 seconds (60000ms)
        let remaining_ms = remaining.unwrap();
        assert!(remaining_ms > 50000 && remaining_ms < 70000); // Allow some variance

        // Test edge cases
        status.progress_percentage = Some(0);
        assert!(status.estimated_time_remaining_ms().is_none()); // Can't estimate with 0% progress

        status.progress_percentage = Some(100);
        assert!(status.estimated_time_remaining_ms().is_none()); // No time remaining at 100%
    }

    #[test]
    fn test_duration_human() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        // Test milliseconds
        let status_ms = ExtractionStatusDto::new_completed(
            extraction_id.clone(),
            document_id.clone(),
            ExtractionMethod::MarkdownConversion,
            Utc::now() - Duration::milliseconds(500),
            Utc::now(),
        );
        assert_eq!(status_ms.duration_human(), "500ms");

        // Test seconds
        let status_s = ExtractionStatusDto::new_completed(
            extraction_id.clone(),
            document_id.clone(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::milliseconds(2500),
            Utc::now(),
        );
        assert_eq!(status_s.duration_human(), "2.5s");

        // Test minutes
        let status_m = ExtractionStatusDto::new_completed(
            extraction_id,
            document_id,
            ExtractionMethod::PdfOcrExtraction,
            Utc::now() - Duration::seconds(125), // 2m 5s
            Utc::now(),
        );
        assert_eq!(status_m.duration_human(), "2m 5s");
    }

    #[test]
    fn test_status_message() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let pending = ExtractionStatusDto::new_pending(extraction_id.clone(), document_id.clone());
        assert_eq!(pending.status_message(), "Queued for extraction");

        let mut processing = ExtractionStatusDto::new_pending(extraction_id.clone(), document_id.clone());
        processing.update_progress(45);
        assert_eq!(processing.status_message(), "Processing... (45%)");

        let completed = ExtractionStatusDto::new_completed(
            extraction_id.clone(),
            document_id.clone(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::seconds(5),
            Utc::now(),
        );
        assert!(completed.status_message().starts_with("Completed in"));

        let error = ExtractionStatusDto::new_error(
            extraction_id,
            document_id,
            Some(ExtractionMethod::PdfTextExtraction),
            Utc::now() - Duration::seconds(10),
            Utc::now(),
            "File corrupted".to_string(),
        );
        assert_eq!(error.status_message(), "Failed: File corrupted");
    }

    #[test]
    fn test_extraction_method_properties() {
        let pdf_text = ExtractionMethod::PdfTextExtraction;
        assert_eq!(pdf_text.description(), "PDF text extraction (embedded text)");
        assert!(pdf_text.supports_progress_updates());
        let (min, max) = pdf_text.typical_duration_range();
        assert!(min < max);
        assert_eq!(pdf_text.to_string(), "PDF Text Extraction");

        let markdown = ExtractionMethod::MarkdownConversion;
        assert!(!markdown.supports_progress_updates());
        assert_eq!(markdown.to_string(), "Markdown Conversion");
    }

    #[test]
    fn test_serialization() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let document_id = "doc_12345678-1234-1234-1234-123456789012".to_string();

        let status = ExtractionStatusDto::new_processing(
            extraction_id,
            document_id,
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::minutes(2),
            Some(75),
        );

        let serialized = serde_json::to_string(&status).unwrap();
        let deserialized: ExtractionStatusDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(status, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("extractionId"));
        assert!(serialized.contains("documentId"));
        assert!(serialized.contains("extractionMethod"));
        assert!(serialized.contains("startedAt"));
        assert!(serialized.contains("completedAt"));
        assert!(serialized.contains("errorMessage"));
        assert!(serialized.contains("progressPercentage"));

        // Check enum serialization
        assert!(serialized.contains("PdfTextExtraction"));
    }
}