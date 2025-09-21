use serde::{Deserialize, Serialize};
use crate::domain::workspace::value_objects::{DocumentCaddyId, FilePath};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DocumentCaddy {
    pub id: DocumentCaddyId,
    pub file_path: FilePath,
    pub title: String,
    pub is_active: bool,
    pub position: CaddyPosition,
    pub dimensions: CaddyDimensions,
    pub scroll_position: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CaddyPosition {
    pub x: f64,
    pub y: f64,
    pub z_index: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CaddyDimensions {
    pub width: f64,
    pub height: f64,
    pub min_width: f64,
    pub min_height: f64,
}

impl DocumentCaddy {
    pub fn new(file_path: FilePath) -> Result<Self, String> {
        let title = Self::extract_title_from_path(&file_path)?;

        Ok(Self {
            id: DocumentCaddyId::new(),
            file_path,
            title,
            is_active: true, // New caddies start as active
            position: CaddyPosition::default(),
            dimensions: CaddyDimensions::default(),
            scroll_position: 0.0,
        })
    }

    pub fn activate(&mut self) {
        self.is_active = true;
    }

    pub fn deactivate(&mut self) {
        self.is_active = false;
    }

    pub fn update_position(&mut self, x: f64, y: f64) -> Result<(), String> {
        if x < 0.0 || y < 0.0 {
            return Err("Position coordinates cannot be negative".to_string());
        }

        self.position.x = x;
        self.position.y = y;
        Ok(())
    }

    pub fn update_dimensions(&mut self, width: f64, height: f64) -> Result<(), String> {
        if width < self.dimensions.min_width {
            return Err(format!(
                "Width cannot be less than minimum: {}",
                self.dimensions.min_width
            ));
        }

        if height < self.dimensions.min_height {
            return Err(format!(
                "Height cannot be less than minimum: {}",
                self.dimensions.min_height
            ));
        }

        self.dimensions.width = width;
        self.dimensions.height = height;
        Ok(())
    }

    pub fn update_scroll_position(&mut self, position: f64) -> Result<(), String> {
        if position < 0.0 {
            return Err("Scroll position cannot be negative".to_string());
        }

        self.scroll_position = position;
        Ok(())
    }

    pub fn bring_to_front(&mut self, max_z_index: i32) {
        self.position.z_index = max_z_index + 1;
    }

    pub fn send_to_back(&mut self) {
        self.position.z_index = 1;
    }

    pub fn get_file_extension(&self) -> Option<String> {
        std::path::Path::new(self.file_path.as_str())
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|s| s.to_lowercase())
    }

    pub fn is_text_file(&self) -> bool {
        matches!(
            self.get_file_extension().as_deref(),
            Some("txt") | Some("md") | Some("json") | Some("xml") | Some("csv") | Some("log")
        )
    }

    pub fn is_document_file(&self) -> bool {
        matches!(
            self.get_file_extension().as_deref(),
            Some("pdf") | Some("doc") | Some("docx") | Some("ppt") | Some("pptx")
        )
    }

    fn extract_title_from_path(file_path: &FilePath) -> Result<String, String> {
        let path = std::path::Path::new(file_path.as_str());

        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid file name")?;

        // Remove extension for title
        let title = if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
            stem.to_string()
        } else {
            file_name.to_string()
        };

        if title.is_empty() {
            return Err("File title cannot be empty".to_string());
        }

        Ok(title)
    }
}

impl Default for CaddyPosition {
    fn default() -> Self {
        Self {
            x: 100.0,
            y: 100.0,
            z_index: 1,
        }
    }
}

impl Default for CaddyDimensions {
    fn default() -> Self {
        Self {
            width: 600.0,
            height: 400.0,
            min_width: 300.0,
            min_height: 200.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_document_caddy() {
        let file_path = FilePath::new("/Users/test/Documents/Source/My Document.txt".to_string()).unwrap();
        let caddy = DocumentCaddy::new(file_path.clone()).unwrap();

        assert_eq!(caddy.file_path, file_path);
        assert_eq!(caddy.title, "My Document");
        assert!(caddy.is_active);
        assert_eq!(caddy.scroll_position, 0.0);
    }

    #[test]
    fn test_title_extraction() {
        let file_path = FilePath::new("/Users/test/Documents/Source/Complex File Name.pdf".to_string()).unwrap();
        let caddy = DocumentCaddy::new(file_path).unwrap();

        assert_eq!(caddy.title, "Complex File Name");
    }

    #[test]
    fn test_position_update() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let mut caddy = DocumentCaddy::new(file_path).unwrap();

        let result = caddy.update_position(200.0, 150.0);
        assert!(result.is_ok());
        assert_eq!(caddy.position.x, 200.0);
        assert_eq!(caddy.position.y, 150.0);

        // Test negative coordinates
        let result = caddy.update_position(-10.0, 150.0);
        assert!(result.is_err());
    }

    #[test]
    fn test_dimension_constraints() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let mut caddy = DocumentCaddy::new(file_path).unwrap();

        // Test minimum width constraint
        let result = caddy.update_dimensions(200.0, 400.0);
        assert!(result.is_err());

        // Test minimum height constraint
        let result = caddy.update_dimensions(600.0, 100.0);
        assert!(result.is_err());

        // Test valid dimensions
        let result = caddy.update_dimensions(800.0, 500.0);
        assert!(result.is_ok());
        assert_eq!(caddy.dimensions.width, 800.0);
        assert_eq!(caddy.dimensions.height, 500.0);
    }

    #[test]
    fn test_z_index_management() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let mut caddy = DocumentCaddy::new(file_path).unwrap();

        caddy.bring_to_front(5);
        assert_eq!(caddy.position.z_index, 6);

        caddy.send_to_back();
        assert_eq!(caddy.position.z_index, 1);
    }

    #[test]
    fn test_file_type_detection() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let caddy = DocumentCaddy::new(file_path).unwrap();

        assert!(caddy.is_text_file());
        assert!(!caddy.is_document_file());

        let pdf_path = FilePath::new("/Users/test/Documents/Source/report.pdf".to_string()).unwrap();
        let pdf_caddy = DocumentCaddy::new(pdf_path).unwrap();

        assert!(!pdf_caddy.is_text_file());
        assert!(pdf_caddy.is_document_file());
    }

    #[test]
    fn test_activation_state() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let mut caddy = DocumentCaddy::new(file_path).unwrap();

        assert!(caddy.is_active);

        caddy.deactivate();
        assert!(!caddy.is_active);

        caddy.activate();
        assert!(caddy.is_active);
    }

    #[test]
    fn test_scroll_position_validation() {
        let file_path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let mut caddy = DocumentCaddy::new(file_path).unwrap();

        let result = caddy.update_scroll_position(150.5);
        assert!(result.is_ok());
        assert_eq!(caddy.scroll_position, 150.5);

        let result = caddy.update_scroll_position(-10.0);
        assert!(result.is_err());
    }
}