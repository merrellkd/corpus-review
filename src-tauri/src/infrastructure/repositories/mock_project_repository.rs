use async_trait::async_trait;
use crate::domain::workspace::entities::project::Project;
use crate::domain::workspace::entities::workspace_layout::WorkspaceLayout;
use crate::domain::workspace::repositories::{ProjectRepository, RepositoryError};
use crate::domain::workspace::value_objects::{ProjectId, FilePath};

/// Mock implementation of ProjectRepository for development
pub struct MockProjectRepository;

#[async_trait]
impl ProjectRepository for MockProjectRepository {
    async fn save(&self, _project: &Project) -> Result<(), RepositoryError> {
        // Mock implementation - just return success
        Ok(())
    }

    async fn find_by_id(&self, _id: &ProjectId) -> Result<Option<Project>, RepositoryError> {
        // Return a mock project for development
        let source_path = FilePath::new("/tmp/test-project/source".to_string())
            .map_err(|e| RepositoryError::ValidationError(e))?;
        let reports_path = FilePath::new("/tmp/test-project/reports".to_string())
            .map_err(|e| RepositoryError::ValidationError(e))?;

        let project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path,
        ).map_err(|e| RepositoryError::ValidationError(e))?;

        Ok(Some(project))
    }

    async fn find_by_name(&self, name: &str) -> Result<Option<Project>, RepositoryError> {
        if name == "Test Project" {
            let source_path = FilePath::new("/tmp/test-project/source".to_string())
                .map_err(|e| RepositoryError::ValidationError(e))?;
            let reports_path = FilePath::new("/tmp/test-project/reports".to_string())
                .map_err(|e| RepositoryError::ValidationError(e))?;

            let project = Project::new(
                name.to_string(),
                source_path,
                reports_path,
            ).map_err(|e| RepositoryError::ValidationError(e))?;

            Ok(Some(project))
        } else {
            Ok(None)
        }
    }

    async fn list_all(&self) -> Result<Vec<Project>, RepositoryError> {
        // Return a mock list with one project
        let source_path = FilePath::new("/tmp/test-project/source".to_string())
            .map_err(|e| RepositoryError::ValidationError(e))?;
        let reports_path = FilePath::new("/tmp/test-project/reports".to_string())
            .map_err(|e| RepositoryError::ValidationError(e))?;

        let project = Project::new(
            "Test Project".to_string(),
            source_path,
            reports_path,
        ).map_err(|e| RepositoryError::ValidationError(e))?;

        Ok(vec![project])
    }

    async fn delete(&self, _id: &ProjectId) -> Result<(), RepositoryError> {
        // Mock implementation - just return success
        Ok(())
    }

    async fn is_name_unique(&self, name: &str, _excluding_id: Option<&ProjectId>) -> Result<bool, RepositoryError> {
        // For mock, only "Test Project" exists
        Ok(name != "Test Project")
    }

    async fn update_workspace_layout(&self, _project_id: &ProjectId, _layout: &WorkspaceLayout) -> Result<(), RepositoryError> {
        // Mock implementation - just return success
        Ok(())
    }
}