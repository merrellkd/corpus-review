use async_trait::async_trait;
use chrono::{DateTime, Utc};
use std::result::Result;

use crate::domain::extraction::{
    entities::ExtractedDocument,
    value_objects::{DocumentId, ExtractedDocumentId, ExtractionMethod, ProseMirrorJson, ProjectId}
};

/// Repository trait for ExtractedDocument entities
///
/// This trait defines the contract for persistence operations on ExtractedDocument entities,
/// which contain the processed content from document extractions.
#[async_trait]
pub trait ExtractedDocumentRepository: Send + Sync {
    /// Error type for repository operations
    type Error: std::error::Error + Send + Sync;

    /// Finds an extracted document by its unique ID
    async fn find_by_id(&self, id: &ExtractedDocumentId) -> Result<Option<ExtractedDocument>, Self::Error>;

    /// Finds the extracted document for a specific original document
    async fn find_by_original(&self, original_id: &DocumentId) -> Result<Option<ExtractedDocument>, Self::Error>;

    /// Finds all extracted documents within a project
    async fn find_by_project(&self, project_id: &ProjectId) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Finds extracted documents by extraction method
    async fn find_by_method(&self, method: &ExtractionMethod) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Finds extracted documents created within a time range
    async fn find_extracted_between(
        &self,
        start: &DateTime<Utc>,
        end: &DateTime<Utc>,
    ) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Finds extracted documents by word count range
    async fn find_by_word_count_range(
        &self,
        project_id: &ProjectId,
        min_words: u32,
        max_words: u32,
    ) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Finds recently extracted documents (within last N hours)
    async fn find_recent(&self, project_id: &ProjectId, hours: u32) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Searches extracted documents by content
    async fn search_by_content(
        &self,
        project_id: &ProjectId,
        query: &str,
    ) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Finds documents with similar content (based on preview)
    async fn find_similar_content(
        &self,
        extracted_document_id: &ExtractedDocumentId,
        similarity_threshold: f32,
    ) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Saves or updates an extracted document
    async fn save(&self, document: &ExtractedDocument) -> Result<(), Self::Error>;

    /// Updates only the TipTap content of an extracted document
    async fn update_content(
        &self,
        id: &ExtractedDocumentId,
        content: &ProseMirrorJson,
    ) -> Result<(), Self::Error>;

    /// Updates content with recalculated metadata
    async fn update_content_with_metadata(
        &self,
        id: &ExtractedDocumentId,
        content: &ProseMirrorJson,
        preview: String,
        word_count: u32,
        character_count: u32,
    ) -> Result<(), Self::Error>;

    /// Deletes an extracted document by ID
    async fn delete(&self, id: &ExtractedDocumentId) -> Result<bool, Self::Error>;

    /// Deletes extracted document by original document ID
    async fn delete_by_original(&self, original_id: &DocumentId) -> Result<bool, Self::Error>;

    /// Deletes all extracted documents for a project
    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error>;

    /// Deletes old extracted documents (cleanup)
    async fn delete_old(&self, older_than: &DateTime<Utc>) -> Result<usize, Self::Error>;

    /// Checks if an extracted document exists by ID
    async fn exists(&self, id: &ExtractedDocumentId) -> Result<bool, Self::Error>;

    /// Checks if there's an extracted version for an original document
    async fn exists_for_original(&self, original_id: &DocumentId) -> Result<bool, Self::Error>;

    /// Counts extracted documents in a project
    async fn count_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error>;

    /// Counts extracted documents by extraction method
    async fn count_by_method(&self, method: &ExtractionMethod) -> Result<usize, Self::Error>;

    /// Gets total word count across all extracted documents in a project
    async fn total_word_count(&self, project_id: &ProjectId) -> Result<u64, Self::Error>;

    /// Gets statistics about extracted documents
    async fn get_statistics(&self, project_id: &ProjectId) -> Result<ExtractedDocumentStatistics, Self::Error>;

    /// Lists extracted documents with pagination
    async fn list_paginated(
        &self,
        project_id: &ProjectId,
        offset: usize,
        limit: usize,
        sort_by: ExtractedDocumentSortBy,
        sort_order: SortOrder,
    ) -> Result<ExtractedDocumentPage, Self::Error>;

    /// Searches extracted documents by various criteria
    async fn search(&self, criteria: &ExtractedDocumentSearchCriteria) -> Result<Vec<ExtractedDocument>, Self::Error>;

    /// Exports extracted document content in various formats
    async fn export_content(
        &self,
        id: &ExtractedDocumentId,
        format: &ExportFormat,
    ) -> Result<String, Self::Error>;

    /// Batch operations for extracted documents
    async fn save_batch(&self, documents: &[ExtractedDocument]) -> Result<(), Self::Error>;

    /// Gets content history for an extracted document (if versioning is implemented)
    async fn get_content_history(&self, id: &ExtractedDocumentId) -> Result<Vec<ContentVersion>, Self::Error>;

    /// Creates a backup of extracted document content
    async fn backup_content(&self, id: &ExtractedDocumentId) -> Result<String, Self::Error>;

    /// Restores extracted document content from backup
    async fn restore_content(&self, id: &ExtractedDocumentId, backup_data: &str) -> Result<(), Self::Error>;
}

/// Statistics about extracted documents
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedDocumentStatistics {
    pub total_documents: usize,
    pub total_word_count: u64,
    pub total_character_count: u64,
    pub average_word_count: f64,
    pub average_character_count: f64,
    pub method_distribution: std::collections::HashMap<ExtractionMethod, usize>,
    pub recent_extractions_24h: usize,
    pub recent_extractions_7d: usize,
    pub largest_document: Option<ExtractedDocumentSummary>,
    pub smallest_document: Option<ExtractedDocumentSummary>,
}

/// Summary information about an extracted document
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedDocumentSummary {
    pub extracted_document_id: ExtractedDocumentId,
    pub original_document_id: DocumentId,
    pub word_count: u32,
    pub character_count: u32,
    pub extraction_method: ExtractionMethod,
    pub extracted_at: DateTime<Utc>,
    pub content_preview: String,
}

/// Paginated result for extracted document listing
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedDocumentPage {
    pub documents: Vec<ExtractedDocument>,
    pub total_count: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

/// Search criteria for extracted document queries
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractedDocumentSearchCriteria {
    pub project_id: Option<ProjectId>,
    pub original_document_id: Option<DocumentId>,
    pub extraction_methods: Option<Vec<ExtractionMethod>>,
    pub content_query: Option<String>,
    pub min_word_count: Option<u32>,
    pub max_word_count: Option<u32>,
    pub extracted_after: Option<DateTime<Utc>>,
    pub extracted_before: Option<DateTime<Utc>>,
    pub sort_by: ExtractedDocumentSortBy,
    pub sort_order: SortOrder,
    pub limit: Option<usize>,
}

/// Sort options for extracted document queries
#[derive(Debug, Clone, PartialEq)]
pub enum ExtractedDocumentSortBy {
    ExtractedAt,
    WordCount,
    CharacterCount,
    ExtractionMethod,
}

/// Sort order options
#[derive(Debug, Clone, PartialEq)]
pub enum SortOrder {
    Ascending,
    Descending,
}

/// Export formats for extracted document content
#[derive(Debug, Clone, PartialEq)]
pub enum ExportFormat {
    /// Plain text content
    PlainText,
    /// Markdown format
    Markdown,
    /// HTML format
    Html,
    /// Raw ProseMirror JSON
    ProseMirrorJson,
    /// Microsoft Word format (if supported)
    Docx,
}

/// Content version for history tracking
#[derive(Debug, Clone, PartialEq)]
pub struct ContentVersion {
    pub version: u32,
    pub content: ProseMirrorJson,
    pub modified_at: DateTime<Utc>,
    pub word_count: u32,
    pub character_count: u32,
    pub change_summary: Option<String>,
}

impl Default for ExtractedDocumentSearchCriteria {
    fn default() -> Self {
        Self {
            project_id: None,
            original_document_id: None,
            extraction_methods: None,
            content_query: None,
            min_word_count: None,
            max_word_count: None,
            extracted_after: None,
            extracted_before: None,
            sort_by: ExtractedDocumentSortBy::ExtractedAt,
            sort_order: SortOrder::Descending,
            limit: None,
        }
    }
}

impl ExtractedDocumentSearchCriteria {
    /// Creates search criteria for a specific project
    pub fn for_project(project_id: ProjectId) -> Self {
        Self {
            project_id: Some(project_id),
            ..Default::default()
        }
    }

    /// Creates search criteria for a specific original document
    pub fn for_original_document(original_document_id: DocumentId) -> Self {
        Self {
            original_document_id: Some(original_document_id),
            ..Default::default()
        }
    }

    /// Filters by extraction methods
    pub fn with_methods(mut self, methods: Vec<ExtractionMethod>) -> Self {
        self.extraction_methods = Some(methods);
        self
    }

    /// Filters by content search query
    pub fn with_content_query(mut self, query: String) -> Self {
        self.content_query = Some(query);
        self
    }

    /// Filters by word count range
    pub fn with_word_count_range(mut self, min: Option<u32>, max: Option<u32>) -> Self {
        self.min_word_count = min;
        self.max_word_count = max;
        self
    }

    /// Filters by extraction time range
    pub fn extracted_between(mut self, start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        self.extracted_after = Some(start);
        self.extracted_before = Some(end);
        self
    }

    /// Filters to only recent extractions (last N hours)
    pub fn recent_only(mut self, hours: u32) -> Self {
        let cutoff = Utc::now() - chrono::Duration::hours(hours as i64);
        self.extracted_after = Some(cutoff);
        self
    }

    /// Sets sort order
    pub fn sort_by(mut self, sort_by: ExtractedDocumentSortBy, order: SortOrder) -> Self {
        self.sort_by = sort_by;
        self.sort_order = order;
        self
    }

    /// Limits the number of results
    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

impl ExportFormat {
    /// Returns the file extension for this format
    pub fn file_extension(&self) -> &'static str {
        match self {
            ExportFormat::PlainText => "txt",
            ExportFormat::Markdown => "md",
            ExportFormat::Html => "html",
            ExportFormat::ProseMirrorJson => "json",
            ExportFormat::Docx => "docx",
        }
    }

    /// Returns the MIME type for this format
    pub fn mime_type(&self) -> &'static str {
        match self {
            ExportFormat::PlainText => "text/plain",
            ExportFormat::Markdown => "text/markdown",
            ExportFormat::Html => "text/html",
            ExportFormat::ProseMirrorJson => "application/json",
            ExportFormat::Docx => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extracted_document_search_criteria_builder() {
        let project_id = ProjectId::new();
        let criteria = ExtractedDocumentSearchCriteria::for_project(project_id.clone())
            .with_methods(vec![ExtractionMethod::PdfTextExtraction])
            .with_content_query("test search".to_string())
            .with_word_count_range(Some(100), Some(5000))
            .recent_only(24)
            .sort_by(ExtractedDocumentSortBy::WordCount, SortOrder::Descending)
            .limit(25);

        assert_eq!(criteria.project_id, Some(project_id));
        assert_eq!(criteria.extraction_methods, Some(vec![ExtractionMethod::PdfTextExtraction]));
        assert_eq!(criteria.content_query, Some("test search".to_string()));
        assert_eq!(criteria.min_word_count, Some(100));
        assert_eq!(criteria.max_word_count, Some(5000));
        assert!(criteria.extracted_after.is_some());
        assert_eq!(criteria.sort_by, ExtractedDocumentSortBy::WordCount);
        assert_eq!(criteria.sort_order, SortOrder::Descending);
        assert_eq!(criteria.limit, Some(25));
    }

    #[test]
    fn test_export_format_properties() {
        assert_eq!(ExportFormat::PlainText.file_extension(), "txt");
        assert_eq!(ExportFormat::Markdown.file_extension(), "md");
        assert_eq!(ExportFormat::Html.file_extension(), "html");
        assert_eq!(ExportFormat::ProseMirrorJson.file_extension(), "json");
        assert_eq!(ExportFormat::Docx.file_extension(), "docx");

        assert_eq!(ExportFormat::PlainText.mime_type(), "text/plain");
        assert_eq!(ExportFormat::Html.mime_type(), "text/html");
    }

    #[test]
    fn test_content_version_structure() {
        let now = Utc::now();
        let content = ProseMirrorJson::new_document();

        let version = ContentVersion {
            version: 1,
            content,
            modified_at: now,
            word_count: 100,
            character_count: 500,
            change_summary: Some("Initial version".to_string()),
        };

        assert_eq!(version.version, 1);
        assert_eq!(version.word_count, 100);
        assert_eq!(version.character_count, 500);
    }
}