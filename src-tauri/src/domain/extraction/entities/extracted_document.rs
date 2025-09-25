use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::extraction::value_objects::{
    DocumentId, ExtractedDocumentId, ExtractionMethod, FilePath, ProseMirrorJson
};

/// ExtractedDocument entity - Represents processed .det files with TipTap/ProseMirror content
///
/// This entity represents the result of document extraction, containing the processed content
/// in ProseMirror JSON format that can be edited in the TipTap editor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExtractedDocument {
    /// Unique identifier for this extracted document
    extracted_document_id: ExtractedDocumentId,
    /// Reference to the original document
    original_document_id: DocumentId,
    /// Path to the .det file
    extracted_file_path: FilePath,
    /// Structured document content in ProseMirror format
    tiptap_content: ProseMirrorJson,
    /// Method used for extraction
    extraction_method: ExtractionMethod,
    /// When the extraction was completed
    extracted_at: DateTime<Utc>,
    /// First 200 characters for display purposes
    content_preview: String,
    /// Number of words in extracted content
    word_count: u32,
    /// Number of characters in extracted content
    character_count: u32,
}

impl ExtractedDocument {
    /// Creates a new ExtractedDocument from extraction results
    pub fn new(
        original_document_id: DocumentId,
        extracted_file_path: FilePath,
        tiptap_content: ProseMirrorJson,
        extraction_method: ExtractionMethod,
    ) -> Result<Self, ExtractedDocumentError> {
        // Validate ProseMirror content
        tiptap_content.validate()
            .map_err(|e| ExtractedDocumentError::InvalidContent(e.to_string()))?;

        // Generate content preview
        let content_preview = tiptap_content.preview(200);

        // Calculate word and character counts
        let word_count = tiptap_content.word_count();
        let character_count = tiptap_content.character_count();

        // Validate that content is not empty
        if word_count == 0 {
            return Err(ExtractedDocumentError::EmptyContent);
        }

        Ok(Self {
            extracted_document_id: ExtractedDocumentId::new(),
            original_document_id,
            extracted_file_path,
            tiptap_content,
            extraction_method,
            extracted_at: Utc::now(),
            content_preview,
            word_count,
            character_count,
        })
    }

    /// Creates ExtractedDocument with existing ID (for loading from storage)
    #[allow(clippy::too_many_arguments)]
    pub fn with_id(
        extracted_document_id: ExtractedDocumentId,
        original_document_id: DocumentId,
        extracted_file_path: FilePath,
        tiptap_content: ProseMirrorJson,
        extraction_method: ExtractionMethod,
        extracted_at: DateTime<Utc>,
        content_preview: String,
        word_count: u32,
        character_count: u32,
    ) -> Self {
        Self {
            extracted_document_id,
            original_document_id,
            extracted_file_path,
            tiptap_content,
            extraction_method,
            extracted_at,
            content_preview,
            word_count,
            character_count,
        }
    }

    // Getters
    pub fn extracted_document_id(&self) -> &ExtractedDocumentId {
        &self.extracted_document_id
    }

    pub fn original_document_id(&self) -> &DocumentId {
        &self.original_document_id
    }

    pub fn extracted_file_path(&self) -> &FilePath {
        &self.extracted_file_path
    }

    pub fn tiptap_content(&self) -> &ProseMirrorJson {
        &self.tiptap_content
    }

    pub fn extraction_method(&self) -> &ExtractionMethod {
        &self.extraction_method
    }

    pub fn extracted_at(&self) -> &DateTime<Utc> {
        &self.extracted_at
    }

    pub fn content_preview(&self) -> &str {
        &self.content_preview
    }

    pub fn word_count(&self) -> u32 {
        self.word_count
    }

    pub fn character_count(&self) -> u32 {
        self.character_count
    }

    /// Updates the TipTap content and recalculates derived fields
    pub fn update_content(&mut self, new_content: ProseMirrorJson) -> Result<(), ExtractedDocumentError> {
        // Validate new content
        new_content.validate()
            .map_err(|e| ExtractedDocumentError::InvalidContent(e.to_string()))?;

        // Validate that content is not empty
        if new_content.word_count() == 0 {
            return Err(ExtractedDocumentError::EmptyContent);
        }

        // Update content and derived fields
        self.tiptap_content = new_content;
        self.content_preview = self.tiptap_content.preview(200);
        self.word_count = self.tiptap_content.word_count();
        self.character_count = self.tiptap_content.character_count();

        Ok(())
    }

    /// Returns the full text content (plain text)
    pub fn extract_plain_text(&self) -> String {
        self.tiptap_content.extract_text()
    }

    /// Returns content statistics
    pub fn content_stats(&self) -> ExtractedDocumentStats {
        ExtractedDocumentStats {
            word_count: self.word_count,
            character_count: self.character_count,
            paragraph_count: self.count_nodes("paragraph"),
            heading_count: self.count_nodes("heading"),
            list_count: self.count_nodes("bulletList") + self.count_nodes("orderedList"),
        }
    }

    /// Checks if the extracted file exists on disk
    pub fn file_exists(&self) -> bool {
        self.extracted_file_path.exists()
    }

    /// Returns the age of the extraction (time since extracted)
    pub fn age(&self) -> chrono::Duration {
        Utc::now() - self.extracted_at
    }

    /// Checks if the extraction is recent (within last hour)
    pub fn is_recent(&self) -> bool {
        self.age() < chrono::Duration::hours(1)
    }

    /// Returns a summary for UI display
    pub fn summary(&self) -> ExtractedDocumentSummary {
        ExtractedDocumentSummary {
            extracted_document_id: self.extracted_document_id.clone(),
            content_preview: self.content_preview.clone(),
            extraction_method: self.extraction_method.clone(),
            extracted_at: self.extracted_at,
            stats: self.content_stats(),
            is_recent: self.is_recent(),
        }
    }

    /// Validates that the current content is still valid
    pub fn validate_content(&self) -> Result<(), ExtractedDocumentError> {
        self.tiptap_content.validate()
            .map_err(|e| ExtractedDocumentError::InvalidContent(e.to_string()))?;

        if self.word_count == 0 {
            return Err(ExtractedDocumentError::EmptyContent);
        }

        Ok(())
    }

    /// Counts occurrences of a specific node type in the document
    fn count_nodes(&self, node_type: &str) -> u32 {
        // This is a simplified implementation
        // In a real implementation, you'd traverse the ProseMirror JSON tree
        let content_str = self.tiptap_content.to_json_string().unwrap_or_default();
        content_str.matches(&format!("\"type\":\"{}\"", node_type)).count() as u32
    }
}

/// Statistics about the extracted document content
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExtractedDocumentStats {
    pub word_count: u32,
    pub character_count: u32,
    pub paragraph_count: u32,
    pub heading_count: u32,
    pub list_count: u32,
}

/// Summary information for UI display
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExtractedDocumentSummary {
    pub extracted_document_id: ExtractedDocumentId,
    pub content_preview: String,
    pub extraction_method: ExtractionMethod,
    pub extracted_at: DateTime<Utc>,
    pub stats: ExtractedDocumentStats,
    pub is_recent: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum ExtractedDocumentError {
    #[error("Invalid ProseMirror content: {0}")]
    InvalidContent(String),
    #[error("Content cannot be empty")]
    EmptyContent,
    #[error("File operation failed: {0}")]
    FileError(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use crate::domain::extraction::value_objects::DocumentId;

    #[test]
    fn test_new_extracted_document() {
        let original_id = DocumentId::new();
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/doc.pdf.det"));
        let content = ProseMirrorJson::new_document();
        let method = ExtractionMethod::PdfTextExtraction;

        // This will fail because document is empty
        let result = ExtractedDocument::new(original_id, file_path, content, method);
        assert!(matches!(result, Err(ExtractedDocumentError::EmptyContent)));
    }

    #[test]
    fn test_new_with_content() {
        let original_id = DocumentId::new();
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/doc.pdf.det"));
        let mut content = ProseMirrorJson::new_document();
        let para = ProseMirrorJson::new_paragraph(Some("Hello world".to_string()));
        content.add_content(para).unwrap();
        let method = ExtractionMethod::PdfTextExtraction;

        let doc = ExtractedDocument::new(original_id, file_path, content, method).unwrap();
        assert!(doc.word_count() > 0);
        assert!(doc.character_count() > 0);
        assert!(!doc.content_preview().is_empty());
    }

    #[test]
    fn test_update_content() {
        let mut doc = create_test_extracted_document();

        let mut new_content = ProseMirrorJson::new_document();
        let para = ProseMirrorJson::new_paragraph(Some("Updated content".to_string()));
        new_content.add_content(para).unwrap();

        let result = doc.update_content(new_content);
        assert!(result.is_ok());
        assert!(doc.content_preview().contains("Updated"));
    }

    #[test]
    fn test_content_stats() {
        let doc = create_test_extracted_document();
        let stats = doc.content_stats();
        assert!(stats.word_count > 0);
        assert!(stats.character_count > 0);
    }

    #[test]
    fn test_age_and_recent() {
        let doc = create_test_extracted_document();
        assert!(doc.age().num_seconds() >= 0);
        assert!(doc.is_recent()); // Just created
    }

    #[test]
    fn test_extract_plain_text() {
        let doc = create_test_extracted_document();
        let text = doc.extract_plain_text();
        assert!(text.contains("Hello world"));
    }

    #[test]
    fn test_summary() {
        let doc = create_test_extracted_document();
        let summary = doc.summary();
        assert_eq!(summary.extracted_document_id, *doc.extracted_document_id());
        assert!(summary.is_recent);
    }

    fn create_test_extracted_document() -> ExtractedDocument {
        let original_id = DocumentId::new();
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/doc.pdf.det"));
        let mut content = ProseMirrorJson::new_document();
        let para = ProseMirrorJson::new_paragraph(Some("Hello world".to_string()));
        content.add_content(para).unwrap();
        let method = ExtractionMethod::PdfTextExtraction;

        ExtractedDocument::new(original_id, file_path, content, method).unwrap()
    }
}