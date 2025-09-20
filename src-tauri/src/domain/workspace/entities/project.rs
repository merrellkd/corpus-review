use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::domain::workspace::value_objects::{ProjectId, FilePath};
use crate::domain::workspace::entities::workspace_layout::WorkspaceLayout;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub id: ProjectId,
    pub name: String,
    pub source_folder_path: FilePath,
    pub reports_folder_path: FilePath,
    pub workspace_layout: Option<WorkspaceLayout>,
}

impl Project {
    pub fn new(
        name: String,
        source_folder_path: FilePath,
        reports_folder_path: FilePath,
    ) -> Result<Self, String> {
        Self::validate_name(&name)?;
        Self::validate_folder_paths(&source_folder_path, &reports_folder_path)?;

        let id = ProjectId::new();

        Ok(Self {
            id: id.clone(),
            name,
            source_folder_path,
            reports_folder_path,
            workspace_layout: Some(WorkspaceLayout::new(id)),
        })
    }

    pub fn update_name(&mut self, name: String) -> Result<(), String> {
        Self::validate_name(&name)?;
        self.name = name;
        Ok(())
    }

    pub fn source_folder(&self) -> &FilePath {
        &self.source_folder_path
    }

    pub fn reports_folder(&self) -> &FilePath {
        &self.reports_folder_path
    }

    pub fn update_source_folder(&mut self, source_folder_path: FilePath) -> Result<(), String> {
        Self::validate_folder_path(&source_folder_path, "Source")?;

        // Ensure different from reports folder
        if source_folder_path == self.reports_folder_path {
            return Err("Source and Reports folders cannot be the same".to_string());
        }

        self.source_folder_path = source_folder_path;
        Ok(())
    }

    pub fn update_reports_folder(&mut self, reports_folder_path: FilePath) -> Result<(), String> {
        Self::validate_folder_path(&reports_folder_path, "Reports")?;

        // Ensure different from source folder
        if reports_folder_path == self.source_folder_path {
            return Err("Source and Reports folders cannot be the same".to_string());
        }

        self.reports_folder_path = reports_folder_path;
        Ok(())
    }

    pub fn get_workspace_layout(&self) -> Option<&WorkspaceLayout> {
        self.workspace_layout.as_ref()
    }

    pub fn get_workspace_layout_mut(&mut self) -> Option<&mut WorkspaceLayout> {
        self.workspace_layout.as_mut()
    }

    pub fn update_workspace_layout(&mut self, layout: WorkspaceLayout) -> Result<(), String> {
        // Ensure layout belongs to this project
        if layout.project_id != self.id {
            return Err("Workspace layout does not belong to this project".to_string());
        }

        self.workspace_layout = Some(layout);
        Ok(())
    }

    pub fn is_path_within_project(&self, path: &str) -> bool {
        path.starts_with(self.source_folder_path.as_str())
            || path.starts_with(self.reports_folder_path.as_str())
    }

    pub fn get_folder_type(&self, path: &str) -> Option<ProjectFolderType> {
        if path.starts_with(self.source_folder_path.as_str()) {
            Some(ProjectFolderType::Source)
        } else if path.starts_with(self.reports_folder_path.as_str()) {
            Some(ProjectFolderType::Reports)
        } else {
            None
        }
    }

    fn validate_name(name: &str) -> Result<(), String> {
        if name.trim().is_empty() {
            return Err("Project name cannot be empty".to_string());
        }

        if name.len() > 100 {
            return Err("Project name cannot exceed 100 characters".to_string());
        }

        // Check for invalid characters
        let invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
        if name.chars().any(|c| invalid_chars.contains(&c)) {
            return Err("Project name contains invalid characters".to_string());
        }

        Ok(())
    }

    fn validate_folder_paths(
        source_path: &FilePath,
        reports_path: &FilePath,
    ) -> Result<(), String> {
        Self::validate_folder_path(source_path, "Source")?;
        Self::validate_folder_path(reports_path, "Reports")?;

        if source_path == reports_path {
            return Err("Source and Reports folders cannot be the same".to_string());
        }

        // Check if one path is a subdirectory of the other
        let source_str = source_path.as_str();
        let reports_str = reports_path.as_str();

        if source_str.starts_with(reports_str) || reports_str.starts_with(source_str) {
            return Err("Source and Reports folders cannot be nested within each other".to_string());
        }

        Ok(())
    }

    fn validate_folder_path(path: &FilePath, folder_type: &str) -> Result<(), String> {
        let path_str = path.as_str();

        if !Path::new(path_str).is_absolute() {
            return Err(format!("{} folder path must be absolute", folder_type));
        }

        // Additional validation could include checking if directory exists
        // but we'll keep this as domain logic only for now

        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ProjectFolderType {
    Source,
    Reports,
}

impl ProjectFolderType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ProjectFolderType::Source => "source",
            ProjectFolderType::Reports => "reports",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_project() {
        let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
        let reports_path = FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap();

        let project = Project::new(
            "Test Project".to_string(),
            source_path.clone(),
            reports_path.clone(),
        ).unwrap();

        assert_eq!(project.name, "Test Project");
        assert_eq!(project.source_folder_path, source_path);
        assert_eq!(project.reports_folder_path, reports_path);
        assert!(project.workspace_layout.is_some());
    }

    #[test]
    fn test_validate_name() {
        // Valid name
        assert!(Project::validate_name("Valid Project Name").is_ok());

        // Empty name
        assert!(Project::validate_name("").is_err());
        assert!(Project::validate_name("   ").is_err());

        // Too long name
        let long_name = "a".repeat(101);
        assert!(Project::validate_name(&long_name).is_err());

        // Invalid characters
        assert!(Project::validate_name("Project/Name").is_err());
        assert!(Project::validate_name("Project\\Name").is_err());
        assert!(Project::validate_name("Project:Name").is_err());
    }

    #[test]
    fn test_same_folder_paths_rejected() {
        let same_path = FilePath::new("/Users/test/Documents/Folder".to_string()).unwrap();

        let result = Project::new(
            "Test Project".to_string(),
            same_path.clone(),
            same_path,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be the same"));
    }

    #[test]
    fn test_nested_folder_paths_rejected() {
        let parent_path = FilePath::new("/Users/test/Documents".to_string()).unwrap();
        let child_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();

        let result = Project::new(
            "Test Project".to_string(),
            parent_path,
            child_path,
        );

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("cannot be nested"));
    }

    #[test]
    fn test_update_folder_paths() {
        let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
        let reports_path = FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap();
        let new_source_path = FilePath::new("/Users/test/NewSource".to_string()).unwrap();

        let mut project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path.clone(),
        ).unwrap();

        let result = project.update_source_folder(new_source_path.clone());
        assert!(result.is_ok());
        assert_eq!(project.source_folder_path, new_source_path);

        // Test rejection of same path
        let result = project.update_source_folder(reports_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_path_within_project() {
        let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
        let reports_path = FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap();

        let project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path,
        ).unwrap();

        assert!(project.is_path_within_project("/Users/test/Documents/Source/file.txt"));
        assert!(project.is_path_within_project("/Users/test/Documents/Reports/report.pdf"));
        assert!(!project.is_path_within_project("/Users/test/Documents/Other/file.txt"));
    }

    #[test]
    fn test_get_folder_type() {
        let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
        let reports_path = FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap();

        let project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path,
        ).unwrap();

        assert_eq!(
            project.get_folder_type("/Users/test/Documents/Source/file.txt"),
            Some(ProjectFolderType::Source)
        );

        assert_eq!(
            project.get_folder_type("/Users/test/Documents/Reports/report.pdf"),
            Some(ProjectFolderType::Reports)
        );

        assert_eq!(
            project.get_folder_type("/Users/test/Documents/Other/file.txt"),
            None
        );
    }

    #[test]
    fn test_workspace_layout_management() {
        let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
        let reports_path = FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap();

        let mut project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path,
        ).unwrap();

        let layout = project.get_workspace_layout().unwrap().clone();
        assert_eq!(layout.project_id, project.id);

        // Test updating with valid layout
        let result = project.update_workspace_layout(layout);
        assert!(result.is_ok());

        // Test updating with layout from different project
        let other_project_id = ProjectId::new();
        let invalid_layout = WorkspaceLayout::new(other_project_id);
        let result = project.update_workspace_layout(invalid_layout);
        assert!(result.is_err());
    }
}