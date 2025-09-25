// Workspace-related DTOs
pub mod workspace_dto;
pub mod directory_listing_dto;
pub mod file_entry_dto;

// File metadata extraction DTOs
pub mod original_document_dto;
pub mod document_details_dto;
pub mod extraction_history_dto;
pub mod extraction_status_dto;
pub mod extracted_document_dto;
pub mod document_preview_dto;
pub mod save_result_dto;

// Re-export workspace DTOs
pub use workspace_dto::*;
pub use directory_listing_dto::*;
pub use file_entry_dto::*;

// Re-export extraction DTOs
pub use original_document_dto::*;
pub use document_details_dto::*;
pub use extraction_history_dto::*;
pub use extraction_status_dto::*;
pub use extracted_document_dto::*;
pub use document_preview_dto::*;
pub use save_result_dto::*;