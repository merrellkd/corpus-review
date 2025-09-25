use async_trait::async_trait;
use std::result::Result;

use crate::domain::extraction::{
    entities::OriginalDocument,
    value_objects::{DocumentId, DocumentType, FilePath, ProjectId}
};

/// Repository trait for OriginalDocument entities
///
/// This trait defines the contract for persistence operations on OriginalDocument entities.
/// Implementations handle the actual data storage and retrieval logic.
#[async_trait]
pub trait DocumentRepository: Send + Sync {
    /// Error type for repository operations
    type Error: std::error::Error + Send + Sync;

    /// Finds a document by its unique ID
    async fn find_by_id(&self, id: &DocumentId) -> Result<Option<OriginalDocument>, Self::Error>;

    /// Finds all documents belonging to a specific project
    async fn find_by_project(&self, project_id: &ProjectId) -> Result<Vec<OriginalDocument>, Self::Error>;

    /// Finds a document by its file path within a project
    async fn find_by_path(&self, path: &FilePath) -> Result<Option<OriginalDocument>, Self::Error>;

    /// Finds documents by file type within a project
    async fn find_by_type(
        &self,
        project_id: &ProjectId,
        file_type: &DocumentType,
    ) -> Result<Vec<OriginalDocument>, Self::Error>;

    /// Finds documents that match a pattern in their file name
    async fn find_by_name_pattern(
        &self,
        project_id: &ProjectId,
        pattern: &str,
    ) -> Result<Vec<OriginalDocument>, Self::Error>;

    /// Finds all documents that can be extracted (within size limits, readable, etc.)
    async fn find_extractable_documents(
        &self,
        project_id: &ProjectId,
    ) -> Result<Vec<OriginalDocument>, Self::Error>;

    /// Finds documents that have been modified since a specific timestamp
    async fn find_modified_since(
        &self,
        project_id: &ProjectId,
        since: &chrono::DateTime<chrono::Utc>,
    ) -> Result<Vec<OriginalDocument>, Self::Error>;

    /// Saves or updates a document
    async fn save(&self, document: &OriginalDocument) -> Result<(), Self::Error>;

    /// Saves multiple documents in a batch operation
    async fn save_batch(&self, documents: &[OriginalDocument]) -> Result<(), Self::Error>;

    /// Deletes a document by ID
    async fn delete(&self, id: &DocumentId) -> Result<bool, Self::Error>;

    /// Deletes all documents belonging to a project
    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error>;

    /// Checks if a document exists by ID
    async fn exists(&self, id: &DocumentId) -> Result<bool, Self::Error>;

    /// Checks if a document exists at the given file path
    async fn exists_at_path(&self, path: &FilePath) -> Result<bool, Self::Error>;

    /// Counts total documents in a project
    async fn count_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error>;

    /// Counts documents by type in a project
    async fn count_by_type(
        &self,
        project_id: &ProjectId,
        file_type: &DocumentType,
    ) -> Result<usize, Self::Error>;

    /// Gets the total file size of all documents in a project
    async fn total_size_by_project(&self, project_id: &ProjectId) -> Result<u64, Self::Error>;

    /// Finds documents with duplicate checksums (indicating identical content)
    async fn find_duplicates(&self, project_id: &ProjectId) -> Result<Vec<Vec<OriginalDocument>>, Self::Error>;

    /// Updates the checksum for a document (when file has been modified)
    async fn update_checksum(
        &self,
        id: &DocumentId,
        new_checksum: String,
        modified_at: chrono::DateTime<chrono::Utc>,
    ) -> Result<(), Self::Error>;

    /// Lists documents with pagination support
    async fn list_paginated(
        &self,
        project_id: &ProjectId,
        offset: usize,
        limit: usize,
    ) -> Result<DocumentPage, Self::Error>;

    /// Searches documents by various criteria
    async fn search(&self, criteria: &DocumentSearchCriteria) -> Result<Vec<OriginalDocument>, Self::Error>;
}

/// Paginated result for document listing
#[derive(Debug, Clone, PartialEq)]
pub struct DocumentPage {
    pub documents: Vec<OriginalDocument>,
    pub total_count: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

/// Search criteria for document queries
#[derive(Debug, Clone, PartialEq)]
pub struct DocumentSearchCriteria {
    pub project_id: ProjectId,
    pub file_types: Option<Vec<DocumentType>>,
    pub name_pattern: Option<String>,
    pub min_size: Option<u64>,
    pub max_size: Option<u64>,
    pub created_after: Option<chrono::DateTime<chrono::Utc>>,
    pub created_before: Option<chrono::DateTime<chrono::Utc>>,
    pub modified_after: Option<chrono::DateTime<chrono::Utc>>,
    pub modified_before: Option<chrono::DateTime<chrono::Utc>>,
    pub extractable_only: bool,
    pub sort_by: DocumentSortBy,
    pub sort_order: SortOrder,
}

/// Sort options for document queries
#[derive(Debug, Clone, PartialEq)]
pub enum DocumentSortBy {
    FileName,
    FileSize,
    FileType,
    CreatedAt,
    ModifiedAt,
}

/// Sort order options
#[derive(Debug, Clone, PartialEq)]
pub enum SortOrder {
    Ascending,
    Descending,
}

impl Default for DocumentSearchCriteria {
    fn default() -> Self {
        Self {
            project_id: ProjectId::new(), // This will need to be set by caller
            file_types: None,
            name_pattern: None,
            min_size: None,
            max_size: None,
            created_after: None,
            created_before: None,
            modified_after: None,
            modified_before: None,
            extractable_only: false,
            sort_by: DocumentSortBy::FileName,
            sort_order: SortOrder::Ascending,
        }
    }
}

impl DocumentSearchCriteria {
    /// Creates search criteria for a specific project
    pub fn for_project(project_id: ProjectId) -> Self {
        Self {
            project_id,
            ..Default::default()
        }
    }

    /// Filters by specific file types
    pub fn with_file_types(mut self, file_types: Vec<DocumentType>) -> Self {
        self.file_types = Some(file_types);
        self
    }

    /// Filters by name pattern (case-insensitive substring match)
    pub fn with_name_pattern(mut self, pattern: String) -> Self {
        self.name_pattern = Some(pattern);
        self
    }

    /// Filters by size range
    pub fn with_size_range(mut self, min_size: Option<u64>, max_size: Option<u64>) -> Self {
        self.min_size = min_size;
        self.max_size = max_size;
        self
    }

    /// Filters by creation date range
    pub fn with_created_range(
        mut self,
        after: Option<chrono::DateTime<chrono::Utc>>,
        before: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Self {
        self.created_after = after;
        self.created_before = before;
        self
    }

    /// Filters by modification date range
    pub fn with_modified_range(
        mut self,
        after: Option<chrono::DateTime<chrono::Utc>>,
        before: Option<chrono::DateTime<chrono::Utc>>,
    ) -> Self {
        self.modified_after = after;
        self.modified_before = before;
        self
    }

    /// Filters to only extractable documents
    pub fn extractable_only(mut self) -> Self {
        self.extractable_only = true;
        self
    }

    /// Sets sort order
    pub fn sort_by(mut self, sort_by: DocumentSortBy, order: SortOrder) -> Self {
        self.sort_by = sort_by;
        self.sort_order = order;
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_search_criteria_builder() {
        let project_id = ProjectId::new();
        let criteria = DocumentSearchCriteria::for_project(project_id.clone())
            .with_file_types(vec![DocumentType::Pdf, DocumentType::Docx])
            .with_name_pattern("test".to_string())
            .extractable_only()
            .sort_by(DocumentSortBy::FileSize, SortOrder::Descending);

        assert_eq!(criteria.project_id, project_id);
        assert_eq!(criteria.file_types, Some(vec![DocumentType::Pdf, DocumentType::Docx]));
        assert_eq!(criteria.name_pattern, Some("test".to_string()));
        assert!(criteria.extractable_only);
        assert_eq!(criteria.sort_by, DocumentSortBy::FileSize);
        assert_eq!(criteria.sort_order, SortOrder::Descending);
    }

    #[test]
    fn test_document_page_has_more() {
        let page = DocumentPage {
            documents: vec![],
            total_count: 100,
            offset: 0,
            limit: 20,
            has_more: true,
        };

        assert!(page.has_more);
        assert_eq!(page.total_count, 100);
        assert_eq!(page.limit, 20);
    }
}