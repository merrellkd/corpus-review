use async_trait::async_trait;
use super::super::aggregates::project::Project;
use super::super::value_objects::project_id::ProjectId;
use super::super::errors::project_error::{ProjectError, ProjectResult};

/// Repository trait for Project aggregate persistence
///
/// This trait defines the contract for persisting and retrieving Project aggregates.
/// Following DDD principles, this interface is defined in the domain layer but
/// implemented in the infrastructure layer.
///
/// All operations are async to support both local SQLite and potential future
/// remote storage implementations.
#[async_trait]
pub trait ProjectRepository: Send + Sync {
    /// Save a new project to the repository
    /// Returns error if a project with the same name already exists
    async fn create(&self, project: &Project) -> ProjectResult<()>;

    /// Update an existing project in the repository
    /// Returns error if project is not found or version conflict occurs
    async fn update(&self, project: &Project) -> ProjectResult<()>;

    /// Remove a project from the repository
    /// Returns error if project is not found or cannot be deleted
    async fn delete(&self, id: &ProjectId) -> ProjectResult<()>;

    /// Find a project by its unique identifier
    /// Returns None if project is not found
    async fn find_by_id(&self, id: &ProjectId) -> ProjectResult<Option<Project>>;

    /// Find a project by its name
    /// Returns None if no project with the given name exists
    async fn find_by_name(&self, name: &str) -> ProjectResult<Option<Project>>;

    /// List all projects in the repository
    /// Returns empty vector if no projects exist
    async fn list_all(&self) -> ProjectResult<Vec<Project>>;

    /// Check if a project exists with the given ID
    async fn exists_by_id(&self, id: &ProjectId) -> ProjectResult<bool>;

    /// Check if a project exists with the given name
    async fn exists_by_name(&self, name: &str) -> ProjectResult<bool>;

    /// Count total number of projects in the repository
    async fn count(&self) -> ProjectResult<usize>;

    /// List projects with pagination support
    /// Returns projects ordered by creation date (newest first)
    async fn list_paged(&self, offset: usize, limit: usize) -> ProjectResult<Vec<Project>>;

    /// Search projects by name pattern (case-insensitive)
    /// Supports partial matches and returns results ordered by relevance
    async fn search_by_name(&self, pattern: &str) -> ProjectResult<Vec<Project>>;

    /// Find projects created within a date range
    /// Useful for reporting and analytics
    async fn find_by_date_range(
        &self,
        start_date: &chrono::DateTime<chrono::Utc>,
        end_date: &chrono::DateTime<chrono::Utc>,
    ) -> ProjectResult<Vec<Project>>;

    /// Validate repository health and connectivity
    /// Returns error if repository is not accessible or corrupted
    async fn health_check(&self) -> ProjectResult<()>;

    /// Get repository statistics for monitoring
    async fn get_stats(&self) -> ProjectResult<RepositoryStats>;
}

/// Repository statistics for monitoring and diagnostics
#[derive(Debug, Clone)]
pub struct RepositoryStats {
    pub total_projects: usize,
    pub accessible_projects: usize,
    pub inaccessible_projects: usize,
    pub average_name_length: f64,
    pub projects_with_notes: usize,
    pub oldest_project_date: Option<chrono::DateTime<chrono::Utc>>,
    pub newest_project_date: Option<chrono::DateTime<chrono::Utc>>,
    pub database_size_bytes: Option<u64>,
}

impl RepositoryStats {
    /// Create empty repository stats
    pub fn empty() -> Self {
        RepositoryStats {
            total_projects: 0,
            accessible_projects: 0,
            inaccessible_projects: 0,
            average_name_length: 0.0,
            projects_with_notes: 0,
            oldest_project_date: None,
            newest_project_date: None,
            database_size_bytes: None,
        }
    }

    /// Calculate accessibility percentage
    pub fn accessibility_percentage(&self) -> f64 {
        if self.total_projects == 0 {
            return 100.0;
        }
        (self.accessible_projects as f64 / self.total_projects as f64) * 100.0
    }

    /// Calculate percentage of projects with notes
    pub fn notes_percentage(&self) -> f64 {
        if self.total_projects == 0 {
            return 0.0;
        }
        (self.projects_with_notes as f64 / self.total_projects as f64) * 100.0
    }
}

/// Mock implementation for testing purposes
/// This allows domain layer tests to run without infrastructure dependencies
#[cfg(test)]
pub mod mock {
    use super::*;
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};
    use chrono::Utc;

    #[derive(Debug, Clone)]
    pub struct MockProjectRepository {
        projects: Arc<Mutex<HashMap<String, Project>>>,
        should_fail: Arc<Mutex<bool>>,
    }

    impl MockProjectRepository {
        pub fn new() -> Self {
            MockProjectRepository {
                projects: Arc::new(Mutex::new(HashMap::new())),
                should_fail: Arc::new(Mutex::new(false)),
            }
        }

        pub fn set_should_fail(&self, should_fail: bool) {
            *self.should_fail.lock().unwrap() = should_fail;
        }

        pub fn clear(&self) {
            self.projects.lock().unwrap().clear();
        }

        pub fn add_project(&self, project: Project) {
            let mut projects = self.projects.lock().unwrap();
            projects.insert(project.id().value().to_string(), project);
        }

        pub fn project_count(&self) -> usize {
            self.projects.lock().unwrap().len()
        }
    }

    impl Default for MockProjectRepository {
        fn default() -> Self {
            Self::new()
        }
    }

    #[async_trait]
    impl ProjectRepository for MockProjectRepository {
        async fn create(&self, project: &Project) -> ProjectResult<()> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let mut projects = self.projects.lock().unwrap();

            // Check for duplicate name
            for existing in projects.values() {
                if existing.name().value() == project.name().value() {
                    return Err(ProjectError::duplicate_name(project.name().value()));
                }
            }

            projects.insert(project.id().value().to_string(), project.clone());
            Ok(())
        }

        async fn update(&self, project: &Project) -> ProjectResult<()> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let mut projects = self.projects.lock().unwrap();
            let id = project.id().value().to_string();

            if !projects.contains_key(&id) {
                return Err(ProjectError::not_found(&id));
            }

            projects.insert(id, project.clone());
            Ok(())
        }

        async fn delete(&self, id: &ProjectId) -> ProjectResult<()> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let mut projects = self.projects.lock().unwrap();
            let id_str = id.value().to_string();

            if projects.remove(&id_str).is_none() {
                return Err(ProjectError::not_found(&id_str));
            }

            Ok(())
        }

        async fn find_by_id(&self, id: &ProjectId) -> ProjectResult<Option<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            Ok(projects.get(id.value()).cloned())
        }

        async fn find_by_name(&self, name: &str) -> ProjectResult<Option<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            for project in projects.values() {
                if project.name().value() == name {
                    return Ok(Some(project.clone()));
                }
            }
            Ok(None)
        }

        async fn list_all(&self) -> ProjectResult<Vec<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            let mut result: Vec<Project> = projects.values().cloned().collect();
            result.sort_by(|a, b| b.created_at().value().cmp(&a.created_at().value()));
            Ok(result)
        }

        async fn exists_by_id(&self, id: &ProjectId) -> ProjectResult<bool> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            Ok(projects.contains_key(id.value()))
        }

        async fn exists_by_name(&self, name: &str) -> ProjectResult<bool> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            for project in projects.values() {
                if project.name().value() == name {
                    return Ok(true);
                }
            }
            Ok(false)
        }

        async fn count(&self) -> ProjectResult<usize> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            Ok(projects.len())
        }

        async fn list_paged(&self, offset: usize, limit: usize) -> ProjectResult<Vec<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let all_projects = self.list_all().await?;
            let end = std::cmp::min(offset + limit, all_projects.len());
            if offset >= all_projects.len() {
                Ok(Vec::new())
            } else {
                Ok(all_projects[offset..end].to_vec())
            }
        }

        async fn search_by_name(&self, pattern: &str) -> ProjectResult<Vec<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            let pattern_lower = pattern.to_lowercase();
            let mut results: Vec<Project> = projects
                .values()
                .filter(|p| p.name().value().to_lowercase().contains(&pattern_lower))
                .cloned()
                .collect();

            results.sort_by(|a, b| b.created_at().value().cmp(&a.created_at().value()));
            Ok(results)
        }

        async fn find_by_date_range(
            &self,
            start_date: &chrono::DateTime<chrono::Utc>,
            end_date: &chrono::DateTime<chrono::Utc>,
        ) -> ProjectResult<Vec<Project>> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            let mut results: Vec<Project> = projects
                .values()
                .filter(|p| {
                    let created = p.created_at().value();
                    created >= *start_date && created <= *end_date
                })
                .cloned()
                .collect();

            results.sort_by(|a, b| b.created_at().value().cmp(&a.created_at().value()));
            Ok(results)
        }

        async fn health_check(&self) -> ProjectResult<()> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock health check failure"));
            }
            Ok(())
        }

        async fn get_stats(&self) -> ProjectResult<RepositoryStats> {
            if *self.should_fail.lock().unwrap() {
                return Err(ProjectError::repository_error("Mock failure"));
            }

            let projects = self.projects.lock().unwrap();
            let total = projects.len();

            if total == 0 {
                return Ok(RepositoryStats::empty());
            }

            let accessible = projects.values().filter(|p| p.is_source_accessible()).count();
            let with_notes = projects.values().filter(|p| p.note().is_some()).count();
            let total_name_length: usize = projects.values().map(|p| p.name().len()).sum();
            let avg_name_length = total_name_length as f64 / total as f64;

            let mut dates: Vec<chrono::DateTime<chrono::Utc>> =
                projects.values().map(|p| p.created_at().value()).collect();
            dates.sort();

            Ok(RepositoryStats {
                total_projects: total,
                accessible_projects: accessible,
                inaccessible_projects: total - accessible,
                average_name_length: avg_name_length,
                projects_with_notes: with_notes,
                oldest_project_date: dates.first().copied(),
                newest_project_date: dates.last().copied(),
                database_size_bytes: None, // Not applicable for mock
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::mock::MockProjectRepository;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/repo_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    #[tokio::test]
    async fn test_mock_repository_create_and_find() {
        let repo = MockProjectRepository::new();
        let test_folder = setup_test_folder("mock_create");

        let project = Project::new(
            "Test Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // Test create
        let result = repo.create(&project).await;
        assert!(result.is_ok());

        // Test find by ID
        let found = repo.find_by_id(project.id()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().id(), project.id());

        // Test find by name
        let found_by_name = repo.find_by_name("Test Project").await.unwrap();
        assert!(found_by_name.is_some());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_mock_repository_duplicate_name_error() {
        let repo = MockProjectRepository::new();
        let test_folder = setup_test_folder("mock_duplicate");

        let project1 = Project::new(
            "Duplicate Name".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        let project2 = Project::new(
            "Duplicate Name".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // First create should succeed
        assert!(repo.create(&project1).await.is_ok());

        // Second create should fail with duplicate name error
        let result = repo.create(&project2).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ProjectError::DuplicateName { .. }));

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_mock_repository_update_and_delete() {
        let repo = MockProjectRepository::new();
        let test_folder = setup_test_folder("mock_update_delete");

        let mut project = Project::new(
            "Original Name".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // Create project
        repo.create(&project).await.unwrap();

        // Update project
        project.update_name("Updated Name".to_string()).unwrap();
        assert!(repo.update(&project).await.is_ok());

        // Verify update
        let found = repo.find_by_id(project.id()).await.unwrap();
        assert_eq!(found.unwrap().name().value(), "Updated Name");

        // Delete project
        assert!(repo.delete(project.id()).await.is_ok());

        // Verify deletion
        let found_after_delete = repo.find_by_id(project.id()).await.unwrap();
        assert!(found_after_delete.is_none());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_mock_repository_list_and_search() {
        let repo = MockProjectRepository::new();
        let test_folder = setup_test_folder("mock_list_search");

        // Create multiple projects
        let projects = vec![
            Project::new("Alpha Project".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("Beta Project".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("Gamma Analysis".to_string(), test_folder.clone(), None).unwrap(),
        ];

        for project in &projects {
            repo.create(project).await.unwrap();
        }

        // Test list all
        let all_projects = repo.list_all().await.unwrap();
        assert_eq!(all_projects.len(), 3);

        // Test search
        let search_results = repo.search_by_name("Project").await.unwrap();
        assert_eq!(search_results.len(), 2); // Alpha and Beta

        let analysis_results = repo.search_by_name("Analysis").await.unwrap();
        assert_eq!(analysis_results.len(), 1); // Gamma

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_repository_stats() {
        let stats = RepositoryStats {
            total_projects: 10,
            accessible_projects: 8,
            inaccessible_projects: 2,
            average_name_length: 15.5,
            projects_with_notes: 6,
            oldest_project_date: None,
            newest_project_date: None,
            database_size_bytes: Some(1024),
        };

        assert_eq!(stats.accessibility_percentage(), 80.0);
        assert_eq!(stats.notes_percentage(), 60.0);

        let empty_stats = RepositoryStats::empty();
        assert_eq!(empty_stats.accessibility_percentage(), 100.0);
        assert_eq!(empty_stats.notes_percentage(), 0.0);
    }

    #[tokio::test]
    async fn test_mock_repository_failure_mode() {
        let repo = MockProjectRepository::new();
        repo.set_should_fail(true);

        let test_folder = setup_test_folder("mock_failure");
        let project = Project::new(
            "Test Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // All operations should fail
        assert!(repo.create(&project).await.is_err());
        assert!(repo.find_by_id(project.id()).await.is_err());
        assert!(repo.list_all().await.is_err());
        assert!(repo.health_check().await.is_err());

        cleanup_test_folder(&test_folder);
    }
}