use crate::domain::workspace::value_objects::{ProjectId, WorkspaceLayoutId};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WorkspaceLayout {
    pub id: WorkspaceLayoutId,
    pub project_id: ProjectId,
    pub panel_states: PanelVisibilityState,
    pub panel_sizes: PanelDimensionState,
    pub last_modified: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PanelVisibilityState {
    pub file_explorer_visible: bool,
    pub category_explorer_visible: bool,
    pub search_panel_visible: bool,
    pub document_workspace_visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PanelDimensionState {
    pub explorer_width: f32,                 // percentage 0.0-100.0
    pub workspace_width: f32,                // calculated percentage
    pub panel_heights: HashMap<String, f32>, // panel type -> height percentage
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum PanelType {
    FileExplorer,
    CategoryExplorer,
    SearchPanel,
    DocumentWorkspace,
}

impl PanelType {
    pub fn as_str(&self) -> &'static str {
        match self {
            PanelType::FileExplorer => "file_explorer",
            PanelType::CategoryExplorer => "category_explorer",
            PanelType::SearchPanel => "search_panel",
            PanelType::DocumentWorkspace => "document_workspace",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "file_explorer" => Some(PanelType::FileExplorer),
            "category_explorer" => Some(PanelType::CategoryExplorer),
            "search_panel" => Some(PanelType::SearchPanel),
            "document_workspace" => Some(PanelType::DocumentWorkspace),
            _ => None,
        }
    }
}

impl WorkspaceLayout {
    pub fn new(project_id: ProjectId) -> Self {
        Self {
            id: WorkspaceLayoutId::new(),
            project_id,
            panel_states: PanelVisibilityState::default(),
            panel_sizes: PanelDimensionState::default(),
            last_modified: Utc::now(),
        }
    }

    pub fn update_panel_visibility(
        &mut self,
        panel_type: PanelType,
        visible: bool,
    ) -> Result<(), String> {
        // Business rule: Document workspace cannot be hidden
        if matches!(panel_type, PanelType::DocumentWorkspace) && !visible {
            return Err("Document workspace cannot be hidden".to_string());
        }

        match panel_type {
            PanelType::FileExplorer => self.panel_states.file_explorer_visible = visible,
            PanelType::CategoryExplorer => self.panel_states.category_explorer_visible = visible,
            PanelType::SearchPanel => self.panel_states.search_panel_visible = visible,
            PanelType::DocumentWorkspace => self.panel_states.document_workspace_visible = visible,
        }

        // Auto-expand workspace when all explorer panels are hidden
        if !self.panel_states.file_explorer_visible
            && !self.panel_states.category_explorer_visible
            && !self.panel_states.search_panel_visible
        {
            self.panel_sizes.explorer_width = 0.0;
            self.panel_sizes.workspace_width = 100.0;
        } else if self.panel_sizes.explorer_width == 0.0 {
            // Restore default size when explorer panels become visible
            self.panel_sizes.explorer_width = 25.0;
            self.panel_sizes.workspace_width = 75.0;
        }

        self.last_modified = Utc::now();
        Ok(())
    }

    pub fn update_panel_sizes(&mut self, explorer_width: f32) -> Result<(), String> {
        // Business rule: Minimum widths
        if explorer_width > 0.0 && explorer_width < 15.0 {
            return Err("Explorer width cannot be less than 15%".to_string());
        }

        if explorer_width > 70.0 {
            return Err("Explorer width cannot be more than 70%".to_string());
        }

        let workspace_width = 100.0 - explorer_width;

        // Business rule: Workspace minimum width
        if workspace_width < 30.0 {
            return Err("Workspace width cannot be less than 30%".to_string());
        }

        self.panel_sizes.explorer_width = explorer_width;
        self.panel_sizes.workspace_width = workspace_width;
        self.last_modified = Utc::now();
        Ok(())
    }

    pub fn update_panel_height(
        &mut self,
        panel_type: PanelType,
        height: f32,
    ) -> Result<(), String> {
        if height < 10.0 || height > 90.0 {
            return Err("Panel height must be between 10% and 90%".to_string());
        }

        self.panel_sizes
            .panel_heights
            .insert(panel_type.as_str().to_string(), height);
        self.last_modified = Utc::now();
        Ok(())
    }

    pub fn is_explorer_visible(&self) -> bool {
        self.panel_states.file_explorer_visible
            || self.panel_states.category_explorer_visible
            || self.panel_states.search_panel_visible
    }
}

impl Default for PanelVisibilityState {
    fn default() -> Self {
        Self {
            file_explorer_visible: true,
            category_explorer_visible: true,
            search_panel_visible: false,
            document_workspace_visible: true, // Always true by business rule
        }
    }
}

impl Default for PanelDimensionState {
    fn default() -> Self {
        let mut panel_heights = HashMap::new();
        panel_heights.insert("file_explorer".to_string(), 50.0);
        panel_heights.insert("category_explorer".to_string(), 50.0);
        panel_heights.insert("search_panel".to_string(), 0.0);

        Self {
            explorer_width: 25.0,
            workspace_width: 75.0,
            panel_heights,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_workspace_layout() {
        let project_id = ProjectId::new();
        let layout = WorkspaceLayout::new(project_id.clone());

        assert_eq!(layout.project_id, project_id);
        assert!(layout.panel_states.document_workspace_visible);
        assert_eq!(layout.panel_sizes.explorer_width, 25.0);
    }

    #[test]
    fn test_cannot_hide_document_workspace() {
        let project_id = ProjectId::new();
        let mut layout = WorkspaceLayout::new(project_id);

        let result = layout.update_panel_visibility(PanelType::DocumentWorkspace, false);
        assert!(result.is_err());
        assert!(layout.panel_states.document_workspace_visible);
    }

    #[test]
    fn test_auto_expand_workspace_when_explorers_hidden() {
        let project_id = ProjectId::new();
        let mut layout = WorkspaceLayout::new(project_id);

        layout
            .update_panel_visibility(PanelType::FileExplorer, false)
            .unwrap();
        layout
            .update_panel_visibility(PanelType::CategoryExplorer, false)
            .unwrap();
        layout
            .update_panel_visibility(PanelType::SearchPanel, false)
            .unwrap();

        assert_eq!(layout.panel_sizes.explorer_width, 0.0);
        assert_eq!(layout.panel_sizes.workspace_width, 100.0);
    }

    #[test]
    fn test_panel_size_constraints() {
        let project_id = ProjectId::new();
        let mut layout = WorkspaceLayout::new(project_id);

        // Test minimum explorer width
        let result = layout.update_panel_sizes(10.0);
        assert!(result.is_err());

        // Test maximum explorer width
        let result = layout.update_panel_sizes(80.0);
        assert!(result.is_err());

        // Test valid size
        let result = layout.update_panel_sizes(30.0);
        assert!(result.is_ok());
        assert_eq!(layout.panel_sizes.explorer_width, 30.0);
        assert_eq!(layout.panel_sizes.workspace_width, 70.0);
    }
}
