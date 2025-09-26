use thiserror::Error;

/// Domain errors for Workspace operations
///
/// These errors represent business rule violations and domain-specific
/// failure scenarios that can occur during workspace navigation operations.
#[derive(Debug, Error)]
pub enum WorkspaceError {
    /// Source folder for the project could not be found
    #[error("Source folder not found: {path}")]
    SourceFolderNotFound { path: String },

    /// User lacks permissions to access the source folder
    #[error("Access denied to source folder: {path}")]
    SourceFolderAccessDenied { path: String },

    /// Invalid path provided for navigation
    #[error("Invalid path: {path} - {reason}")]
    InvalidPath { path: String, reason: String },

    /// Attempted navigation outside workspace boundaries
    #[error("Navigation boundary violation: attempted to access {path} which is outside workspace root {workspace_root}")]
    NavigationBoundaryViolation {
        path: String,
        workspace_root: String,
    },

    /// Failed to list directory contents
    #[error("Directory listing failed for {path}: {reason}")]
    DirectoryListingFailed { path: String, reason: String },

    /// File or directory metadata could not be retrieved
    #[error("Failed to retrieve metadata for {path}: {reason}")]
    MetadataRetrievalFailed { path: String, reason: String },

    /// Invalid workspace context provided
    #[error("Invalid workspace context: {reason}")]
    InvalidWorkspaceContext { reason: String },

    /// Project ID not found or invalid
    #[error("Invalid project ID: {project_id}")]
    InvalidProjectId { project_id: String },

    /// File system operation failed
    #[error("File system operation failed: {operation} on {path} - {reason}")]
    FileSystemError {
        operation: String,
        path: String,
        reason: String,
    },

    /// Empty directory handling error
    #[error("Empty directory error for {path}: {reason}")]
    EmptyDirectoryError { path: String, reason: String },
}

impl WorkspaceError {
    /// Create a source folder not found error
    pub fn source_folder_not_found(path: impl Into<String>) -> Self {
        Self::SourceFolderNotFound { path: path.into() }
    }

    /// Create a source folder access denied error
    pub fn source_folder_access_denied(path: impl Into<String>) -> Self {
        Self::SourceFolderAccessDenied { path: path.into() }
    }

    /// Create an invalid path error
    pub fn invalid_path(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::InvalidPath {
            path: path.into(),
            reason: reason.into(),
        }
    }

    /// Create a navigation boundary violation error
    pub fn navigation_boundary_violation(
        path: impl Into<String>,
        workspace_root: impl Into<String>,
    ) -> Self {
        Self::NavigationBoundaryViolation {
            path: path.into(),
            workspace_root: workspace_root.into(),
        }
    }

    /// Create a directory listing failed error
    pub fn directory_listing_failed(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::DirectoryListingFailed {
            path: path.into(),
            reason: reason.into(),
        }
    }

    /// Create a metadata retrieval failed error
    pub fn metadata_retrieval_failed(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::MetadataRetrievalFailed {
            path: path.into(),
            reason: reason.into(),
        }
    }

    /// Create an invalid workspace context error
    pub fn invalid_workspace_context(reason: impl Into<String>) -> Self {
        Self::InvalidWorkspaceContext {
            reason: reason.into(),
        }
    }

    /// Create an invalid project ID error
    pub fn invalid_project_id(project_id: impl Into<String>) -> Self {
        Self::InvalidProjectId {
            project_id: project_id.into(),
        }
    }

    /// Create a file system error
    pub fn file_system_error(
        operation: impl Into<String>,
        path: impl Into<String>,
        reason: impl Into<String>,
    ) -> Self {
        Self::FileSystemError {
            operation: operation.into(),
            path: path.into(),
            reason: reason.into(),
        }
    }

    /// Create an empty directory error
    pub fn empty_directory_error(path: impl Into<String>, reason: impl Into<String>) -> Self {
        Self::EmptyDirectoryError {
            path: path.into(),
            reason: reason.into(),
        }
    }

    /// Check if the error is recoverable (user can retry)
    pub fn is_recoverable(&self) -> bool {
        match self {
            WorkspaceError::SourceFolderNotFound { .. } => false,
            WorkspaceError::SourceFolderAccessDenied { .. } => false,
            WorkspaceError::InvalidPath { .. } => false,
            WorkspaceError::NavigationBoundaryViolation { .. } => false,
            WorkspaceError::DirectoryListingFailed { .. } => true,
            WorkspaceError::MetadataRetrievalFailed { .. } => true,
            WorkspaceError::InvalidWorkspaceContext { .. } => false,
            WorkspaceError::InvalidProjectId { .. } => false,
            WorkspaceError::FileSystemError { .. } => true,
            WorkspaceError::EmptyDirectoryError { .. } => false,
        }
    }

    /// Check if the error requires user attention
    pub fn requires_user_attention(&self) -> bool {
        match self {
            WorkspaceError::SourceFolderNotFound { .. } => true,
            WorkspaceError::SourceFolderAccessDenied { .. } => true,
            WorkspaceError::InvalidPath { .. } => false,
            WorkspaceError::NavigationBoundaryViolation { .. } => false,
            WorkspaceError::DirectoryListingFailed { .. } => true,
            WorkspaceError::MetadataRetrievalFailed { .. } => false,
            WorkspaceError::InvalidWorkspaceContext { .. } => false,
            WorkspaceError::InvalidProjectId { .. } => true,
            WorkspaceError::FileSystemError { .. } => true,
            WorkspaceError::EmptyDirectoryError { .. } => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_error_creation() {
        let error = WorkspaceError::source_folder_not_found("/invalid/path");
        assert!(!error.is_recoverable());
        assert!(error.requires_user_attention());
        assert!(error.to_string().contains("/invalid/path"));
    }

    #[test]
    fn test_navigation_boundary_violation() {
        let error = WorkspaceError::navigation_boundary_violation("/evil/path", "/safe/workspace");
        assert!(!error.is_recoverable());
        assert!(!error.requires_user_attention());
        assert!(error.to_string().contains("/evil/path"));
        assert!(error.to_string().contains("/safe/workspace"));
    }

    #[test]
    fn test_file_system_error_recoverability() {
        let error =
            WorkspaceError::file_system_error("read", "/some/file", "temporary network issue");
        assert!(error.is_recoverable());
        assert!(error.requires_user_attention());
    }
}
