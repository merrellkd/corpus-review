use serde::{Deserialize, Serialize};
use super::super::value_objects::{
    project_id::ProjectId,
    project_name::ProjectName,
    folder_path::FolderPath,
    project_note::ProjectNote,
    created_at::CreatedAt,
};
use super::super::errors::project_error::ProjectError;

/// Project aggregate root representing a document analysis project
///
/// Business Rules:
/// - Each project has a unique identifier
/// - Project name is required and must be valid
/// - Source folder must exist and be accessible
/// - Note is optional but validated when provided
/// - Creation timestamp is immutable
/// - Projects can be updated (name, note) but not source folder
/// - Source folder changes require creating a new project
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Project {
    id: ProjectId,
    name: ProjectName,
    source_folder: FolderPath,
    note: Option<ProjectNote>,
    created_at: CreatedAt,
}

impl Project {
    /// Create a new Project with required fields
    pub fn new(
        name: String,
        source_folder: String,
        note: Option<String>,
    ) -> Result<Self, ProjectError> {
        let project_name = ProjectName::new(name)
            .map_err(ProjectError::InvalidName)?;

        let folder_path = FolderPath::new(source_folder)
            .map_err(ProjectError::InvalidPath)?;

        let project_note = ProjectNote::from_optional(note)
            .map_err(ProjectError::InvalidNote)?;

        Ok(Project {
            id: ProjectId::new(),
            name: project_name,
            source_folder: folder_path,
            note: project_note,
            created_at: CreatedAt::now(),
        })
    }

    /// Create a Project from existing data (for repository reconstruction)
    pub fn from_data(
        id: String,
        name: String,
        source_folder: String,
        note: Option<String>,
        created_at: String,
    ) -> Result<Self, ProjectError> {
        let project_id = ProjectId::from_string(id)
            .map_err(|_| ProjectError::InvalidId)?;

        let project_name = ProjectName::new(name)
            .map_err(ProjectError::InvalidName)?;

        let folder_path = FolderPath::new(source_folder)
            .map_err(ProjectError::InvalidPath)?;

        let project_note = ProjectNote::from_optional(note)
            .map_err(ProjectError::InvalidNote)?;

        let timestamp = CreatedAt::from_string(created_at)
            .map_err(ProjectError::InvalidTimestamp)?;

        Ok(Project {
            id: project_id,
            name: project_name,
            source_folder: folder_path,
            note: project_note,
            created_at: timestamp,
        })
    }

    /// Get the project ID
    pub fn id(&self) -> &ProjectId {
        &self.id
    }

    /// Get the project name
    pub fn name(&self) -> &ProjectName {
        &self.name
    }

    /// Get the source folder path
    pub fn source_folder(&self) -> &FolderPath {
        &self.source_folder
    }

    /// Get the project note (if any)
    pub fn note(&self) -> Option<&ProjectNote> {
        self.note.as_ref()
    }

    /// Get the creation timestamp
    pub fn created_at(&self) -> &CreatedAt {
        &self.created_at
    }

    /// Update the project name
    pub fn update_name(&mut self, new_name: String) -> Result<(), ProjectError> {
        let project_name = ProjectName::new(new_name)
            .map_err(ProjectError::InvalidName)?;
        self.name = project_name;
        Ok(())
    }

    /// Update the project note
    pub fn update_note(&mut self, new_note: Option<String>) -> Result<(), ProjectError> {
        let project_note = ProjectNote::from_optional(new_note)
            .map_err(ProjectError::InvalidNote)?;
        self.note = project_note;
        Ok(())
    }

    /// Clear the project note
    pub fn clear_note(&mut self) {
        self.note = None;
    }

    /// Check if the source folder is still accessible
    pub fn is_source_accessible(&self) -> bool {
        self.source_folder.is_accessible()
    }

    /// Get a display-friendly project summary
    pub fn summary(&self) -> String {
        let note_preview = self.note
            .as_ref()
            .map(|n| format!(" - {}", n.preview(50)))
            .unwrap_or_default();

        format!(
            "{} ({}){}",
            self.name.value(),
            self.source_folder.folder_name().unwrap_or_else(|| "Unknown".to_string()),
            note_preview
        )
    }

    /// Get project metadata for display
    pub fn metadata(&self) -> ProjectMetadata {
        ProjectMetadata {
            id: self.id.clone(),
            name: self.name.clone(),
            source_folder_name: self.source_folder.folder_name(),
            source_folder_path: self.source_folder.as_string(),
            note_preview: self.note.as_ref().map(|n| n.preview(100)),
            note_line_count: self.note.as_ref().map(|n| n.line_count()),
            created_at: self.created_at.clone(),
            is_accessible: self.is_source_accessible(),
        }
    }

    /// Validate that the project is in a consistent state
    pub fn validate(&self) -> Result<(), ProjectError> {
        // All value objects are already validated, but check business rules
        if !self.is_source_accessible() {
            return Err(ProjectError::SourceNotAccessible);
        }
        Ok(())
    }
}

/// Project metadata for UI display and serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectMetadata {
    pub id: ProjectId,
    pub name: ProjectName,
    pub source_folder_name: Option<String>,
    pub source_folder_path: String,
    pub note_preview: Option<String>,
    pub note_line_count: Option<usize>,
    pub created_at: CreatedAt,
    pub is_accessible: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/project_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    #[test]
    fn test_new_project_creation() {
        let test_folder = setup_test_folder("new_project");

        let project = Project::new(
            "Test Project".to_string(),
            test_folder.clone(),
            Some("Test note".to_string())
        );

        assert!(project.is_ok());
        let proj = project.unwrap();
        assert_eq!(proj.name().value(), "Test Project");
        assert_eq!(proj.source_folder().as_string(), test_folder);
        assert!(proj.note().is_some());
        assert_eq!(proj.note().unwrap().value(), "Test note");

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_new_project_without_note() {
        let test_folder = setup_test_folder("no_note");

        let project = Project::new(
            "Project No Note".to_string(),
            test_folder.clone(),
            None
        );

        assert!(project.is_ok());
        let proj = project.unwrap();
        assert!(proj.note().is_none());

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_new_project_with_invalid_name() {
        let test_folder = setup_test_folder("invalid_name");

        let project = Project::new(
            "".to_string(), // Invalid empty name
            test_folder.clone(),
            None
        );

        assert!(project.is_err());
        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_new_project_with_invalid_folder() {
        let project = Project::new(
            "Valid Name".to_string(),
            "/nonexistent/folder".to_string(), // Invalid folder
            None
        );

        assert!(project.is_err());
    }

    #[test]
    fn test_from_data_reconstruction() {
        let test_folder = setup_test_folder("from_data");

        let project = Project::from_data(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            "Reconstructed Project".to_string(),
            test_folder.clone(),
            Some("Reconstructed note".to_string()),
            "2023-12-01T10:30:00Z".to_string()
        );

        assert!(project.is_ok());
        let proj = project.unwrap();
        assert_eq!(proj.id().value(), "proj_550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(proj.name().value(), "Reconstructed Project");

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_update_name() {
        let test_folder = setup_test_folder("update_name");
        let mut project = Project::new(
            "Original Name".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        let result = project.update_name("Updated Name".to_string());
        assert!(result.is_ok());
        assert_eq!(project.name().value(), "Updated Name");

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_update_name_with_invalid_name() {
        let test_folder = setup_test_folder("invalid_update");
        let mut project = Project::new(
            "Valid Name".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        let result = project.update_name("".to_string()); // Invalid empty name
        assert!(result.is_err());
        assert_eq!(project.name().value(), "Valid Name"); // Should remain unchanged

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_update_note() {
        let test_folder = setup_test_folder("update_note");
        let mut project = Project::new(
            "Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        assert!(project.note().is_none());

        let result = project.update_note(Some("New note".to_string()));
        assert!(result.is_ok());
        assert!(project.note().is_some());
        assert_eq!(project.note().unwrap().value(), "New note");

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_clear_note() {
        let test_folder = setup_test_folder("clear_note");
        let mut project = Project::new(
            "Project".to_string(),
            test_folder.clone(),
            Some("Initial note".to_string())
        ).unwrap();

        assert!(project.note().is_some());

        project.clear_note();
        assert!(project.note().is_none());

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_summary() {
        let test_folder = setup_test_folder("summary");
        let project = Project::new(
            "Summary Test".to_string(),
            test_folder.clone(),
            Some("This is a test note for summary display".to_string())
        ).unwrap();

        let summary = project.summary();
        assert!(summary.contains("Summary Test"));
        assert!(summary.contains("This is a test note for summary"));

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_metadata() {
        let test_folder = setup_test_folder("metadata");
        let project = Project::new(
            "Metadata Test".to_string(),
            test_folder.clone(),
            Some("Multi\nline\nnote".to_string())
        ).unwrap();

        let metadata = project.metadata();
        assert_eq!(metadata.name.value(), "Metadata Test");
        assert!(metadata.note_preview.is_some());
        assert_eq!(metadata.note_line_count, Some(3));
        assert!(metadata.is_accessible);

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_validation() {
        let test_folder = setup_test_folder("validation");
        let project = Project::new(
            "Valid Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        assert!(project.validate().is_ok());

        cleanup_test_folder(&test_folder);

        // After cleanup, validation should fail
        assert!(project.validate().is_err());
    }

    #[test]
    fn test_project_equality() {
        let test_folder = setup_test_folder("equality");

        let project1 = Project::new(
            "Same Project".to_string(),
            test_folder.clone(),
            Some("Same note".to_string())
        ).unwrap();

        let project2 = Project::from_data(
            project1.id().value().to_string(),
            "Same Project".to_string(),
            test_folder.clone(),
            Some("Same note".to_string()),
            project1.created_at().to_string()
        ).unwrap();

        let project3 = Project::new(
            "Different Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        assert_eq!(project1, project2);
        assert_ne!(project1, project3);

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_serialization() {
        let test_folder = setup_test_folder("serialization");
        let project = Project::new(
            "Serialization Test".to_string(),
            test_folder.clone(),
            Some("Serialized note".to_string())
        ).unwrap();

        let serialized = serde_json::to_string(&project).unwrap();
        let deserialized: Project = serde_json::from_str(&serialized).unwrap();

        assert_eq!(project, deserialized);

        cleanup_test_folder(&test_folder);
    }
}