//! Repository traits for the extraction domain
//!
//! Repository traits define contracts for data persistence operations.
//! Implementations handle the actual storage and retrieval logic.

pub mod document_repository;
pub mod extraction_repository;
pub mod extracted_document_repository;

// Re-exports for convenience
pub use document_repository::{
    DocumentRepository, DocumentPage, DocumentSearchCriteria, DocumentSortBy, SortOrder
};
pub use extraction_repository::{
    ExtractionRepository, ExtractionStatistics, ExtractionPerformanceMetrics, ExtractionPage,
    ExtractionSearchCriteria, ExtractionSortBy, TimeRange
};
pub use extracted_document_repository::{
    ExtractedDocumentRepository, ExtractedDocumentStatistics, ExtractedDocumentSummary,
    ExtractedDocumentPage, ExtractedDocumentSearchCriteria, ExtractedDocumentSortBy,
    ExportFormat, ContentVersion
};