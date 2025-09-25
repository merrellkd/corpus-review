use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// DTO for save operation results
///
/// This represents the result of saving changes to an extracted document,
/// including success status, timing, and updated content statistics.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SaveResultDto {
    /// Whether the save operation was successful
    pub success: bool,

    /// ID of the extracted document that was saved
    pub extracted_document_id: String,

    /// When the save operation was completed
    pub saved_at: DateTime<Utc>,

    /// Updated word count after save
    pub word_count: i32,

    /// Updated character count after save
    pub character_count: i32,

    /// Error message if the save failed
    pub error_message: Option<String>,
}

impl SaveResultDto {
    /// Create a successful save result
    pub fn success(
        extracted_document_id: String,
        word_count: i32,
        character_count: i32,
    ) -> Self {
        SaveResultDto {
            success: true,
            extracted_document_id,
            saved_at: Utc::now(),
            word_count,
            character_count,
            error_message: None,
        }
    }

    /// Create a successful save result with custom timestamp
    pub fn success_with_timestamp(
        extracted_document_id: String,
        saved_at: DateTime<Utc>,
        word_count: i32,
        character_count: i32,
    ) -> Self {
        SaveResultDto {
            success: true,
            extracted_document_id,
            saved_at,
            word_count,
            character_count,
            error_message: None,
        }
    }

    /// Create a failed save result
    pub fn failure(
        extracted_document_id: String,
        error_message: String,
    ) -> Self {
        SaveResultDto {
            success: false,
            extracted_document_id,
            saved_at: Utc::now(),
            word_count: 0,
            character_count: 0,
            error_message: Some(error_message),
        }
    }

    /// Create a failed save result with custom timestamp
    pub fn failure_with_timestamp(
        extracted_document_id: String,
        saved_at: DateTime<Utc>,
        error_message: String,
    ) -> Self {
        SaveResultDto {
            success: false,
            extracted_document_id,
            saved_at,
            word_count: 0,
            character_count: 0,
            error_message: Some(error_message),
        }
    }

    /// Check if the save operation failed
    pub fn is_failure(&self) -> bool {
        !self.success
    }

    /// Check if the save operation was successful
    pub fn is_success(&self) -> bool {
        self.success
    }

    /// Get the error message if the operation failed
    pub fn get_error_message(&self) -> Option<&str> {
        self.error_message.as_deref()
    }

    /// Check if the content has any text
    pub fn has_content(&self) -> bool {
        self.success && (self.word_count > 0 || self.character_count > 0)
    }

    /// Check if the content is substantial
    pub fn has_substantial_content(&self) -> bool {
        self.success && self.word_count >= 10 && self.character_count >= 50
    }

    /// Get content density (characters per word)
    pub fn content_density(&self) -> f64 {
        if self.success && self.word_count > 0 {
            self.character_count as f64 / self.word_count as f64
        } else {
            0.0
        }
    }

    /// Get estimated reading time in minutes
    pub fn estimated_reading_time_minutes(&self) -> i32 {
        if self.success {
            const AVERAGE_WORDS_PER_MINUTE: i32 = 200;
            std::cmp::max(1, (self.word_count as f64 / AVERAGE_WORDS_PER_MINUTE as f64).ceil() as i32)
        } else {
            0
        }
    }

    /// Get human-readable content size
    pub fn content_size_human(&self) -> String {
        if self.success {
            if self.word_count == 0 && self.character_count == 0 {
                "Empty".to_string()
            } else if self.word_count == 1 {
                format!("1 word, {} characters", self.character_count)
            } else {
                format!("{} words, {} characters", self.word_count, self.character_count)
            }
        } else {
            "N/A".to_string()
        }
    }

    /// Get estimated file size for the saved content
    pub fn estimated_file_size_bytes(&self) -> i64 {
        if self.success {
            // Rough estimate: TipTap JSON is typically 2-3x the character count
            (self.character_count as f64 * 2.5) as i64
        } else {
            0
        }
    }

    /// Get human-readable file size estimate
    pub fn estimated_file_size_human(&self) -> String {
        let bytes = self.estimated_file_size_bytes();

        if bytes == 0 {
            return "N/A".to_string();
        }

        let size = bytes as f64;
        if size < 1024.0 {
            format!("{} B", size)
        } else if size < 1024.0 * 1024.0 {
            format!("{:.1} KB", size / 1024.0)
        } else {
            format!("{:.1} MB", size / (1024.0 * 1024.0))
        }
    }

    /// Get time elapsed since save
    pub fn time_since_save(&self) -> chrono::Duration {
        Utc::now() - self.saved_at
    }

    /// Get human-readable time since save
    pub fn time_since_save_human(&self) -> String {
        let duration = self.time_since_save();

        if duration.num_days() > 0 {
            format!("{} days ago", duration.num_days())
        } else if duration.num_hours() > 0 {
            format!("{} hours ago", duration.num_hours())
        } else if duration.num_minutes() > 0 {
            format!("{} minutes ago", duration.num_minutes())
        } else {
            "Just now".to_string()
        }
    }

    /// Check if the save was recent (within last 5 minutes)
    pub fn is_recent_save(&self) -> bool {
        self.time_since_save().num_minutes() < 5
    }

    /// Get a user-friendly status message
    pub fn status_message(&self) -> String {
        if self.success {
            if self.has_substantial_content() {
                format!("Saved successfully - {}", self.content_size_human())
            } else if self.has_content() {
                format!("Saved - {}", self.content_size_human())
            } else {
                "Saved (empty document)".to_string()
            }
        } else {
            match &self.error_message {
                Some(error) => format!("Save failed: {}", error),
                None => "Save failed with unknown error".to_string(),
            }
        }
    }

    /// Get save result summary for logging or display
    pub fn get_summary(&self) -> SaveResultSummary {
        SaveResultSummary {
            success: self.success,
            extracted_document_id: self.extracted_document_id.clone(),
            content_stats: if self.success {
                Some(ContentStats {
                    word_count: self.word_count,
                    character_count: self.character_count,
                    estimated_file_size_bytes: self.estimated_file_size_bytes(),
                    reading_time_minutes: self.estimated_reading_time_minutes(),
                })
            } else {
                None
            },
            error_summary: self.error_message.clone(),
            saved_at: self.saved_at,
        }
    }
}

/// Summary of save result for display or logging
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveResultSummary {
    pub success: bool,
    pub extracted_document_id: String,
    pub content_stats: Option<ContentStats>,
    pub error_summary: Option<String>,
    pub saved_at: DateTime<Utc>,
}

/// Content statistics for successful saves
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContentStats {
    pub word_count: i32,
    pub character_count: i32,
    pub estimated_file_size_bytes: i64,
    pub reading_time_minutes: i32,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, Utc};

    #[test]
    fn test_success_creation() {
        let extracted_doc_id = "det_12345678-1234-1234-1234-123456789012".to_string();
        let result = SaveResultDto::success(extracted_doc_id.clone(), 100, 500);

        assert!(result.is_success());
        assert!(!result.is_failure());
        assert_eq!(result.extracted_document_id, extracted_doc_id);
        assert_eq!(result.word_count, 100);
        assert_eq!(result.character_count, 500);
        assert!(result.error_message.is_none());
        assert!(result.has_content());
        assert!(result.has_substantial_content());
    }

    #[test]
    fn test_failure_creation() {
        let extracted_doc_id = "det_12345678-1234-1234-1234-123456789012".to_string();
        let error_msg = "File system error".to_string();
        let result = SaveResultDto::failure(extracted_doc_id.clone(), error_msg.clone());

        assert!(result.is_failure());
        assert!(!result.is_success());
        assert_eq!(result.extracted_document_id, extracted_doc_id);
        assert_eq!(result.word_count, 0);
        assert_eq!(result.character_count, 0);
        assert_eq!(result.error_message, Some(error_msg));
        assert!(!result.has_content());
        assert!(!result.has_substantial_content());
    }

    #[test]
    fn test_success_with_custom_timestamp() {
        let extracted_doc_id = "det_12345678-1234-1234-1234-123456789012".to_string();
        let custom_time = Utc::now() - Duration::hours(2);

        let result = SaveResultDto::success_with_timestamp(
            extracted_doc_id.clone(),
            custom_time,
            75,
            400,
        );

        assert!(result.is_success());
        assert_eq!(result.saved_at, custom_time);
        assert_eq!(result.word_count, 75);
        assert_eq!(result.character_count, 400);
    }

    #[test]
    fn test_failure_with_custom_timestamp() {
        let extracted_doc_id = "det_12345678-1234-1234-1234-123456789012".to_string();
        let custom_time = Utc::now() - Duration::minutes(30);
        let error_msg = "Invalid content format".to_string();

        let result = SaveResultDto::failure_with_timestamp(
            extracted_doc_id.clone(),
            custom_time,
            error_msg.clone(),
        );

        assert!(result.is_failure());
        assert_eq!(result.saved_at, custom_time);
        assert_eq!(result.get_error_message(), Some("Invalid content format"));
    }

    #[test]
    fn test_content_analysis() {
        // Substantial content
        let substantial_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            50,
            250,
        );

        assert!(substantial_result.has_content());
        assert!(substantial_result.has_substantial_content());
        assert_eq!(substantial_result.content_density(), 5.0); // 250 / 50 = 5.0
        assert_eq!(substantial_result.estimated_reading_time_minutes(), 1); // 50 / 200 = 0.25, rounded up to 1

        // Minimal content
        let minimal_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            5,
            25,
        );

        assert!(minimal_result.has_content());
        assert!(!minimal_result.has_substantial_content()); // Less than 10 words or 50 characters

        // Empty content
        let empty_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            0,
            0,
        );

        assert!(!empty_result.has_content());
        assert!(!empty_result.has_substantial_content());
        assert_eq!(empty_result.content_density(), 0.0);
    }

    #[test]
    fn test_content_size_human() {
        let single_word = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            1,
            10,
        );
        assert_eq!(single_word.content_size_human(), "1 word, 10 characters");

        let multiple_words = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            25,
            150,
        );
        assert_eq!(multiple_words.content_size_human(), "25 words, 150 characters");

        let empty = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            0,
            0,
        );
        assert_eq!(empty.content_size_human(), "Empty");

        let failure = SaveResultDto::failure(
            "det_12345678-1234-1234-1234-123456789015".to_string(),
            "Error".to_string(),
        );
        assert_eq!(failure.content_size_human(), "N/A");
    }

    #[test]
    fn test_file_size_estimation() {
        let result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            100,
            500,
        );

        let estimated_bytes = result.estimated_file_size_bytes();
        assert_eq!(estimated_bytes, 1250); // 500 * 2.5 = 1250

        let size_human = result.estimated_file_size_human();
        assert_eq!(size_human, "1250 B");

        // Test larger content
        let large_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            1000,
            50000,
        );

        let large_size_human = large_result.estimated_file_size_human();
        assert!(large_size_human.contains("KB"));

        // Test failure case
        let failure_result = SaveResultDto::failure(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            "Error".to_string(),
        );

        assert_eq!(failure_result.estimated_file_size_bytes(), 0);
        assert_eq!(failure_result.estimated_file_size_human(), "N/A");
    }

    #[test]
    fn test_time_since_save() {
        // Recent save
        let recent_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            50,
            250,
        );

        assert!(recent_result.is_recent_save());
        assert_eq!(recent_result.time_since_save_human(), "Just now");

        // Old save
        let old_time = Utc::now() - Duration::hours(2);
        let old_result = SaveResultDto::success_with_timestamp(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            old_time,
            50,
            250,
        );

        assert!(!old_result.is_recent_save());
        assert_eq!(old_result.time_since_save_human(), "2 hours ago");

        // Very old save
        let very_old_time = Utc::now() - Duration::days(3);
        let very_old_result = SaveResultDto::success_with_timestamp(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            very_old_time,
            50,
            250,
        );

        assert_eq!(very_old_result.time_since_save_human(), "3 days ago");
    }

    #[test]
    fn test_status_message() {
        // Successful save with substantial content
        let substantial_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            50,
            250,
        );
        assert_eq!(substantial_result.status_message(), "Saved successfully - 50 words, 250 characters");

        // Successful save with minimal content
        let minimal_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            5,
            25,
        );
        assert_eq!(minimal_result.status_message(), "Saved - 5 words, 25 characters");

        // Successful save with empty content
        let empty_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            0,
            0,
        );
        assert_eq!(empty_result.status_message(), "Saved (empty document)");

        // Failed save with error message
        let failed_result = SaveResultDto::failure(
            "det_12345678-1234-1234-1234-123456789015".to_string(),
            "File permission denied".to_string(),
        );
        assert_eq!(failed_result.status_message(), "Save failed: File permission denied");

        // Failed save without error message
        let mut failed_no_msg = SaveResultDto::failure(
            "det_12345678-1234-1234-1234-123456789016".to_string(),
            "Some error".to_string(),
        );
        failed_no_msg.error_message = None;
        assert_eq!(failed_no_msg.status_message(), "Save failed with unknown error");
    }

    #[test]
    fn test_get_summary() {
        let result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            100,
            500,
        );

        let summary = result.get_summary();

        assert!(summary.success);
        assert_eq!(summary.extracted_document_id, "det_12345678-1234-1234-1234-123456789012");
        assert!(summary.content_stats.is_some());
        assert!(summary.error_summary.is_none());

        let content_stats = summary.content_stats.unwrap();
        assert_eq!(content_stats.word_count, 100);
        assert_eq!(content_stats.character_count, 500);
        assert_eq!(content_stats.estimated_file_size_bytes, 1250);
        assert_eq!(content_stats.reading_time_minutes, 1);

        // Test failure summary
        let failed_result = SaveResultDto::failure(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            "Save error".to_string(),
        );

        let failed_summary = failed_result.get_summary();
        assert!(!failed_summary.success);
        assert!(failed_summary.content_stats.is_none());
        assert_eq!(failed_summary.error_summary, Some("Save error".to_string()));
    }

    #[test]
    fn test_edge_cases() {
        // Test with very large numbers
        let large_result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            1000000, // 1 million words
            5000000, // 5 million characters
        );

        assert!(large_result.has_substantial_content());
        assert_eq!(large_result.estimated_reading_time_minutes(), 5000); // 1M / 200 = 5000

        // Test content density edge case
        let high_density = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            10,
            1000, // Very long words on average
        );
        assert_eq!(high_density.content_density(), 100.0);

        // Test zero word count but non-zero character count (edge case)
        let zero_words = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789014".to_string(),
            0,
            100,
        );
        assert_eq!(zero_words.content_density(), 0.0);
        assert!(!zero_words.has_substantial_content()); // Need at least 10 words
    }

    #[test]
    fn test_serialization() {
        let result = SaveResultDto::success(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            100,
            500,
        );

        let serialized = serde_json::to_string(&result).unwrap();
        let deserialized: SaveResultDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(result, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("extractedDocumentId"));
        assert!(serialized.contains("savedAt"));
        assert!(serialized.contains("wordCount"));
        assert!(serialized.contains("characterCount"));
        assert!(serialized.contains("errorMessage"));

        // Test summary serialization
        let summary = result.get_summary();
        let summary_serialized = serde_json::to_string(&summary).unwrap();
        let summary_deserialized: SaveResultSummary = serde_json::from_str(&summary_serialized).unwrap();

        assert_eq!(summary.success, summary_deserialized.success);
        assert_eq!(summary.extracted_document_id, summary_deserialized.extracted_document_id);
    }
}