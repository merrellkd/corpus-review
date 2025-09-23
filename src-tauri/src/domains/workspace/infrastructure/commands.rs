use tauri::State;
use serde::{Deserialize, Serialize};

use crate::domains::workspace::domain::{
    workspace::{Workspace, WorkspaceId, CreateWorkspaceRequest, UpdateWorkspaceRequest, WorkspaceResponse, Position, Dimensions, LayoutMode},
    document_caddy::{DocumentCaddy, DocumentCaddyId, CreateDocumentCaddyRequest, UpdateDocumentCaddyRequest, DocumentCaddyResponse, DocumentCaddyData},
    layout_mode::{LayoutEngine, DocumentLayoutInfo, DocumentLayoutResult, CalculateLayoutRequest, CalculateLayoutResponse},
};

use super::workspace_repository::{WorkspaceRepository, WorkspaceRepositoryError};

/// Application state for workspace operations
pub struct WorkspaceAppState {
    pub repository: Box<dyn WorkspaceRepository + Send + Sync>,
}

/// Create a new workspace
#[tauri::command]
pub async fn create_workspace(
    request: CreateWorkspaceRequest,
    state: State<'_, WorkspaceAppState>,
) -> Result<WorkspaceResponse, String> {
    let mut workspace = Workspace::new(request.name)?;

    // Apply optional configuration
    if let Some(layout_mode_str) = request.layout_mode {
        let layout_mode = LayoutMode::from_str(&layout_mode_str)
            .map_err(|e| format!("Invalid layout mode: {}", e))?;
        workspace.switch_layout_mode(layout_mode);
    }

    if let Some(size) = request.workspace_size {
        workspace.update_workspace_size(size);
    }

    // Save to repository
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to save workspace: {}", e))?;

    Ok(WorkspaceResponse::success(workspace))
}

/// Get workspace by ID
#[tauri::command]
pub async fn get_workspace(
    workspace_id: String,
    state: State<'_, WorkspaceAppState>,
) -> Result<WorkspaceResponse, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    match state.repository.find_by_id(&id).await {
        Ok(Some(workspace)) => Ok(WorkspaceResponse::success(workspace)),
        Ok(None) => Err(format!("Workspace not found: {}", id)),
        Err(e) => Err(format!("Failed to get workspace: {}", e)),
    }
}

/// Update workspace
#[tauri::command]
pub async fn update_workspace(
    workspace_id: String,
    request: UpdateWorkspaceRequest,
    state: State<'_, WorkspaceAppState>,
) -> Result<WorkspaceResponse, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    let mut workspace = match state.repository.find_by_id(&id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    // Apply updates
    if let Some(name) = request.name {
        workspace.update_name(name)?;
    }

    if let Some(layout_mode_str) = request.layout_mode {
        let layout_mode = LayoutMode::from_str(&layout_mode_str)
            .map_err(|e| format!("Invalid layout mode: {}", e))?;
        workspace.switch_layout_mode(layout_mode);
    }

    if let Some(size) = request.workspace_size {
        workspace.update_workspace_size(size);
    }

    // Save changes
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to update workspace: {}", e))?;

    Ok(WorkspaceResponse::success(workspace))
}

/// Delete workspace
#[tauri::command]
pub async fn delete_workspace(
    workspace_id: String,
    state: State<'_, WorkspaceAppState>,
) -> Result<bool, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    state.repository.delete(&id).await
        .map_err(|e| format!("Failed to delete workspace: {}", e))
}

/// List all workspaces
#[tauri::command]
pub async fn list_workspaces(
    state: State<'_, WorkspaceAppState>,
) -> Result<Vec<Workspace>, String> {
    state.repository.list_all().await
        .map_err(|e| format!("Failed to list workspaces: {}", e))
}

/// Add document to workspace
#[tauri::command]
pub async fn add_document_to_workspace(
    workspace_id: String,
    request: CreateDocumentCaddyRequest,
    state: State<'_, WorkspaceAppState>,
) -> Result<DocumentCaddyResponse, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    let mut workspace = match state.repository.find_by_id(&id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    // Create position and dimensions
    let position = request.position
        .map(|p| Position::new(p.x, p.y))
        .transpose()?
        .unwrap_or_else(Position::origin);

    let dimensions = request.dimensions
        .map(|d| Dimensions::new(d.width, d.height))
        .transpose()?
        .unwrap_or_else(Dimensions::default);

    // Determine title
    let title = request.title.unwrap_or_else(|| {
        std::path::Path::new(&request.file_path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled Document")
            .to_string()
    });

    // Create document caddy
    let document_caddy = DocumentCaddy::new(request.file_path, title, position, dimensions)?;

    // Add to workspace
    workspace.add_document(document_caddy.id.to_string());

    // Save workspace
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to save workspace: {}", e))?;

    Ok(DocumentCaddyResponse::success(document_caddy))
}

/// Remove document from workspace
#[tauri::command]
pub async fn remove_document_from_workspace(
    workspace_id: String,
    document_id: String,
    state: State<'_, WorkspaceAppState>,
) -> Result<bool, String> {
    let workspace_id = WorkspaceId::from_string(workspace_id)?;
    let _document_id = DocumentCaddyId::from_string(document_id.clone())?;

    let mut workspace = match state.repository.find_by_id(&workspace_id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", workspace_id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    // Remove document from workspace
    let removed = workspace.remove_document(&document_id);

    if removed {
        // Save workspace
        state.repository.save(&workspace).await
            .map_err(|e| format!("Failed to save workspace: {}", e))?;
    }

    Ok(removed)
}

/// Switch workspace layout mode
#[tauri::command]
pub async fn switch_layout_mode(
    workspace_id: String,
    layout_mode: String,
    state: State<'_, WorkspaceAppState>,
) -> Result<CalculateLayoutResponse, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    let mut workspace = match state.repository.find_by_id(&id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    // Parse and apply layout mode
    let new_layout_mode = LayoutMode::from_str(&layout_mode)
        .map_err(|e| format!("Invalid layout mode: {}", e))?;

    workspace.switch_layout_mode(new_layout_mode);

    // Save workspace
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to save workspace: {}", e))?;

    // Calculate new layout (placeholder - would need actual document data)
    let layout_results = Vec::new(); // TODO: Implement actual layout calculation

    Ok(CalculateLayoutResponse::success(layout_results))
}

/// Move document in workspace
#[tauri::command]
pub async fn move_document(
    workspace_id: String,
    document_id: String,
    x: f64,
    y: f64,
    state: State<'_, WorkspaceAppState>,
) -> Result<CalculateLayoutResponse, String> {
    let workspace_id = WorkspaceId::from_string(workspace_id)?;
    let _document_id = DocumentCaddyId::from_string(document_id)?;

    let mut workspace = match state.repository.find_by_id(&workspace_id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", workspace_id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    let new_position = Position::new(x, y)?;

    // Check if this action should trigger auto-freeform mode
    workspace.auto_switch_to_freeform_if_needed("drag");

    // Save workspace
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to save workspace: {}", e))?;

    // Calculate new layout (placeholder)
    let layout_results = Vec::new(); // TODO: Implement actual layout calculation

    Ok(CalculateLayoutResponse::success(layout_results))
}

/// Resize document in workspace
#[tauri::command]
pub async fn resize_document(
    workspace_id: String,
    document_id: String,
    width: f64,
    height: f64,
    state: State<'_, WorkspaceAppState>,
) -> Result<CalculateLayoutResponse, String> {
    let workspace_id = WorkspaceId::from_string(workspace_id)?;
    let _document_id = DocumentCaddyId::from_string(document_id)?;

    let mut workspace = match state.repository.find_by_id(&workspace_id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", workspace_id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    let new_dimensions = Dimensions::new(width, height)?;

    // Check if this action should trigger auto-freeform mode
    workspace.auto_switch_to_freeform_if_needed("resize");

    // Save workspace
    state.repository.save(&workspace).await
        .map_err(|e| format!("Failed to save workspace: {}", e))?;

    // Calculate new layout (placeholder)
    let layout_results = Vec::new(); // TODO: Implement actual layout calculation

    Ok(CalculateLayoutResponse::success(layout_results))
}

/// Calculate layout for workspace documents
#[tauri::command]
pub async fn calculate_layout(
    request: CalculateLayoutRequest,
    _state: State<'_, WorkspaceAppState>,
) -> Result<CalculateLayoutResponse, String> {
    let layout_mode = LayoutMode::from_str(&request.layout_mode)
        .map_err(|e| format!("Invalid layout mode: {}", e))?;

    let layout_results = LayoutEngine::calculate_layout(
        &request.documents,
        &layout_mode,
        &request.workspace_size,
        request.active_document_id.as_deref(),
    ).map_err(|e| format!("Layout calculation failed: {}", e))?;

    Ok(CalculateLayoutResponse::success(layout_results))
}

/// Get workspace statistics
#[tauri::command]
pub async fn get_workspace_stats(
    workspace_id: String,
    state: State<'_, WorkspaceAppState>,
) -> Result<WorkspaceStats, String> {
    let id = WorkspaceId::from_string(workspace_id)?;

    let workspace = match state.repository.find_by_id(&id).await {
        Ok(Some(workspace)) => workspace,
        Ok(None) => return Err(format!("Workspace not found: {}", id)),
        Err(e) => return Err(format!("Failed to get workspace: {}", e)),
    };

    Ok(WorkspaceStats {
        workspace_id: workspace.id.to_string(),
        name: workspace.name.clone(),
        document_count: workspace.document_count,
        layout_mode: workspace.layout_mode.as_str().to_string(),
        workspace_size: WorkspaceSizeData {
            width: workspace.workspace_size.width,
            height: workspace.workspace_size.height,
        },
        active_document_id: workspace.active_document_id.clone(),
        is_empty: workspace.is_empty(),
        created_at: workspace.created_at.to_rfc3339(),
        last_modified: workspace.last_modified.to_rfc3339(),
    })
}

/// Workspace statistics response
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceStats {
    pub workspace_id: String,
    pub name: String,
    pub document_count: usize,
    pub layout_mode: String,
    pub workspace_size: WorkspaceSizeData,
    pub active_document_id: Option<String>,
    pub is_empty: bool,
    pub created_at: String,
    pub last_modified: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceSizeData {
    pub width: f64,
    pub height: f64,
}

/// Validate file path for document addition
#[tauri::command]
pub async fn validate_document_path(file_path: String) -> Result<DocumentPathValidation, String> {
    use std::path::Path;

    let path = Path::new(&file_path);

    // Check if file exists
    if !path.exists() {
        return Ok(DocumentPathValidation {
            is_valid: false,
            error_message: Some("File does not exist".to_string()),
            file_info: None,
        });
    }

    // Check if it's a file (not directory)
    if !path.is_file() {
        return Ok(DocumentPathValidation {
            is_valid: false,
            error_message: Some("Path is not a file".to_string()),
            file_info: None,
        });
    }

    // Get file metadata
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let file_size = metadata.len();
    let modified = metadata.modified()
        .map_err(|e| format!("Failed to get modification time: {}", e))?;

    // Get file extension and determine if it's supported
    let extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    let supported_extensions = ["pdf", "txt", "md", "html", "json", "xml"];
    let is_supported = supported_extensions.contains(&extension.as_str());

    let file_name = path.file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    Ok(DocumentPathValidation {
        is_valid: is_supported,
        error_message: if !is_supported {
            Some(format!("Unsupported file type: .{}", extension))
        } else {
            None
        },
        file_info: Some(FileInfo {
            name: file_name,
            path: file_path,
            size: file_size,
            extension,
            modified_at: modified.duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs(),
        }),
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentPathValidation {
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub file_info: Option<FileInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub extension: String,
    pub modified_at: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::workspace::infrastructure::workspace_repository::InMemoryWorkspaceRepository;
    use tauri::test::{MockRuntime, MockState};

    fn create_test_state() -> WorkspaceAppState {
        WorkspaceAppState {
            repository: Box::new(InMemoryWorkspaceRepository::new()),
        }
    }

    #[tokio::test]
    async fn test_create_workspace_command() {
        let state = MockState::new(create_test_state());

        let request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            layout_mode: Some("stacked".to_string()),
            workspace_size: None,
        };

        let result = create_workspace(request, state).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.success);
        assert_eq!(response.workspace.name, "Test Workspace");
    }

    #[tokio::test]
    async fn test_get_workspace_command() {
        let state = MockState::new(create_test_state());

        // First create a workspace
        let create_request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            layout_mode: None,
            workspace_size: None,
        };

        let create_result = create_workspace(create_request, state.clone()).await.unwrap();
        let workspace_id = create_result.workspace.id.to_string();

        // Then get it
        let get_result = get_workspace(workspace_id, state).await;
        assert!(get_result.is_ok());

        let response = get_result.unwrap();
        assert!(response.success);
        assert_eq!(response.workspace.name, "Test Workspace");
    }

    #[tokio::test]
    async fn test_add_document_to_workspace_command() {
        let state = MockState::new(create_test_state());

        // Create workspace first
        let create_request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            layout_mode: None,
            workspace_size: None,
        };

        let workspace_response = create_workspace(create_request, state.clone()).await.unwrap();
        let workspace_id = workspace_response.workspace.id.to_string();

        // Add document
        let doc_request = CreateDocumentCaddyRequest {
            file_path: "/test/document.pdf".to_string(),
            title: Some("Test Document".to_string()),
            position: None,
            dimensions: None,
        };

        let result = add_document_to_workspace(workspace_id, doc_request, state).await;
        assert!(result.is_ok());

        let response = result.unwrap();
        assert!(response.success);
        assert_eq!(response.document_caddy.title, "Test Document");
    }

    #[tokio::test]
    async fn test_switch_layout_mode_command() {
        let state = MockState::new(create_test_state());

        // Create workspace first
        let create_request = CreateWorkspaceRequest {
            name: "Test Workspace".to_string(),
            layout_mode: Some("stacked".to_string()),
            workspace_size: None,
        };

        let workspace_response = create_workspace(create_request, state.clone()).await.unwrap();
        let workspace_id = workspace_response.workspace.id.to_string();

        // Switch layout mode
        let result = switch_layout_mode(workspace_id.clone(), "grid".to_string(), state.clone()).await;
        assert!(result.is_ok());

        // Verify the change
        let get_result = get_workspace(workspace_id, state).await.unwrap();
        assert_eq!(get_result.workspace.layout_mode, LayoutMode::Grid);
    }
}