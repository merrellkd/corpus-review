use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::collections::HashMap;

/// Workspace identifier with mws_ prefix
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct WorkspaceId(String);

impl WorkspaceId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self(format!("mws_{}", uuid))
    }

    pub fn from_string(id: String) -> Result<Self, String> {
        if !id.starts_with("mws_") {
            return Err(format!("WorkspaceId must start with 'mws_'. Got: {}", id));
        }

        let uuid_part = &id[4..];
        if Uuid::parse_str(uuid_part).is_err() {
            return Err(format!("Invalid UUID format in WorkspaceId: {}", uuid_part));
        }

        Ok(Self(id))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_string(self) -> String {
        self.0
    }
}

impl std::fmt::Display for WorkspaceId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Position in 2D space
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

impl Position {
    pub fn new(x: f64, y: f64) -> Result<Self, String> {
        if !x.is_finite() || !y.is_finite() {
            return Err("Position coordinates must be finite".to_string());
        }
        if x < 0.0 || y < 0.0 {
            return Err("Position coordinates must be non-negative".to_string());
        }
        Ok(Self { x, y })
    }

    pub fn origin() -> Self {
        Self { x: 0.0, y: 0.0 }
    }
}

/// Dimensions (width and height)
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Dimensions {
    pub width: f64,
    pub height: f64,
}

impl Dimensions {
    const MIN_WIDTH: f64 = 100.0;
    const MIN_HEIGHT: f64 = 50.0;
    const MAX_WIDTH: f64 = 4000.0;
    const MAX_HEIGHT: f64 = 3000.0;

    pub fn new(width: f64, height: f64) -> Result<Self, String> {
        if !width.is_finite() || !height.is_finite() {
            return Err("Dimensions must be finite numbers".to_string());
        }
        if width < Self::MIN_WIDTH || height < Self::MIN_HEIGHT {
            return Err(format!(
                "Dimensions must be at least {}x{}. Got: {}x{}",
                Self::MIN_WIDTH, Self::MIN_HEIGHT, width, height
            ));
        }
        if width > Self::MAX_WIDTH || height > Self::MAX_HEIGHT {
            return Err(format!(
                "Dimensions must not exceed {}x{}. Got: {}x{}",
                Self::MAX_WIDTH, Self::MAX_HEIGHT, width, height
            ));
        }
        Ok(Self { width, height })
    }

    pub fn default() -> Self {
        Self {
            width: 600.0,
            height: 400.0,
        }
    }
}

/// Layout modes available for the workspace
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LayoutMode {
    Stacked,
    Grid,
    Freeform,
}

impl LayoutMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            LayoutMode::Stacked => "stacked",
            LayoutMode::Grid => "grid",
            LayoutMode::Freeform => "freeform",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "stacked" => Ok(LayoutMode::Stacked),
            "grid" => Ok(LayoutMode::Grid),
            "freeform" => Ok(LayoutMode::Freeform),
            _ => Err(format!("Invalid layout mode: {}", s)),
        }
    }

    pub fn supports_user_manipulation(&self) -> bool {
        matches!(self, LayoutMode::Freeform)
    }

    pub fn should_auto_switch_to_freeform(&self) -> bool {
        !matches!(self, LayoutMode::Freeform)
    }
}

/// Workspace aggregate containing document management and layout state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: WorkspaceId,
    pub name: String,
    pub layout_mode: LayoutMode,
    pub workspace_size: Dimensions,
    pub document_count: usize,
    pub active_document_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_modified: chrono::DateTime<chrono::Utc>,
}

impl Workspace {
    pub fn new(name: String) -> Result<Self, String> {
        if name.trim().is_empty() {
            return Err("Workspace name cannot be empty".to_string());
        }

        let now = chrono::Utc::now();
        Ok(Self {
            id: WorkspaceId::new(),
            name: name.trim().to_string(),
            layout_mode: LayoutMode::Stacked,
            workspace_size: Dimensions::default(),
            document_count: 0,
            active_document_id: None,
            created_at: now,
            last_modified: now,
        })
    }

    pub fn update_name(&mut self, new_name: String) -> Result<(), String> {
        if new_name.trim().is_empty() {
            return Err("Workspace name cannot be empty".to_string());
        }
        self.name = new_name.trim().to_string();
        self.touch();
        Ok(())
    }

    pub fn switch_layout_mode(&mut self, new_mode: LayoutMode) {
        if self.layout_mode != new_mode {
            self.layout_mode = new_mode;
            self.touch();
        }
    }

    pub fn update_workspace_size(&mut self, new_size: Dimensions) {
        self.workspace_size = new_size;
        self.touch();
    }

    pub fn add_document(&mut self, document_id: String) {
        self.document_count += 1;
        if self.active_document_id.is_none() {
            self.active_document_id = Some(document_id);
        }
        self.touch();
    }

    pub fn remove_document(&mut self, document_id: &str) -> bool {
        if self.document_count > 0 {
            self.document_count -= 1;

            // If this was the active document, clear the active state
            if let Some(ref active_id) = self.active_document_id {
                if active_id == document_id {
                    self.active_document_id = None;
                }
            }

            self.touch();
            true
        } else {
            false
        }
    }

    pub fn remove_all_documents(&mut self) {
        self.document_count = 0;
        self.active_document_id = None;
        self.touch();
    }

    pub fn activate_document(&mut self, document_id: String) {
        self.active_document_id = Some(document_id);
        self.touch();
    }

    pub fn auto_switch_to_freeform_if_needed(&mut self, user_action: &str) {
        if self.layout_mode.should_auto_switch_to_freeform() {
            match user_action {
                "drag" | "resize" => {
                    self.layout_mode = LayoutMode::Freeform;
                    self.touch();
                }
                _ => {}
            }
        }
    }

    pub fn is_empty(&self) -> bool {
        self.document_count == 0
    }

    fn touch(&mut self) {
        self.last_modified = chrono::Utc::now();
    }
}

/// Data transfer object for workspace creation
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWorkspaceRequest {
    pub name: String,
    pub layout_mode: Option<String>,
    pub workspace_size: Option<Dimensions>,
}

/// Data transfer object for workspace updates
#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateWorkspaceRequest {
    pub name: Option<String>,
    pub layout_mode: Option<String>,
    pub workspace_size: Option<Dimensions>,
}

/// Response for workspace operations
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceResponse {
    pub workspace: Workspace,
    pub success: bool,
    pub message: Option<String>,
}

impl WorkspaceResponse {
    pub fn success(workspace: Workspace) -> Self {
        Self {
            workspace,
            success: true,
            message: None,
        }
    }

    pub fn error(workspace: Workspace, message: String) -> Self {
        Self {
            workspace,
            success: false,
            message: Some(message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_id_creation() {
        let id = WorkspaceId::new();
        assert!(id.as_str().starts_with("mws_"));
        assert_eq!(id.as_str().len(), 40); // "mws_" + 36 char UUID
    }

    #[test]
    fn test_workspace_id_from_string() {
        let valid_id = "mws_12345678-1234-4567-8901-123456789012";
        let id = WorkspaceId::from_string(valid_id.to_string()).unwrap();
        assert_eq!(id.as_str(), valid_id);

        let invalid_id = "invalid_id";
        assert!(WorkspaceId::from_string(invalid_id.to_string()).is_err());
    }

    #[test]
    fn test_position_validation() {
        assert!(Position::new(10.0, 20.0).is_ok());
        assert!(Position::new(-1.0, 20.0).is_err());
        assert!(Position::new(10.0, -1.0).is_err());
        assert!(Position::new(f64::NAN, 20.0).is_err());
    }

    #[test]
    fn test_dimensions_validation() {
        assert!(Dimensions::new(600.0, 400.0).is_ok());
        assert!(Dimensions::new(50.0, 50.0).is_err()); // Too small
        assert!(Dimensions::new(5000.0, 400.0).is_err()); // Too large
    }

    #[test]
    fn test_workspace_creation() {
        let workspace = Workspace::new("Test Workspace".to_string()).unwrap();
        assert_eq!(workspace.name, "Test Workspace");
        assert_eq!(workspace.layout_mode, LayoutMode::Stacked);
        assert_eq!(workspace.document_count, 0);
        assert!(workspace.active_document_id.is_none());

        assert!(Workspace::new("".to_string()).is_err());
        assert!(Workspace::new("   ".to_string()).is_err());
    }

    #[test]
    fn test_layout_mode_conversion() {
        assert_eq!(LayoutMode::Stacked.as_str(), "stacked");
        assert_eq!(LayoutMode::from_str("grid").unwrap(), LayoutMode::Grid);
        assert!(LayoutMode::from_str("invalid").is_err());
    }

    #[test]
    fn test_auto_freeform_switching() {
        let mut workspace = Workspace::new("Test".to_string()).unwrap();

        workspace.auto_switch_to_freeform_if_needed("drag");
        assert_eq!(workspace.layout_mode, LayoutMode::Freeform);

        workspace.layout_mode = LayoutMode::Grid;
        workspace.auto_switch_to_freeform_if_needed("resize");
        assert_eq!(workspace.layout_mode, LayoutMode::Freeform);

        workspace.auto_switch_to_freeform_if_needed("click");
        assert_eq!(workspace.layout_mode, LayoutMode::Freeform); // No change
    }
}