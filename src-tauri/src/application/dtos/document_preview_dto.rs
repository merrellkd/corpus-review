use serde::{Deserialize, Serialize};
use serde_json::{Value, Map};
use crate::application::dtos::original_document_dto::DocumentFileType;

/// DTO for document preview data for read-only viewing
///
/// This provides preview content and metadata for original documents
/// that can be displayed in read-only mode before or alongside extraction.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DocumentPreviewDto {
    /// Document identifier
    pub document_id: String,

    /// Name of the file
    pub file_name: String,

    /// Type of the document
    pub file_type: DocumentFileType,

    /// File size in bytes
    pub file_size_bytes: i64,

    /// HTML or text preview content for read-only viewing
    pub preview_content: String,

    /// Number of pages (for paginated documents like PDFs)
    pub page_count: Option<i32>,

    /// Additional metadata extracted from the document
    pub metadata: Map<String, Value>,
}

impl DocumentPreviewDto {
    /// Create a new DocumentPreviewDto
    pub fn new(
        document_id: String,
        file_name: String,
        file_type: DocumentFileType,
        file_size_bytes: i64,
        preview_content: String,
        page_count: Option<i32>,
        metadata: Map<String, Value>,
    ) -> Self {
        DocumentPreviewDto {
            document_id,
            file_name,
            file_type,
            file_size_bytes,
            preview_content,
            page_count,
            metadata,
        }
    }

    /// Create a DocumentPreviewDto with empty metadata
    pub fn new_simple(
        document_id: String,
        file_name: String,
        file_type: DocumentFileType,
        file_size_bytes: i64,
        preview_content: String,
        page_count: Option<i32>,
    ) -> Self {
        DocumentPreviewDto::new(
            document_id,
            file_name,
            file_type,
            file_size_bytes,
            preview_content,
            page_count,
            Map::new(),
        )
    }

    /// Check if the preview content is available
    pub fn has_preview_content(&self) -> bool {
        !self.preview_content.trim().is_empty()
    }

    /// Check if the document has pages (is paginated)
    pub fn is_paginated(&self) -> bool {
        self.page_count.is_some() && self.page_count.unwrap() > 0
    }

    /// Get the number of pages, defaulting to 1 for non-paginated documents
    pub fn page_count_or_default(&self) -> i32 {
        self.page_count.unwrap_or(1)
    }

    /// Check if the document has substantial content
    pub fn has_substantial_content(&self) -> bool {
        self.preview_content.len() > 100 // At least 100 characters
    }

    /// Get human-readable file size
    pub fn file_size_human(&self) -> String {
        let size = self.file_size_bytes as f64;
        if size < 1024.0 {
            format!("{} B", size)
        } else if size < 1024.0 * 1024.0 {
            format!("{:.1} KB", size / 1024.0)
        } else {
            format!("{:.1} MB", size / (1024.0 * 1024.0))
        }
    }

    /// Get a shortened preview with max length
    pub fn shortened_preview(&self, max_length: usize) -> String {
        if self.preview_content.len() <= max_length {
            self.preview_content.clone()
        } else {
            format!("{}...", &self.preview_content[..max_length])
        }
    }

    /// Get the preview content type (HTML, plain text, etc.)
    pub fn preview_content_type(&self) -> PreviewContentType {
        let content = self.preview_content.trim();
        if content.starts_with("<!DOCTYPE") || content.starts_with("<html") || content.contains("<p>") || content.contains("<div>") {
            PreviewContentType::Html
        } else if content.starts_with("# ") || content.contains("## ") || content.contains("**") || content.contains("*") {
            PreviewContentType::Markdown
        } else {
            PreviewContentType::PlainText
        }
    }

    /// Get metadata value by key
    pub fn get_metadata_string(&self, key: &str) -> Option<String> {
        self.metadata.get(key).and_then(|v| {
            match v {
                Value::String(s) => Some(s.clone()),
                Value::Number(n) => Some(n.to_string()),
                Value::Bool(b) => Some(b.to_string()),
                _ => None,
            }
        })
    }

    /// Get metadata value as integer
    pub fn get_metadata_int(&self, key: &str) -> Option<i64> {
        self.metadata.get(key).and_then(|v| {
            match v {
                Value::Number(n) => n.as_i64(),
                Value::String(s) => s.parse().ok(),
                _ => None,
            }
        })
    }

    /// Get metadata value as boolean
    pub fn get_metadata_bool(&self, key: &str) -> Option<bool> {
        self.metadata.get(key).and_then(|v| {
            match v {
                Value::Bool(b) => Some(*b),
                Value::String(s) => match s.to_lowercase().as_str() {
                    "true" | "1" | "yes" => Some(true),
                    "false" | "0" | "no" => Some(false),
                    _ => None,
                },
                _ => None,
            }
        })
    }

    /// Add or update metadata entry
    pub fn set_metadata(&mut self, key: String, value: Value) {
        self.metadata.insert(key, value);
    }

    /// Remove metadata entry
    pub fn remove_metadata(&mut self, key: &str) -> Option<Value> {
        self.metadata.remove(key)
    }

    /// Get all metadata keys
    pub fn metadata_keys(&self) -> Vec<&String> {
        self.metadata.keys().collect()
    }

    /// Check if document has specific metadata
    pub fn has_metadata(&self, key: &str) -> bool {
        self.metadata.contains_key(key)
    }

    /// Get common document metadata fields
    pub fn get_title(&self) -> Option<String> {
        self.get_metadata_string("title")
            .or_else(|| self.get_metadata_string("Title"))
            .or_else(|| self.get_metadata_string("dc:title"))
    }

    pub fn get_author(&self) -> Option<String> {
        self.get_metadata_string("author")
            .or_else(|| self.get_metadata_string("Author"))
            .or_else(|| self.get_metadata_string("dc:creator"))
            .or_else(|| self.get_metadata_string("Creator"))
    }

    pub fn get_subject(&self) -> Option<String> {
        self.get_metadata_string("subject")
            .or_else(|| self.get_metadata_string("Subject"))
            .or_else(|| self.get_metadata_string("dc:subject"))
    }

    pub fn get_creation_date(&self) -> Option<String> {
        self.get_metadata_string("creation_date")
            .or_else(|| self.get_metadata_string("CreationDate"))
            .or_else(|| self.get_metadata_string("created"))
    }

    pub fn get_modification_date(&self) -> Option<String> {
        self.get_metadata_string("modification_date")
            .or_else(|| self.get_metadata_string("ModDate"))
            .or_else(|| self.get_metadata_string("modified"))
    }

    /// Get estimated reading time based on preview content
    pub fn estimated_reading_time_minutes(&self) -> i32 {
        const AVERAGE_WORDS_PER_MINUTE: i32 = 200;
        let word_count = self.estimate_word_count();
        std::cmp::max(1, (word_count as f64 / AVERAGE_WORDS_PER_MINUTE as f64).ceil() as i32)
    }

    /// Estimate word count from preview content
    fn estimate_word_count(&self) -> i32 {
        let text = if self.preview_content_type() == PreviewContentType::Html {
            // Strip HTML tags for word counting
            strip_html_tags(&self.preview_content)
        } else {
            self.preview_content.clone()
        };

        text.split_whitespace().count() as i32
    }

    /// Get a summary of the document for display
    pub fn get_summary(&self) -> DocumentSummary {
        DocumentSummary {
            title: self.get_title().unwrap_or_else(|| self.file_name.clone()),
            author: self.get_author(),
            file_type: self.file_type.clone(),
            page_count: self.page_count,
            file_size: self.file_size_human(),
            word_count_estimate: self.estimate_word_count(),
            reading_time_minutes: self.estimated_reading_time_minutes(),
            has_preview: self.has_preview_content(),
        }
    }
}

/// Preview content type enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum PreviewContentType {
    Html,
    Markdown,
    PlainText,
}

/// Document summary for quick display
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DocumentSummary {
    pub title: String,
    pub author: Option<String>,
    pub file_type: DocumentFileType,
    pub page_count: Option<i32>,
    pub file_size: String,
    pub word_count_estimate: i32,
    pub reading_time_minutes: i32,
    pub has_preview: bool,
}

/// Helper function to strip HTML tags from content
fn strip_html_tags(html: &str) -> String {
    let mut result = String::new();
    let mut in_tag = false;

    for c in html.chars() {
        match c {
            '<' => in_tag = true,
            '>' => {
                in_tag = false;
                result.push(' '); // Replace tag with space
            }
            _ if !in_tag => result.push(c),
            _ => {} // Skip characters inside tags
        }
    }

    // Clean up multiple spaces
    result.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn create_test_metadata() -> Map<String, Value> {
        let mut metadata = Map::new();
        metadata.insert("title".to_string(), json!("Test Document"));
        metadata.insert("author".to_string(), json!("Test Author"));
        metadata.insert("subject".to_string(), json!("Test Subject"));
        metadata.insert("page_count".to_string(), json!(10));
        metadata.insert("creation_date".to_string(), json!("2024-01-01"));
        metadata
    }

    #[test]
    fn test_document_preview_dto_creation() {
        let metadata = create_test_metadata();
        let preview_content = "<html><body><h1>Test Document</h1><p>This is a test document with sample content.</p></body></html>".to_string();

        let dto = DocumentPreviewDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.pdf".to_string(),
            DocumentFileType::Pdf,
            1024 * 1024, // 1MB
            preview_content.clone(),
            Some(5),
            metadata.clone(),
        );

        assert_eq!(dto.document_id, "doc_12345678-1234-1234-1234-123456789012");
        assert_eq!(dto.file_name, "test.pdf");
        assert_eq!(dto.file_type, DocumentFileType::Pdf);
        assert_eq!(dto.file_size_bytes, 1024 * 1024);
        assert_eq!(dto.preview_content, preview_content);
        assert_eq!(dto.page_count, Some(5));
        assert_eq!(dto.metadata, metadata);

        assert!(dto.has_preview_content());
        assert!(dto.is_paginated());
        assert_eq!(dto.page_count_or_default(), 5);
        assert!(dto.has_substantial_content());
    }

    #[test]
    fn test_new_simple() {
        let dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "simple.md".to_string(),
            DocumentFileType::Markdown,
            2048,
            "# Simple Document\n\nThis is a simple markdown document.".to_string(),
            None,
        );

        assert_eq!(dto.metadata.len(), 0);
        assert!(!dto.is_paginated());
        assert_eq!(dto.page_count_or_default(), 1);
    }

    #[test]
    fn test_file_size_human() {
        let dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.pdf".to_string(),
            DocumentFileType::Pdf,
            512,
            "Small content".to_string(),
            None,
        );
        assert_eq!(dto.file_size_human(), "512 B");

        let kb_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "test2.pdf".to_string(),
            DocumentFileType::Pdf,
            2048,
            "KB content".to_string(),
            None,
        );
        assert_eq!(kb_dto.file_size_human(), "2.0 KB");

        let mb_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789014".to_string(),
            "test3.pdf".to_string(),
            DocumentFileType::Pdf,
            2 * 1024 * 1024,
            "MB content".to_string(),
            None,
        );
        assert_eq!(mb_dto.file_size_human(), "2.0 MB");
    }

    #[test]
    fn test_shortened_preview() {
        let long_content = "This is a very long piece of content that should be truncated when requested to show only a portion of the full text.".to_string();

        let dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "long.txt".to_string(),
            DocumentFileType::Markdown,
            1024,
            long_content.clone(),
            None,
        );

        let short = dto.shortened_preview(20);
        assert_eq!(short, "This is a very long ...");

        let full = dto.shortened_preview(200);
        assert_eq!(full, long_content);
    }

    #[test]
    fn test_preview_content_type() {
        // HTML content
        let html_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "html.pdf".to_string(),
            DocumentFileType::Pdf,
            1024,
            "<html><body><p>HTML content</p></body></html>".to_string(),
            None,
        );
        assert_eq!(html_dto.preview_content_type(), PreviewContentType::Html);

        // Markdown content
        let md_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "markdown.md".to_string(),
            DocumentFileType::Markdown,
            1024,
            "# Title\n\nThis is **bold** text with *italics*.".to_string(),
            None,
        );
        assert_eq!(md_dto.preview_content_type(), PreviewContentType::Markdown);

        // Plain text content
        let text_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789014".to_string(),
            "plain.txt".to_string(),
            DocumentFileType::Markdown,
            1024,
            "This is plain text content without any markup.".to_string(),
            None,
        );
        assert_eq!(text_dto.preview_content_type(), PreviewContentType::PlainText);
    }

    #[test]
    fn test_metadata_operations() {
        let mut dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.pdf".to_string(),
            DocumentFileType::Pdf,
            1024,
            "Content".to_string(),
            None,
        );

        // Add metadata
        dto.set_metadata("title".to_string(), json!("Test Title"));
        dto.set_metadata("pages".to_string(), json!(42));
        dto.set_metadata("published".to_string(), json!(true));

        assert!(dto.has_metadata("title"));
        assert_eq!(dto.get_metadata_string("title"), Some("Test Title".to_string()));
        assert_eq!(dto.get_metadata_int("pages"), Some(42));
        assert_eq!(dto.get_metadata_bool("published"), Some(true));

        // Test metadata keys
        let keys = dto.metadata_keys();
        assert_eq!(keys.len(), 3);
        assert!(keys.contains(&&"title".to_string()));
        assert!(keys.contains(&&"pages".to_string()));
        assert!(keys.contains(&&"published".to_string()));

        // Remove metadata
        let removed = dto.remove_metadata("pages");
        assert!(removed.is_some());
        assert!(!dto.has_metadata("pages"));
        assert_eq!(dto.metadata_keys().len(), 2);
    }

    #[test]
    fn test_common_metadata_getters() {
        let mut metadata = Map::new();
        metadata.insert("Title".to_string(), json!("Document Title"));
        metadata.insert("Author".to_string(), json!("John Doe"));
        metadata.insert("Subject".to_string(), json!("Test Subject"));
        metadata.insert("CreationDate".to_string(), json!("2024-01-01T00:00:00Z"));
        metadata.insert("ModDate".to_string(), json!("2024-01-02T12:00:00Z"));

        let dto = DocumentPreviewDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.pdf".to_string(),
            DocumentFileType::Pdf,
            1024,
            "Content".to_string(),
            Some(10),
            metadata,
        );

        assert_eq!(dto.get_title(), Some("Document Title".to_string()));
        assert_eq!(dto.get_author(), Some("John Doe".to_string()));
        assert_eq!(dto.get_subject(), Some("Test Subject".to_string()));
        assert_eq!(dto.get_creation_date(), Some("2024-01-01T00:00:00Z".to_string()));
        assert_eq!(dto.get_modification_date(), Some("2024-01-02T12:00:00Z".to_string()));
    }

    #[test]
    fn test_word_count_and_reading_time() {
        // HTML content
        let html_content = "<html><body><h1>Title</h1><p>This is a test document with multiple words for counting purposes.</p><p>Second paragraph with more words.</p></body></html>";

        let dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.html".to_string(),
            DocumentFileType::Pdf,
            1024,
            html_content.to_string(),
            None,
        );

        let word_count = dto.estimate_word_count();
        assert!(word_count > 10); // Should count words from stripped HTML

        let reading_time = dto.estimated_reading_time_minutes();
        assert_eq!(reading_time, 1); // Should be at least 1 minute

        // Test with longer content
        let long_content = "word ".repeat(500); // 500 words
        let long_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "long.txt".to_string(),
            DocumentFileType::Markdown,
            1024,
            long_content,
            None,
        );

        assert_eq!(long_dto.estimate_word_count(), 500);
        assert_eq!(long_dto.estimated_reading_time_minutes(), 3); // 500/200 = 2.5, rounded up to 3
    }

    #[test]
    fn test_document_summary() {
        let metadata = create_test_metadata();

        let dto = DocumentPreviewDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test-document.pdf".to_string(),
            DocumentFileType::Pdf,
            2 * 1024 * 1024, // 2MB
            "<html><body><h1>Test Document</h1><p>This is a comprehensive test document with substantial content for testing purposes. It contains multiple paragraphs and should provide good test coverage.</p></body></html>".to_string(),
            Some(15),
            metadata,
        );

        let summary = dto.get_summary();

        assert_eq!(summary.title, "Test Document"); // From metadata, not filename
        assert_eq!(summary.author, Some("Test Author".to_string()));
        assert_eq!(summary.file_type, DocumentFileType::Pdf);
        assert_eq!(summary.page_count, Some(15));
        assert_eq!(summary.file_size, "2.0 MB");
        assert!(summary.word_count_estimate > 0);
        assert!(summary.reading_time_minutes >= 1);
        assert!(summary.has_preview);
    }

    #[test]
    fn test_strip_html_tags() {
        let html = "<html><body><h1>Title</h1><p>This is <strong>bold</strong> and <em>italic</em> text.</p></body></html>";
        let stripped = strip_html_tags(html);

        assert_eq!(stripped, "Title This is bold and italic text.");
        assert!(!stripped.contains('<'));
        assert!(!stripped.contains('>'));
    }

    #[test]
    fn test_edge_cases() {
        // Empty content
        let empty_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "empty.txt".to_string(),
            DocumentFileType::Markdown,
            0,
            "".to_string(),
            None,
        );

        assert!(!empty_dto.has_preview_content());
        assert!(!empty_dto.has_substantial_content());
        assert_eq!(empty_dto.estimate_word_count(), 0);
        assert_eq!(empty_dto.estimated_reading_time_minutes(), 1); // Minimum 1 minute

        // Whitespace only content
        let whitespace_dto = DocumentPreviewDto::new_simple(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "whitespace.txt".to_string(),
            DocumentFileType::Markdown,
            50,
            "   \n\t  \n   ".to_string(),
            None,
        );

        assert!(!whitespace_dto.has_preview_content());
        assert!(!whitespace_dto.has_substantial_content());
    }

    #[test]
    fn test_serialization() {
        let metadata = create_test_metadata();

        let dto = DocumentPreviewDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "test.pdf".to_string(),
            DocumentFileType::Pdf,
            1024 * 1024,
            "<html><body>Test content</body></html>".to_string(),
            Some(10),
            metadata,
        );

        let serialized = serde_json::to_string(&dto).unwrap();
        let deserialized: DocumentPreviewDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(dto, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("documentId"));
        assert!(serialized.contains("fileName"));
        assert!(serialized.contains("fileType"));
        assert!(serialized.contains("fileSizeBytes"));
        assert!(serialized.contains("previewContent"));
        assert!(serialized.contains("pageCount"));
        assert!(serialized.contains("metadata"));
    }
}