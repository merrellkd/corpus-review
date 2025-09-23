use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Document caddy identifier with doc_ prefix
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DocumentCaddyId(String);

impl DocumentCaddyId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self(format!("doc_{}", uuid))
    }

    pub fn from_string(id: String) -> Result<Self, String> {
        if !id.starts_with("doc_") {
            return Err(format!("DocumentCaddyId must start with 'doc_'. Got: {}", id));
        }

        let uuid_part = &id[4..];
        if Uuid::parse_str(uuid_part).is_err() {
            return Err(format!("Invalid UUID format in DocumentCaddyId: {}", uuid_part));
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

impl std::fmt::Display for DocumentCaddyId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Document caddy states during its lifecycle
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DocumentCaddyState {
    Loading,
    Ready,
    Error,
    Closing,
}

impl DocumentCaddyState {
    pub fn as_str(&self) -> &'static str {
        match self {
            DocumentCaddyState::Loading => "loading",
            DocumentCaddyState::Ready => "ready",
            DocumentCaddyState::Error => "error",
            DocumentCaddyState::Closing => "closing",
        }
    }

    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "loading" => Ok(DocumentCaddyState::Loading),
            "ready" => Ok(DocumentCaddyState::Ready),
            "error" => Ok(DocumentCaddyState::Error),
            "closing" => Ok(DocumentCaddyState::Closing),
            _ => Err(format!("Invalid document caddy state: {}", s)),
        }
    }

    pub fn can_interact(&self) -> bool {
        matches!(self, DocumentCaddyState::Ready)
    }

    pub fn can_move(&self) -> bool {
        self.can_interact()
    }

    pub fn can_resize(&self) -> bool {
        self.can_interact()
    }
}

/// Document caddy entity representing a document container in the workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentCaddy {
    pub id: DocumentCaddyId,
    pub file_path: String,
    pub title: String,
    pub position: super::workspace::Position,
    pub dimensions: super::workspace::Dimensions,
    pub is_active: bool,
    pub z_index: i32,
    pub state: DocumentCaddyState,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_modified: chrono::DateTime<chrono::Utc>,
}

impl DocumentCaddy {
    pub fn new(
        file_path: String,
        title: String,
        position: super::workspace::Position,
        dimensions: super::workspace::Dimensions,
    ) -> Result<Self, String> {
        if file_path.trim().is_empty() {
            return Err("File path cannot be empty".to_string());
        }

        if title.trim().is_empty() {
            return Err("Document title cannot be empty".to_string());
        }

        let now = chrono::Utc::now();
        Ok(Self {
            id: DocumentCaddyId::new(),
            file_path: file_path.trim().to_string(),
            title: title.trim().to_string(),
            position,
            dimensions,
            is_active: false,
            z_index: 0,
            state: DocumentCaddyState::Loading,
            error_message: None,
            created_at: now,
            last_modified: now,
        })
    }

    pub fn from_data(data: DocumentCaddyData) -> Result<Self, String> {
        let id = DocumentCaddyId::from_string(data.id)?;
        let position = super::workspace::Position::new(data.position.x, data.position.y)?;
        let dimensions = super::workspace::Dimensions::new(data.dimensions.width, data.dimensions.height)?;
        let state = DocumentCaddyState::from_str(&data.state)?;

        Ok(Self {
            id,
            file_path: data.file_path,
            title: data.title,
            position,
            dimensions,
            is_active: data.is_active,
            z_index: data.z_index,
            state,
            error_message: data.error_message,
            created_at: data.created_at,
            last_modified: data.last_modified,
        })
    }

    pub fn update_title(&mut self, new_title: String) -> Result<(), String> {
        if new_title.trim().is_empty() {
            return Err("Document title cannot be empty".to_string());
        }
        self.title = new_title.trim().to_string();
        self.touch();
        Ok(())
    }

    pub fn move_to(&mut self, new_position: super::workspace::Position) {
        self.position = new_position;
        self.touch();
    }

    pub fn resize(&mut self, new_dimensions: super::workspace::Dimensions) {
        self.dimensions = new_dimensions;
        self.touch();
    }

    pub fn activate(&mut self) {
        self.is_active = true;
        self.touch();
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
        self.touch();
    }

    pub fn set_z_index(&mut self, new_z_index: i32) -> Result<(), String> {
        if new_z_index < 0 {
            return Err("Z-index must be non-negative".to_string());
        }
        self.z_index = new_z_index;
        self.touch();
        Ok(())
    }

    pub fn bring_to_front(&mut self, current_max_z_index: i32) -> Result<(), String> {
        self.set_z_index(current_max_z_index + 1)
    }

    pub fn mark_ready(&mut self) -> Result<(), String> {
        if self.state != DocumentCaddyState::Loading {
            return Err(format!("Cannot mark ready from state: {}", self.state.as_str()));
        }
        self.state = DocumentCaddyState::Ready;
        self.error_message = None;
        self.touch();
        Ok(())
    }

    pub fn mark_error(&mut self, error_message: String) {
        self.state = DocumentCaddyState::Error;
        self.error_message = Some(error_message);
        self.touch();
    }

    pub fn start_closing(&mut self) {
        self.state = DocumentCaddyState::Closing;
        self.touch();
    }

    pub fn can_interact(&self) -> bool {
        self.state.can_interact()
    }

    pub fn can_move(&self) -> bool {
        self.state.can_move() && !self.is_closing()
    }

    pub fn can_resize(&self) -> bool {
        self.state.can_resize() && !self.is_closing()
    }

    pub fn is_ready(&self) -> bool {
        self.state == DocumentCaddyState::Ready
    }

    pub fn has_error(&self) -> bool {
        self.state == DocumentCaddyState::Error
    }

    pub fn is_loading(&self) -> bool {
        self.state == DocumentCaddyState::Loading
    }

    pub fn is_closing(&self) -> bool {
        self.state == DocumentCaddyState::Closing
    }

    fn touch(&mut self) {
        self.last_modified = chrono::Utc::now();
    }

    pub fn to_data(&self) -> DocumentCaddyData {
        DocumentCaddyData {
            id: self.id.to_string(),
            file_path: self.file_path.clone(),
            title: self.title.clone(),
            position: PositionData {
                x: self.position.x,
                y: self.position.y,
            },
            dimensions: DimensionsData {
                width: self.dimensions.width,
                height: self.dimensions.height,
            },
            is_active: self.is_active,
            z_index: self.z_index,
            state: self.state.as_str().to_string(),
            error_message: self.error_message.clone(),
            created_at: self.created_at,
            last_modified: self.last_modified,
        }
    }
}

/// Data transfer objects for serialization
#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentCaddyData {
    pub id: String,
    pub file_path: String,
    pub title: String,
    pub position: PositionData,
    pub dimensions: DimensionsData,
    pub is_active: bool,
    pub z_index: i32,
    pub state: String,
    pub error_message: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub last_modified: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PositionData {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DimensionsData {
    pub width: f64,
    pub height: f64,
}

/// Request/Response types for document caddy operations
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentCaddyRequest {
    pub file_path: String,
    pub title: Option<String>,
    pub position: Option<PositionData>,
    pub dimensions: Option<DimensionsData>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDocumentCaddyRequest {
    pub title: Option<String>,
    pub position: Option<PositionData>,
    pub dimensions: Option<DimensionsData>,
    pub z_index: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DocumentCaddyResponse {
    pub document_caddy: DocumentCaddyData,
    pub success: bool,
    pub message: Option<String>,
}

impl DocumentCaddyResponse {
    pub fn success(document_caddy: DocumentCaddy) -> Self {
        Self {
            document_caddy: document_caddy.to_data(),
            success: true,
            message: None,
        }
    }

    pub fn error(document_caddy: DocumentCaddy, message: String) -> Self {
        Self {
            document_caddy: document_caddy.to_data(),
            success: false,
            message: Some(message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_caddy_id_creation() {
        let id = DocumentCaddyId::new();
        assert!(id.as_str().starts_with("doc_"));
        assert_eq!(id.as_str().len(), 40); // "doc_" + 36 char UUID
    }

    #[test]
    fn test_document_caddy_id_from_string() {
        let valid_id = "doc_12345678-1234-4567-8901-123456789012";
        let id = DocumentCaddyId::from_string(valid_id.to_string()).unwrap();
        assert_eq!(id.as_str(), valid_id);

        let invalid_id = "invalid_id";
        assert!(DocumentCaddyId::from_string(invalid_id.to_string()).is_err());
    }

    #[test]
    fn test_document_caddy_state_transitions() {
        assert!(DocumentCaddyState::Ready.can_interact());
        assert!(!DocumentCaddyState::Loading.can_interact());
        assert!(!DocumentCaddyState::Error.can_interact());
        assert!(!DocumentCaddyState::Closing.can_interact());
    }

    #[test]
    fn test_document_caddy_creation() {
        let position = super::workspace::Position::new(10.0, 20.0).unwrap();
        let dimensions = super::workspace::Dimensions::new(600.0, 400.0).unwrap();

        let caddy = DocumentCaddy::new(
            "/test/document.pdf".to_string(),
            "Test Document".to_string(),
            position,
            dimensions,
        ).unwrap();

        assert_eq!(caddy.file_path, "/test/document.pdf");
        assert_eq!(caddy.title, "Test Document");
        assert_eq!(caddy.state, DocumentCaddyState::Loading);
        assert!(!caddy.is_active);
        assert_eq!(caddy.z_index, 0);

        assert!(DocumentCaddy::new("".to_string(), "Title".to_string(), position, dimensions).is_err());
        assert!(DocumentCaddy::new("/path".to_string(), "".to_string(), position, dimensions).is_err());
    }

    #[test]
    fn test_document_caddy_state_management() {
        let position = super::workspace::Position::new(0.0, 0.0).unwrap();
        let dimensions = super::workspace::Dimensions::default();
        let mut caddy = DocumentCaddy::new(
            "/test.pdf".to_string(),
            "Test".to_string(),
            position,
            dimensions,
        ).unwrap();

        // Initial state
        assert!(caddy.is_loading());
        assert!(!caddy.can_interact());

        // Mark ready
        caddy.mark_ready().unwrap();
        assert!(caddy.is_ready());
        assert!(caddy.can_interact());

        // Cannot mark ready from non-loading state
        assert!(caddy.mark_ready().is_err());

        // Mark error
        caddy.mark_error("Test error".to_string());
        assert!(caddy.has_error());
        assert!(!caddy.can_interact());
        assert_eq!(caddy.error_message, Some("Test error".to_string()));
    }

    #[test]
    fn test_document_caddy_manipulation() {
        let position = super::workspace::Position::new(0.0, 0.0).unwrap();
        let dimensions = super::workspace::Dimensions::default();
        let mut caddy = DocumentCaddy::new(
            "/test.pdf".to_string(),
            "Test".to_string(),
            position,
            dimensions,
        ).unwrap();

        caddy.mark_ready().unwrap();

        // Test activation
        caddy.activate();
        assert!(caddy.is_active);

        caddy.deactivate();
        assert!(!caddy.is_active);

        // Test z-index
        caddy.set_z_index(5).unwrap();
        assert_eq!(caddy.z_index, 5);

        assert!(caddy.set_z_index(-1).is_err());

        caddy.bring_to_front(10).unwrap();
        assert_eq!(caddy.z_index, 11);

        // Test movement
        let new_position = super::workspace::Position::new(100.0, 200.0).unwrap();
        caddy.move_to(new_position);
        assert_eq!(caddy.position.x, 100.0);
        assert_eq!(caddy.position.y, 200.0);

        // Test resizing
        let new_dimensions = super::workspace::Dimensions::new(800.0, 600.0).unwrap();
        caddy.resize(new_dimensions);
        assert_eq!(caddy.dimensions.width, 800.0);
        assert_eq!(caddy.dimensions.height, 600.0);

        // Test title update
        caddy.update_title("New Title".to_string()).unwrap();
        assert_eq!(caddy.title, "New Title");

        assert!(caddy.update_title("".to_string()).is_err());
    }

    #[test]
    fn test_document_caddy_closing_restrictions() {
        let position = super::workspace::Position::new(0.0, 0.0).unwrap();
        let dimensions = super::workspace::Dimensions::default();
        let mut caddy = DocumentCaddy::new(
            "/test.pdf".to_string(),
            "Test".to_string(),
            position,
            dimensions,
        ).unwrap();

        caddy.mark_ready().unwrap();
        assert!(caddy.can_move());
        assert!(caddy.can_resize());

        caddy.start_closing();
        assert!(caddy.is_closing());
        assert!(!caddy.can_move());
        assert!(!caddy.can_resize());
    }
}