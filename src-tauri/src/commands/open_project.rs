use tauri::{AppHandle, State};

use crate::application::{AppState, StateManager};
use crate::infrastructure::{ProjectDto, AppResult};

/// Tauri command to open a project
///
/// This command validates that a project exists and is accessible,
/// then returns the project information for the frontend to open.
/// The actual opening logic (navigating to project view) is handled
/// by the frontend.
///
/// # Arguments
/// * `id` - The project ID to open
/// * `app` - The Tauri AppHandle for accessing application state
/// * `state` - The managed application state
///
/// # Returns
/// * `Result<ProjectDto, String>` - The project DTO if valid and accessible
#[tauri::command]
pub async fn open_project(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    // Log the request for debugging in development
    if cfg!(debug_assertions) {
        tracing::debug!("Opening project: id={}", id);
    }

    // Validate project exists and is accessible
    let result = state.project_service().validate_project_access(&id).await;

    match result {
        Ok(project_dto) => {
            tracing::info!("Project opened successfully: {} - {}",
                project_dto.id, project_dto.name);
            Ok(project_dto)
        }
        Err(app_error) => {
            // Log error details for debugging
            if app_error.should_log() {
                match app_error.log_level() {
                    crate::infrastructure::errors::app_error::LogLevel::Error => {
                        tracing::error!("Failed to open project: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Warning => {
                        tracing::warn!("Failed to open project: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Info => {
                        tracing::info!("Failed to open project: {} - {}",
                            app_error.code, app_error.message);
                    }
                }
            }

            // Return user-friendly error message
            Err(app_error.user_message())
        }
    }
}

/// Tauri command to open a project by name
///
/// This command finds a project by name and opens it if valid and accessible.
#[tauri::command]
pub async fn open_project_by_name(
    name: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Opening project by name: {}", name);

    // Find the project by name
    let project_option = state.project_service()
        .get_project_by_name(&name)
        .await
        .map_err(|e| e.user_message())?;

    let project = project_option
        .ok_or_else(|| format!("Project not found: {}", name))?;

    // Validate accessibility
    let result = state.project_service().validate_project_access(&project.id).await;

    match result {
        Ok(project_dto) => {
            tracing::info!("Project opened by name successfully: {} - {}",
                project_dto.id, project_dto.name);
            Ok(project_dto)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to open project by name: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to validate project access without opening
///
/// This command checks if a project can be opened without actually
/// opening it, useful for UI state validation.
#[tauri::command]
pub async fn validate_project_access(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectAccessInfo, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Validating project access: {}", id);

    // Get project info
    let project_result = state.project_service().get_project(&id).await;

    let access_info = match project_result {
        Ok(Some(project)) => {
            let warnings = get_access_warnings(&project).await;
            let recommendations = get_access_recommendations(&project, &warnings).await;
            ProjectAccessInfo {
                project_id: id,
                project_name: project.name.clone(),
                can_open: project.is_accessible,
                is_accessible: project.is_accessible,
                warnings,
                recommendations,
            }
        }
        Ok(None) => ProjectAccessInfo {
            project_id: id,
            project_name: "Unknown".to_string(),
            can_open: false,
            is_accessible: false,
            warnings: vec!["Project not found".to_string()],
            recommendations: vec!["Verify the project ID is correct".to_string()],
        },
        Err(error) => ProjectAccessInfo {
            project_id: id,
            project_name: "Unknown".to_string(),
            can_open: false,
            is_accessible: false,
            warnings: vec![error.user_message()],
            recommendations: vec!["Check application logs for details".to_string()],
        },
    };

    Ok(access_info)
}

/// Tauri command to get recent projects for quick access
///
/// This command returns recently accessed or created projects
/// for display in a "recent projects" list.
#[tauri::command]
pub async fn get_recent_projects(
    limit: Option<usize>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    let limit = limit.unwrap_or(10).min(50); // Default 10, max 50

    tracing::debug!("Getting recent projects (limit: {})", limit);

    // Get recent projects (by creation date)
    let result = state.project_service().list_projects_paged(0, limit).await;

    match result {
        Ok(project_list) => {
            tracing::info!("Retrieved {} recent projects", project_list.projects.len());
            Ok(project_list.projects)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to get recent projects: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to open a project folder in the system file manager
///
/// This command opens the project's source folder in the default
/// file manager (Finder on macOS, Explorer on Windows, etc.).
#[tauri::command]
pub async fn open_project_folder(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Opening project folder in file manager: {}", id);

    // Get the project
    let project = state.project_service()
        .get_project(&id)
        .await
        .map_err(|e| e.user_message())?
        .ok_or_else(|| "Project not found".to_string())?;

    // Check if folder exists and is accessible
    if !project.is_accessible {
        return Err("Project source folder is not accessible".to_string());
    }

    // Open folder using Tauri's shell plugin
    use tauri_plugin_shell::ShellExt;
    let shell = app.shell();

    #[cfg(target_os = "macos")]
    let result = shell.command("open")
        .args([&project.source_folder])
        .status()
        .await;

    #[cfg(target_os = "windows")]
    let result = shell.command("explorer")
        .args([&project.source_folder])
        .status()
        .await;

    #[cfg(target_os = "linux")]
    let result = shell.command("xdg-open")
        .args([&project.source_folder])
        .status()
        .await;

    match result {
        Ok(status) => {
            if status.success() {
                tracing::info!("Successfully opened project folder: {}", project.source_folder);
                Ok(())
            } else {
                let error_msg = format!("Failed to open folder: command failed with status {}", status.code().unwrap_or(-1));
                tracing::error!("{}", error_msg);
                Err(error_msg)
            }
        }
        Err(error) => {
            let error_msg = format!("Failed to execute file manager command: {}", error);
            tracing::error!("{}", error_msg);
            Err(error_msg)
        }
    }
}

/// Tauri command to get project opening statistics
///
/// This command returns statistics about project opening patterns
/// for analytics and user insights.
#[tauri::command]
pub async fn get_project_opening_stats(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectOpeningStats, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting project opening statistics");

    let repository_stats = state.project_service()
        .get_statistics()
        .await
        .map_err(|e| e.user_message())?;

    let app_status = state.get_status().await;

    let stats = ProjectOpeningStats {
        total_projects: repository_stats.total_projects,
        accessible_projects: repository_stats.accessible_projects,
        inaccessible_projects: repository_stats.inaccessible_projects,
        accessibility_percentage: repository_stats.accessibility_percentage,
        total_commands_this_session: app_status.total_commands,
        last_activity: app_status.last_activity,
    };

    Ok(stats)
}

/// Helper function to get access warnings for a project
async fn get_access_warnings(project: &ProjectDto) -> Vec<String> {
    let mut warnings = Vec::new();

    if !project.is_accessible {
        warnings.push("Source folder is not accessible".to_string());
    }

    // Add more project-specific warnings as needed
    warnings
}

/// Helper function to get access recommendations
async fn get_access_recommendations(
    project: &ProjectDto,
    warnings: &[String],
) -> Vec<String> {
    let mut recommendations = Vec::new();

    if !project.is_accessible {
        recommendations.push("Check if the source folder has been moved or deleted".to_string());
        recommendations.push("Verify you have permission to access the folder".to_string());
        recommendations.push("Consider updating the project's source folder path".to_string());
    }

    if warnings.is_empty() && project.is_accessible {
        recommendations.push("Project is ready to open".to_string());
    }

    recommendations
}

/// Information about project access validation
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectAccessInfo {
    pub project_id: String,
    pub project_name: String,
    pub can_open: bool,
    pub is_accessible: bool,
    pub warnings: Vec<String>,
    pub recommendations: Vec<String>,
}

/// Statistics for project opening patterns
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ProjectOpeningStats {
    pub total_projects: usize,
    pub accessible_projects: usize,
    pub inaccessible_projects: usize,
    pub accessibility_percentage: f64,
    pub total_commands_this_session: u64,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
}

impl ProjectAccessInfo {
    /// Get a summary status message
    pub fn status_message(&self) -> String {
        if self.can_open {
            "Ready to open".to_string()
        } else if !self.is_accessible {
            "Source folder not accessible".to_string()
        } else {
            "Cannot open".to_string()
        }
    }

    /// Check if there are any issues
    pub fn has_issues(&self) -> bool {
        !self.warnings.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_access_info() {
        let access_info = ProjectAccessInfo {
            project_id: "proj_test".to_string(),
            project_name: "Test Project".to_string(),
            can_open: true,
            is_accessible: true,
            warnings: Vec::new(),
            recommendations: vec!["Project is ready to open".to_string()],
        };

        assert_eq!(access_info.status_message(), "Ready to open");
        assert!(!access_info.has_issues());

        // Test serialization
        let serialized = serde_json::to_string(&access_info).unwrap();
        assert!(serialized.contains("Test Project"));

        // Test deserialization
        let deserialized: ProjectAccessInfo = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.project_name, "Test Project");
    }

    #[test]
    fn test_project_access_info_with_issues() {
        let access_info = ProjectAccessInfo {
            project_id: "proj_test".to_string(),
            project_name: "Test Project".to_string(),
            can_open: false,
            is_accessible: false,
            warnings: vec!["Source folder not accessible".to_string()],
            recommendations: vec!["Check folder permissions".to_string()],
        };

        assert_eq!(access_info.status_message(), "Source folder not accessible");
        assert!(access_info.has_issues());
    }

    #[test]
    fn test_project_opening_stats() {
        let stats = ProjectOpeningStats {
            total_projects: 10,
            accessible_projects: 8,
            inaccessible_projects: 2,
            accessibility_percentage: 80.0,
            total_commands_this_session: 25,
            last_activity: Some(chrono::Utc::now()),
        };

        // Test serialization
        let serialized = serde_json::to_string(&stats).unwrap();
        assert!(serialized.contains("total_projects"));

        // Test deserialization
        let deserialized: ProjectOpeningStats = serde_json::from_str(&serialized).unwrap();
        assert_eq!(deserialized.total_projects, 10);
        assert_eq!(deserialized.accessibility_percentage, 80.0);
    }

    #[test]
    fn test_recent_projects_limit_validation() {
        // Test limit defaults and bounds
        let test_cases = vec![
            (None, 10),      // Default
            (Some(5), 5),    // Custom within bounds
            (Some(100), 50), // Above max, should be clamped to 50
            (Some(0), 0),    // Zero should work
        ];

        for (input_limit, expected_limit) in test_cases {
            let actual_limit = input_limit.unwrap_or(10).min(50);
            assert_eq!(actual_limit, expected_limit,
                "Failed for input_limit: {:?}", input_limit);
        }
    }

    // Integration test that could be run with a real Tauri app
    #[cfg(feature = "integration-tests")]
    #[tokio::test]
    async fn test_open_project_integration() {
        use tauri::test::{mock_app, MockRuntime};
        use crate::infrastructure::CreateProjectRequest;
        use std::fs;

        fn setup_test_folder(name: &str) -> String {
            let test_path = format!("/tmp/open_command_test_{}", name);
            fs::create_dir_all(&test_path).expect("Failed to create test directory");
            test_path
        }

        let test_folder = setup_test_folder("open_integration");

        // This would require setting up a full Tauri test environment
        let app = mock_app();
        let state = AppState::new_for_testing().await.unwrap();
        app.manage(state);

        // Create a test project first
        let create_request = CreateProjectRequest::new(
            "Open Integration Test".to_string(),
            test_folder.clone(),
            None,
        );
        // Would call create_project command here
        // let created_project = create_project(create_request, app.app_handle(), app.state()).await.unwrap();

        // Test opening the project
        // let result = open_project(created_project.id, app.app_handle(), app.state()).await;
        // assert!(result.is_ok());

        fs::remove_dir_all(&test_folder).ok();
    }
}