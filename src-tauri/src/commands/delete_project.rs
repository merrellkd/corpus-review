use tauri::{AppHandle, State};

use crate::application::{AppState, StateManager};
use crate::infrastructure::{DeleteProjectRequest, ProjectDto};

/// Tauri command to delete a project
///
/// This command removes a project from the repository after validation
/// and confirmation. It does not affect the source folder on disk.
///
/// # Arguments
/// * `request` - The project deletion request with ID and confirmation
/// * `app` - The Tauri AppHandle for accessing application state
/// * `state` - The managed application state
///
/// # Returns
/// * `Result<(), String>` - Success or error message
#[tauri::command]
pub async fn delete_project(
    request: DeleteProjectRequest,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Record command execution
    StateManager::record_command(&app).await;

    // Log the request for debugging in development
    if cfg!(debug_assertions) {
        tracing::debug!(
            "Deleting project: id={}, confirmed={}",
            request.id,
            request.is_confirmed()
        );
    }

    // Execute the business logic through the application service
    let result = state.project_service().delete_project(request).await;

    match result {
        Ok(()) => {
            // Record successful project deletion
            state.record_project_deleted().await;

            tracing::info!("Project deleted successfully");
            Ok(())
        }
        Err(app_error) => {
            // Log error details for debugging
            if app_error.should_log() {
                match app_error.log_level() {
                    crate::infrastructure::errors::app_error::LogLevel::Error => {
                        tracing::error!(
                            "Failed to delete project: {} - {}",
                            app_error.code,
                            app_error.message
                        );
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Warning => {
                        tracing::warn!(
                            "Failed to delete project: {} - {}",
                            app_error.code,
                            app_error.message
                        );
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Info => {
                        tracing::info!(
                            "Failed to delete project: {} - {}",
                            app_error.code,
                            app_error.message
                        );
                    }
                }
            }

            // Return user-friendly error message
            Err(app_error.user_message())
        }
    }
}

/// Tauri command to validate deletion request
///
/// This command allows the frontend to validate a deletion request
/// before submitting it, providing better user experience.
#[tauri::command]
pub async fn validate_delete_project_request(
    request: DeleteProjectRequest,
    _app: AppHandle,
) -> Result<bool, String> {
    match request.validate() {
        Ok(()) => Ok(true),
        Err(error) => Err(error.to_string()),
    }
}

/// Tauri command to get project info before deletion
///
/// This command retrieves project information that can be shown
/// in a confirmation dialog before deletion.
#[tauri::command]
pub async fn get_project_for_deletion(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<DeletionInfo, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting project info for deletion: {}", id);

    // Get the project
    let project = state
        .project_service()
        .get_project(&id)
        .await
        .map_err(|e| e.user_message())?
        .ok_or_else(|| "Project not found".to_string())?;

    // Gather additional deletion-related information
    let deletion_info = DeletionInfo {
        project,
        warnings: get_deletion_warnings(&id, &state).await,
        can_be_deleted: true, // For now, all projects can be deleted
    };

    Ok(deletion_info)
}

/// Tauri command to perform bulk project deletion
///
/// This command allows deleting multiple projects in a single operation,
/// with individual success/failure reporting.
#[tauri::command]
pub async fn delete_projects_bulk(
    requests: Vec<DeleteProjectRequest>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<BulkDeletionResult, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::info!("Performing bulk deletion of {} projects", requests.len());

    // Execute bulk deletion through the application service
    let result = state
        .project_service()
        .delete_projects_batch(requests)
        .await;

    match result {
        Ok(batch_result) => {
            // Record successful deletions
            for _ in 0..batch_result.success_count() {
                state.record_project_deleted().await;
            }

            let bulk_result = BulkDeletionResult {
                total_requested: batch_result.total_count(),
                successful: batch_result.success_count(),
                failed: batch_result.failure_count(),
                success_rate: batch_result.success_rate(),
                errors: batch_result
                    .failed
                    .into_iter()
                    .map(|e| BulkDeletionError {
                        index: e.index,
                        error: e.error.user_message(),
                    })
                    .collect(),
            };

            tracing::info!(
                "Bulk deletion completed: {}/{} successful",
                bulk_result.successful,
                bulk_result.total_requested
            );

            Ok(bulk_result)
        }
        Err(app_error) => {
            tracing::error!(
                "Bulk deletion failed: {} - {}",
                app_error.code,
                app_error.message
            );

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to check if projects can be safely deleted
///
/// This command performs safety checks before deletion to warn users
/// about potential issues.
#[tauri::command]
pub async fn check_deletion_safety(
    ids: Vec<String>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<DeletionSafetyCheck>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Checking deletion safety for {} projects", ids.len());

    let mut safety_checks = Vec::new();

    for id in ids {
        let project_result = state.project_service().get_project(&id).await;

        let safety_check = match project_result {
            Ok(Some(project)) => {
                let warnings = get_deletion_warnings(&id, &state).await;
                let risk_level = if warnings.is_empty() {
                    RiskLevel::Low
                } else {
                    RiskLevel::Medium
                };
                DeletionSafetyCheck {
                    project_id: id,
                    project_name: Some(project.name.clone()),
                    can_delete: true,
                    warnings,
                    risk_level,
                }
            }
            Ok(None) => DeletionSafetyCheck {
                project_id: id,
                project_name: None,
                can_delete: false,
                warnings: vec!["Project not found".to_string()],
                risk_level: RiskLevel::High,
            },
            Err(error) => DeletionSafetyCheck {
                project_id: id,
                project_name: None,
                can_delete: false,
                warnings: vec![error.user_message()],
                risk_level: RiskLevel::High,
            },
        };

        safety_checks.push(safety_check);
    }

    Ok(safety_checks)
}

/// Helper function to get deletion warnings for a project
async fn get_deletion_warnings(id: &str, state: &State<'_, AppState>) -> Vec<String> {
    let mut warnings = Vec::new();

    // Check if project source is inaccessible
    if let Ok(Some(project)) = state.project_service().get_project(id).await {
        if !project.is_accessible {
            warnings.push("Source folder is not accessible - this may indicate the folder was already deleted".to_string());
        }

        if project.has_note() {
            warnings.push("Project has notes that will be permanently lost".to_string());
        }

        // Add more project-specific warnings as needed
    }

    warnings
}

/// Information about a project being deleted
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeletionInfo {
    pub project: ProjectDto,
    pub warnings: Vec<String>,
    pub can_be_deleted: bool,
}

/// Result of bulk deletion operation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BulkDeletionResult {
    pub total_requested: usize,
    pub successful: usize,
    pub failed: usize,
    pub success_rate: f64,
    pub errors: Vec<BulkDeletionError>,
}

/// Error information for bulk deletion
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BulkDeletionError {
    pub index: usize,
    pub error: String,
}

/// Safety check result for project deletion
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DeletionSafetyCheck {
    pub project_id: String,
    pub project_name: Option<String>,
    pub can_delete: bool,
    pub warnings: Vec<String>,
    pub risk_level: RiskLevel,
}

/// Risk level for deletion operations
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

impl BulkDeletionResult {
    /// Check if all deletions were successful
    pub fn all_successful(&self) -> bool {
        self.failed == 0
    }

    /// Check if any deletions were successful
    pub fn any_successful(&self) -> bool {
        self.successful > 0
    }

    /// Get a summary message
    pub fn summary(&self) -> String {
        if self.all_successful() {
            format!("All {} projects deleted successfully", self.successful)
        } else if self.any_successful() {
            format!(
                "{} of {} projects deleted successfully",
                self.successful, self.total_requested
            )
        } else {
            format!("Failed to delete any of {} projects", self.total_requested)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::DeleteProjectRequest;

    #[test]
    fn test_delete_project_request_validation() {
        // Valid confirmed deletion
        let valid_request = DeleteProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some(true),
        );
        assert!(valid_request.validate().is_ok());

        // Not confirmed
        let not_confirmed = DeleteProjectRequest::new(
            "proj_550e8400-e29b-41d4-a716-446655440000".to_string(),
            Some(false),
        );
        assert!(not_confirmed.validate().is_err());

        // Invalid ID format
        let invalid_id = DeleteProjectRequest::new("invalid_id".to_string(), Some(true));
        assert!(invalid_id.validate().is_err());
    }

    #[test]
    fn test_bulk_deletion_result() {
        let result = BulkDeletionResult {
            total_requested: 5,
            successful: 3,
            failed: 2,
            success_rate: 60.0,
            errors: vec![
                BulkDeletionError {
                    index: 1,
                    error: "Not found".to_string(),
                },
                BulkDeletionError {
                    index: 3,
                    error: "Permission denied".to_string(),
                },
            ],
        };

        assert!(!result.all_successful());
        assert!(result.any_successful());
        assert_eq!(result.summary(), "3 of 5 projects deleted successfully");
    }

    #[test]
    fn test_risk_level_serialization() {
        let safety_check = DeletionSafetyCheck {
            project_id: "proj_test".to_string(),
            project_name: Some("Test Project".to_string()),
            can_delete: true,
            warnings: vec!["Test warning".to_string()],
            risk_level: RiskLevel::Medium,
        };

        // Test serialization
        let serialized = serde_json::to_string(&safety_check).unwrap();
        assert!(serialized.contains("Medium"));

        // Test deserialization
        let deserialized: DeletionSafetyCheck = serde_json::from_str(&serialized).unwrap();
        assert!(matches!(deserialized.risk_level, RiskLevel::Medium));
    }

    #[test]
    fn test_deletion_info_structure() {
        // This test verifies the structure compiles and serializes correctly
        let project = ProjectDto {
            id: "proj_test".to_string(),
            name: "Test Project".to_string(),
            source_folder: "/test/path".to_string(),
            source_folder_name: Some("path".to_string()),
            note: None,
            note_preview: None,
            note_line_count: None,
            created_at: "2023-12-01T10:30:00Z".to_string(),
            is_accessible: true,
        };

        let deletion_info = DeletionInfo {
            project,
            warnings: vec!["Test warning".to_string()],
            can_be_deleted: true,
        };

        // Verify serialization works
        let serialized = serde_json::to_string(&deletion_info).unwrap();
        assert!(serialized.contains("Test Project"));
    }
}
