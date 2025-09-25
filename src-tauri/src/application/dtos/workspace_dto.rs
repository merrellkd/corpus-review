use serde::{Deserialize, Serialize};
use crate::application::dtos::DirectoryListingDto;

/// DTO for transferring workspace data between layers
///
/// This represents the complete workspace context and current directory state
/// for communication between the backend and frontend.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDto {
    /// The project ID this workspace represents
    pub project_id: String,

    /// The human-readable project name
    pub project_name: String,

    /// The root source folder path for this project
    pub source_folder: String,

    /// The current navigation path within the workspace
    pub current_path: String,

    /// The directory listing for the current path
    pub directory_listing: DirectoryListingDto,
}

impl WorkspaceDto {
    /// Create a new WorkspaceDto
    pub fn new(
        project_id: String,
        project_name: String,
        source_folder: String,
        current_path: String,
        directory_listing: DirectoryListingDto,
    ) -> Self {
        WorkspaceDto {
            project_id,
            project_name,
            source_folder,
            current_path,
            directory_listing,
        }
    }

    /// Check if the workspace is at the root directory
    pub fn is_at_root(&self) -> bool {
        self.current_path == self.source_folder
    }

    /// Get relative path from workspace root
    pub fn relative_path(&self) -> String {
        if self.is_at_root() {
            String::new()
        } else {
            self.current_path
                .strip_prefix(&self.source_folder)
                .unwrap_or(&self.current_path)
                .trim_start_matches('/')
                .to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::dtos::{DirectoryListingDto, FileEntryDto};

    #[test]
    fn test_workspace_dto_creation() {
        let directory_listing = DirectoryListingDto {
            entries: vec![],
            is_root: true,
            parent_path: None,
            can_navigate_up: false,
        };

        let workspace = WorkspaceDto::new(
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "Test Project".to_string(),
            "/Users/test/project".to_string(),
            "/Users/test/project".to_string(),
            directory_listing,
        );

        assert_eq!(workspace.project_id, "proj_12345678-1234-1234-1234-123456789012");
        assert_eq!(workspace.project_name, "Test Project");
        assert_eq!(workspace.source_folder, "/Users/test/project");
        assert_eq!(workspace.current_path, "/Users/test/project");
        assert!(workspace.is_at_root());
        assert_eq!(workspace.relative_path(), "");
    }

    #[test]
    fn test_workspace_dto_in_subdirectory() {
        let directory_listing = DirectoryListingDto {
            entries: vec![],
            is_root: false,
            parent_path: Some("/Users/test/project".to_string()),
            can_navigate_up: true,
        };

        let workspace = WorkspaceDto::new(
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "Test Project".to_string(),
            "/Users/test/project".to_string(),
            "/Users/test/project/documents".to_string(),
            directory_listing,
        );

        assert!(!workspace.is_at_root());
        assert_eq!(workspace.relative_path(), "documents");
    }

    #[test]
    fn test_workspace_dto_serialization() {
        let directory_listing = DirectoryListingDto {
            entries: vec![],
            is_root: true,
            parent_path: None,
            can_navigate_up: false,
        };

        let workspace = WorkspaceDto::new(
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "Test Project".to_string(),
            "/Users/test/project".to_string(),
            "/Users/test/project".to_string(),
            directory_listing,
        );

        let serialized = serde_json::to_string(&workspace).unwrap();
        let deserialized: WorkspaceDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(workspace, deserialized);
    }
}