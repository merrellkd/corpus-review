use crate::domain::workspace::{
    entities::{WorkspaceLayout, DocumentCaddy},
    value_objects::{ProjectId, WorkspaceLayoutId, DocumentCaddyId, FilePath},
    repositories::{RepositoryError, RepositoryFactory},
    PanelType,
};
// use crate::application::dtos::{WorkspaceLayoutDto, DocumentCaddyDto, ProjectDto}; // DTOs not implemented yet
use crate::infrastructure::ProjectDto;
use std::sync::Arc;

/// Application service for workspace operations
pub struct WorkspaceService {
    repository_factory: Arc<dyn RepositoryFactory>,
}


#[derive(Debug, Clone)]
pub enum WorkspaceServiceError {
    NotFound(String),
    ValidationError(String),
    PersistenceError(String),
    InternalError(String),
}

impl std::fmt::Display for WorkspaceServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WorkspaceServiceError::NotFound(msg) => write!(f, "Not found: {}", msg),
            WorkspaceServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            WorkspaceServiceError::PersistenceError(msg) => write!(f, "Persistence error: {}", msg),
            WorkspaceServiceError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for WorkspaceServiceError {}

impl From<RepositoryError> for WorkspaceServiceError {
    fn from(error: RepositoryError) -> Self {
        match error {
            RepositoryError::NotFound(msg) => WorkspaceServiceError::NotFound(msg),
            RepositoryError::ValidationError(msg) => WorkspaceServiceError::ValidationError(msg),
            RepositoryError::DatabaseError(msg) => WorkspaceServiceError::PersistenceError(msg),
            RepositoryError::AccessError(msg) => WorkspaceServiceError::ValidationError(msg),
            RepositoryError::SerializationError(msg) => WorkspaceServiceError::InternalError(msg),
            RepositoryError::FileSystemError(msg) => WorkspaceServiceError::ValidationError(msg),
            RepositoryError::ConstraintViolation(msg) => WorkspaceServiceError::ValidationError(msg),
            RepositoryError::InternalError(msg) => WorkspaceServiceError::InternalError(msg),
        }
    }
}

impl WorkspaceService {
    pub fn new(repository_factory: Arc<dyn RepositoryFactory>) -> Self {
        Self { repository_factory }
    }

    // All methods temporarily commented out due to missing DTOs
    /*
    /// Get workspace layout for a project
    pub async fn get_workspace_layout(&self, project_id: &str) -> Result<WorkspaceLayoutDto, WorkspaceServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let layout_repo = self.repository_factory.workspace_layout_repository();
        match layout_repo.find_by_project_id(&project_id).await {
            Ok(Some(layout)) => Ok(self.workspace_layout_to_dto(layout)),
            Ok(None) => Err(WorkspaceServiceError::NotFound(format!("No layout found for project {}", project_id.to_string()))),
            Err(e) => Err(WorkspaceServiceError::PersistenceError(e.to_string())),
        }
    }

    /// Save workspace layout
    pub async fn save_workspace_layout(&self, layout_dto: WorkspaceLayoutDto) -> Result<(), WorkspaceServiceError> {
        let layout = self.workspace_layout_from_dto(layout_dto)?;

        let layout_repo = self.repository_factory.workspace_layout_repository();
        layout_repo.save(&layout).await?;

        Ok(())
    }

    /// Update panel visibility
    pub async fn update_panel_visibility(
        &self,
        project_id: &str,
        panel_type: &str,
        visible: bool,
    ) -> Result<WorkspaceLayoutDto, WorkspaceServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let panel_type = PanelType::from_str(panel_type)
            .ok_or_else(|| WorkspaceServiceError::ValidationError("Invalid panel type".to_string()))?;

        let layout_repo = self.repository_factory.workspace_layout_repository();

        // Get existing layout or create new one
        let mut layout = match layout_repo.find_by_project_id(&project_id).await? {
            Some(layout) => layout,
            None => WorkspaceLayout::new(project_id),
        };

        // Update panel visibility
        layout.update_panel_visibility(panel_type, visible)
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        // Save updated layout
        layout_repo.save(&layout).await?;

        Ok(self.workspace_layout_to_dto(layout))
    }

    /// Update panel sizes
    pub async fn update_panel_sizes(
        &self,
        project_id: &str,
        panel_type: &str,
        width: u32,
        height: Option<u32>,
    ) -> Result<WorkspaceLayoutDto, WorkspaceServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let layout_repo = self.repository_factory.workspace_layout_repository();

        // Get existing layout or create new one
        let mut layout = match layout_repo.find_by_project_id(&project_id).await? {
            Some(layout) => layout,
            None => WorkspaceLayout::new(project_id),
        };

        // Update panel sizes - convert width to explorer width percentage
        let explorer_width = if panel_type == "file_explorer" || panel_type == "category_explorer" || panel_type == "search_panel" {
            width as f32
        } else {
            // Default explorer width if adjusting document workspace
            25.0
        };

        layout.update_panel_sizes(explorer_width)
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        // Save updated layout
        layout_repo.save(&layout).await?;

        Ok(self.workspace_layout_to_dto(layout))
    }

    /// Create document caddy
    pub async fn create_document_caddy(
        &self,
        file_path: &str,
    ) -> Result<DocumentCaddyDto, WorkspaceServiceError> {
        let file_path = FilePath::new(file_path.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        // Use a default workspace for now - in a real implementation this would be determined from context
        let workspace_id = WorkspaceLayoutId::new();

        // Validate that file exists and is accessible
        let fs_repo = self.repository_factory.file_system_repository();
        let file_exists = fs_repo.path_exists(&file_path).await?;
        if !file_exists {
            return Err(WorkspaceServiceError::ValidationError("File does not exist".to_string()));
        }

        let is_accessible = fs_repo.is_path_accessible(&file_path).await?;
        if !is_accessible {
            return Err(WorkspaceServiceError::ValidationError("File is not accessible".to_string()));
        }

        // Create document caddy
        let caddy = DocumentCaddy::new(file_path)
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        // Deactivate other caddies and activate this one
        let caddy_repo = self.repository_factory.document_caddy_repository();
        caddy_repo.set_active(&caddy.id, &workspace_id).await?;

        // Save the new caddy
        caddy_repo.save(&caddy).await?;

        Ok(self.document_caddy_to_dto(caddy))
    }

    /// Update document caddy layout
    pub async fn update_document_caddy(
        &self,
        caddy_id: &str,
        position_x: Option<u32>,
        position_y: Option<u32>,
    ) -> Result<DocumentCaddyDto, WorkspaceServiceError> {
        let caddy_id = DocumentCaddyId::from_string(caddy_id.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let caddy_repo = self.repository_factory.document_caddy_repository();
        let mut caddy = caddy_repo.find_by_id(&caddy_id).await?
            .ok_or_else(|| WorkspaceServiceError::NotFound("Document caddy not found".to_string()))?;

        // Update position if provided
        if let (Some(x), Some(y)) = (position_x, position_y) {
            caddy.update_position(x as f64, y as f64)
                .map_err(|e| WorkspaceServiceError::ValidationError(e))?;
        }


        // Save updated caddy
        caddy_repo.save(&caddy).await?;

        Ok(self.document_caddy_to_dto(caddy))
    }

    /// Get project details
    pub async fn get_project_details(&self, project_id: &str) -> Result<ProjectDto, WorkspaceServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let project_repo = self.repository_factory.project_repository();
        let project = project_repo.find_by_id(&project_id).await?
            .ok_or_else(|| WorkspaceServiceError::NotFound("Project not found".to_string()))?;

        Ok(self.project_to_dto(project))
    }

    // Helper methods for DTO conversion
    fn workspace_layout_to_dto(&self, layout: WorkspaceLayout) -> WorkspaceLayoutDto {
        WorkspaceLayoutDto {
            id: layout.id.to_string(),
            project_id: layout.project_id.to_string(),
            file_explorer_visible: layout.panel_states.file_explorer_visible,
            category_explorer_visible: layout.panel_states.category_explorer_visible,
            search_panel_visible: layout.panel_states.search_panel_visible,
            document_workspace_visible: layout.panel_states.document_workspace_visible,
            explorer_width: layout.panel_sizes.explorer_width,
            workspace_width: layout.panel_sizes.workspace_width,
            last_modified: layout.last_modified,
        }
    }

    fn workspace_layout_from_dto(&self, dto: WorkspaceLayoutDto) -> Result<WorkspaceLayout, WorkspaceServiceError> {
        let id = WorkspaceLayoutId::from_string(dto.id)
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        let project_id = ProjectId::from_string(dto.project_id)
            .map_err(|e| WorkspaceServiceError::ValidationError(e))?;

        Ok(WorkspaceLayout {
            id,
            project_id,
            panel_states: crate::domain::workspace::entities::workspace_layout::PanelVisibilityState {
                file_explorer_visible: dto.file_explorer_visible,
                category_explorer_visible: dto.category_explorer_visible,
                search_panel_visible: dto.search_panel_visible,
                document_workspace_visible: dto.document_workspace_visible,
            },
            panel_sizes: crate::domain::workspace::entities::workspace_layout::PanelDimensionState {
                explorer_width: dto.explorer_width,
                workspace_width: dto.workspace_width,
                panel_heights: std::collections::HashMap::new(),
            },
            last_modified: dto.last_modified,
        })
    }

    fn document_caddy_to_dto(&self, caddy: DocumentCaddy) -> DocumentCaddyDto {
        DocumentCaddyDto {
            id: caddy.id.to_string(),
            file_path: caddy.file_path.as_str().to_string(),
            title: caddy.title,
            position_x: caddy.position.x,
            position_y: caddy.position.y,
            width: caddy.dimensions.width,
            height: caddy.dimensions.height,
            z_index: caddy.position.z_index as u32,
            is_active: caddy.is_active,
        }
    }

    fn project_to_dto(&self, project: crate::domain::workspace::entities::Project) -> ProjectDto {
        ProjectDto {
            id: project.id.to_string(),
            name: project.name.clone(),
            source_folder: project.source_folder().as_str().to_string(),
            reports_folder: project.reports_folder().as_str().to_string(),
            created_at: chrono::Utc::now(), // For now, use current time - in real implementation would come from entity
        }
    }
    */
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::workspace::repositories::*;
    use std::collections::HashMap;
    use async_trait::async_trait;
    use tokio;

    // Mock repository implementations for testing
    struct MockWorkspaceLayoutRepository {
        layouts: std::sync::Mutex<HashMap<String, WorkspaceLayout>>,
    }

    impl MockWorkspaceLayoutRepository {
        fn new() -> Self {
            Self {
                layouts: std::sync::Mutex::new(HashMap::new()),
            }
        }
    }

    #[async_trait]
    impl WorkspaceLayoutRepository for MockWorkspaceLayoutRepository {
        async fn save(&self, layout: &WorkspaceLayout) -> Result<(), RepositoryError> {
            let mut layouts = self.layouts.lock().unwrap();
            layouts.insert(layout.project_id.as_str().to_string(), layout.clone());
            Ok(())
        }

        async fn find_by_project_id(&self, project_id: &ProjectId) -> Result<Option<WorkspaceLayout>, RepositoryError> {
            let layouts = self.layouts.lock().unwrap();
            Ok(layouts.get(project_id.as_str()).cloned())
        }

        async fn find_by_id(&self, _id: &WorkspaceLayoutId) -> Result<Option<WorkspaceLayout>, RepositoryError> {
            Ok(None)
        }

        async fn delete(&self, _id: &WorkspaceLayoutId) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn exists_for_project(&self, project_id: &ProjectId) -> Result<bool, RepositoryError> {
            let layouts = self.layouts.lock().unwrap();
            Ok(layouts.contains_key(project_id.as_str()))
        }
    }

    struct MockRepositoryFactory {
        workspace_layout_repo: Box<dyn WorkspaceLayoutRepository>,
    }

    impl MockRepositoryFactory {
        fn new() -> Self {
            Self {
                workspace_layout_repo: Box::new(MockWorkspaceLayoutRepository::new()),
            }
        }
    }

    impl RepositoryFactory for MockRepositoryFactory {
        fn workspace_layout_repository(&self) -> Box<dyn WorkspaceLayoutRepository> {
            Box::new(MockWorkspaceLayoutRepository::new())
        }

        fn file_system_repository(&self) -> Box<dyn FileSystemRepository> {
            unimplemented!()
        }

        fn document_caddy_repository(&self) -> Box<dyn DocumentCaddyRepository> {
            unimplemented!()
        }

        fn project_repository(&self) -> Box<dyn ProjectRepository> {
            unimplemented!()
        }
    }

    #[tokio::test]
    async fn test_get_workspace_layout_not_found() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = WorkspaceService::new(factory);

        let result = service.get_workspace_layout("project_550e8400-e29b-41d4-a716-446655440000").await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_update_panel_visibility() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = WorkspaceService::new(factory);

        let result = service.update_panel_visibility(
            "project_550e8400-e29b-41d4-a716-446655440000",
            "file_explorer",
            false,
        ).await;

        assert!(result.is_ok());
        let layout = result.unwrap();
        assert!(!layout.panel_states.file_explorer_visible);
    }

    #[tokio::test]
    async fn test_invalid_project_id() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = WorkspaceService::new(factory);

        let result = service.get_workspace_layout("invalid-id").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_invalid_panel_type() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = WorkspaceService::new(factory);

        let result = service.update_panel_visibility(
            "project_550e8400-e29b-41d4-a716-446655440000",
            "invalid_panel",
            true,
        ).await;

        assert!(result.is_err());
    }
}