use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use crate::application::dtos::original_document_dto::ExtractionStatus;

/// DTO for historical extraction records
///
/// This represents a single extraction attempt for a document,
/// including timing, status, and error information.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExtractionHistoryDto {
    /// Unique identifier for this extraction attempt
    pub extraction_id: String,

    /// When the extraction was started
    pub started_at: DateTime<Utc>,

    /// When the extraction was completed (null if still in progress)
    pub completed_at: Option<DateTime<Utc>>,

    /// Current/final status of this extraction
    pub status: ExtractionStatus,

    /// Error message if extraction failed
    pub error_message: Option<String>,

    /// Processing duration in milliseconds if completed
    pub processing_duration_ms: Option<i64>,
}

impl ExtractionHistoryDto {
    /// Create a new ExtractionHistoryDto for a pending extraction
    pub fn new_pending(extraction_id: String) -> Self {
        ExtractionHistoryDto {
            extraction_id,
            started_at: Utc::now(),
            completed_at: None,
            status: ExtractionStatus::Pending,
            error_message: None,
            processing_duration_ms: None,
        }
    }

    /// Create a new ExtractionHistoryDto for a processing extraction
    pub fn new_processing(extraction_id: String, started_at: DateTime<Utc>) -> Self {
        ExtractionHistoryDto {
            extraction_id,
            started_at,
            completed_at: None,
            status: ExtractionStatus::Processing,
            error_message: None,
            processing_duration_ms: None,
        }
    }

    /// Create a new ExtractionHistoryDto for a completed extraction
    pub fn new_completed(
        extraction_id: String,
        started_at: DateTime<Utc>,
        completed_at: DateTime<Utc>,
    ) -> Self {
        let processing_duration_ms = (completed_at - started_at).num_milliseconds();

        ExtractionHistoryDto {
            extraction_id,
            started_at,
            completed_at: Some(completed_at),
            status: ExtractionStatus::Completed,
            error_message: None,
            processing_duration_ms: Some(processing_duration_ms),
        }
    }

    /// Create a new ExtractionHistoryDto for a failed extraction
    pub fn new_error(
        extraction_id: String,
        started_at: DateTime<Utc>,
        completed_at: DateTime<Utc>,
        error_message: String,
    ) -> Self {
        let processing_duration_ms = (completed_at - started_at).num_milliseconds();

        ExtractionHistoryDto {
            extraction_id,
            started_at,
            completed_at: Some(completed_at),
            status: ExtractionStatus::Error,
            error_message: Some(error_message),
            processing_duration_ms: Some(processing_duration_ms),
        }
    }

    /// Check if this extraction is still in progress
    pub fn is_in_progress(&self) -> bool {
        matches!(self.status, ExtractionStatus::Pending | ExtractionStatus::Processing)
    }

    /// Check if this extraction completed successfully
    pub fn is_successful(&self) -> bool {
        matches!(self.status, ExtractionStatus::Completed)
    }

    /// Check if this extraction failed
    pub fn is_failed(&self) -> bool {
        matches!(self.status, ExtractionStatus::Error)
    }

    /// Get human-readable duration string
    pub fn duration_human(&self) -> Option<String> {
        self.processing_duration_ms.map(|ms| {
            if ms < 1000 {
                format!("{}ms", ms)
            } else if ms < 60_000 {
                format!("{:.1}s", ms as f64 / 1000.0)
            } else {
                let minutes = ms / 60_000;
                let seconds = (ms % 60_000) / 1000;
                format!("{}m {}s", minutes, seconds)
            }
        })
    }

    /// Get elapsed time if extraction is in progress
    pub fn elapsed_time_ms(&self) -> Option<i64> {
        if self.is_in_progress() {
            Some((Utc::now() - self.started_at).num_milliseconds())
        } else {
            self.processing_duration_ms
        }
    }

    /// Update the status to processing
    pub fn mark_processing(&mut self) {
        if matches!(self.status, ExtractionStatus::Pending) {
            self.status = ExtractionStatus::Processing;
        }
    }

    /// Mark the extraction as completed successfully
    pub fn mark_completed(&mut self) {
        let now = Utc::now();
        self.completed_at = Some(now);
        self.status = ExtractionStatus::Completed;
        self.processing_duration_ms = Some((now - self.started_at).num_milliseconds());
    }

    /// Mark the extraction as failed with an error message
    pub fn mark_error(&mut self, error_message: String) {
        let now = Utc::now();
        self.completed_at = Some(now);
        self.status = ExtractionStatus::Error;
        self.error_message = Some(error_message);
        self.processing_duration_ms = Some((now - self.started_at).num_milliseconds());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    #[test]
    fn test_new_pending() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let history = ExtractionHistoryDto::new_pending(extraction_id.clone());

        assert_eq!(history.extraction_id, extraction_id);
        assert_eq!(history.status, ExtractionStatus::Pending);
        assert!(history.completed_at.is_none());
        assert!(history.error_message.is_none());
        assert!(history.processing_duration_ms.is_none());
        assert!(history.is_in_progress());
        assert!(!history.is_successful());
        assert!(!history.is_failed());
    }

    #[test]
    fn test_new_completed() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::seconds(30);
        let completed_at = Utc::now();

        let history = ExtractionHistoryDto::new_completed(
            extraction_id.clone(),
            started_at,
            completed_at,
        );

        assert_eq!(history.extraction_id, extraction_id);
        assert_eq!(history.status, ExtractionStatus::Completed);
        assert_eq!(history.completed_at, Some(completed_at));
        assert!(history.processing_duration_ms.is_some());
        assert!(history.processing_duration_ms.unwrap() > 0);
        assert!(!history.is_in_progress());
        assert!(history.is_successful());
        assert!(!history.is_failed());
    }

    #[test]
    fn test_new_error() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::seconds(15);
        let completed_at = Utc::now();
        let error_message = "File could not be parsed".to_string();

        let history = ExtractionHistoryDto::new_error(
            extraction_id.clone(),
            started_at,
            completed_at,
            error_message.clone(),
        );

        assert_eq!(history.extraction_id, extraction_id);
        assert_eq!(history.status, ExtractionStatus::Error);
        assert_eq!(history.completed_at, Some(completed_at));
        assert_eq!(history.error_message, Some(error_message));
        assert!(history.processing_duration_ms.is_some());
        assert!(!history.is_in_progress());
        assert!(!history.is_successful());
        assert!(history.is_failed());
    }

    #[test]
    fn test_duration_human() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();

        // Test milliseconds
        let mut history = ExtractionHistoryDto::new_pending(extraction_id.clone());
        history.processing_duration_ms = Some(500);
        assert_eq!(history.duration_human(), Some("500ms".to_string()));

        // Test seconds
        history.processing_duration_ms = Some(2500);
        assert_eq!(history.duration_human(), Some("2.5s".to_string()));

        // Test minutes
        history.processing_duration_ms = Some(125_000); // 2m 5s
        assert_eq!(history.duration_human(), Some("2m 5s".to_string()));
    }

    #[test]
    fn test_mark_processing() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let mut history = ExtractionHistoryDto::new_pending(extraction_id);

        assert_eq!(history.status, ExtractionStatus::Pending);

        history.mark_processing();
        assert_eq!(history.status, ExtractionStatus::Processing);
        assert!(history.is_in_progress());
    }

    #[test]
    fn test_mark_completed() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let mut history = ExtractionHistoryDto::new_pending(extraction_id);

        // Wait a bit to get meaningful duration
        std::thread::sleep(std::time::Duration::from_millis(10));

        history.mark_completed();

        assert_eq!(history.status, ExtractionStatus::Completed);
        assert!(history.completed_at.is_some());
        assert!(history.processing_duration_ms.is_some());
        assert!(history.processing_duration_ms.unwrap() > 0);
        assert!(history.is_successful());
        assert!(!history.is_in_progress());
    }

    #[test]
    fn test_mark_error() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let mut history = ExtractionHistoryDto::new_pending(extraction_id);
        let error_message = "Processing failed".to_string();

        // Wait a bit to get meaningful duration
        std::thread::sleep(std::time::Duration::from_millis(10));

        history.mark_error(error_message.clone());

        assert_eq!(history.status, ExtractionStatus::Error);
        assert!(history.completed_at.is_some());
        assert_eq!(history.error_message, Some(error_message));
        assert!(history.processing_duration_ms.is_some());
        assert!(history.processing_duration_ms.unwrap() > 0);
        assert!(history.is_failed());
        assert!(!history.is_in_progress());
    }

    #[test]
    fn test_elapsed_time_ms() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();

        // Test in progress extraction
        let in_progress = ExtractionHistoryDto::new_pending(extraction_id.clone());
        let elapsed = in_progress.elapsed_time_ms();
        assert!(elapsed.is_some());
        assert!(elapsed.unwrap() >= 0);

        // Test completed extraction
        let started_at = Utc::now() - Duration::seconds(30);
        let completed_at = Utc::now();
        let completed = ExtractionHistoryDto::new_completed(
            extraction_id,
            started_at,
            completed_at,
        );
        let elapsed_completed = completed.elapsed_time_ms();
        assert!(elapsed_completed.is_some());
        assert_eq!(elapsed_completed, completed.processing_duration_ms);
    }

    #[test]
    fn test_serialization() {
        let extraction_id = "ext_12345678-1234-1234-1234-123456789012".to_string();
        let started_at = Utc::now() - Duration::seconds(30);
        let completed_at = Utc::now();

        let history = ExtractionHistoryDto::new_completed(
            extraction_id,
            started_at,
            completed_at,
        );

        let serialized = serde_json::to_string(&history).unwrap();
        let deserialized: ExtractionHistoryDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(history, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("extractionId"));
        assert!(serialized.contains("startedAt"));
        assert!(serialized.contains("completedAt"));
        assert!(serialized.contains("errorMessage"));
        assert!(serialized.contains("processingDurationMs"));
    }
}