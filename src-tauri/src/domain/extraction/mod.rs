//! Extraction domain module
//!
//! This module contains the domain logic for file metadata extraction functionality.
//! It follows Domain-Driven Design principles with strict layer separation.

pub mod value_objects;
pub mod entities;
pub mod aggregates;
pub mod repositories;

// Re-exports for convenience
pub use value_objects::*;
pub use entities::*;
pub use aggregates::*;
pub use repositories::*;