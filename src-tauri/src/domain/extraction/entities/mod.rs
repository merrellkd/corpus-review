//! Entities for the extraction domain
//!
//! Entities are objects with identity that encapsulate business logic and maintain state.
//! They are the core building blocks of the domain model.

pub mod original_document;
pub mod extracted_document;
pub mod file_extraction;

// Re-exports for convenience
pub use original_document::{OriginalDocument, OriginalDocumentError, OriginalDocumentMetadata};
pub use extracted_document::{
    ExtractedDocument, ExtractedDocumentError, ExtractedDocumentStats, ExtractedDocumentSummary
};
pub use file_extraction::{
    FileExtraction, FileExtractionError, FileExtractionStatusSummary
};