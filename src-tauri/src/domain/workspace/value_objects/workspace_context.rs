use crate::domain::project::value_objects::ProjectId;
use crate::domain::workspace::errors::WorkspaceError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// WorkspaceContext represents the context and state of an active project workspace
///
/// This value object contains immutable information about a workspace session,
/// including the project being worked on and the current navigation state.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WorkspaceContext {
    /// The unique identifier of the project this workspace represents
    project_id: ProjectId,
    /// The human-readable name of the project
    project_name: String,
    /// The root source folder path for this project
    source_folder: PathBuf,
    /// The current navigation path within the workspace
    current_path: PathBuf,
}

impl WorkspaceContext {
    /// Create a new WorkspaceContext
    ///
    /// # Arguments
    /// * `project_id` - The unique identifier of the project
    /// * `project_name` - The human-readable name of the project
    /// * `source_folder` - The root source folder path
    /// * `current_path` - The current navigation path (defaults to source_folder if None)
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Project name is empty
    /// - Source folder path is invalid
    /// - Current path is outside the source folder boundary
    pub fn new(
        project_id: ProjectId,
        project_name: impl Into<String>,
        source_folder: impl AsRef<Path>,
        current_path: Option<impl AsRef<Path>>,
    ) -> Result<Self, WorkspaceError> {
        let project_name = project_name.into();
        let source_folder = source_folder.as_ref().to_path_buf();
        let current_path = current_path
            .map(|p| p.as_ref().to_path_buf())
            .unwrap_or_else(|| source_folder.clone());

        // Validate project name
        if project_name.trim().is_empty() {
            return Err(WorkspaceError::invalid_workspace_context(
                "Project name cannot be empty",
            ));
        }

        // Validate paths
        if !source_folder.is_absolute() {
            return Err(WorkspaceError::invalid_workspace_context(
                "Source folder must be an absolute path",
            ));
        }

        // Ensure current path is within source folder boundaries
        if !Self::is_path_within_boundary(&current_path, &source_folder)? {
            return Err(WorkspaceError::navigation_boundary_violation(
                current_path.display().to_string(),
                source_folder.display().to_string(),
            ));
        }

        Ok(WorkspaceContext {
            project_id,
            project_name,
            source_folder,
            current_path,
        })
    }

    /// Get the project ID
    pub fn project_id(&self) -> &ProjectId {
        &self.project_id
    }

    /// Get the project name
    pub fn project_name(&self) -> &str {
        &self.project_name
    }

    /// Get the source folder path
    pub fn source_folder(&self) -> &Path {
        &self.source_folder
    }

    /// Get the current path
    pub fn current_path(&self) -> &Path {
        &self.current_path
    }

    /// Check if the current path is at the workspace root
    pub fn is_at_root(&self) -> bool {
        self.current_path == self.source_folder
    }

    /// Get the parent path if navigation up is possible
    ///
    /// Returns `None` if already at the workspace root
    pub fn get_parent_path(&self) -> Option<PathBuf> {
        if self.is_at_root() {
            None
        } else {
            self.current_path.parent().map(|p| p.to_path_buf())
        }
    }

    /// Create a new WorkspaceContext with updated current path
    ///
    /// # Arguments
    /// * `new_path` - The new current path
    ///
    /// # Errors
    /// Returns `WorkspaceError` if the new path is outside workspace boundaries
    pub fn with_current_path(&self, new_path: impl AsRef<Path>) -> Result<Self, WorkspaceError> {
        let new_path = new_path.as_ref().to_path_buf();

        if !Self::is_path_within_boundary(&new_path, &self.source_folder)? {
            return Err(WorkspaceError::navigation_boundary_violation(
                new_path.display().to_string(),
                self.source_folder.display().to_string(),
            ));
        }

        Ok(WorkspaceContext {
            project_id: self.project_id.clone(),
            project_name: self.project_name.clone(),
            source_folder: self.source_folder.clone(),
            current_path: new_path,
        })
    }

    /// Navigate to a child folder
    ///
    /// # Arguments
    /// * `folder_name` - Name of the folder to navigate to (relative to current path)
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Folder name contains invalid characters
    /// - Navigation would exceed workspace boundaries
    pub fn navigate_to_folder(&self, folder_name: &str) -> Result<Self, WorkspaceError> {
        // Validate folder name for security
        if folder_name.contains("..") || folder_name.contains('/') || folder_name.contains('\\') {
            return Err(WorkspaceError::invalid_path(
                folder_name.to_string(),
                "Folder name contains invalid characters or path traversal",
            ));
        }

        if folder_name.trim().is_empty() {
            return Err(WorkspaceError::invalid_path(
                folder_name.to_string(),
                "Folder name cannot be empty",
            ));
        }

        let new_path = self.current_path.join(folder_name);
        self.with_current_path(new_path)
    }

    /// Navigate to parent directory
    ///
    /// # Errors
    /// Returns `WorkspaceError` if already at workspace root
    pub fn navigate_to_parent(&self) -> Result<Self, WorkspaceError> {
        match self.get_parent_path() {
            Some(parent_path) => self.with_current_path(parent_path),
            None => Err(WorkspaceError::invalid_path(
                self.current_path.display().to_string(),
                "Already at workspace root, cannot navigate up",
            )),
        }
    }

    /// Check if a path is within the workspace boundary
    ///
    /// This is a critical security function that prevents path traversal attacks
    fn is_path_within_boundary(path: &Path, boundary: &Path) -> Result<bool, WorkspaceError> {
        // Canonicalize both paths to resolve any symlinks or relative components
        let canonical_path = path
            .canonicalize()
            .or_else(|_| {
                // If path doesn't exist yet, canonicalize the parent and join the filename
                if let Some(parent) = path.parent() {
                    if let Some(filename) = path.file_name() {
                        parent
                            .canonicalize()
                            .map(|canonical_parent| canonical_parent.join(filename))
                    } else {
                        Err(std::io::Error::new(
                            std::io::ErrorKind::InvalidInput,
                            "Invalid path",
                        ))
                    }
                } else {
                    Err(std::io::Error::new(
                        std::io::ErrorKind::InvalidInput,
                        "Invalid path",
                    ))
                }
            })
            .map_err(|e| {
                WorkspaceError::invalid_path(
                    path.display().to_string(),
                    format!("Failed to canonicalize path: {}", e),
                )
            })?;

        let canonical_boundary = boundary.canonicalize().map_err(|e| {
            WorkspaceError::source_folder_not_found(format!(
                "Workspace boundary path invalid: {}",
                e
            ))
        })?;

        Ok(canonical_path.starts_with(canonical_boundary))
    }

    /// Get relative path from workspace root
    pub fn relative_path(&self) -> Result<PathBuf, WorkspaceError> {
        self.current_path
            .strip_prefix(&self.source_folder)
            .map(|p| p.to_path_buf())
            .map_err(|_| {
                WorkspaceError::invalid_workspace_context(
                    "Current path is not within workspace source folder",
                )
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_project_id() -> ProjectId {
        ProjectId::new()
    }

    #[test]
    fn test_workspace_context_creation() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        let context =
            WorkspaceContext::new(project_id.clone(), "Test Project", temp_dir.path(), None::<&str>)
                .unwrap();

        assert_eq!(context.project_id(), &project_id);
        assert_eq!(context.project_name(), "Test Project");
        assert_eq!(context.source_folder(), temp_dir.path());
        assert_eq!(context.current_path(), temp_dir.path());
        assert!(context.is_at_root());
    }

    #[test]
    fn test_empty_project_name_validation() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        let result = WorkspaceContext::new(project_id, "", temp_dir.path(), None::<&str>);

        assert!(result.is_err());
        match result.unwrap_err() {
            WorkspaceError::InvalidWorkspaceContext { reason } => {
                assert!(reason.contains("Project name cannot be empty"));
            }
            _ => panic!("Expected InvalidWorkspaceContext error"),
        }
    }

    #[test]
    fn test_navigation_to_folder() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        // Create a subdirectory
        let sub_dir = temp_dir.path().join("documents");
        std::fs::create_dir(&sub_dir).unwrap();

        let context = WorkspaceContext::new(
            project_id,
            "Test Project",
            temp_dir.path(),
            None::<&str>,
        )
        .unwrap();

        let navigated_context = context.navigate_to_folder("documents").unwrap();

        assert_eq!(navigated_context.current_path(), sub_dir);
        assert!(!navigated_context.is_at_root());
        assert!(navigated_context.get_parent_path().is_some());
    }

    #[test]
    fn test_navigation_to_parent() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        // Create a subdirectory
        let sub_dir = temp_dir.path().join("documents");
        std::fs::create_dir(&sub_dir).unwrap();

        let context =
            WorkspaceContext::new(project_id, "Test Project", temp_dir.path(), Some(&sub_dir))
                .unwrap();

        let parent_context = context.navigate_to_parent().unwrap();

        assert_eq!(parent_context.current_path(), temp_dir.path());
        assert!(parent_context.is_at_root());
    }

    #[test]
    fn test_navigation_boundary_violation() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        let context = WorkspaceContext::new(
            project_id,
            "Test Project",
            temp_dir.path(),
            None::<&str>,
        )
        .unwrap();

        // Try to navigate with path traversal
        let result = context.navigate_to_folder("../evil");
        assert!(result.is_err());

        match result.unwrap_err() {
            WorkspaceError::InvalidPath { path, reason } => {
                assert_eq!(path, "../evil");
                assert!(reason.contains("invalid characters") || reason.contains("path traversal"));
            }
            _ => panic!("Expected InvalidPath error"),
        }
    }

    #[test]
    fn test_navigation_to_parent_at_root() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        let context = WorkspaceContext::new(
            project_id,
            "Test Project",
            temp_dir.path(),
            None::<&str>,
        )
        .unwrap();

        let result = context.navigate_to_parent();
        assert!(result.is_err());

        match result.unwrap_err() {
            WorkspaceError::InvalidPath { reason, .. } => {
                assert!(reason.contains("Already at workspace root"));
            }
            _ => panic!("Expected InvalidPath error"),
        }
    }

    #[test]
    fn test_relative_path() {
        let temp_dir = TempDir::new().unwrap();
        let project_id = create_test_project_id();

        // Create subdirectories
        let sub_dir = temp_dir.path().join("documents").join("archived");
        std::fs::create_dir_all(&sub_dir).unwrap();

        let context =
            WorkspaceContext::new(project_id, "Test Project", temp_dir.path(), Some(&sub_dir))
                .unwrap();

        let relative = context.relative_path().unwrap();
        assert_eq!(relative, PathBuf::from("documents").join("archived"));
    }
}
