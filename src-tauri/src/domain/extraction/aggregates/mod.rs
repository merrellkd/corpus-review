//! Aggregates for the extraction domain
//!
//! Aggregates are clusters of domain objects that are treated as a single unit.
//! They enforce consistency boundaries and business invariants.

pub mod document_extraction_aggregate;

// Re-exports for convenience
pub use document_extraction_aggregate::{
    DocumentExtractionAggregate, DocumentExtractionAggregateError, DocumentExtractionAggregateSummary
};