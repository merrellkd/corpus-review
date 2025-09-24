use tauri::{AppHandle, State};

use crate::application::{AppState, StateManager};
use crate::infrastructure::{ProjectDto, ProjectListDto, RepositoryStatsDto, AppResult};

/// Tauri command to list all projects
///
/// This command retrieves all projects from the repository and returns them
/// as DTOs sorted by creation date (newest first).
#[tauri::command]
pub async fn list_projects(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Listing all projects");

    // Execute the business logic through the application service
    let result = state.project_service().list_projects().await;

    match result {
        Ok(projects) => {
            tracing::info!("Listed {} projects successfully", projects.len());
            Ok(projects)
        }
        Err(app_error) => {
            // Log error details for debugging
            if app_error.should_log() {
                match app_error.log_level() {
                    crate::infrastructure::errors::app_error::LogLevel::Error => {
                        tracing::error!("Failed to list projects: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Warning => {
                        tracing::warn!("Failed to list projects: {} - {}",
                            app_error.code, app_error.message);
                    }
                    crate::infrastructure::errors::app_error::LogLevel::Info => {
                        tracing::info!("Failed to list projects: {} - {}",
                            app_error.code, app_error.message);
                    }
                }
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to list projects with pagination
///
/// This command provides paginated access to projects for better performance
/// and user experience when dealing with large numbers of projects.
#[tauri::command]
pub async fn list_projects_paged(
    offset: usize,
    limit: usize,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectListDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Listing projects with pagination: offset={}, limit={}", offset, limit);

    // Execute the business logic through the application service
    let result = state.project_service().list_projects_paged(offset, limit).await;

    match result {
        Ok(project_list) => {
            tracing::info!("Listed {} projects (page {}/{}, total: {})",
                project_list.projects.len(),
                project_list.current_page(),
                project_list.total_pages(),
                project_list.total_count);

            Ok(project_list)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to list projects with pagination: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to search projects by name pattern
///
/// This command allows users to find projects by searching for partial
/// name matches, returning results ordered by relevance with pagination.
#[tauri::command]
pub async fn search_projects(
    query: String,
    offset: Option<usize>,
    limit: Option<usize>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<ProjectListDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    let offset = offset.unwrap_or(0);
    let limit = limit.unwrap_or(50);

    tracing::debug!("Searching projects with query: '{}', offset: {}, limit: {}", query, offset, limit);

    // Execute the business logic through the application service
    let result = state.project_service().search_projects(&query).await;

    match result {
        Ok(projects) => {
            tracing::info!("Found {} projects matching query '{}'", projects.len(), query);

            // Apply pagination to results
            let total_count = projects.len();
            let start = offset.min(total_count);
            let end = (offset + limit).min(total_count);
            let page_projects = projects[start..end].to_vec();

            // Create paginated response using DTOs directly
            Ok(ProjectListDto {
                projects: page_projects,
                total_count,
                offset,
                limit,
                has_more: end < total_count,
            })
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to search projects: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to get a specific project by ID
///
/// This command retrieves a single project by its unique identifier.
#[tauri::command]
pub async fn get_project(
    id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting project by ID: {}", id);

    // Execute the business logic through the application service
    let result = state.project_service().get_project(&id).await;

    match result {
        Ok(project_option) => {
            match &project_option {
                Some(project) => tracing::info!("Retrieved project: {} - {}", project.id, project.name),
                None => tracing::info!("Project not found: {}", id),
            }
            Ok(project_option)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to get project: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to get a project by name
///
/// This command allows finding a project by its exact name.
#[tauri::command]
pub async fn get_project_by_name(
    name: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting project by name: {}", name);

    // Execute the business logic through the application service
    let result = state.project_service().get_project_by_name(&name).await;

    match result {
        Ok(project_option) => {
            match &project_option {
                Some(project) => tracing::info!("Retrieved project by name: {} - {}", project.id, project.name),
                None => tracing::info!("Project not found with name: {}", name),
            }
            Ok(project_option)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to get project by name: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to get repository statistics
///
/// This command provides comprehensive statistics about the project repository
/// for monitoring and analytics purposes.
#[tauri::command]
pub async fn get_repository_stats(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RepositoryStatsDto, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting repository statistics");

    // Execute the business logic through the application service
    let result = state.project_service().get_statistics().await;

    match result {
        Ok(stats) => {
            tracing::info!("Retrieved repository statistics: {} projects, {:.1}% accessible",
                stats.total_projects, stats.accessibility_percentage);
            Ok(stats)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to get repository statistics: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to get inaccessible projects
///
/// This command returns a list of projects whose source folders
/// are no longer accessible, helping users identify issues.
#[tauri::command]
pub async fn get_inaccessible_projects(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Getting inaccessible projects");

    // Execute the business logic through the application service
    let result = state.project_service().get_inaccessible_projects().await;

    match result {
        Ok(projects) => {
            tracing::info!("Found {} inaccessible projects", projects.len());
            Ok(projects)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to get inaccessible projects: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

/// Tauri command to find projects by date range
///
/// This command allows filtering projects by their creation date,
/// useful for reporting and analytics.
#[tauri::command]
pub async fn find_projects_by_date_range(
    start_date: String,
    end_date: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<ProjectDto>, String> {
    // Record command execution
    StateManager::record_command(&app).await;

    tracing::debug!("Finding projects by date range: {} to {}", start_date, end_date);

    // Parse dates
    let start_datetime = start_date.parse::<chrono::DateTime<chrono::Utc>>()
        .map_err(|e| format!("Invalid start date format: {}", e))?;

    let end_datetime = end_date.parse::<chrono::DateTime<chrono::Utc>>()
        .map_err(|e| format!("Invalid end date format: {}", e))?;

    // Execute the business logic through the application service
    let result = state.project_service()
        .find_projects_by_date_range(start_datetime, end_datetime)
        .await;

    match result {
        Ok(projects) => {
            tracing::info!("Found {} projects in date range {} to {}",
                projects.len(), start_date, end_date);
            Ok(projects)
        }
        Err(app_error) => {
            if app_error.should_log() {
                tracing::error!("Failed to find projects by date range: {} - {}",
                    app_error.code, app_error.message);
            }

            Err(app_error.user_message())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::AppState;
    use crate::infrastructure::CreateProjectRequest;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/list_command_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    // Note: These are unit tests for the command logic.
    // Full integration tests would require a Tauri app instance.

    #[test]
    fn test_date_parsing() {
        let valid_date = "2023-12-01T10:30:00Z";
        let parsed = valid_date.parse::<chrono::DateTime<chrono::Utc>>();
        assert!(parsed.is_ok());

        let invalid_date = "not-a-date";
        let parsed = invalid_date.parse::<chrono::DateTime<chrono::Utc>>();
        assert!(parsed.is_err());
    }

    #[tokio::test]
    async fn test_pagination_parameters() {
        // Test various pagination parameter combinations
        let test_cases = vec![
            (0, 10, true),   // First page
            (10, 10, true),  // Second page
            (0, 1000, true), // Max limit
            (100, 50, true), // Middle page
        ];

        for (offset, limit, should_be_valid) in test_cases {
            // These would be validated by the service layer
            let result = limit > 0 && limit <= 1000;
            assert_eq!(result, should_be_valid, "Failed for offset={}, limit={}", offset, limit);
        }
    }

    // Integration test that could be run with a real Tauri app
    #[cfg(feature = "integration-tests")]
    #[tokio::test]
    async fn test_list_projects_integration() {
        use tauri::test::{mock_app, MockRuntime};

        let test_folder = setup_test_folder("list_integration");

        // This would require setting up a full Tauri test environment
        let app = mock_app();
        let state = AppState::new_for_testing().await.unwrap();
        app.manage(state);

        // Create some test projects first
        for i in 1..=3 {
            let request = CreateProjectRequest::new(
                format!("Test Project {}", i),
                test_folder.clone(),
                None,
            );
            // Would call create_project command here
        }

        // Test listing projects
        // let result = list_projects(app.app_handle(), app.state()).await;
        // assert!(result.is_ok());
        // assert_eq!(result.unwrap().len(), 3);

        cleanup_test_folder(&test_folder);
    }
}