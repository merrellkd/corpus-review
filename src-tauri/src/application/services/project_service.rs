use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::domain::project::{Project, ProjectId, ProjectRepository};
use crate::infrastructure::{
    AppError, AppResult, CreateProjectRequest, DeleteProjectRequest, ProjectDto, ProjectListDto,
    RepositoryStatsDto, UpdateProjectRequest,
};

/// Application service for Project operations
///
/// This service coordinates between the domain layer and infrastructure layer,
/// handling use cases and orchestrating business operations. It translates
/// between DTOs and domain objects while maintaining business rules.
pub struct ProjectService {
    repository: Arc<dyn ProjectRepository>,
}

impl ProjectService {
    /// Create a new ProjectService with the given repository
    pub fn new(repository: Arc<dyn ProjectRepository>) -> Self {
        ProjectService { repository }
    }

    /// Create a new project from a request
    pub async fn create_project(&self, request: CreateProjectRequest) -> AppResult<ProjectDto> {
        // Validate the request
        let (name, source_folder, note) = request.to_domain_params().map_err(AppError::from)?;

        // Create domain object
        let project = Project::new(name, source_folder, note).map_err(AppError::from)?;

        // Validate project business rules
        project.validate().map_err(AppError::from)?;

        // Save to repository
        self.repository
            .create(&project)
            .await
            .map_err(AppError::from)?;

        // Return DTO
        Ok(ProjectDto::from_project(&project))
    }

    /// Update an existing project
    pub async fn update_project(&self, request: UpdateProjectRequest) -> AppResult<ProjectDto> {
        // Validate the request
        request.validate().map_err(AppError::from)?;

        // Find the existing project
        let project_id = ProjectId::from_string(request.get_id().to_string())
            .map_err(|_| AppError::validation_error("Invalid project ID format", None))?;

        let mut project = self
            .repository
            .find_by_id(&project_id)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::not_found("Project"))?;

        // Apply updates
        if let Some(new_name) = request.get_name() {
            project.update_name(new_name).map_err(AppError::from)?;
        }

        if let Some(note_update) = request.get_note() {
            match note_update {
                Some(new_note) => project
                    .update_note(Some(new_note))
                    .map_err(AppError::from)?,
                None => project.clear_note(),
            }
        }

        // Validate updated project
        project.validate().map_err(AppError::from)?;

        // Save changes
        self.repository
            .update(&project)
            .await
            .map_err(AppError::from)?;

        // Return updated DTO
        Ok(ProjectDto::from_project(&project))
    }

    /// Delete a project
    pub async fn delete_project(&self, request: DeleteProjectRequest) -> AppResult<()> {
        // Validate the request
        request.validate().map_err(AppError::from)?;

        // Parse project ID
        let project_id = ProjectId::from_string(request.get_id().to_string())
            .map_err(|_| AppError::validation_error("Invalid project ID format", None))?;

        // Check if project exists
        let exists = self
            .repository
            .exists_by_id(&project_id)
            .await
            .map_err(AppError::from)?;

        if !exists {
            return Err(AppError::not_found("Project"));
        }

        // Delete the project
        self.repository
            .delete(&project_id)
            .await
            .map_err(AppError::from)?;

        Ok(())
    }

    /// Get a project by ID
    pub async fn get_project(&self, id: &str) -> AppResult<Option<ProjectDto>> {
        // Parse project ID
        let project_id = ProjectId::from_string(id.to_string())
            .map_err(|_| AppError::validation_error("Invalid project ID format", None))?;

        // Find the project
        let project = self
            .repository
            .find_by_id(&project_id)
            .await
            .map_err(AppError::from)?;

        // Convert to DTO
        Ok(project.map(|p| ProjectDto::from_project(&p)))
    }

    /// Get a project by name
    pub async fn get_project_by_name(&self, name: &str) -> AppResult<Option<ProjectDto>> {
        if name.trim().is_empty() {
            return Err(AppError::validation_error(
                "Project name cannot be empty",
                None,
            ));
        }

        // Find the project
        let project = self
            .repository
            .find_by_name(name)
            .await
            .map_err(AppError::from)?;

        // Convert to DTO
        Ok(project.map(|p| ProjectDto::from_project(&p)))
    }

    /// List all projects
    pub async fn list_projects(&self) -> AppResult<Vec<ProjectDto>> {
        let projects = self.repository.list_all().await.map_err(AppError::from)?;

        let dtos = projects.iter().map(ProjectDto::from_project).collect();

        Ok(dtos)
    }

    /// List projects with pagination
    pub async fn list_projects_paged(
        &self,
        offset: usize,
        limit: usize,
    ) -> AppResult<ProjectListDto> {
        // Validate pagination parameters
        if limit == 0 {
            return Err(AppError::validation_error(
                "Limit must be greater than 0",
                None,
            ));
        }

        if limit > 1000 {
            return Err(AppError::validation_error("Limit cannot exceed 1000", None));
        }

        // Get total count
        let total_count = self.repository.count().await.map_err(AppError::from)?;

        // Get projects for this page
        let projects = self
            .repository
            .list_paged(offset, limit)
            .await
            .map_err(AppError::from)?;

        // Create paginated response
        Ok(ProjectListDto::from_projects(
            projects,
            total_count,
            offset,
            limit,
        ))
    }

    /// Search projects by name pattern
    pub async fn search_projects(&self, pattern: &str) -> AppResult<Vec<ProjectDto>> {
        if pattern.trim().is_empty() {
            return Err(AppError::validation_error(
                "Search pattern cannot be empty",
                None,
            ));
        }

        let projects = self
            .repository
            .search_by_name(pattern)
            .await
            .map_err(AppError::from)?;

        let dtos = projects.iter().map(ProjectDto::from_project).collect();

        Ok(dtos)
    }

    /// Find projects created within a date range
    pub async fn find_projects_by_date_range(
        &self,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> AppResult<Vec<ProjectDto>> {
        if start_date >= end_date {
            return Err(AppError::validation_error(
                "Start date must be before end date",
                None,
            ));
        }

        let projects = self
            .repository
            .find_by_date_range(&start_date, &end_date)
            .await
            .map_err(AppError::from)?;

        let dtos = projects.iter().map(ProjectDto::from_project).collect();

        Ok(dtos)
    }

    /// Get repository statistics
    pub async fn get_statistics(&self) -> AppResult<RepositoryStatsDto> {
        let stats = self.repository.get_stats().await.map_err(AppError::from)?;

        Ok(RepositoryStatsDto::from_stats(&stats))
    }

    /// Check if a project name is available
    pub async fn is_name_available(&self, name: &str) -> AppResult<bool> {
        if name.trim().is_empty() {
            return Err(AppError::validation_error(
                "Project name cannot be empty",
                None,
            ));
        }

        let exists = self
            .repository
            .exists_by_name(name)
            .await
            .map_err(AppError::from)?;

        Ok(!exists)
    }

    /// Validate a project exists and is accessible
    pub async fn validate_project_access(&self, id: &str) -> AppResult<ProjectDto> {
        let project_dto = self
            .get_project(id)
            .await?
            .ok_or_else(|| AppError::not_found("Project"))?;

        if !project_dto.is_accessible {
            return Err(AppError::filesystem_error(
                "Project source folder is not accessible",
            ));
        }

        Ok(project_dto)
    }

    /// Perform health check on the repository
    pub async fn health_check(&self) -> AppResult<()> {
        self.repository.health_check().await.map_err(AppError::from)
    }

    /// Get a summary of inaccessible projects
    pub async fn get_inaccessible_projects(&self) -> AppResult<Vec<ProjectDto>> {
        let all_projects = self.repository.list_all().await.map_err(AppError::from)?;

        let inaccessible: Vec<ProjectDto> = all_projects
            .iter()
            .filter(|p| !p.is_source_accessible())
            .map(ProjectDto::from_project)
            .collect();

        Ok(inaccessible)
    }

    /// Batch operation: Create multiple projects
    pub async fn create_projects_batch(
        &self,
        requests: Vec<CreateProjectRequest>,
    ) -> AppResult<BatchResult<ProjectDto>> {
        let mut successful = Vec::new();
        let mut failed = Vec::new();

        for (index, request) in requests.into_iter().enumerate() {
            match self.create_project(request).await {
                Ok(dto) => successful.push(dto),
                Err(error) => failed.push(BatchError { index, error }),
            }
        }

        Ok(BatchResult { successful, failed })
    }

    /// Batch operation: Delete multiple projects
    pub async fn delete_projects_batch(
        &self,
        requests: Vec<DeleteProjectRequest>,
    ) -> AppResult<BatchResult<()>> {
        let mut successful = Vec::new();
        let mut failed = Vec::new();

        for (index, request) in requests.into_iter().enumerate() {
            match self.delete_project(request).await {
                Ok(()) => successful.push(()),
                Err(error) => failed.push(BatchError { index, error }),
            }
        }

        Ok(BatchResult { successful, failed })
    }
}

/// Result of a batch operation
#[derive(Debug, Clone)]
pub struct BatchResult<T> {
    pub successful: Vec<T>,
    pub failed: Vec<BatchError>,
}

/// Error information for batch operations
#[derive(Debug, Clone)]
pub struct BatchError {
    pub index: usize,
    pub error: AppError,
}

impl<T> BatchResult<T> {
    /// Check if all operations were successful
    pub fn all_successful(&self) -> bool {
        self.failed.is_empty()
    }

    /// Check if any operations were successful
    pub fn any_successful(&self) -> bool {
        !self.successful.is_empty()
    }

    /// Get the success count
    pub fn success_count(&self) -> usize {
        self.successful.len()
    }

    /// Get the failure count
    pub fn failure_count(&self) -> usize {
        self.failed.len()
    }

    /// Get the total count
    pub fn total_count(&self) -> usize {
        self.successful.len() + self.failed.len()
    }

    /// Get the success rate as a percentage
    pub fn success_rate(&self) -> f64 {
        if self.total_count() == 0 {
            return 100.0;
        }
        (self.success_count() as f64 / self.total_count() as f64) * 100.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::project::repositories::MockProjectRepository;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/service_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    fn create_test_service() -> ProjectService {
        let repository = Arc::new(MockProjectRepository::new());
        ProjectService::new(repository)
    }

    #[tokio::test]
    async fn test_create_project_service() {
        let service = create_test_service();
        let test_folder = setup_test_folder("create_service");

        let request = CreateProjectRequest::new(
            "Service Test Project".to_string(),
            test_folder.clone(),
            Some("Test note".to_string()),
        );

        let result = service.create_project(request).await;
        assert!(result.is_ok());

        let dto = result.unwrap();
        assert_eq!(dto.name, "Service Test Project");
        assert!(dto.note.is_some());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_create_project_with_invalid_request() {
        let service = create_test_service();

        let invalid_request = CreateProjectRequest::new(
            "".to_string(), // Empty name
            "/valid/path".to_string(),
            None,
        );

        let result = service.create_project(invalid_request).await;
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code, "VALIDATION_ERROR");
    }

    #[tokio::test]
    async fn test_update_project_service() {
        let service = create_test_service();
        let test_folder = setup_test_folder("update_service");

        // First create a project
        let create_request =
            CreateProjectRequest::new("Original Name".to_string(), test_folder.clone(), None);
        let created_dto = service.create_project(create_request).await.unwrap();

        // Then update it
        let update_request = UpdateProjectRequest::new(
            created_dto.id.clone(),
            Some("Updated Name".to_string()),
            Some("Added note".to_string()),
        );

        let result = service.update_project(update_request).await;
        assert!(result.is_ok());

        let updated_dto = result.unwrap();
        assert_eq!(updated_dto.name, "Updated Name");
        assert!(updated_dto.note.is_some());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_delete_project_service() {
        let service = create_test_service();
        let test_folder = setup_test_folder("delete_service");

        // Create a project
        let create_request =
            CreateProjectRequest::new("Project To Delete".to_string(), test_folder.clone(), None);
        let created_dto = service.create_project(create_request).await.unwrap();

        // Delete it
        let delete_request = DeleteProjectRequest::new(created_dto.id.clone(), Some(true));

        let result = service.delete_project(delete_request).await;
        assert!(result.is_ok());

        // Verify it's gone
        let get_result = service.get_project(&created_dto.id).await.unwrap();
        assert!(get_result.is_none());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_list_projects_paged() {
        let service = create_test_service();
        let test_folder = setup_test_folder("list_paged");

        // Create multiple projects
        for i in 1..=5 {
            let request =
                CreateProjectRequest::new(format!("Project {}", i), test_folder.clone(), None);
            service.create_project(request).await.unwrap();
        }

        // Test pagination
        let result = service.list_projects_paged(0, 3).await.unwrap();
        assert_eq!(result.projects.len(), 3);
        assert_eq!(result.total_count, 5);
        assert!(result.has_more);

        let second_page = service.list_projects_paged(3, 3).await.unwrap();
        assert_eq!(second_page.projects.len(), 2);
        assert!(!second_page.has_more);

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_search_projects() {
        let service = create_test_service();
        let test_folder = setup_test_folder("search");

        // Create projects with different names
        let projects = vec!["Alpha Project", "Beta Project", "Gamma Analysis"];

        for name in projects {
            let request = CreateProjectRequest::new(name.to_string(), test_folder.clone(), None);
            service.create_project(request).await.unwrap();
        }

        // Search for projects
        let search_result = service.search_projects("Project").await.unwrap();
        assert_eq!(search_result.len(), 2); // Alpha and Beta

        let analysis_result = service.search_projects("Analysis").await.unwrap();
        assert_eq!(analysis_result.len(), 1); // Gamma

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_is_name_available() {
        let service = create_test_service();
        let test_folder = setup_test_folder("name_available");

        // Initially available
        let available = service.is_name_available("Unique Name").await.unwrap();
        assert!(available);

        // Create project
        let request =
            CreateProjectRequest::new("Unique Name".to_string(), test_folder.clone(), None);
        service.create_project(request).await.unwrap();

        // No longer available
        let not_available = service.is_name_available("Unique Name").await.unwrap();
        assert!(!not_available);

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_batch_create_projects() {
        let service = create_test_service();
        let test_folder = setup_test_folder("batch_create");

        let requests = vec![
            CreateProjectRequest::new("Batch 1".to_string(), test_folder.clone(), None),
            CreateProjectRequest::new("Batch 2".to_string(), test_folder.clone(), None),
            CreateProjectRequest::new("".to_string(), test_folder.clone(), None), // Invalid
        ];

        let result = service.create_projects_batch(requests).await.unwrap();

        assert_eq!(result.success_count(), 2);
        assert_eq!(result.failure_count(), 1);
        assert!(!result.all_successful());
        assert!(result.any_successful());

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_batch_result() {
        let batch_result = BatchResult {
            successful: vec!["success1", "success2"],
            failed: vec![BatchError {
                index: 2,
                error: AppError::validation_error("test", None),
            }],
        };

        assert_eq!(batch_result.success_count(), 2);
        assert_eq!(batch_result.failure_count(), 1);
        assert_eq!(batch_result.total_count(), 3);
        assert!((batch_result.success_rate() - 66.67).abs() < 0.1);
        assert!(!batch_result.all_successful());
        assert!(batch_result.any_successful());
    }
}
