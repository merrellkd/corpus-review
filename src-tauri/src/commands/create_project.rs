use tauri::{AppHandle, State};

use crate::application::{AppState, StateManager};
use crate::infrastructure::{CreateProjectRequest, ProjectDto, AppResult};

/// Tauri command to create a new project
///
/// This command receives a CreateProjectRequest from the frontend,
/// validates the data, creates the project through the application service,
/// and returns the created project as a DTO.
///
/// # Arguments
/// * `request` - The project creation request from the frontend
/// * `app` - The Tauri AppHandle for accessing application state
/// * `state` - The managed application state
///
/// # Returns
/// * `Result<ProjectDto, String>` - The created project DTO or error message
#[tauri::command]
pub async fn create_project(
    request: CreateProjectRequest,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    // Log the request for debugging in development
    if cfg!(debug_assertions) {
        tracing::debug!("Creating project: name={}, folder={}, has_note={}",
            request.name, request.source_folder, request.has_note());
    }

    // Execute the business logic through the application service
    let result = state.project_service().create_project(request).await;

    match result {
        Ok(project_dto) => {
            // Record successful project creation
            state.record_project_created().await;

            tracing::info!("Project created successfully: id={}, name={}",
                project_dto.id, project_dto.name);

            Ok(project_dto)
        }
        Err(app_error) => {
            // Log error details for debugging
            if app_error.should_log() {
                match app_error.log_level() {
                    crate::infrastructure::errors::app_error::LogLevel::Error => {
                        tracing::error!("Failed to create project: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Warning => {
                        tracing::warn!("Failed to create project: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Info => {
                        tracing::info!("Failed to create project: {} - {}",
                            app_error.code, app_error.message);
                    }
                }
            }

            // Return user-friendly error message
            Err(app_error.user_message())
        }
    }
}

/// Validation helper for create project requests
///
/// This function can be called from the frontend to validate
/// project creation data before submitting the actual request.
#[tauri::command]
pub async fn validate_create_project_request(
    request: CreateProjectRequest,
    _app: AppHandle,
) -> Result<bool, String> {
    match request.validate() {
        Ok(()) => Ok(true),
        Err(error) => Err(error.to_string()),
    }
}

/// Check if a project name is available
///
/// This command allows the frontend to check name availability
/// before submitting a creation request, providing better UX.
#[tauri::command]
pub async fn check_project_name_availability(
    name: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Checking name availability: {}", name);

    state.project_service()
        .is_name_available(&name)
        .await
        .map_err(|e| e.user_message())
}

/// Get project creation statistics
///
/// Returns statistics about project creation for monitoring and analytics.
#[tauri::command]
pub async fn get_project_creation_stats(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectCreationStats, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    let app_status = state.get_status().await;
    let repository_stats = state.project_service()
        .get_statistics()
        .await
        .map_err(|e| e.user_message())?;

    Ok(ProjectCreationStats {
        total_projects: repository_stats.total_projects,
        projects_created_this_session: app_status.total_projects_created,
        accessible_projects: repository_stats.accessible_projects,
        projects_with_notes: repository_stats.projects_with_notes,
        average_name_length: repository_stats.average_name_length,
        oldest_project_date: repository_stats.oldest_project_date,
        newest_project_date: repository_stats.newest_project_date,
    })
}

/// Statistics for project creation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectCreationStats {
    pub total_projects: usize,
    pub projects_created_this_session: u64,
    pub accessible_projects: usize,
    pub projects_with_notes: usize,
    pub average_name_length: f64,
    pub oldest_project_date: Option<String>,
    pub newest_project_date: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::AppState;
    use crate::infrastructure::CreateProjectRequest;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/command_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    // Note: These are unit tests for the command logic.
    // Full integration tests would require a Tauri app instance.

    #[tokio::test]
    async fn test_create_project_validation() {
        let valid_request = CreateProjectRequest::new(
            "Valid Project".to_string(),
            "/valid/path".to_string(),
            Some("Valid note".to_string()),
        );

        let validation_result = valid_request.validate();
        assert!(validation_result.is_ok());

        let invalid_request = CreateProjectRequest::new(
            "".to_string(), // Empty name
            "/valid/path".to_string(),
            None,
        );

        let validation_result = invalid_request.validate();
        assert!(validation_result.is_err());
    }

    #[tokio::test]
    async fn test_project_creation_stats_structure() {
        let stats = ProjectCreationStats {
            total_projects: 10,
            projects_created_this_session: 3,
            accessible_projects: 8,
            projects_with_notes: 5,
            average_name_length: 15.5,
            oldest_project_date: Some("2023-01-01T00:00:00Z".to_string()),
            newest_project_date: Some("2023-12-31T23:59:59Z".to_string()),
        };

        // Verify serialization works
        let serialized = serde_json::to_string(&stats).unwrap();
        assert!(serialized.contains("total_projects"));

        // Verify deserialization works
        let deserialized: ProjectCreationStats = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.total_projects, 10);
    }

    // Integration test that could be run with a real Tauri app
    #[cfg(feature = "integration-tests")]
    #[tokio::test]
    async fn test_create_project_integration() {
        use tauri::test::{mock_app, MockRuntime};

        let test_folder = setup_test_folder("integration");

        // This would require setting up a full Tauri test environment
        let app = mock_app();
        let state = AppState::new_for_testing().await.unwrap();
        app.manage(state);

        let request = CreateProjectRequest::new(
            "Integration Test Project".to_string(),
            test_folder.clone(),
            None,
        );

        // In a real integration test, we would call the command directly
        // let result = create_project(request, app.app_handle(), app.state()).await;
        // assert!(result.is_ok());

        cleanup_test_folder(&test_folder);
    }
}