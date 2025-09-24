pub mod value_objects;
pub mod aggregates;
pub mod errors;
pub mod repositories;

// Re-export commonly used types
pub use value_objects::{ProjectId, ProjectName, FolderPath, ProjectNote, CreatedAt};
pub use aggregates::{Project, ProjectMetadata};
pub use errors::{ProjectError, ProjectResult};
pub use repositories::{ProjectRepository, RepositoryStats};