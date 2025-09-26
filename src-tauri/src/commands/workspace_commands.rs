use crate::application::{
    // workspace_service::{WorkspaceService as LegacyWorkspaceService, WorkspaceServiceError},
    dtos::{DirectoryListingDto, WorkspaceDto},
    AppState,
};
use crate::infrastructure::AppError;
use tauri::State;

// Legacy workspace commands - temporarily commented out due to missing DTOs
/*
#[tauri::command]
pub async fn get_workspace_layout(
    project_id: String,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<WorkspaceLayoutDto, String> {
    workspace_service
        .get_workspace_layout(&project_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_workspace_layout(
    layout: WorkspaceLayoutDto,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<(), String> {
    workspace_service
        .save_workspace_layout(layout)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_panel_visibility(
    project_id: String,
    panel_type: String,
    visible: bool,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<WorkspaceLayoutDto, String> {
    workspace_service
        .update_panel_visibility(&project_id, &panel_type, visible)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_panel_sizes(
    project_id: String,
    panel_type: String,
    width: u32,
    height: Option<u32>,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<WorkspaceLayoutDto, String> {
    workspace_service
        .update_panel_sizes(&project_id, &panel_type, width, height)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_document_caddy(
    file_path: String,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<DocumentCaddyDto, String> {
    workspace_service
        .create_document_caddy(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_document_caddy(
    caddy_id: String,
    position_x: Option<u32>,
    position_y: Option<u32>,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<DocumentCaddyDto, String> {
    workspace_service
        .update_document_caddy(&caddy_id, position_x, position_y)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_details(
    project_id: String,
    workspace_service: State<'_, LegacyWorkspaceService>,
) -> Result<ProjectDto, String> {
    workspace_service
        .get_project_details(&project_id)
        .await
        .map_err(|e| e.to_string())
}
*/

// ============================================================================
// Workspace Navigation Commands
// ============================================================================

/// Tauri command to open a workspace for a project
///
/// This initializes the workspace context and returns the root directory
/// listing. It validates that the project exists and its source folder
/// is accessible.
#[tauri::command]
pub async fn open_workspace_navigation(
    project_id: String,
    project_name: String,
    source_folder: String,
    app_state: State<'_, AppState>,
) -> Result<WorkspaceDto, AppError> {
    println!(
        "🔧 Opening workspace navigation: project_id={}, project_name={}, source_folder={}",
        project_id, project_name, source_folder
    );

    let workspace_service = app_state.workspace_navigation_service();
    let result = workspace_service
        .open_workspace(&project_id, &project_name, &source_folder)
        .await
        .map_err(AppError::from);

    match &result {
        Ok(workspace) => {
            println!(
                "✅ Workspace navigation opened successfully: currentPath={}, entries_count={}",
                workspace.current_path,
                workspace.directory_listing.entries.len()
            );
        }
        Err(e) => {
            println!("❌ Failed to open workspace navigation: {:?}", e);
        }
    }

    result
}

/// Tauri command to list the contents of the current directory
///
/// Returns the directory listing for the workspace's current path.
/// This is used for refreshing the current view or after navigation.
#[tauri::command]
pub async fn list_directory(
    project_id: String,
    project_name: String,
    source_folder: String,
    current_path: String,
    app_state: State<'_, AppState>,
) -> Result<DirectoryListingDto, AppError> {
    let workspace_service = app_state.workspace_navigation_service();
    workspace_service
        .list_directory(&project_id, &project_name, &source_folder, &current_path)
        .await
        .map_err(AppError::from)
}

/// Tauri command to navigate to a specific folder within the workspace
///
/// Updates the workspace context to point to the specified folder
/// and returns the updated workspace state with the new directory listing.
#[tauri::command]
pub async fn navigate_to_folder(
    project_id: String,
    project_name: String,
    source_folder: String,
    current_path: String,
    folder_name: String,
    app_state: State<'_, AppState>,
) -> Result<WorkspaceDto, AppError> {
    let workspace_service = app_state.workspace_navigation_service();
    workspace_service
        .navigate_to_folder(
            &project_id,
            &project_name,
            &source_folder,
            &current_path,
            &folder_name,
        )
        .await
        .map_err(AppError::from)
}

/// Tauri command to navigate to the parent directory
///
/// Moves up one level in the directory hierarchy, but not above
/// the workspace source folder boundary.
#[tauri::command]
pub async fn navigate_to_parent(
    project_id: String,
    project_name: String,
    source_folder: String,
    current_path: String,
    app_state: State<'_, AppState>,
) -> Result<WorkspaceDto, AppError> {
    let workspace_service = app_state.workspace_navigation_service();
    workspace_service
        .navigate_to_parent(&project_id, &project_name, &source_folder, &current_path)
        .await
        .map_err(AppError::from)
}
