pub mod aggregates;
pub mod errors;
pub mod repositories;
pub mod value_objects;

// Re-export commonly used types
pub use aggregates::{Project, ProjectMetadata};
pub use errors::{ProjectError, ProjectResult};
pub use repositories::{ProjectRepository, RepositoryStats};
pub use value_objects::{CreatedAt, FolderPath, ProjectId, ProjectName, ProjectNote};
