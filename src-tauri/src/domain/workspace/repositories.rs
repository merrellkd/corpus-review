use async_trait::async_trait;

pub mod workspace_repository;
pub use workspace_repository::*;
use crate::domain::workspace::entities::{
    workspace_layout::WorkspaceLayout,
    file_system_item::FileSystemItem,
    document_caddy::DocumentCaddy,
    project::Project,
};
use crate::domain::workspace::value_objects::{
    ProjectId,
    WorkspaceLayoutId,
    DocumentCaddyId,
    FilePath,
};

/// Repository for managing workspace layouts
#[async_trait]
pub trait WorkspaceLayoutRepository: Send + Sync {
    /// Save a workspace layout
    async fn save(&self, layout: &WorkspaceLayout) -> Result<(), RepositoryError>;

    /// Find a workspace layout by project ID
    async fn find_by_project_id(&self, project_id: &ProjectId) -> Result<Option<WorkspaceLayout>, RepositoryError>;

    /// Find a workspace layout by its ID
    async fn find_by_id(&self, id: &WorkspaceLayoutId) -> Result<Option<WorkspaceLayout>, RepositoryError>;

    /// Delete a workspace layout
    async fn delete(&self, id: &WorkspaceLayoutId) -> Result<(), RepositoryError>;

    /// Check if a layout exists for a project
    async fn exists_for_project(&self, project_id: &ProjectId) -> Result<bool, RepositoryError>;
}

/// Repository for managing file system operations
#[async_trait]
pub trait FileSystemRepository: Send + Sync {
    /// List contents of a directory
    async fn list_directory_contents(&self, path: &FilePath) -> Result<Vec<FileSystemItem>, RepositoryError>;

    /// Check if a path exists
    async fn path_exists(&self, path: &FilePath) -> Result<bool, RepositoryError>;

    /// Check if a path is accessible (readable)
    async fn is_path_accessible(&self, path: &FilePath) -> Result<bool, RepositoryError>;

    /// Get metadata for a specific file or directory
    async fn get_item_metadata(&self, path: &FilePath) -> Result<Option<FileSystemItem>, RepositoryError>;

    /// Watch a directory for changes (optional capability)
    async fn watch_directory(&self, path: &FilePath) -> Result<(), RepositoryError>;

    /// Validate that a path is within allowed project directories
    async fn validate_path_within_project(&self, path: &FilePath, project: &Project) -> Result<bool, RepositoryError>;
}

/// Repository for managing document caddies
#[async_trait]
pub trait DocumentCaddyRepository: Send + Sync {
    /// Save a document caddy
    async fn save(&self, caddy: &DocumentCaddy) -> Result<(), RepositoryError>;

    /// Find a document caddy by ID
    async fn find_by_id(&self, id: &DocumentCaddyId) -> Result<Option<DocumentCaddy>, RepositoryError>;

    /// Find all document caddies for a workspace
    async fn find_by_workspace(&self, workspace_id: &WorkspaceLayoutId) -> Result<Vec<DocumentCaddy>, RepositoryError>;

    /// Find document caddy by file path
    async fn find_by_file_path(&self, file_path: &FilePath) -> Result<Option<DocumentCaddy>, RepositoryError>;

    /// Delete a document caddy
    async fn delete(&self, id: &DocumentCaddyId) -> Result<(), RepositoryError>;

    /// Update document caddy position and dimensions
    async fn update_layout(&self, id: &DocumentCaddyId, position: Option<(f64, f64)>, dimensions: Option<(f64, f64)>) -> Result<(), RepositoryError>;

    /// Set a document caddy as active (deactivates others)
    async fn set_active(&self, id: &DocumentCaddyId, workspace_id: &WorkspaceLayoutId) -> Result<(), RepositoryError>;

    /// Get the currently active document caddy for a workspace
    async fn get_active(&self, workspace_id: &WorkspaceLayoutId) -> Result<Option<DocumentCaddy>, RepositoryError>;
}

/// Repository for managing projects
#[async_trait]
pub trait ProjectRepository: Send + Sync {
    /// Save a project
    async fn save(&self, project: &Project) -> Result<(), RepositoryError>;

    /// Find a project by ID
    async fn find_by_id(&self, id: &ProjectId) -> Result<Option<Project>, RepositoryError>;

    /// Find a project by name
    async fn find_by_name(&self, name: &str) -> Result<Option<Project>, RepositoryError>;

    /// List all projects
    async fn list_all(&self) -> Result<Vec<Project>, RepositoryError>;

    /// Delete a project
    async fn delete(&self, id: &ProjectId) -> Result<(), RepositoryError>;

    /// Check if a project name is unique
    async fn is_name_unique(&self, name: &str, excluding_id: Option<&ProjectId>) -> Result<bool, RepositoryError>;

    /// Update project workspace layout
    async fn update_workspace_layout(&self, project_id: &ProjectId, layout: &WorkspaceLayout) -> Result<(), RepositoryError>;
}

/// Common error types for repository operations
#[derive(Debug, Clone)]
pub enum RepositoryError {
    /// Item not found
    NotFound(String),

    /// Database connection or query error
    DatabaseError(String),

    /// Validation error
    ValidationError(String),

    /// Permission or access error
    AccessError(String),

    /// Serialization/deserialization error
    SerializationError(String),

    /// File system error
    FileSystemError(String),

    /// Constraint violation (e.g., unique constraint)
    ConstraintViolation(String),

    /// Generic internal error
    InternalError(String),
}

impl std::fmt::Display for RepositoryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RepositoryError::NotFound(msg) => write!(f, "Not found: {}", msg),
            RepositoryError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            RepositoryError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            RepositoryError::AccessError(msg) => write!(f, "Access error: {}", msg),
            RepositoryError::SerializationError(msg) => write!(f, "Serialization error: {}", msg),
            RepositoryError::FileSystemError(msg) => write!(f, "File system error: {}", msg),
            RepositoryError::ConstraintViolation(msg) => write!(f, "Constraint violation: {}", msg),
            RepositoryError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for RepositoryError {}

/// Convert common errors to RepositoryError
impl From<serde_json::Error> for RepositoryError {
    fn from(error: serde_json::Error) -> Self {
        RepositoryError::SerializationError(error.to_string())
    }
}

impl From<std::io::Error> for RepositoryError {
    fn from(error: std::io::Error) -> Self {
        RepositoryError::FileSystemError(error.to_string())
    }
}

/// Trait for repository factory to create repository instances
pub trait RepositoryFactory: Send + Sync {
    fn workspace_layout_repository(&self) -> Box<dyn WorkspaceLayoutRepository>;
    fn file_system_repository(&self) -> Box<dyn FileSystemRepository>;
    fn document_caddy_repository(&self) -> Box<dyn DocumentCaddyRepository>;
    fn project_repository(&self) -> Box<dyn ProjectRepository>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_repository_error_display() {
        let error = RepositoryError::NotFound("Project not found".to_string());
        assert_eq!(error.to_string(), "Not found: Project not found");

        let error = RepositoryError::DatabaseError("Connection failed".to_string());
        assert_eq!(error.to_string(), "Database error: Connection failed");
    }

    #[test]
    fn test_repository_error_from_io_error() {
        let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "File not found");
        let repo_error = RepositoryError::from(io_error);

        match repo_error {
            RepositoryError::FileSystemError(msg) => assert!(msg.contains("File not found")),
            _ => panic!("Expected FileSystemError"),
        }
    }

    #[test]
    fn test_repository_error_from_serde_error() {
        let json_str = "{invalid json}";
        let serde_error = serde_json::from_str::<serde_json::Value>(json_str).unwrap_err();
        let repo_error = RepositoryError::from(serde_error);

        match repo_error {
            RepositoryError::SerializationError(_) => {},
            _ => panic!("Expected SerializationError"),
        }
    }
}