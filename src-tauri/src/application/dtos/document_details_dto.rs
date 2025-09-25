use serde::{Deserialize, Serialize};
use crate::application::dtos::{OriginalDocumentDto, ExtractionHistoryDto};

/// DTO for detailed document information including extraction history
///
/// This extends OriginalDocumentDto with additional metadata and the complete
/// extraction history for comprehensive document analysis and debugging.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentDetailsDto {
    /// Base document information
    #[serde(flatten)]
    pub document: OriginalDocumentDto,

    /// File checksum for integrity verification
    pub checksum: String,

    /// Complete history of all extraction attempts
    pub extraction_history: Vec<ExtractionHistoryDto>,
}

impl DocumentDetailsDto {
    /// Create a new DocumentDetailsDto
    pub fn new(
        document: OriginalDocumentDto,
        checksum: String,
        extraction_history: Vec<ExtractionHistoryDto>,
    ) -> Self {
        DocumentDetailsDto {
            document,
            checksum,
            extraction_history,
        }
    }

    /// Get the most recent extraction attempt
    pub fn latest_extraction(&self) -> Option<&ExtractionHistoryDto> {
        self.extraction_history
            .iter()
            .max_by_key(|h| &h.started_at)
    }

    /// Get the most recent successful extraction
    pub fn latest_successful_extraction(&self) -> Option<&ExtractionHistoryDto> {
        self.extraction_history
            .iter()
            .filter(|h| h.is_successful())
            .max_by_key(|h| &h.started_at)
    }

    /// Get all failed extraction attempts
    pub fn failed_extractions(&self) -> Vec<&ExtractionHistoryDto> {
        self.extraction_history
            .iter()
            .filter(|h| h.is_failed())
            .collect()
    }

    /// Get all successful extraction attempts
    pub fn successful_extractions(&self) -> Vec<&ExtractionHistoryDto> {
        self.extraction_history
            .iter()
            .filter(|h| h.is_successful())
            .collect()
    }

    /// Count total number of extraction attempts
    pub fn total_extraction_attempts(&self) -> usize {
        self.extraction_history.len()
    }

    /// Count successful extraction attempts
    pub fn successful_extraction_count(&self) -> usize {
        self.successful_extractions().len()
    }

    /// Count failed extraction attempts
    pub fn failed_extraction_count(&self) -> usize {
        self.failed_extractions().len()
    }

    /// Get the current extraction status based on latest attempt
    pub fn current_status(&self) -> Option<&crate::application::dtos::original_document_dto::ExtractionStatus> {
        self.latest_extraction().map(|h| &h.status)
    }

    /// Check if there's an extraction currently in progress
    pub fn has_extraction_in_progress(&self) -> bool {
        self.latest_extraction()
            .map(|h| h.is_in_progress())
            .unwrap_or(false)
    }

    /// Check if the document has ever been successfully extracted
    pub fn has_successful_extraction(&self) -> bool {
        self.latest_successful_extraction().is_some()
    }

    /// Get average processing time for successful extractions
    pub fn average_processing_time_ms(&self) -> Option<f64> {
        let successful_durations: Vec<i64> = self.successful_extractions()
            .iter()
            .filter_map(|h| h.processing_duration_ms)
            .collect();

        if successful_durations.is_empty() {
            None
        } else {
            let sum: i64 = successful_durations.iter().sum();
            Some(sum as f64 / successful_durations.len() as f64)
        }
    }

    /// Get the fastest successful extraction time
    pub fn fastest_extraction_time_ms(&self) -> Option<i64> {
        self.successful_extractions()
            .iter()
            .filter_map(|h| h.processing_duration_ms)
            .min()
    }

    /// Get the slowest successful extraction time
    pub fn slowest_extraction_time_ms(&self) -> Option<i64> {
        self.successful_extractions()
            .iter()
            .filter_map(|h| h.processing_duration_ms)
            .max()
    }

    /// Get extraction reliability (success rate as percentage)
    pub fn extraction_reliability_percentage(&self) -> f64 {
        if self.extraction_history.is_empty() {
            0.0
        } else {
            (self.successful_extraction_count() as f64 / self.extraction_history.len() as f64) * 100.0
        }
    }

    /// Check if the file has been modified since last successful extraction
    pub fn is_file_modified_since_extraction(&self) -> bool {
        if let Some(latest_success) = self.latest_successful_extraction() {
            self.document.modified_at > latest_success.started_at
        } else {
            true // Never been extracted or never successful
        }
    }

    /// Get common error messages from failed extractions
    pub fn common_error_messages(&self) -> Vec<String> {
        let mut error_messages: Vec<String> = self.failed_extractions()
            .iter()
            .filter_map(|h| h.error_message.as_ref())
            .cloned()
            .collect();

        error_messages.sort();
        error_messages.dedup();
        error_messages
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::dtos::original_document_dto::{DocumentFileType, ExtractionStatus};
    use chrono::{Duration, Utc};

    fn create_test_document() -> OriginalDocumentDto {
        let now = Utc::now();
        OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.pdf".to_string(),
            "document.pdf".to_string(),
            1024 * 1024,
            DocumentFileType::Pdf,
            now,
            now,
            true,
            Some(ExtractionStatus::Completed),
        )
    }

    #[test]
    fn test_document_details_dto_creation() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();
        let history = vec![
            ExtractionHistoryDto::new_completed(
                "ext_12345678-1234-1234-1234-123456789001".to_string(),
                Utc::now() - Duration::minutes(5),
                Utc::now() - Duration::minutes(4),
            ),
        ];

        let details = DocumentDetailsDto::new(document.clone(), checksum.clone(), history.clone());

        assert_eq!(details.document, document);
        assert_eq!(details.checksum, checksum);
        assert_eq!(details.extraction_history, history);
        assert_eq!(details.total_extraction_attempts(), 1);
        assert!(details.has_successful_extraction());
    }

    #[test]
    fn test_extraction_history_analysis() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();

        let history = vec![
            // First attempt - failed
            ExtractionHistoryDto::new_error(
                "ext_12345678-1234-1234-1234-123456789001".to_string(),
                Utc::now() - Duration::hours(2),
                Utc::now() - Duration::hours(2) + Duration::seconds(30),
                "File corrupted".to_string(),
            ),
            // Second attempt - successful
            ExtractionHistoryDto::new_completed(
                "ext_12345678-1234-1234-1234-123456789002".to_string(),
                Utc::now() - Duration::minutes(30),
                Utc::now() - Duration::minutes(29),
            ),
            // Third attempt - failed
            ExtractionHistoryDto::new_error(
                "ext_12345678-1234-1234-1234-123456789003".to_string(),
                Utc::now() - Duration::minutes(15),
                Utc::now() - Duration::minutes(14),
                "Network error".to_string(),
            ),
        ];

        let details = DocumentDetailsDto::new(document, checksum, history);

        assert_eq!(details.total_extraction_attempts(), 3);
        assert_eq!(details.successful_extraction_count(), 1);
        assert_eq!(details.failed_extraction_count(), 2);
        assert!(details.has_successful_extraction());

        let latest = details.latest_extraction().unwrap();
        assert_eq!(latest.extraction_id, "ext_12345678-1234-1234-1234-123456789003");

        let latest_success = details.latest_successful_extraction().unwrap();
        assert_eq!(latest_success.extraction_id, "ext_12345678-1234-1234-1234-123456789002");

        let reliability = details.extraction_reliability_percentage();
        assert!((reliability - 33.33).abs() < 0.01); // 1 success out of 3 attempts

        let common_errors = details.common_error_messages();
        assert_eq!(common_errors.len(), 2);
        assert!(common_errors.contains(&"File corrupted".to_string()));
        assert!(common_errors.contains(&"Network error".to_string()));
    }

    #[test]
    fn test_processing_time_statistics() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();

        let mut history = vec![];

        // Add successful extractions with different durations
        let durations_ms = [1000, 2000, 3000, 1500, 2500];
        for (i, duration) in durations_ms.iter().enumerate() {
            let started = Utc::now() - Duration::minutes(10 + i as i64);
            let completed = started + Duration::milliseconds(*duration);

            history.push(ExtractionHistoryDto::new_completed(
                format!("ext_12345678-1234-1234-1234-12345678900{}", i + 1),
                started,
                completed,
            ));
        }

        // Add a failed extraction (should be ignored for timing stats)
        history.push(ExtractionHistoryDto::new_error(
            "ext_12345678-1234-1234-1234-123456789006".to_string(),
            Utc::now() - Duration::minutes(1),
            Utc::now(),
            "Failed".to_string(),
        ));

        let details = DocumentDetailsDto::new(document, checksum, history);

        let average = details.average_processing_time_ms().unwrap();
        assert!((average - 2000.0).abs() < 0.1); // (1000+2000+3000+1500+2500)/5 = 2000

        let fastest = details.fastest_extraction_time_ms().unwrap();
        assert_eq!(fastest, 1000);

        let slowest = details.slowest_extraction_time_ms().unwrap();
        assert_eq!(slowest, 3000);
    }

    #[test]
    fn test_file_modification_detection() {
        let now = Utc::now();
        let old_modification = now - Duration::hours(2);

        let mut document = create_test_document();
        document.modified_at = old_modification;

        let checksum = "abc123def456".to_string();

        // Successful extraction happened 1 hour ago (after file modification)
        let extraction_time = now - Duration::hours(1);
        let history = vec![
            ExtractionHistoryDto::new_completed(
                "ext_12345678-1234-1234-1234-123456789001".to_string(),
                extraction_time,
                extraction_time + Duration::minutes(1),
            ),
        ];

        let details = DocumentDetailsDto::new(document.clone(), checksum.clone(), history);
        assert!(!details.is_file_modified_since_extraction());

        // Now modify the document after the extraction
        document.modified_at = now - Duration::minutes(30); // Modified after extraction
        let details_modified = DocumentDetailsDto::new(document, checksum, details.extraction_history);
        assert!(details_modified.is_file_modified_since_extraction());
    }

    #[test]
    fn test_current_status_and_progress() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();

        // Test with in-progress extraction
        let history = vec![
            ExtractionHistoryDto::new_processing(
                "ext_12345678-1234-1234-1234-123456789001".to_string(),
                Utc::now() - Duration::minutes(5),
            ),
        ];

        let details = DocumentDetailsDto::new(document.clone(), checksum.clone(), history);

        assert_eq!(details.current_status(), Some(&ExtractionStatus::Processing));
        assert!(details.has_extraction_in_progress());

        // Test with completed extraction
        let completed_history = vec![
            ExtractionHistoryDto::new_completed(
                "ext_12345678-1234-1234-1234-123456789002".to_string(),
                Utc::now() - Duration::minutes(10),
                Utc::now() - Duration::minutes(9),
            ),
        ];

        let completed_details = DocumentDetailsDto::new(document, checksum, completed_history);

        assert_eq!(completed_details.current_status(), Some(&ExtractionStatus::Completed));
        assert!(!completed_details.has_extraction_in_progress());
    }

    #[test]
    fn test_empty_history() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();
        let history = vec![];

        let details = DocumentDetailsDto::new(document, checksum, history);

        assert_eq!(details.total_extraction_attempts(), 0);
        assert_eq!(details.successful_extraction_count(), 0);
        assert_eq!(details.failed_extraction_count(), 0);
        assert!(!details.has_successful_extraction());
        assert!(!details.has_extraction_in_progress());
        assert_eq!(details.current_status(), None);
        assert_eq!(details.latest_extraction(), None);
        assert_eq!(details.average_processing_time_ms(), None);
        assert_eq!(details.extraction_reliability_percentage(), 0.0);
        assert!(details.is_file_modified_since_extraction());
    }

    #[test]
    fn test_serialization() {
        let document = create_test_document();
        let checksum = "abc123def456".to_string();
        let history = vec![
            ExtractionHistoryDto::new_completed(
                "ext_12345678-1234-1234-1234-123456789001".to_string(),
                Utc::now() - Duration::minutes(5),
                Utc::now() - Duration::minutes(4),
            ),
        ];

        let details = DocumentDetailsDto::new(document, checksum, history);

        let serialized = serde_json::to_string(&details).unwrap();
        let deserialized: DocumentDetailsDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(details, deserialized);

        // Check that the document fields are flattened (no nested "document" object)
        assert!(serialized.contains("documentId"));
        assert!(serialized.contains("projectId"));
        assert!(!serialized.contains("\"document\":{"));

        // Check specific fields are present
        assert!(serialized.contains("checksum"));
        assert!(serialized.contains("extractionHistory"));
    }
}