use thiserror::Error;
use super::super::value_objects::{
    project_name::ProjectNameError,
    folder_path::FolderPathError,
    project_note::ProjectNoteError,
    created_at::CreatedAtError,
};

/// Domain errors for Project aggregate and related operations
///
/// These errors represent business rule violations and domain-specific
/// failure scenarios that can occur during project operations.
#[derive(Debug, Error)]
pub enum ProjectError {
    // Value object validation errors
    #[error("Invalid project name: {0}")]
    InvalidName(#[from] ProjectNameError),

    #[error("Invalid folder path: {0}")]
    InvalidPath(#[from] FolderPathError),

    #[error("Invalid project note: {0}")]
    InvalidNote(#[from] ProjectNoteError),

    #[error("Invalid timestamp: {0}")]
    InvalidTimestamp(#[from] CreatedAtError),

    // Domain-specific business rule violations
    #[error("Invalid project ID format")]
    InvalidId,

    #[error("Source folder is not accessible")]
    SourceNotAccessible,

    #[error("Project not found with ID: {id}")]
    NotFound { id: String },

    #[error("Project already exists with name: {name}")]
    DuplicateName { name: String },

    #[error("Cannot delete project: {reason}")]
    CannotDelete { reason: String },

    #[error("Cannot update project: {reason}")]
    CannotUpdate { reason: String },

    // Repository-level errors
    #[error("Repository operation failed: {operation}")]
    RepositoryError { operation: String },

    #[error("Database connection failed")]
    DatabaseConnection,

    #[error("Data corruption detected in project: {id}")]
    DataCorruption { id: String },

    // Concurrent access errors
    #[error("Project is locked for editing by another process")]
    Locked,

    #[error("Project version conflict - data was modified by another process")]
    VersionConflict,
}

impl ProjectError {
    /// Create a NotFound error for a specific project ID
    pub fn not_found(id: impl Into<String>) -> Self {
        ProjectError::NotFound { id: id.into() }
    }

    /// Create a DuplicateName error for a specific project name
    pub fn duplicate_name(name: impl Into<String>) -> Self {
        ProjectError::DuplicateName { name: name.into() }
    }

    /// Create a CannotDelete error with a specific reason
    pub fn cannot_delete(reason: impl Into<String>) -> Self {
        ProjectError::CannotDelete { reason: reason.into() }
    }

    /// Create a CannotUpdate error with a specific reason
    pub fn cannot_update(reason: impl Into<String>) -> Self {
        ProjectError::CannotUpdate { reason: reason.into() }
    }

    /// Create a RepositoryError for a specific operation
    pub fn repository_error(operation: impl Into<String>) -> Self {
        ProjectError::RepositoryError { operation: operation.into() }
    }

    /// Create a DataCorruption error for a specific project ID
    pub fn data_corruption(id: impl Into<String>) -> Self {
        ProjectError::DataCorruption { id: id.into() }
    }

    /// Check if this error is recoverable (user can retry)
    pub fn is_recoverable(&self) -> bool {
        match self {
            // These errors are due to invalid input - user can fix and retry
            ProjectError::InvalidName(_) |
            ProjectError::InvalidPath(_) |
            ProjectError::InvalidNote(_) |
            ProjectError::InvalidTimestamp(_) |
            ProjectError::InvalidId => true,

            // These might be temporary issues
            ProjectError::DatabaseConnection |
            ProjectError::RepositoryError { .. } |
            ProjectError::Locked => true,

            // These are permanent issues that can't be retried
            ProjectError::SourceNotAccessible |
            ProjectError::NotFound { .. } |
            ProjectError::DuplicateName { .. } |
            ProjectError::DataCorruption { .. } |
            ProjectError::VersionConflict => false,

            // Business rule violations depend on context
            ProjectError::CannotDelete { .. } |
            ProjectError::CannotUpdate { .. } => false,
        }
    }

    /// Check if this error requires user attention vs automatic handling
    pub fn requires_user_attention(&self) -> bool {
        match self {
            // User input validation errors always need user attention
            ProjectError::InvalidName(_) |
            ProjectError::InvalidPath(_) |
            ProjectError::InvalidNote(_) |
            ProjectError::DuplicateName { .. } => true,

            // System errors might be handled automatically
            ProjectError::DatabaseConnection |
            ProjectError::RepositoryError { .. } |
            ProjectError::Locked => false,

            // Everything else should be shown to the user
            _ => true,
        }
    }

    /// Get a user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            ProjectError::InvalidName(e) => format!("Project name is invalid: {}", e),
            ProjectError::InvalidPath(e) => format!("Folder path is invalid: {}", e),
            ProjectError::InvalidNote(e) => format!("Project note is invalid: {}", e),
            ProjectError::InvalidId => "Project ID format is invalid".to_string(),
            ProjectError::SourceNotAccessible => "The project's source folder cannot be accessed. It may have been moved or deleted.".to_string(),
            ProjectError::NotFound { id } => format!("Project not found (ID: {})", id),
            ProjectError::DuplicateName { name } => format!("A project named '{}' already exists", name),
            ProjectError::CannotDelete { reason } => format!("Cannot delete project: {}", reason),
            ProjectError::CannotUpdate { reason } => format!("Cannot update project: {}", reason),
            ProjectError::DatabaseConnection => "Unable to connect to the database".to_string(),
            ProjectError::DataCorruption { id } => format!("Data corruption detected in project (ID: {})", id),
            ProjectError::Locked => "Project is currently being edited by another process".to_string(),
            ProjectError::VersionConflict => "Project was modified by another process. Please refresh and try again.".to_string(),
            ProjectError::RepositoryError { operation } => format!("Database operation failed: {}", operation),
            ProjectError::InvalidTimestamp(e) => format!("Invalid timestamp: {}", e),
        }
    }
}

/// Result type for Project operations
pub type ProjectResult<T> = Result<T, ProjectError>;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::project::value_objects::project_name::ProjectNameError;

    #[test]
    fn test_error_creation_helpers() {
        let not_found = ProjectError::not_found("proj_123");
        assert!(matches!(not_found, ProjectError::NotFound { id } if id == "proj_123"));

        let duplicate = ProjectError::duplicate_name("Test Project");
        assert!(matches!(duplicate, ProjectError::DuplicateName { name } if name == "Test Project"));

        let cannot_delete = ProjectError::cannot_delete("Project in use");
        assert!(matches!(cannot_delete, ProjectError::CannotDelete { reason } if reason == "Project in use"));

        let repo_error = ProjectError::repository_error("SELECT failed");
        assert!(matches!(repo_error, ProjectError::RepositoryError { operation } if operation == "SELECT failed"));

        let corruption = ProjectError::data_corruption("proj_456");
        assert!(matches!(corruption, ProjectError::DataCorruption { id } if id == "proj_456"));
    }

    #[test]
    fn test_error_recoverability() {
        // Recoverable errors
        assert!(ProjectError::InvalidName(ProjectNameError::Required).is_recoverable());
        assert!(ProjectError::DatabaseConnection.is_recoverable());
        assert!(ProjectError::Locked.is_recoverable());

        // Non-recoverable errors
        assert!(!ProjectError::NotFound { id: "test".to_string() }.is_recoverable());
        assert!(!ProjectError::SourceNotAccessible.is_recoverable());
        assert!(!ProjectError::VersionConflict.is_recoverable());
    }

    #[test]
    fn test_user_attention_requirements() {
        // Requires user attention
        assert!(ProjectError::InvalidName(ProjectNameError::Required).requires_user_attention());
        assert!(ProjectError::DuplicateName { name: "test".to_string() }.requires_user_attention());
        assert!(ProjectError::SourceNotAccessible.requires_user_attention());

        // May be handled automatically
        assert!(!ProjectError::DatabaseConnection.requires_user_attention());
        assert!(!ProjectError::Locked.requires_user_attention());
    }

    #[test]
    fn test_user_messages() {
        let name_error = ProjectError::InvalidName(ProjectNameError::Required);
        assert!(name_error.user_message().contains("Project name is invalid"));

        let not_found = ProjectError::NotFound { id: "proj_123".to_string() };
        assert!(not_found.user_message().contains("Project not found"));
        assert!(not_found.user_message().contains("proj_123"));

        let duplicate = ProjectError::DuplicateName { name: "My Project".to_string() };
        assert!(duplicate.user_message().contains("already exists"));
        assert!(duplicate.user_message().contains("My Project"));
    }

    #[test]
    fn test_error_display() {
        let error = ProjectError::NotFound { id: "test_id".to_string() };
        let display_string = format!("{}", error);
        assert!(display_string.contains("Project not found"));
        assert!(display_string.contains("test_id"));
    }

    #[test]
    fn test_error_from_value_object_errors() {
        let name_error = ProjectNameError::Required;
        let project_error: ProjectError = name_error.into();
        assert!(matches!(project_error, ProjectError::InvalidName(_)));

        let path_error = FolderPathError::NotFound { path: "test".to_string() };
        let project_error: ProjectError = path_error.into();
        assert!(matches!(project_error, ProjectError::InvalidPath(_)));
    }

    #[test]
    fn test_project_result_type() {
        let success: ProjectResult<String> = Ok("success".to_string());
        assert!(success.is_ok());

        let failure: ProjectResult<String> = Err(ProjectError::InvalidId);
        assert!(failure.is_err());
    }
}