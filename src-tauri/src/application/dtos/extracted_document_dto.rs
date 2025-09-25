use serde::{Deserialize, Serialize};
use serde_json::Value;
use chrono::{DateTime, Utc};
use crate::application::dtos::extraction_status_dto::ExtractionMethod;

/// DTO for extracted document content and metadata
///
/// This represents a successfully extracted document with its TipTap/ProseMirror
/// content and associated metadata for editing and analysis.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedDocumentDto {
    /// Unique identifier for the extracted document with det_ prefix
    pub extracted_document_id: String,

    /// Reference to the original document
    pub original_document_id: String,

    /// Path to the .det file containing the extracted content
    pub extracted_file_path: String,

    /// TipTap/ProseMirror JSON structure for editing
    pub tiptap_content: Value,

    /// Method used for extraction
    pub extraction_method: String,

    /// When the extraction was completed
    pub extracted_at: DateTime<Utc>,

    /// Plain text preview of content (first 500 chars)
    pub content_preview: String,

    /// Word count of the extracted content
    pub word_count: i32,

    /// Character count of the extracted content
    pub character_count: i32,
}

impl ExtractedDocumentDto {
    /// Create a new ExtractedDocumentDto
    pub fn new(
        extracted_document_id: String,
        original_document_id: String,
        extracted_file_path: String,
        tiptap_content: Value,
        extraction_method: ExtractionMethod,
        extracted_at: DateTime<Utc>,
        content_preview: String,
        word_count: i32,
        character_count: i32,
    ) -> Self {
        ExtractedDocumentDto {
            extracted_document_id,
            original_document_id,
            extracted_file_path,
            tiptap_content,
            extraction_method: extraction_method.to_string(),
            extracted_at,
            content_preview,
            word_count,
            character_count,
        }
    }

    /// Check if the content appears to be valid TipTap/ProseMirror JSON
    pub fn is_valid_tiptap_content(&self) -> bool {
        if let Value::Object(obj) = &self.tiptap_content {
            // Basic validation: should have type and content fields
            obj.contains_key("type") && obj.contains_key("content")
        } else {
            false
        }
    }

    /// Get the document type from TipTap content
    pub fn document_type(&self) -> Option<String> {
        self.tiptap_content
            .get("type")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    /// Get the content nodes count
    pub fn content_nodes_count(&self) -> usize {
        self.tiptap_content
            .get("content")
            .and_then(|v| v.as_array())
            .map(|arr| arr.len())
            .unwrap_or(0)
    }

    /// Check if the content is empty
    pub fn is_content_empty(&self) -> bool {
        self.word_count == 0 || self.character_count == 0
    }

    /// Get reading time estimate in minutes
    pub fn estimated_reading_time_minutes(&self) -> i32 {
        const AVERAGE_WORDS_PER_MINUTE: i32 = 200;
        std::cmp::max(1, (self.word_count as f64 / AVERAGE_WORDS_PER_MINUTE as f64).ceil() as i32)
    }

    /// Get content density (characters per word)
    pub fn content_density(&self) -> f64 {
        if self.word_count > 0 {
            self.character_count as f64 / self.word_count as f64
        } else {
            0.0
        }
    }

    /// Get the file extension for the extracted document
    pub fn file_extension(&self) -> &'static str {
        ".det"
    }

    /// Get a shortened preview with max length
    pub fn shortened_preview(&self, max_length: usize) -> String {
        if self.content_preview.len() <= max_length {
            self.content_preview.clone()
        } else {
            format!("{}...", &self.content_preview[..max_length])
        }
    }

    /// Check if the extracted content is substantial
    pub fn is_substantial_content(&self) -> bool {
        const MIN_WORDS: i32 = 10;
        const MIN_CHARS: i32 = 50;
        self.word_count >= MIN_WORDS && self.character_count >= MIN_CHARS
    }

    /// Get content quality score (0.0 to 1.0)
    pub fn content_quality_score(&self) -> f64 {
        let mut score = 0.0;

        // Word count score (0.3 weight)
        if self.word_count >= 100 {
            score += 0.3;
        } else if self.word_count >= 10 {
            score += 0.3 * (self.word_count as f64 / 100.0);
        }

        // Valid TipTap structure (0.3 weight)
        if self.is_valid_tiptap_content() {
            score += 0.3;
        }

        // Content nodes diversity (0.2 weight)
        let nodes_count = self.content_nodes_count();
        if nodes_count >= 5 {
            score += 0.2;
        } else if nodes_count > 0 {
            score += 0.2 * (nodes_count as f64 / 5.0);
        }

        // Content preview quality (0.2 weight)
        if !self.content_preview.is_empty() {
            let preview_score = std::cmp::min(self.content_preview.len(), 200) as f64 / 200.0;
            score += 0.2 * preview_score;
        }

        score.min(1.0)
    }

    /// Update the TipTap content and recalculate stats
    pub fn update_content(&mut self, new_tiptap_content: Value, new_preview: String, new_word_count: i32, new_character_count: i32) {
        self.tiptap_content = new_tiptap_content;
        self.content_preview = new_preview;
        self.word_count = new_word_count;
        self.character_count = new_character_count;
    }

    /// Get human-readable file size estimate (rough)
    pub fn estimated_file_size_human(&self) -> String {
        // Rough estimate: TipTap JSON is typically 2-3x the character count
        let estimated_bytes = self.character_count as f64 * 2.5;

        if estimated_bytes < 1024.0 {
            format!("{:.0} B", estimated_bytes)
        } else if estimated_bytes < 1024.0 * 1024.0 {
            format!("{:.1} KB", estimated_bytes / 1024.0)
        } else {
            format!("{:.1} MB", estimated_bytes / (1024.0 * 1024.0))
        }
    }

    /// Extract plain text from TipTap content (simple extraction)
    pub fn extract_plain_text(&self) -> String {
        extract_text_from_value(&self.tiptap_content)
    }

    /// Get the extraction method as an enum if possible
    pub fn extraction_method_enum(&self) -> Option<ExtractionMethod> {
        match self.extraction_method.as_str() {
            "PdfTextExtraction" => Some(ExtractionMethod::PdfTextExtraction),
            "PdfOcrExtraction" => Some(ExtractionMethod::PdfOcrExtraction),
            "DocxStructureExtraction" => Some(ExtractionMethod::DocxStructureExtraction),
            "MarkdownConversion" => Some(ExtractionMethod::MarkdownConversion),
            _ => None,
        }
    }

    /// Check if the document was extracted recently (within last 24 hours)
    pub fn is_recently_extracted(&self) -> bool {
        let now = Utc::now();
        let hours_ago_24 = now - chrono::Duration::hours(24);
        self.extracted_at > hours_ago_24
    }

    /// Get age of extraction in human-readable format
    pub fn extraction_age_human(&self) -> String {
        let now = Utc::now();
        let duration = now - self.extracted_at;

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
}

/// Helper function to extract plain text from TipTap/ProseMirror JSON
fn extract_text_from_value(value: &Value) -> String {
    match value {
        Value::Object(obj) => {
            let mut text = String::new();

            // Extract text content if present
            if let Some(text_value) = obj.get("text") {
                if let Some(text_str) = text_value.as_str() {
                    text.push_str(text_str);
                }
            }

            // Recursively extract from content array
            if let Some(content_array) = obj.get("content") {
                if let Some(array) = content_array.as_array() {
                    for item in array {
                        let child_text = extract_text_from_value(item);
                        if !child_text.is_empty() {
                            if !text.is_empty() {
                                text.push(' ');
                            }
                            text.push_str(&child_text);
                        }
                    }
                }
            }

            text
        },
        Value::Array(arr) => {
            let mut text = String::new();
            for item in arr {
                let child_text = extract_text_from_value(item);
                if !child_text.is_empty() {
                    if !text.is_empty() {
                        text.push(' ');
                    }
                    text.push_str(&child_text);
                }
            }
            text
        },
        Value::String(s) => s.clone(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use chrono::{Duration, Utc};

    fn create_test_tiptap_content() -> Value {
        json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "This is a sample document with some content."
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "It has multiple paragraphs and provides good test coverage."
                        }
                    ]
                }
            ]
        })
    }

    #[test]
    fn test_extracted_document_dto_creation() {
        let tiptap_content = create_test_tiptap_content();
        let extracted_at = Utc::now();

        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            tiptap_content.clone(),
            ExtractionMethod::PdfTextExtraction,
            extracted_at,
            "This is a sample document with some content.".to_string(),
            15,
            95,
        );

        assert_eq!(dto.extracted_document_id, "det_12345678-1234-1234-1234-123456789012");
        assert_eq!(dto.original_document_id, "doc_12345678-1234-1234-1234-123456789012");
        assert_eq!(dto.tiptap_content, tiptap_content);
        assert_eq!(dto.extraction_method, "PDF Text Extraction");
        assert_eq!(dto.word_count, 15);
        assert_eq!(dto.character_count, 95);
        assert!(dto.is_valid_tiptap_content());
        assert!(dto.is_substantial_content());
    }

    #[test]
    fn test_content_validation() {
        let valid_content = create_test_tiptap_content();
        let invalid_content = json!({"invalid": "structure"});

        let valid_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            valid_content,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Sample content".to_string(),
            10,
            50,
        );

        let invalid_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/invalid.det".to_string(),
            invalid_content,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Sample content".to_string(),
            10,
            50,
        );

        assert!(valid_dto.is_valid_tiptap_content());
        assert!(!invalid_dto.is_valid_tiptap_content());

        assert_eq!(valid_dto.document_type(), Some("doc".to_string()));
        assert_eq!(valid_dto.content_nodes_count(), 2);
        assert_eq!(invalid_dto.content_nodes_count(), 0);
    }

    #[test]
    fn test_content_analysis() {
        let tiptap_content = create_test_tiptap_content();

        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            tiptap_content,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "This is a sample document with some content. It has multiple paragraphs.".to_string(),
            15,
            95,
        );

        assert!(!dto.is_content_empty());
        assert_eq!(dto.estimated_reading_time_minutes(), 1); // 15 words ÷ 200 wpm, minimum 1

        let density = dto.content_density();
        assert!((density - 6.33).abs() < 0.1); // 95 chars ÷ 15 words ≈ 6.33

        assert!(dto.is_substantial_content());

        let quality = dto.content_quality_score();
        assert!(quality > 0.5); // Should be decent quality
    }

    #[test]
    fn test_content_extraction_edge_cases() {
        // Empty content
        let empty_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/empty.det".to_string(),
            json!({"type": "doc", "content": []}),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "".to_string(),
            0,
            0,
        );

        assert!(empty_dto.is_content_empty());
        assert!(!empty_dto.is_substantial_content());
        assert_eq!(empty_dto.estimated_reading_time_minutes(), 1); // Minimum is 1

        // Large content
        let large_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/large.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Large document content preview".to_string(),
            1500,
            8000,
        );

        assert_eq!(large_dto.estimated_reading_time_minutes(), 8); // 1500 ÷ 200 = 7.5, rounded up
    }

    #[test]
    fn test_shortened_preview() {
        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "This is a very long preview that should be truncated when requested to show only a portion".to_string(),
            15,
            95,
        );

        let short = dto.shortened_preview(20);
        assert_eq!(short, "This is a very long ...");

        let full = dto.shortened_preview(200);
        assert_eq!(full, dto.content_preview); // Should return full content
    }

    #[test]
    fn test_update_content() {
        let original_content = create_test_tiptap_content();
        let mut dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            original_content,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Original preview".to_string(),
            10,
            50,
        );

        let new_content = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Updated content with more text."
                        }
                    ]
                }
            ]
        });

        dto.update_content(
            new_content.clone(),
            "Updated preview".to_string(),
            20,
            120,
        );

        assert_eq!(dto.tiptap_content, new_content);
        assert_eq!(dto.content_preview, "Updated preview");
        assert_eq!(dto.word_count, 20);
        assert_eq!(dto.character_count, 120);
    }

    #[test]
    fn test_extraction_method_parsing() {
        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::DocxStructureExtraction,
            Utc::now(),
            "Sample content".to_string(),
            10,
            50,
        );

        assert_eq!(dto.extraction_method, "DOCX Structure Extraction");
        assert_eq!(dto.extraction_method_enum(), Some(ExtractionMethod::DocxStructureExtraction));

        // Test with unknown method
        let mut unknown_dto = dto.clone();
        unknown_dto.extraction_method = "UnknownMethod".to_string();
        assert_eq!(unknown_dto.extraction_method_enum(), None);
    }

    #[test]
    fn test_extraction_age() {
        // Recent extraction
        let recent_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/recent.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::minutes(30),
            "Recent content".to_string(),
            10,
            50,
        );

        assert!(recent_dto.is_recently_extracted());
        assert!(recent_dto.extraction_age_human().contains("minutes ago"));

        // Old extraction
        let old_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/old.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now() - Duration::days(2),
            "Old content".to_string(),
            10,
            50,
        );

        assert!(!old_dto.is_recently_extracted());
        assert!(old_dto.extraction_age_human().contains("days ago"));
    }

    #[test]
    fn test_plain_text_extraction() {
        let complex_content = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "First paragraph with "
                        },
                        {
                            "type": "text",
                            "text": "bold text",
                            "marks": [{"type": "strong"}]
                        },
                        {
                            "type": "text",
                            "text": " and normal text."
                        }
                    ]
                },
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Second paragraph."
                        }
                    ]
                }
            ]
        });

        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/complex.det".to_string(),
            complex_content,
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Sample preview".to_string(),
            20,
            120,
        );

        let plain_text = dto.extract_plain_text();
        assert!(plain_text.contains("First paragraph"));
        assert!(plain_text.contains("bold text"));
        assert!(plain_text.contains("Second paragraph"));
    }

    #[test]
    fn test_file_size_estimation() {
        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Sample content".to_string(),
            100,
            500,
        );

        let size = dto.estimated_file_size_human();
        assert!(size.contains("KB") || size.contains("B"));

        // Test larger document
        let large_dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789013".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/large.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Large content".to_string(),
            5000,
            500_000,
        );

        let large_size = large_dto.estimated_file_size_human();
        assert!(large_size.contains("MB"));
    }

    #[test]
    fn test_serialization() {
        let dto = ExtractedDocumentDto::new(
            "det_12345678-1234-1234-1234-123456789012".to_string(),
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.det".to_string(),
            create_test_tiptap_content(),
            ExtractionMethod::PdfTextExtraction,
            Utc::now(),
            "Sample content preview".to_string(),
            15,
            95,
        );

        let serialized = serde_json::to_string(&dto).unwrap();
        let deserialized: ExtractedDocumentDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(dto, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("extractedDocumentId"));
        assert!(serialized.contains("originalDocumentId"));
        assert!(serialized.contains("extractedFilePath"));
        assert!(serialized.contains("tiptapContent"));
        assert!(serialized.contains("extractionMethod"));
        assert!(serialized.contains("extractedAt"));
        assert!(serialized.contains("contentPreview"));
        assert!(serialized.contains("wordCount"));
        assert!(serialized.contains("characterCount"));
    }
}