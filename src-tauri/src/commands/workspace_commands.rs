use tauri::State;
use crate::application::{
    workspace_service::{WorkspaceService, WorkspaceServiceError},
    dtos::{WorkspaceLayoutDto, DocumentCaddyDto, ProjectDto},
};

#[tauri::command]
pub async fn get_workspace_layout(
    project_id: String,
    workspace_service: State<'_, WorkspaceService>,
) -> Result<WorkspaceLayoutDto, String> {
    workspace_service
        .get_workspace_layout(&project_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_workspace_layout(
    layout: WorkspaceLayoutDto,
    workspace_service: State<'_, WorkspaceService>,
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
    workspace_service: State<'_, WorkspaceService>,
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
    workspace_service: State<'_, WorkspaceService>,
) -> Result<WorkspaceLayoutDto, String> {
    workspace_service
        .update_panel_sizes(&project_id, &panel_type, width, height)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_document_caddy(
    file_path: String,
    workspace_service: State<'_, WorkspaceService>,
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
    workspace_service: State<'_, WorkspaceService>,
) -> Result<DocumentCaddyDto, String> {
    workspace_service
        .update_document_caddy(&caddy_id, position_x, position_y)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_project_details(
    project_id: String,
    workspace_service: State<'_, WorkspaceService>,
) -> Result<ProjectDto, String> {
    workspace_service
        .get_project_details(&project_id)
        .await
        .map_err(|e| e.to_string())
}