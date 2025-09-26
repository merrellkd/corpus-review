use crate::domain::workspace::repositories::{RepositoryError, RepositoryFactory};
// use crate::application::dtos::{FileSystemItemDto, ProjectDto}; // DTOs not implemented yet
use std::sync::Arc;

/// Application service for file system operations
pub struct FileSystemService {
    repository_factory: Arc<dyn RepositoryFactory>,
}

#[derive(Debug, Clone)]
pub enum FileSystemServiceError {
    NotFound(String),
    ValidationError(String),
    AccessError(String),
    InternalError(String),
}

impl std::fmt::Display for FileSystemServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FileSystemServiceError::NotFound(msg) => write!(f, "Not found: {}", msg),
            FileSystemServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            FileSystemServiceError::AccessError(msg) => write!(f, "Access error: {}", msg),
            FileSystemServiceError::InternalError(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl std::error::Error for FileSystemServiceError {}

impl From<RepositoryError> for FileSystemServiceError {
    fn from(error: RepositoryError) -> Self {
        match error {
            RepositoryError::NotFound(msg) => FileSystemServiceError::NotFound(msg),
            RepositoryError::ValidationError(msg) => FileSystemServiceError::ValidationError(msg),
            RepositoryError::DatabaseError(msg) => FileSystemServiceError::InternalError(msg),
            RepositoryError::AccessError(msg) => FileSystemServiceError::AccessError(msg),
            RepositoryError::SerializationError(msg) => FileSystemServiceError::InternalError(msg),
            RepositoryError::FileSystemError(msg) => FileSystemServiceError::AccessError(msg),
            RepositoryError::ConstraintViolation(msg) => {
                FileSystemServiceError::ValidationError(msg)
            }
            RepositoryError::InternalError(msg) => FileSystemServiceError::InternalError(msg),
        }
    }
}

impl FileSystemService {
    pub fn new(repository_factory: Arc<dyn RepositoryFactory>) -> Self {
        Self { repository_factory }
    }

    // All methods temporarily commented out due to missing DTOs
    /*

    /// List contents of a folder
    pub async fn list_folder_contents(&self, folder_path: &str) -> Result<Vec<FileSystemItemDto>, FileSystemServiceError> {
        let path = FilePath::new(folder_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();

        // Check if path exists and is accessible
        match fs_repo.path_exists(&path).await {
            Ok(false) => {
                return Ok(vec![]); // Return empty list with no error for missing paths
            }
            Err(e) => {
                return Err(FileSystemServiceError::from(e));
            }
            Ok(true) => {
                // Path exists, check accessibility
                match fs_repo.is_path_accessible(&path).await {
                    Ok(false) => {
                        return Err(FileSystemServiceError::AccessError("FOLDER_INACCESSIBLE: Permission denied".to_string()));
                    }
                    Err(e) => {
                        return Err(FileSystemServiceError::from(e));
                    }
                    Ok(true) => {
                        // Path is accessible, proceed to list contents
                    }
                }
            }
        }

        // List directory contents
        let items = fs_repo.list_directory_contents(&path).await?;

        // Convert to DTOs
        let dtos: Vec<FileSystemItemDto> = items
            .into_iter()
            .map(|item| self.file_system_item_to_dto(item))
            .collect();

        Ok(dtos)
    }

    /// Get project details by ID
    pub async fn get_project_details(&self, project_id: &str) -> Result<Option<ProjectDto>, FileSystemServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let project_repo = self.repository_factory.project_repository();
        let project = project_repo.find_by_id(&project_id).await?;

        Ok(project.map(|p| self.project_to_dto(p)))
    }

    /// Validate that a path is within project boundaries
    pub async fn validate_path_within_project(
        &self,
        file_path: &str,
        project_id: &str,
    ) -> Result<bool, FileSystemServiceError> {
        let path = FilePath::new(file_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let project_repo = self.repository_factory.project_repository();
        let project = project_repo.find_by_id(&project_id).await?
            .ok_or_else(|| FileSystemServiceError::NotFound("Project not found".to_string()))?;

        let fs_repo = self.repository_factory.file_system_repository();
        let is_valid = fs_repo.validate_path_within_project(&path, &project).await?;

        Ok(is_valid)
    }

    /// Get file metadata
    pub async fn get_file_metadata(&self, file_path: &str) -> Result<Option<FileSystemItemDto>, FileSystemServiceError> {
        let path = FilePath::new(file_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();
        let item = fs_repo.get_item_metadata(&path).await?;

        Ok(item.map(|i| self.file_system_item_to_dto(i)))
    }

    /// Check if a path exists
    pub async fn path_exists(&self, file_path: &str) -> Result<bool, FileSystemServiceError> {
        let path = FilePath::new(file_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();
        let exists = fs_repo.path_exists(&path).await?;

        Ok(exists)
    }

    /// Check if a path is accessible
    pub async fn is_path_accessible(&self, file_path: &str) -> Result<bool, FileSystemServiceError> {
        let path = FilePath::new(file_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();
        let accessible = fs_repo.is_path_accessible(&path).await?;

        Ok(accessible)
    }

    /// Get files filtered by project boundaries
    pub async fn list_project_folder_contents(
        &self,
        folder_path: &str,
        project_id: &str,
    ) -> Result<Vec<FileSystemItemDto>, FileSystemServiceError> {
        // First validate that the folder is within project boundaries
        let is_valid = self.validate_path_within_project(folder_path, project_id).await?;
        if !is_valid {
            return Err(FileSystemServiceError::ValidationError(
                "Path is outside project boundaries".to_string()
            ));
        }

        // Get folder contents
        self.list_folder_contents(folder_path).await
    }

    /// Search files within project directories
    pub async fn search_project_files(
        &self,
        project_id: &str,
        search_term: &str,
    ) -> Result<Vec<FileSystemItemDto>, FileSystemServiceError> {
        let project_id = ProjectId::from_string(project_id.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let project_repo = self.repository_factory.project_repository();
        let project = project_repo.find_by_id(&project_id).await?
            .ok_or_else(|| FileSystemServiceError::NotFound("Project not found".to_string()))?;

        let mut results = Vec::new();

        // Search in source folder
        let source_files = self.search_in_folder(&project.source_folder_path, search_term).await?;
        results.extend(source_files);

        // Search in reports folder
        let reports_files = self.search_in_folder(&project.reports_folder_path, search_term).await?;
        results.extend(reports_files);

        Ok(results)
    }

    /// Search for files recursively within a folder
    pub async fn search_files_recursive(&self, folder_path: &str, query: &str) -> Result<Vec<FileSystemItemDto>, FileSystemServiceError> {
        let path = FilePath::new(folder_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();

        // Check if path exists and is accessible
        match fs_repo.is_path_accessible(&path).await {
            Ok(false) => {
                return Err(FileSystemServiceError::AccessError("FOLDER_INACCESSIBLE: Permission denied".to_string()));
            }
            Err(e) => {
                return Err(FileSystemServiceError::from(e));
            }
            Ok(true) => {}
        }

        // Use the existing helper method
        self.search_in_folder(&path, query).await
    }

    /// Get file information for a specific path
    pub async fn get_file_info(&self, file_path: &str) -> Result<Option<FileSystemItemDto>, FileSystemServiceError> {
        let path = FilePath::new(file_path.to_string())
            .map_err(|e| FileSystemServiceError::ValidationError(e))?;

        let fs_repo = self.repository_factory.file_system_repository();

        match fs_repo.get_item_metadata(&path).await {
            Ok(Some(item)) => Ok(Some(self.file_system_item_to_dto(item))),
            Ok(None) => Ok(None),
            Err(e) => Err(FileSystemServiceError::from(e)),
        }
    }

    /// Helper method to search within a specific folder (non-recursive implementation to avoid boxing)
    async fn search_in_folder(&self, folder_path: &FilePath, search_term: &str) -> Result<Vec<FileSystemItemDto>, FileSystemServiceError> {
        let fs_repo = self.repository_factory.file_system_repository();

        // Check if folder is accessible
        if !fs_repo.is_path_accessible(folder_path).await? {
            return Ok(vec![]); // Return empty results for inaccessible folders
        }

        let items = fs_repo.list_directory_contents(folder_path).await?;
        let mut results = Vec::new();

        for item in items {
            // Check if item name contains search term (case-insensitive)
            if item.name.to_lowercase().contains(&search_term.to_lowercase()) {
                results.push(self.file_system_item_to_dto(item.clone()));
            }

            // Note: Skipping recursive search to avoid complex async recursion
            // In a real implementation, you'd use a queue-based approach for recursion
        }

        Ok(results)
    }

    // Helper function for file size formatting
    fn format_file_size(bytes: u64) -> String {
        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        let mut size = bytes as f64;
        let mut unit_index = 0;

        while size >= 1024.0 && unit_index < UNITS.len() - 1 {
            size /= 1024.0;
            unit_index += 1;
        }

        if unit_index == 0 {
            format!("{} {}", bytes, UNITS[unit_index])
        } else {
            format!("{:.1} {}", size, UNITS[unit_index])
        }
    }

    // Helper methods for DTO conversion
    fn file_system_item_to_dto(&self, item: FileSystemItem) -> FileSystemItemDto {
        let formatted_size = match item.size {
            Some(bytes) => Self::format_file_size(bytes),
            None => "--".to_string(),
        };

        FileSystemItemDto {
            path: item.path.as_str().to_string(),
            name: item.name,
            item_type: item.item_type.as_str().to_string(),
            parent_path: item.parent_path.map(|p| p.as_str().to_string()),
            last_modified: item.last_modified,
            size: item.size,
            is_accessible: item.is_accessible,
            formatted_size,
        }
    }

    fn project_to_dto(&self, project: Project) -> ProjectDto {
        ProjectDto {
            id: project.id.as_str().to_string(),
            name: project.name,
            source_folder: project.source_folder_path.as_str().to_string(),
            reports_folder: project.reports_folder_path.as_str().to_string(),
            created_at: chrono::Utc::now(), // For now, use current time - in real implementation would come from entity
        }
    }
    */
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{project::aggregates::Project, workspace::{entities::*, repositories::*, value_objects::*}};
    use async_trait::async_trait;
    use chrono::Utc;
    use std::collections::HashMap;
    use tokio;

    // Mock repository implementations for testing
    struct MockFileSystemRepository {
        files: HashMap<String, FileSystemItem>,
        accessible_paths: Vec<String>,
    }

    impl MockFileSystemRepository {
        fn new() -> Self {
            let mut files = HashMap::new();
            let mut accessible_paths = vec![
                "/Users/test/Documents/Source".to_string(),
                "/Users/test/Documents/Reports".to_string(),
            ];

            // Add some test files
            let source_path = FilePath::new("/Users/test/Documents/Source".to_string()).unwrap();
            let file = FileSystemItem::new(
                FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap(),
                FileSystemItemType::File,
                Utc::now(),
                Some(1024),
                true,
            )
            .unwrap();

            files.insert("/Users/test/Documents/Source".to_string(), file);
            accessible_paths.push("/Users/test/Documents/Source/document.txt".to_string());

            Self {
                files,
                accessible_paths,
            }
        }
    }

    #[async_trait]
    impl FileSystemRepository for MockFileSystemRepository {
        async fn list_directory_contents(
            &self,
            path: &FilePath,
        ) -> Result<Vec<FileSystemItem>, RepositoryError> {
            let items: Vec<FileSystemItem> = self
                .files
                .values()
                .filter(|item| {
                    item.parent_path
                        .as_ref()
                        .map_or(false, |parent| parent.as_str() == path.as_str())
                })
                .cloned()
                .collect();
            Ok(items)
        }

        async fn path_exists(&self, path: &FilePath) -> Result<bool, RepositoryError> {
            Ok(self.accessible_paths.contains(&path.as_str().to_string())
                || self.files.contains_key(path.as_str()))
        }

        async fn is_path_accessible(&self, path: &FilePath) -> Result<bool, RepositoryError> {
            Ok(self.accessible_paths.contains(&path.as_str().to_string()))
        }

        async fn get_item_metadata(
            &self,
            path: &FilePath,
        ) -> Result<Option<FileSystemItem>, RepositoryError> {
            Ok(self.files.get(path.as_str()).cloned())
        }

        async fn watch_directory(&self, _path: &FilePath) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn validate_path_within_project(
            &self,
            path: &FilePath,
            project: &Project,
        ) -> Result<bool, RepositoryError> {
            Ok(project.is_path_within_project(path.as_str()))
        }
    }

    struct MockProjectRepository {
        projects: HashMap<String, Project>,
    }

    impl MockProjectRepository {
        fn new() -> Self {
            let mut projects = HashMap::new();

            let project = Project::new(
                "Test Project".to_string(),
                FilePath::new("/Users/test/Documents/Source".to_string()).unwrap(),
                FilePath::new("/Users/test/Documents/Reports".to_string()).unwrap(),
            )
            .unwrap();

            projects.insert(project.id.as_str().to_string(), project);

            Self { projects }
        }
    }

    #[async_trait]
    impl ProjectRepository for MockProjectRepository {
        async fn save(&self, _project: &Project) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn find_by_id(&self, id: &ProjectId) -> Result<Option<Project>, RepositoryError> {
            Ok(self.projects.get(id.as_str()).cloned())
        }

        async fn find_by_name(&self, _name: &str) -> Result<Option<Project>, RepositoryError> {
            Ok(None)
        }

        async fn list_all(&self) -> Result<Vec<Project>, RepositoryError> {
            Ok(self.projects.values().cloned().collect())
        }

        async fn delete(&self, _id: &ProjectId) -> Result<(), RepositoryError> {
            Ok(())
        }

        async fn is_name_unique(
            &self,
            _name: &str,
            _excluding_id: Option<&ProjectId>,
        ) -> Result<bool, RepositoryError> {
            Ok(true)
        }

        async fn update_workspace_layout(
            &self,
            _project_id: &ProjectId,
            _layout: &crate::domain::workspace::WorkspaceLayout,
        ) -> Result<(), RepositoryError> {
            Ok(())
        }
    }

    struct MockRepositoryFactory {
        fs_repo: Box<dyn FileSystemRepository>,
        project_repo: Box<dyn ProjectRepository>,
    }

    impl MockRepositoryFactory {
        fn new() -> Self {
            Self {
                fs_repo: Box::new(MockFileSystemRepository::new()),
                project_repo: Box::new(MockProjectRepository::new()),
            }
        }
    }

    impl RepositoryFactory for MockRepositoryFactory {
        fn workspace_layout_repository(&self) -> Box<dyn WorkspaceLayoutRepository> {
            unimplemented!()
        }

        fn file_system_repository(&self) -> Box<dyn FileSystemRepository> {
            Box::new(MockFileSystemRepository::new())
        }

        fn document_caddy_repository(&self) -> Box<dyn DocumentCaddyRepository> {
            unimplemented!()
        }

        fn project_repository(&self) -> Box<dyn ProjectRepository> {
            Box::new(MockProjectRepository::new())
        }
    }

    #[tokio::test]
    async fn test_list_folder_contents_accessible() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = FileSystemService::new(factory);

        let result = service
            .list_folder_contents("/Users/test/Documents/Source")
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_list_folder_contents_inaccessible() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = FileSystemService::new(factory);

        let result = service.list_folder_contents("/inaccessible/path").await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_path_exists() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = FileSystemService::new(factory);

        let result = service.path_exists("/Users/test/Documents/Source").await;
        assert!(result.is_ok());
        assert!(result.unwrap());

        let result = service.path_exists("/nonexistent/path").await;
        assert!(result.is_ok());
        assert!(!result.unwrap());
    }

    #[tokio::test]
    async fn test_invalid_path() {
        let factory = Arc::new(MockRepositoryFactory::new());
        let service = FileSystemService::new(factory);

        let result = service.list_folder_contents("../../../etc/passwd").await;
        assert!(result.is_err());
    }
}
