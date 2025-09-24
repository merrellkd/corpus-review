use serde::{Deserialize, Serialize};

/// Request DTO for creating a new project
///
/// This DTO represents the data required to create a new project.
/// It's used for validation and deserialization of incoming requests
/// from the frontend or external APIs.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    /// The name of the project (required, 1-255 characters)
    pub name: String,

    /// The path to the source folder (required, must exist and be a directory)
    pub source_folder: String,

    /// Optional project note/description (max 1000 characters)
    pub note: Option<String>,
}

impl CreateProjectRequest {
    /// Create a new CreateProjectRequest
    pub fn new(
        name: String,
        source_folder: String,
        note: Option<String>,
    ) -> Self {
        CreateProjectRequest {
            name,
            source_folder,
            note,
        }
    }

    /// Validate the request data
    pub fn validate(&self) -> Result<(), CreateProjectRequestError> {
        // Validate name
        let trimmed_name = self.name.trim();
        if trimmed_name.is_empty() {
            return Err(CreateProjectRequestError::NameRequired);
        }

        if trimmed_name.len() > 255 {
            return Err(CreateProjectRequestError::NameTooLong);
        }

        // Validate source folder
        let trimmed_folder = self.source_folder.trim();
        if trimmed_folder.is_empty() {
            return Err(CreateProjectRequestError::SourceFolderRequired);
        }

        // Validate note if provided
        if let Some(note) = &self.note {
            let trimmed_note = note.trim();
            if !trimmed_note.is_empty() && trimmed_note.len() > 1000 {
                return Err(CreateProjectRequestError::NoteTooLong);
            }
        }

        Ok(())
    }

    /// Get the trimmed project name
    pub fn get_name(&self) -> String {
        self.name.trim().to_string()
    }

    /// Get the trimmed source folder path
    pub fn get_source_folder(&self) -> String {
        self.source_folder.trim().to_string()
    }

    /// Get the trimmed note (None if empty or whitespace-only)
    pub fn get_note(&self) -> Option<String> {
        self.note
            .as_ref()
            .map(|n| n.trim())
            .filter(|n| !n.is_empty())
            .map(|n| n.to_string())
    }

    /// Convert to domain creation parameters after validation
    pub fn to_domain_params(&self) -> Result<(String, String, Option<String>), CreateProjectRequestError> {
        self.validate()?;
        Ok((
            self.get_name(),
            self.get_source_folder(),
            self.get_note(),
        ))
    }

    /// Check if the request has a meaningful note
    pub fn has_note(&self) -> bool {
        self.get_note().is_some()
    }

    /// Get the character count of the note (0 if no note)
    pub fn note_length(&self) -> usize {
        self.get_note()
            .map(|n| n.len())
            .unwrap_or(0)
    }

    /// Get validation summary for debugging
    pub fn validation_summary(&self) -> ValidationSummary {
        let name_len = self.get_name().len();
        let note_len = self.note_length();

        ValidationSummary {
            name_length: name_len,
            name_valid: name_len > 0 && name_len <= 255,
            source_folder_valid: !self.get_source_folder().is_empty(),
            note_length: note_len,
            note_valid: note_len <= 1000,
            overall_valid: self.validate().is_ok(),
        }
    }
}

/// Summary of validation status for debugging
#[derive(Debug, Clone)]
pub struct ValidationSummary {
    pub name_length: usize,
    pub name_valid: bool,
    pub source_folder_valid: bool,
    pub note_length: usize,
    pub note_valid: bool,
    pub overall_valid: bool,
}

impl ValidationSummary {
    /// Get a human-readable validation report
    pub fn report(&self) -> String {
        let mut issues = Vec::new();

        if !self.name_valid {
            if self.name_length == 0 {
                issues.push("Name is required".to_string());
            } else {
                issues.push(format!("Name is too long ({} > 255 characters)", self.name_length));
            }
        }

        if !self.source_folder_valid {
            issues.push("Source folder is required".to_string());
        }

        if !self.note_valid {
            issues.push(format!("Note is too long ({} > 1000 characters)", self.note_length));
        }

        if issues.is_empty() {
            "All fields are valid".to_string()
        } else {
            format!("Validation issues: {}", issues.join(", "))
        }
    }
}

/// Update request DTO for modifying existing projects
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    /// The project ID to update
    pub id: String,

    /// New project name (optional, if provided must be 1-255 characters)
    pub name: Option<String>,

    /// New project note (optional, if provided must be max 1000 characters)
    /// Use Some(String::new()) to clear the note
    pub note: Option<String>,
}

impl UpdateProjectRequest {
    /// Create a new UpdateProjectRequest
    pub fn new(
        id: String,
        name: Option<String>,
        note: Option<String>,
    ) -> Self {
        UpdateProjectRequest { id, name, note }
    }

    /// Validate the update request
    pub fn validate(&self) -> Result<(), UpdateProjectRequestError> {
        // Validate project ID format
        if !self.id.starts_with("proj_") {
            return Err(UpdateProjectRequestError::InvalidIdFormat);
        }

        // Validate name if provided
        if let Some(name) = &self.name {
            let trimmed_name = name.trim();
            if trimmed_name.is_empty() {
                return Err(UpdateProjectRequestError::NameRequired);
            }
            if trimmed_name.len() > 255 {
                return Err(UpdateProjectRequestError::NameTooLong);
            }
        }

        // Validate note if provided
        if let Some(note) = &self.note {
            if note.len() > 1000 { // Don't trim for update - allow clearing with empty string
                return Err(UpdateProjectRequestError::NoteTooLong);
            }
        }

        Ok(())
    }

    /// Get the project ID
    pub fn get_id(&self) -> &str {
        &self.id
    }

    /// Get the trimmed project name (None if not provided)
    pub fn get_name(&self) -> Option<String> {
        self.name
            .as_ref()
            .map(|n| n.trim().to_string())
            .filter(|n| !n.is_empty())
    }

    /// Get the processed note for update
    /// Returns None if not provided, Some("") to clear, Some(content) for content
    pub fn get_note(&self) -> Option<Option<String>> {
        match &self.note {
            None => None, // Don't update note
            Some(note) => {
                let trimmed = note.trim();
                if trimmed.is_empty() {
                    Some(None) // Clear the note
                } else {
                    Some(Some(trimmed.to_string())) // Set to content
                }
            }
        }
    }

    /// Check if this request will update the name
    pub fn updates_name(&self) -> bool {
        self.get_name().is_some()
    }

    /// Check if this request will update the note
    pub fn updates_note(&self) -> bool {
        self.note.is_some()
    }

    /// Check if this request has any updates
    pub fn has_updates(&self) -> bool {
        self.updates_name() || self.updates_note()
    }
}

/// Delete request DTO for removing projects
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeleteProjectRequest {
    /// The project ID to delete
    pub id: String,

    /// Optional confirmation flag to prevent accidental deletions
    pub confirm: Option<bool>,
}

impl DeleteProjectRequest {
    /// Create a new DeleteProjectRequest
    pub fn new(id: String, confirm: Option<bool>) -> Self {
        DeleteProjectRequest { id, confirm }
    }

    /// Validate the delete request
    pub fn validate(&self) -> Result<(), DeleteProjectRequestError> {
        // Validate project ID format
        if !self.id.starts_with("proj_") {
            return Err(DeleteProjectRequestError::InvalidIdFormat);
        }

        // Check confirmation if required
        if !self.is_confirmed() {
            return Err(DeleteProjectRequestError::NotConfirmed);
        }

        Ok(())
    }

    /// Get the project ID
    pub fn get_id(&self) -> &str {
        &self.id
    }

    /// Check if deletion is confirmed
    pub fn is_confirmed(&self) -> bool {
        self.confirm.unwrap_or(false)
    }
}

/// Errors for CreateProjectRequest validation
#[derive(Debug, thiserror::Error)]
pub enum CreateProjectRequestError {
    #[error("Project name is required")]
    NameRequired,
    #[error("Project name is too long (max 255 characters)")]
    NameTooLong,
    #[error("Source folder is required")]
    SourceFolderRequired,
    #[error("Project note is too long (max 1000 characters)")]
    NoteTooLong,
}

/// Errors for UpdateProjectRequest validation
#[derive(Debug, thiserror::Error)]
pub enum UpdateProjectRequestError {
    #[error("Invalid project ID format - must start with 'proj_'")]
    InvalidIdFormat,
    #[error("Project name is required when updating name")]
    NameRequired,
    #[error("Project name is too long (max 255 characters)")]
    NameTooLong,
    #[error("Project note is too long (max 1000 characters)")]
    NoteTooLong,
}

/// Errors for DeleteProjectRequest validation
#[derive(Debug, thiserror::Error)]
pub enum DeleteProjectRequestError {
    #[error("Invalid project ID format - must start with 'proj_'")]
    InvalidIdFormat,
    #[error("Deletion must be confirmed")]
    NotConfirmed,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_project_request_validation() {
        // Valid request
        let valid_request = CreateProjectRequest::new(
            "Valid Project".to_string(),
            "/valid/path".to_string(),
            Some("Valid note".to_string()),
        );
        assert!(valid_request.validate().is_ok());

        // Empty name
        let empty_name = CreateProjectRequest::new(
            "".to_string(),
            "/valid/path".to_string(),
            None,
        );
        assert!(matches!(
            empty_name.validate().unwrap_err(),
            CreateProjectRequestError::NameRequired
        ));

        // Name too long
        let long_name = CreateProjectRequest::new(
            "x".repeat(256),
            "/valid/path".to_string(),
            None,
        );
        assert!(matches!(
            long_name.validate().unwrap_err(),
            CreateProjectRequestError::NameTooLong
        ));

        // Empty source folder
        let empty_folder = CreateProjectRequest::new(
            "Valid Name".to_string(),
            "".to_string(),
            None,
        );
        assert!(matches!(
            empty_folder.validate().unwrap_err(),
            CreateProjectRequestError::SourceFolderRequired
        ));

        // Note too long
        let long_note = CreateProjectRequest::new(
            "Valid Name".to_string(),
            "/valid/path".to_string(),
            Some("x".repeat(1001)),
        );
        assert!(matches!(
            long_note.validate().unwrap_err(),
            CreateProjectRequestError::NoteTooLong
        ));
    }

    #[test]
    fn test_create_project_request_trimming() {
        let request = CreateProjectRequest::new(
            "  Trimmed Name  ".to_string(),
            "  /trimmed/path  ".to_string(),
            Some("  Trimmed note  ".to_string()),
        );

        assert_eq!(request.get_name(), "Trimmed Name");
        assert_eq!(request.get_source_folder(), "/trimmed/path");
        assert_eq!(request.get_note().unwrap(), "Trimmed note");
    }

    #[test]
    fn test_create_project_request_empty_note_handling() {
        let request_with_empty_note = CreateProjectRequest::new(
            "Valid Name".to_string(),
            "/valid/path".to_string(),
            Some("   ".to_string()), // Whitespace-only note
        );

        assert!(request_with_empty_note.get_note().is_none());
        assert!(!request_with_empty_note.has_note());
        assert_eq!(request_with_empty_note.note_length(), 0);
    }

    #[test]
    fn test_update_project_request_validation() {
        // Valid update request
        let valid_update = UpdateProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some("Updated Name".to_string()),
            Some("Updated note".to_string()),
        );
        assert!(valid_update.validate().is_ok());

        // Invalid ID format
        let invalid_id = UpdateProjectRequest::new(
            "invalid_id".to_string(),
            Some("Name".to_string()),
            None,
        );
        assert!(matches!(
            invalid_id.validate().unwrap_err(),
            UpdateProjectRequestError::InvalidIdFormat
        ));

        // Empty name when updating
        let empty_name = UpdateProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some("".to_string()),
            None,
        );
        assert!(matches!(
            empty_name.validate().unwrap_err(),
            UpdateProjectRequestError::NameRequired
        ));
    }

    #[test]
    fn test_update_project_request_note_handling() {
        let request = UpdateProjectRequest::new(
            "proj_test".to_string(),
            None,
            Some("".to_string()), // Empty string to clear note
        );

        assert!(!request.updates_name());
        assert!(request.updates_note());
        assert_eq!(request.get_note(), Some(None)); // Clear the note
    }

    #[test]
    fn test_delete_project_request_validation() {
        // Valid deletion with confirmation
        let confirmed_delete = DeleteProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some(true),
        );
        assert!(confirmed_delete.validate().is_ok());

        // Not confirmed
        let not_confirmed = DeleteProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some(false),
        );
        assert!(matches!(
            not_confirmed.validate().unwrap_err(),
            DeleteProjectRequestError::NotConfirmed
        ));

        // Invalid ID
        let invalid_id = DeleteProjectRequest::new(
            "invalid_id".to_string(),
            Some(true),
        );
        assert!(matches!(
            invalid_id.validate().unwrap_err(),
            DeleteProjectRequestError::InvalidIdFormat
        ));
    }

    #[test]
    fn test_validation_summary() {
        let request = CreateProjectRequest::new(
            "Test Project".to_string(),
            "/test/path".to_string(),
            Some("Test note".to_string()),
        );

        let summary = request.validation_summary();
        assert!(summary.name_valid);
        assert!(summary.source_folder_valid);
        assert!(summary.note_valid);
        assert!(summary.overall_valid);

        let report = summary.report();
        assert_eq!(report, "All fields are valid");
    }

    #[test]
    fn test_validation_summary_with_issues() {
        let bad_request = CreateProjectRequest::new(
            "x".repeat(256), // Too long
            "".to_string(),  // Empty
            Some("x".repeat(1001)), // Too long
        );

        let summary = bad_request.validation_summary();
        assert!(!summary.name_valid);
        assert!(!summary.source_folder_valid);
        assert!(!summary.note_valid);
        assert!(!summary.overall_valid);

        let report = summary.report();
        assert!(report.contains("Name is too long"));
        assert!(report.contains("Source folder is required"));
        assert!(report.contains("Note is too long"));
    }
}