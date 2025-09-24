use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

use crate::domain::project::{Project, ProjectMetadata, ProjectError};

/// Data Transfer Object for Project aggregate
///
/// This DTO is used for serialization/deserialization when communicating
/// with the frontend or external APIs. It provides a stable interface
/// that can evolve independently of the domain model.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub source_folder: String,
    pub source_folder_name: Option<String>,
    pub note: Option<String>,
    pub note_preview: Option<String>,
    pub note_line_count: Option<usize>,
    pub created_at: String,
    pub is_accessible: bool,
}

impl ProjectDto {
    /// Convert from domain Project to DTO
    pub fn from_project(project: &Project) -> Self {
        let metadata = project.metadata();

        ProjectDto {
            id: project.id().value().to_string(),
            name: project.name().value().to_string(),
            source_folder: project.source_folder().as_string(),
            source_folder_name: project.source_folder().folder_name(),
            note: project.note().map(|n| n.value().to_string()),
            note_preview: project.note().map(|n| n.preview(100)),
            note_line_count: project.note().map(|n| n.line_count()),
            created_at: project.created_at().to_string(),
            is_accessible: project.is_source_accessible(),
        }
    }

    /// Convert from domain ProjectMetadata to DTO
    pub fn from_metadata(metadata: &ProjectMetadata) -> Self {
        ProjectDto {
            id: metadata.id.value().to_string(),
            name: metadata.name.value().to_string(),
            source_folder: metadata.source_folder_path.clone(),
            source_folder_name: metadata.source_folder_name.clone(),
            note: metadata.note_preview.clone(), // For metadata, we use the preview as the note
            note_preview: metadata.note_preview.clone(),
            note_line_count: metadata.note_line_count,
            created_at: metadata.created_at.to_string(),
            is_accessible: metadata.is_accessible,
        }
    }

    /// Convert to domain Project (for reconstruction from storage)
    pub fn to_project(&self) -> Result<Project, ProjectError> {
        Project::from_data(
            self.id.clone(),
            self.name.clone(),
            self.source_folder.clone(),
            self.note.clone(),
            self.created_at.clone(),
        )
    }

    /// Get a display-friendly summary
    pub fn display_summary(&self) -> String {
        let folder_name = self.source_folder_name
            .as_ref()
            .unwrap_or(&"Unknown".to_string());

        let note_suffix = self.note_preview
            .as_ref()
            .map(|n| format!(" - {}", n))
            .unwrap_or_default();

        format!("{} ({}){}",self.name, folder_name, note_suffix)
    }

    /// Get formatted creation date for display
    pub fn formatted_date(&self) -> Result<String, ProjectError> {
        let datetime: DateTime<Utc> = self.created_at.parse()
            .map_err(|_| ProjectError::InvalidId)?;

        Ok(datetime.format("%Y-%m-%d %H:%M UTC").to_string())
    }

    /// Check if the project has a note
    pub fn has_note(&self) -> bool {
        self.note.is_some() && !self.note.as_ref().unwrap().is_empty()
    }

    /// Get the note length in characters (0 if no note)
    pub fn note_length(&self) -> usize {
        self.note.as_ref().map(|n| n.len()).unwrap_or(0)
    }

    /// Validate the DTO structure
    pub fn validate(&self) -> Result<(), ProjectDtoError> {
        // Validate ID format
        if !self.id.starts_with("proj_") {
            return Err(ProjectDtoError::InvalidIdFormat);
        }

        // Validate name
        if self.name.trim().is_empty() {
            return Err(ProjectDtoError::EmptyName);
        }

        if self.name.len() > 255 {
            return Err(ProjectDtoError::NameTooLong);
        }

        // Validate source folder
        if self.source_folder.trim().is_empty() {
            return Err(ProjectDtoError::EmptySourceFolder);
        }

        // Validate note length
        if let Some(note) = &self.note {
            if note.len() > 1000 {
                return Err(ProjectDtoError::NoteTooLong);
            }
        }

        // Validate timestamp format
        if self.created_at.parse::<DateTime<Utc>>().is_err() {
            return Err(ProjectDtoError::InvalidTimestamp);
        }

        Ok(())
    }
}

/// List of ProjectDtos with pagination info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectListDto {
    pub projects: Vec<ProjectDto>,
    pub total_count: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

impl ProjectListDto {
    /// Create a new ProjectListDto
    pub fn new(
        projects: Vec<ProjectDto>,
        total_count: usize,
        offset: usize,
        limit: usize,
    ) -> Self {
        let has_more = offset + projects.len() < total_count;

        ProjectListDto {
            projects,
            total_count,
            offset,
            limit,
            has_more,
        }
    }

    /// Create from a list of domain Projects
    pub fn from_projects(
        projects: Vec<Project>,
        total_count: usize,
        offset: usize,
        limit: usize,
    ) -> Self {
        let project_dtos = projects.iter()
            .map(ProjectDto::from_project)
            .collect();

        Self::new(project_dtos, total_count, offset, limit)
    }

    /// Check if the list is empty
    pub fn is_empty(&self) -> bool {
        self.projects.is_empty()
    }

    /// Get the number of projects in this page
    pub fn page_size(&self) -> usize {
        self.projects.len()
    }

    /// Calculate the current page number (1-based)
    pub fn current_page(&self) -> usize {
        if self.limit == 0 {
            1
        } else {
            (self.offset / self.limit) + 1
        }
    }

    /// Calculate the total number of pages
    pub fn total_pages(&self) -> usize {
        if self.limit == 0 || self.total_count == 0 {
            1
        } else {
            (self.total_count + self.limit - 1) / self.limit
        }
    }
}

/// Statistics DTO for repository information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryStatsDto {
    pub total_projects: usize,
    pub accessible_projects: usize,
    pub inaccessible_projects: usize,
    pub accessibility_percentage: f64,
    pub projects_with_notes: usize,
    pub notes_percentage: f64,
    pub average_name_length: f64,
    pub oldest_project_date: Option<String>,
    pub newest_project_date: Option<String>,
    pub database_size_bytes: Option<u64>,
}

impl RepositoryStatsDto {
    /// Convert from domain RepositoryStats
    pub fn from_stats(stats: &crate::domain::project::RepositoryStats) -> Self {
        RepositoryStatsDto {
            total_projects: stats.total_projects,
            accessible_projects: stats.accessible_projects,
            inaccessible_projects: stats.inaccessible_projects,
            accessibility_percentage: stats.accessibility_percentage(),
            projects_with_notes: stats.projects_with_notes,
            notes_percentage: stats.notes_percentage(),
            average_name_length: stats.average_name_length,
            oldest_project_date: stats.oldest_project_date.map(|d| d.to_rfc3339()),
            newest_project_date: stats.newest_project_date.map(|d| d.to_rfc3339()),
            database_size_bytes: stats.database_size_bytes,
        }
    }

    /// Get formatted database size
    pub fn formatted_database_size(&self) -> String {
        match self.database_size_bytes {
            Some(size) => format_bytes(size),
            None => "Unknown".to_string(),
        }
    }
}

/// Format bytes into human-readable format
fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: u64 = 1024;

    if bytes < THRESHOLD {
        return format!("{} B", bytes);
    }

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= THRESHOLD as f64 && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD as f64;
        unit_index += 1;
    }

    format!("{:.1} {}", size, UNITS[unit_index])
}

/// Errors that can occur during DTO validation or conversion
#[derive(Debug, thiserror::Error)]
pub enum ProjectDtoError {
    #[error("Invalid project ID format - must start with 'proj_'")]
    InvalidIdFormat,
    #[error("Project name cannot be empty")]
    EmptyName,
    #[error("Project name is too long (max 255 characters)")]
    NameTooLong,
    #[error("Source folder cannot be empty")]
    EmptySourceFolder,
    #[error("Project note is too long (max 1000 characters)")]
    NoteTooLong,
    #[error("Invalid timestamp format")]
    InvalidTimestamp,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/dto_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    #[test]
    fn test_project_dto_from_project() {
        let test_folder = setup_test_folder("from_project");

        let project = Project::new(
            "Test Project".to_string(),
            test_folder.clone(),
            Some("Test note content".to_string())
        ).unwrap();

        let dto = ProjectDto::from_project(&project);

        assert!(dto.id.starts_with("proj_"));
        assert_eq!(dto.name, "Test Project");
        assert_eq!(dto.source_folder, test_folder);
        assert!(dto.note.is_some());
        assert_eq!(dto.note.unwrap(), "Test note content");
        assert!(dto.note_preview.is_some());
        assert_eq!(dto.note_line_count, Some(1));

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_dto_to_project() {
        let test_folder = setup_test_folder("to_project");

        let dto = ProjectDto {
            id: "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            name: "Test Project".to_string(),
            source_folder: test_folder.clone(),
            source_folder_name: Some("dto_test_to_project".to_string()),
            note: Some("Test note".to_string()),
            note_preview: Some("Test note".to_string()),
            note_line_count: Some(1),
            created_at: "2023-12-01T10:30:00Z".to_string(),
            is_accessible: true,
        };

        let result = dto.to_project();
        assert!(result.is_ok());

        let project = result.unwrap();
        assert_eq!(project.id().value(), "proj_550e8400-e29b-41d4-a716-446655440000");
        assert_eq!(project.name().value(), "Test Project");

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_project_dto_validation() {
        let valid_dto = ProjectDto {
            id: "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            name: "Valid Project".to_string(),
            source_folder: "/valid/path".to_string(),
            source_folder_name: Some("path".to_string()),
            note: Some("Valid note".to_string()),
            note_preview: Some("Valid note".to_string()),
            note_line_count: Some(1),
            created_at: "2023-12-01T10:30:00Z".to_string(),
            is_accessible: true,
        };

        assert!(valid_dto.validate().is_ok());

        // Test invalid ID format
        let mut invalid_dto = valid_dto.clone();
        invalid_dto.id = "invalid_id".to_string();
        assert!(matches!(invalid_dto.validate().unwrap_err(), ProjectDtoError::InvalidIdFormat));

        // Test empty name
        let mut invalid_dto = valid_dto.clone();
        invalid_dto.name = "".to_string();
        assert!(matches!(invalid_dto.validate().unwrap_err(), ProjectDtoError::EmptyName));

        // Test long name
        let mut invalid_dto = valid_dto.clone();
        invalid_dto.name = "x".repeat(256);
        assert!(matches!(invalid_dto.validate().unwrap_err(), ProjectDtoError::NameTooLong));

        // Test long note
        let mut invalid_dto = valid_dto.clone();
        invalid_dto.note = Some("x".repeat(1001));
        assert!(matches!(invalid_dto.validate().unwrap_err(), ProjectDtoError::NoteTooLong));

        // Test invalid timestamp
        let mut invalid_dto = valid_dto.clone();
        invalid_dto.created_at = "invalid-timestamp".to_string();
        assert!(matches!(invalid_dto.validate().unwrap_err(), ProjectDtoError::InvalidTimestamp));
    }

    #[test]
    fn test_project_list_dto() {
        let test_folder = setup_test_folder("list_dto");

        let projects = vec![
            Project::new("Project 1".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("Project 2".to_string(), test_folder.clone(), None).unwrap(),
        ];

        let list_dto = ProjectListDto::from_projects(projects, 10, 0, 5);

        assert_eq!(list_dto.projects.len(), 2);
        assert_eq!(list_dto.total_count, 10);
        assert_eq!(list_dto.offset, 0);
        assert_eq!(list_dto.limit, 5);
        assert!(list_dto.has_more);
        assert_eq!(list_dto.current_page(), 1);
        assert_eq!(list_dto.total_pages(), 2);

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(0), "0 B");
        assert_eq!(format_bytes(512), "512 B");
        assert_eq!(format_bytes(1024), "1.0 KB");
        assert_eq!(format_bytes(1536), "1.5 KB");
        assert_eq!(format_bytes(1048576), "1.0 MB");
        assert_eq!(format_bytes(1073741824), "1.0 GB");
    }

    #[test]
    fn test_project_dto_helper_methods() {
        let dto = ProjectDto {
            id: "proj_test".to_string(),
            name: "Helper Test".to_string(),
            source_folder: "/test/path".to_string(),
            source_folder_name: Some("path".to_string()),
            note: Some("Test note content".to_string()),
            note_preview: Some("Test note...".to_string()),
            note_line_count: Some(2),
            created_at: "2023-12-01T10:30:00Z".to_string(),
            is_accessible: true,
        };

        assert!(dto.has_note());
        assert_eq!(dto.note_length(), 17);

        let summary = dto.display_summary();
        assert!(summary.contains("Helper Test"));
        assert!(summary.contains("path"));
        assert!(summary.contains("Test note"));

        let formatted_date = dto.formatted_date().unwrap();
        assert!(formatted_date.contains("2023-12-01"));
    }

    #[test]
    fn test_project_dto_without_note() {
        let dto = ProjectDto {
            id: "proj_test".to_string(),
            name: "No Note Test".to_string(),
            source_folder: "/test/path".to_string(),
            source_folder_name: Some("path".to_string()),
            note: None,
            note_preview: None,
            note_line_count: None,
            created_at: "2023-12-01T10:30:00Z".to_string(),
            is_accessible: true,
        };

        assert!(!dto.has_note());
        assert_eq!(dto.note_length(), 0);

        let summary = dto.display_summary();
        assert!(summary.contains("No Note Test"));
        assert!(summary.contains("path"));
        assert!(!summary.contains(" - "));
    }
}