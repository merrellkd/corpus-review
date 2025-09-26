pub mod repositories;
pub mod database;
pub mod dtos;
pub mod errors;
pub mod extraction;
pub mod parsers;

pub use dtos::{ProjectDto, ProjectListDto, RepositoryStatsDto, CreateProjectRequest, UpdateProjectRequest, DeleteProjectRequest};
pub use errors::{AppError, AppResult, ErrorResponse};
pub use repositories::SqliteProjectRepository;
pub use database::{DatabaseConnection, DatabaseHealth};
pub use extraction::{ProseMirrorSerializer, ProseMirrorDocument, FileSystemService, DetFileMetadata};

// Re-export extraction sub-modules for backward compatibility
pub mod serializers {
    pub use crate::infrastructure::extraction::serializers::*;
}

pub mod services {
    pub use crate::infrastructure::extraction::services::*;
}