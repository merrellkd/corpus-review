use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::workspace::{Position, Dimensions};
use super::document_caddy::DocumentCaddyId;

/// Layout strategies for organizing documents in the workspace
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

    pub fn should_auto_switch_to_freeform(&self, user_action: &str) -> bool {
        if matches!(self, LayoutMode::Freeform) {
            return false; // Already in freeform
        }

        matches!(user_action, "drag" | "resize")
    }

    pub fn get_css_class_name(&self) -> &'static str {
        match self {
            LayoutMode::Stacked => "stacked-layout",
            LayoutMode::Grid => "grid-layout",
            LayoutMode::Freeform => "freeform-layout",
        }
    }
}

/// Information about a document needed for layout calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentLayoutInfo {
    pub id: String,
    pub current_position: Position,
    pub current_dimensions: Dimensions,
    pub is_active: bool,
    pub z_index: i32,
}

/// Result of layout calculation for a single document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentLayoutResult {
    pub id: String,
    pub position: Position,
    pub dimensions: Dimensions,
    pub z_index: i32,
    pub is_visible: bool,
}

/// Layout calculation engine with different strategies
pub struct LayoutEngine;

impl LayoutEngine {
    /// Calculates layout for documents using the specified layout mode
    pub fn calculate_layout(
        documents: &[DocumentLayoutInfo],
        layout_mode: &LayoutMode,
        workspace_size: &Dimensions,
        active_document_id: Option<&str>,
    ) -> Result<Vec<DocumentLayoutResult>, String> {
        match layout_mode {
            LayoutMode::Stacked => Self::calculate_stacked_layout(documents, workspace_size, active_document_id),
            LayoutMode::Grid => Self::calculate_grid_layout(documents, workspace_size),
            LayoutMode::Freeform => Self::calculate_freeform_layout(documents, workspace_size),
        }
    }

    /// Stacked layout - only active document fully visible
    fn calculate_stacked_layout(
        documents: &[DocumentLayoutInfo],
        workspace_size: &Dimensions,
        active_document_id: Option<&str>,
    ) -> Result<Vec<DocumentLayoutResult>, String> {
        let mut results = Vec::new();

        for doc in documents {
            let is_active = active_document_id
                .map(|active_id| doc.id == active_id)
                .unwrap_or(doc.is_active);

            if is_active {
                // Active document takes center stage with constrained dimensions
                let max_width = (workspace_size.width * 0.9).min(1000.0);
                let max_height = (workspace_size.height * 0.9).min(700.0);

                let center_x = (workspace_size.width - max_width) / 2.0;
                let center_y = (workspace_size.height - max_height) / 2.0;

                let position = Position::new(center_x, center_y)?;
                let dimensions = Dimensions::new(max_width, max_height)?;

                results.push(DocumentLayoutResult {
                    id: doc.id.clone(),
                    position,
                    dimensions,
                    z_index: 10,
                    is_visible: true,
                });
            } else {
                // Inactive documents are hidden but positioned for tab switching
                results.push(DocumentLayoutResult {
                    id: doc.id.clone(),
                    position: Position::origin(),
                    dimensions: Dimensions::new(100.0, 50.0)?, // Minimum size
                    z_index: 0,
                    is_visible: false,
                });
            }
        }

        Ok(results)
    }

    /// Grid layout - documents arranged in responsive grid
    fn calculate_grid_layout(
        documents: &[DocumentLayoutInfo],
        workspace_size: &Dimensions,
    ) -> Result<Vec<DocumentLayoutResult>, String> {
        let mut results = Vec::new();
        let doc_count = documents.len();

        if doc_count == 0 {
            return Ok(results);
        }

        // Calculate optimal grid dimensions
        let (cols, rows) = Self::calculate_grid_dimensions(doc_count);

        // Calculate cell dimensions with padding
        let padding = 20.0;
        let cell_width = (workspace_size.width - padding * (cols as f64 + 1.0)) / cols as f64;
        let cell_height = (workspace_size.height - padding * (rows as f64 + 1.0)) / rows as f64;

        let cell_width = cell_width.max(100.0); // Minimum width
        let cell_height = cell_height.max(50.0); // Minimum height

        for (index, doc) in documents.iter().enumerate() {
            let row = index / cols;
            let col = index % cols;

            let x = padding + col as f64 * (cell_width + padding);
            let y = padding + row as f64 * (cell_height + padding);

            let position = Position::new(x, y)?;
            let dimensions = Dimensions::new(cell_width, cell_height)?;

            results.push(DocumentLayoutResult {
                id: doc.id.clone(),
                position,
                dimensions,
                z_index: if doc.is_active { 5 } else { 1 },
                is_visible: true,
            });
        }

        Ok(results)
    }

    /// Freeform layout - documents positioned freely by user
    fn calculate_freeform_layout(
        documents: &[DocumentLayoutInfo],
        workspace_size: &Dimensions,
    ) -> Result<Vec<DocumentLayoutResult>, String> {
        let mut results = Vec::new();

        for doc in documents {
            // Constrain positions to workspace bounds
            let constrained_x = doc.current_position.x.max(0.0).min(workspace_size.width - doc.current_dimensions.width);
            let constrained_y = doc.current_position.y.max(0.0).min(workspace_size.height - doc.current_dimensions.height);

            let constrained_position = Position::new(constrained_x, constrained_y)?;

            // Ensure dimensions fit within workspace
            let max_width = workspace_size.width - constrained_position.x;
            let max_height = workspace_size.height - constrained_position.y;

            let constrained_width = doc.current_dimensions.width.min(max_width);
            let constrained_height = doc.current_dimensions.height.min(max_height);

            let constrained_dimensions = Dimensions::new(constrained_width, constrained_height)?;

            results.push(DocumentLayoutResult {
                id: doc.id.clone(),
                position: constrained_position,
                dimensions: constrained_dimensions,
                z_index: doc.z_index,
                is_visible: true,
            });
        }

        Ok(results)
    }

    /// Calculate optimal grid dimensions for document count
    fn calculate_grid_dimensions(doc_count: usize) -> (usize, usize) {
        match doc_count {
            0..=1 => (1, 1),
            2 => (2, 1),
            3..=4 => (2, 2),
            5..=6 => (3, 2),
            7..=9 => (3, 3),
            _ => {
                // For larger numbers, aim for roughly square layout
                let cols = (doc_count as f64).sqrt().ceil() as usize;
                let rows = (doc_count as f64 / cols as f64).ceil() as usize;
                (cols, rows)
            }
        }
    }

    /// Validates that a layout fits within workspace bounds
    pub fn validate_layout(
        results: &[DocumentLayoutResult],
        workspace_size: &Dimensions,
    ) -> Result<(), Vec<String>> {
        let mut issues = Vec::new();

        for result in results {
            let right_edge = result.position.x + result.dimensions.width;
            let bottom_edge = result.position.y + result.dimensions.height;

            if right_edge > workspace_size.width {
                issues.push(format!("Document {} extends beyond right edge", result.id));
            }

            if bottom_edge > workspace_size.height {
                issues.push(format!("Document {} extends beyond bottom edge", result.id));
            }

            if result.position.x < 0.0 || result.position.y < 0.0 {
                issues.push(format!("Document {} has negative position", result.id));
            }
        }

        if issues.is_empty() {
            Ok(())
        } else {
            Err(issues)
        }
    }

    /// Suggests optimal layout mode for the current conditions
    pub fn suggest_optimal_layout_mode(
        document_count: usize,
        workspace_size: &Dimensions,
        current_mode: Option<&LayoutMode>,
    ) -> LayoutMode {
        if document_count == 0 {
            return LayoutMode::Stacked;
        }

        if document_count == 1 {
            return LayoutMode::Stacked;
        }

        let workspace_area = workspace_size.width * workspace_size.height;
        let avg_document_area = 600.0 * 400.0; // Default document size
        let total_document_area = document_count as f64 * avg_document_area;

        // If documents would be too small in grid, use stacked
        if total_document_area > workspace_area * 0.8 {
            return LayoutMode::Stacked;
        }

        // For 2-4 documents, grid works well
        if document_count <= 4 {
            return LayoutMode::Grid;
        }

        // For many documents, suggest grid if there's space, otherwise stacked
        if document_count <= 9 && workspace_area > 1000.0 * 800.0 {
            return LayoutMode::Grid;
        }

        // If user is already in freeform, don't suggest changing
        if let Some(LayoutMode::Freeform) = current_mode {
            return LayoutMode::Freeform;
        }

        LayoutMode::Stacked
    }

    /// Calculates layout with non-overlapping constraint for freeform mode
    pub fn calculate_non_overlapping_layout(
        documents: &[DocumentLayoutInfo],
        workspace_size: &Dimensions,
        padding: f64,
    ) -> Result<Vec<DocumentLayoutResult>, String> {
        if documents.is_empty() {
            return Ok(Vec::new());
        }

        let mut results = Vec::new();
        let mut placed_rects = Vec::new();

        for doc in documents {
            let mut position = doc.current_position;
            let dimensions = doc.current_dimensions;

            // Find a non-overlapping position
            let mut attempts = 0;
            const MAX_ATTEMPTS: usize = 100;

            while attempts < MAX_ATTEMPTS {
                let proposed_rect = Rectangle {
                    x: position.x,
                    y: position.y,
                    width: dimensions.width,
                    height: dimensions.height,
                };

                // Check for overlaps with existing rectangles
                let has_overlap = placed_rects.iter().any(|rect| {
                    Self::rectangles_overlap(&proposed_rect, rect, padding)
                });

                if !has_overlap {
                    // Position is good, place the document
                    placed_rects.push(proposed_rect);
                    results.push(DocumentLayoutResult {
                        id: doc.id.clone(),
                        position,
                        dimensions,
                        z_index: doc.z_index,
                        is_visible: true,
                    });
                    break;
                }

                // Try a new position
                position = Self::find_next_position(&position, &dimensions, workspace_size, &placed_rects, padding)?;
                attempts += 1;
            }

            // If we couldn't find a non-overlapping position, place it anyway
            if attempts >= MAX_ATTEMPTS {
                results.push(DocumentLayoutResult {
                    id: doc.id.clone(),
                    position: doc.current_position,
                    dimensions: doc.current_dimensions,
                    z_index: doc.z_index,
                    is_visible: true,
                });
            }
        }

        Ok(results)
    }

    fn rectangles_overlap(rect1: &Rectangle, rect2: &Rectangle, padding: f64) -> bool {
        !(rect1.x + rect1.width + padding <= rect2.x
            || rect2.x + rect2.width + padding <= rect1.x
            || rect1.y + rect1.height + padding <= rect2.y
            || rect2.y + rect2.height + padding <= rect1.y)
    }

    fn find_next_position(
        current_position: &Position,
        dimensions: &Dimensions,
        workspace_size: &Dimensions,
        _placed_rects: &[Rectangle],
        _padding: f64,
    ) -> Result<Position, String> {
        // Simple strategy: try moving right, then down
        let step_size = 50.0;

        let mut x = current_position.x + step_size;
        let mut y = current_position.y;

        // If moving right would go out of bounds, wrap to next row
        if x + dimensions.width > workspace_size.width {
            x = 0.0;
            y += step_size;
        }

        // If moving down would go out of bounds, wrap to top
        if y + dimensions.height > workspace_size.height {
            y = 0.0;
        }

        Position::new(x, y)
    }
}

#[derive(Debug, Clone)]
struct Rectangle {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

/// Request/Response types for layout operations
#[derive(Debug, Serialize, Deserialize)]
pub struct CalculateLayoutRequest {
    pub documents: Vec<DocumentLayoutInfo>,
    pub layout_mode: String,
    pub workspace_size: Dimensions,
    pub active_document_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CalculateLayoutResponse {
    pub layout_results: Vec<DocumentLayoutResult>,
    pub success: bool,
    pub message: Option<String>,
}

impl CalculateLayoutResponse {
    pub fn success(layout_results: Vec<DocumentLayoutResult>) -> Self {
        Self {
            layout_results,
            success: true,
            message: None,
        }
    }

    pub fn error(message: String) -> Self {
        Self {
            layout_results: Vec::new(),
            success: false,
            message: Some(message),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_document(id: &str, x: f64, y: f64, width: f64, height: f64, is_active: bool) -> DocumentLayoutInfo {
        DocumentLayoutInfo {
            id: id.to_string(),
            current_position: Position::new(x, y).unwrap(),
            current_dimensions: Dimensions::new(width, height).unwrap(),
            is_active,
            z_index: if is_active { 5 } else { 1 },
        }
    }

    #[test]
    fn test_layout_mode_conversion() {
        assert_eq!(LayoutMode::Stacked.as_str(), "stacked");
        assert_eq!(LayoutMode::from_str("grid").unwrap(), LayoutMode::Grid);
        assert!(LayoutMode::from_str("invalid").is_err());
    }

    #[test]
    fn test_layout_mode_capabilities() {
        assert!(!LayoutMode::Stacked.supports_user_manipulation());
        assert!(!LayoutMode::Grid.supports_user_manipulation());
        assert!(LayoutMode::Freeform.supports_user_manipulation());

        assert!(LayoutMode::Stacked.should_auto_switch_to_freeform("drag"));
        assert!(LayoutMode::Grid.should_auto_switch_to_freeform("resize"));
        assert!(!LayoutMode::Freeform.should_auto_switch_to_freeform("drag"));
    }

    #[test]
    fn test_stacked_layout_calculation() {
        let documents = vec![
            create_test_document("doc1", 0.0, 0.0, 400.0, 300.0, true),
            create_test_document("doc2", 0.0, 0.0, 400.0, 300.0, false),
        ];

        let workspace_size = Dimensions::new(1200.0, 800.0).unwrap();
        let results = LayoutEngine::calculate_stacked_layout(&documents, &workspace_size, Some("doc1")).unwrap();

        assert_eq!(results.len(), 2);

        // Active document should be visible and centered
        let active_result = results.iter().find(|r| r.id == "doc1").unwrap();
        assert!(active_result.is_visible);
        assert_eq!(active_result.z_index, 10);

        // Inactive document should be hidden
        let inactive_result = results.iter().find(|r| r.id == "doc2").unwrap();
        assert!(!inactive_result.is_visible);
        assert_eq!(inactive_result.z_index, 0);
    }

    #[test]
    fn test_grid_layout_calculation() {
        let documents = vec![
            create_test_document("doc1", 0.0, 0.0, 400.0, 300.0, true),
            create_test_document("doc2", 0.0, 0.0, 400.0, 300.0, false),
            create_test_document("doc3", 0.0, 0.0, 400.0, 300.0, false),
            create_test_document("doc4", 0.0, 0.0, 400.0, 300.0, false),
        ];

        let workspace_size = Dimensions::new(1200.0, 800.0).unwrap();
        let results = LayoutEngine::calculate_grid_layout(&documents, &workspace_size).unwrap();

        assert_eq!(results.len(), 4);

        // All documents should be visible in grid
        for result in &results {
            assert!(result.is_visible);
            assert!(result.position.x >= 0.0);
            assert!(result.position.y >= 0.0);
        }

        // Active document should have higher z-index
        let active_result = results.iter().find(|r| r.id == "doc1").unwrap();
        assert_eq!(active_result.z_index, 5);
    }

    #[test]
    fn test_freeform_layout_calculation() {
        let documents = vec![
            create_test_document("doc1", 100.0, 200.0, 400.0, 300.0, true),
            create_test_document("doc2", 600.0, 400.0, 400.0, 300.0, false),
        ];

        let workspace_size = Dimensions::new(1200.0, 800.0).unwrap();
        let results = LayoutEngine::calculate_freeform_layout(&documents, &workspace_size).unwrap();

        assert_eq!(results.len(), 2);

        // Documents should maintain their positions if within bounds
        let doc1_result = results.iter().find(|r| r.id == "doc1").unwrap();
        assert_eq!(doc1_result.position.x, 100.0);
        assert_eq!(doc1_result.position.y, 200.0);

        let doc2_result = results.iter().find(|r| r.id == "doc2").unwrap();
        assert_eq!(doc2_result.position.x, 600.0);
        assert_eq!(doc2_result.position.y, 400.0);
    }

    #[test]
    fn test_grid_dimensions_calculation() {
        assert_eq!(LayoutEngine::calculate_grid_dimensions(1), (1, 1));
        assert_eq!(LayoutEngine::calculate_grid_dimensions(2), (2, 1));
        assert_eq!(LayoutEngine::calculate_grid_dimensions(4), (2, 2));
        assert_eq!(LayoutEngine::calculate_grid_dimensions(6), (3, 2));
        assert_eq!(LayoutEngine::calculate_grid_dimensions(9), (3, 3));
    }

    #[test]
    fn test_layout_validation() {
        let workspace_size = Dimensions::new(1000.0, 800.0).unwrap();

        let valid_results = vec![
            DocumentLayoutResult {
                id: "doc1".to_string(),
                position: Position::new(100.0, 100.0).unwrap(),
                dimensions: Dimensions::new(400.0, 300.0).unwrap(),
                z_index: 1,
                is_visible: true,
            }
        ];

        assert!(LayoutEngine::validate_layout(&valid_results, &workspace_size).is_ok());

        let invalid_results = vec![
            DocumentLayoutResult {
                id: "doc1".to_string(),
                position: Position::new(800.0, 600.0).unwrap(),
                dimensions: Dimensions::new(400.0, 300.0).unwrap(), // Extends beyond bounds
                z_index: 1,
                is_visible: true,
            }
        ];

        assert!(LayoutEngine::validate_layout(&invalid_results, &workspace_size).is_err());
    }

    #[test]
    fn test_optimal_layout_mode_suggestion() {
        let workspace_size = Dimensions::new(1200.0, 800.0).unwrap();

        // Empty workspace should suggest stacked
        assert_eq!(
            LayoutEngine::suggest_optimal_layout_mode(0, &workspace_size, None),
            LayoutMode::Stacked
        );

        // Single document should suggest stacked
        assert_eq!(
            LayoutEngine::suggest_optimal_layout_mode(1, &workspace_size, None),
            LayoutMode::Stacked
        );

        // Few documents should suggest grid
        assert_eq!(
            LayoutEngine::suggest_optimal_layout_mode(3, &workspace_size, None),
            LayoutMode::Grid
        );

        // Many documents should suggest stacked
        assert_eq!(
            LayoutEngine::suggest_optimal_layout_mode(20, &workspace_size, None),
            LayoutMode::Stacked
        );

        // Should respect current freeform mode
        assert_eq!(
            LayoutEngine::suggest_optimal_layout_mode(5, &workspace_size, Some(&LayoutMode::Freeform)),
            LayoutMode::Freeform
        );
    }
}