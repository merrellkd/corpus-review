use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceLayoutDto {
    pub id: String,
    pub project_id: String,
    pub file_explorer_visible: bool,
    pub category_explorer_visible: bool,
    pub search_panel_visible: bool,
    pub document_workspace_visible: bool,
    pub explorer_width: f32,
    pub workspace_width: f32,
    pub last_modified: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentCaddyDto {
    pub id: String,
    pub file_path: String,
    pub title: String,
    pub position_x: f64,
    pub position_y: f64,
    pub width: f64,
    pub height: f64,
    pub z_index: u32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub source_folder: String,
    pub reports_folder: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSystemItemDto {
    pub path: String,
    pub name: String,
    pub item_type: String,
    pub parent_path: Option<String>,
    pub last_modified: DateTime<Utc>,
    pub size: Option<u64>,
    pub is_accessible: bool,
    pub formatted_size: String,
}