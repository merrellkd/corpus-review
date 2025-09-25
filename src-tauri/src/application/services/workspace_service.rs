use std::path::PathBuf;
use crate::application::dtos::{WorkspaceDto, DirectoryListingDto, FileEntryDto};
use crate::infrastructure::AppError;

/// Simplified workspace navigation service for MVP implementation
///
/// This service provides workspace navigation functionality by working
/// directly with the file system using existing file system operations.
pub struct WorkspaceNavigationService;

impl WorkspaceNavigationService {
    pub fn new() -> Self {
        Self
    }

    /// Open a workspace for a project
    pub async fn open_workspace(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
    ) -> Result<WorkspaceDto, AppError> {
        // Create basic workspace DTO with root directory listing
        let directory_listing = self.list_directory_contents(source_folder).await?;

        Ok(WorkspaceDto::new(
            project_id.to_string(),
            project_name.to_string(),
            source_folder.to_string(),
            source_folder.to_string(),
            directory_listing,
        ))
    }

    /// List directory contents
    pub async fn list_directory(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        current_path: &str,
    ) -> Result<DirectoryListingDto, AppError> {
        self.list_directory_contents(current_path).await
    }

    /// Navigate to a specific folder
    pub async fn navigate_to_folder(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        current_path: &str,
        folder_name: &str,
    ) -> Result<WorkspaceDto, AppError> {
        let new_path = PathBuf::from(current_path).join(folder_name);
        let new_path_str = new_path.to_string_lossy().to_string();

        // Validate that the new path is within the workspace boundaries
        if !new_path_str.starts_with(source_folder) {
            return Err(AppError::validation_error("Navigation outside workspace boundaries", None));
        }

        let directory_listing = self.list_directory_contents(&new_path_str).await?;

        Ok(WorkspaceDto::new(
            project_id.to_string(),
            project_name.to_string(),
            source_folder.to_string(),
            new_path_str,
            directory_listing,
        ))
    }

    /// Navigate to parent directory
    pub async fn navigate_to_parent(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        current_path: &str,
    ) -> Result<WorkspaceDto, AppError> {
        let current_path_buf = PathBuf::from(current_path);
        let parent_path = current_path_buf.parent()
            .ok_or_else(|| AppError::validation_error("Cannot navigate above root", None))?;

        let parent_path_str = parent_path.to_string_lossy().to_string();

        // Ensure we don't navigate above the source folder
        if !parent_path_str.starts_with(source_folder) {
            return Err(AppError::validation_error("Cannot navigate above workspace root", None));
        }

        let directory_listing = self.list_directory_contents(&parent_path_str).await?;

        Ok(WorkspaceDto::new(
            project_id.to_string(),
            project_name.to_string(),
            source_folder.to_string(),
            parent_path_str,
            directory_listing,
        ))
    }

    /// Navigate to a specific path
    pub async fn navigate_to_path(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        target_path: &str,
    ) -> Result<WorkspaceDto, AppError> {
        // Validate that the target path is within workspace boundaries
        if !target_path.starts_with(source_folder) {
            return Err(AppError::validation_error("Navigation outside workspace boundaries", None));
        }

        let directory_listing = self.list_directory_contents(target_path).await?;

        Ok(WorkspaceDto::new(
            project_id.to_string(),
            project_name.to_string(),
            source_folder.to_string(),
            target_path.to_string(),
            directory_listing,
        ))
    }

    /// Get metadata for a file entry
    pub async fn get_entry_metadata(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        entry_path: &str,
    ) -> Result<FileEntryDto, AppError> {
        // Validate path is within workspace
        if !entry_path.starts_with(source_folder) {
            return Err(AppError::validation_error("Path outside workspace boundaries", None));
        }

        self.get_file_metadata(entry_path).await
    }

    /// Validate workspace path
    pub async fn validate_workspace_path(
        &self,
        project_id: &str,
        project_name: &str,
        source_folder: &str,
        path: &str,
    ) -> Result<bool, AppError> {
        if !path.starts_with(source_folder) {
            return Ok(false);
        }

        let path_buf = PathBuf::from(path);
        Ok(path_buf.exists() && (path_buf.is_file() || path_buf.is_dir()))
    }

    /// List directory contents (internal helper)
    async fn list_directory_contents(&self, path: &str) -> Result<DirectoryListingDto, AppError> {
        let path_buf = PathBuf::from(path);

        if !path_buf.exists() {
            return Err(AppError::filesystem_error("Directory not found"));
        }

        if !path_buf.is_dir() {
            return Err(AppError::validation_error("Path is not a directory", None));
        }

        let mut entries = Vec::new();

        match std::fs::read_dir(&path_buf) {
            Ok(dir_entries) => {
                for entry in dir_entries {
                    match entry {
                        Ok(dir_entry) => {
                            let entry_path = dir_entry.path();
                            let name = entry_path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("Unknown")
                                .to_string();

                            let metadata = entry_path.metadata().map_err(|_| {
                                AppError::filesystem_error("Failed to read file metadata")
                            })?;

                            let is_directory = metadata.is_dir();
                            let size = if is_directory { None } else { Some(metadata.len()) };
                            let modified = metadata.modified()
                                .map_err(|_| AppError::filesystem_error("Failed to read modification time"))?
                                .duration_since(std::time::UNIX_EPOCH)
                                .map_err(|_| AppError::filesystem_error("Invalid modification time"))?;

                            // Convert to ISO string format
                            let modified_str = chrono::DateTime::from_timestamp(modified.as_secs() as i64, 0)
                                .unwrap_or_default()
                                .to_rfc3339();

                            let file_entry = FileEntryDto::new(
                                name,
                                entry_path.to_string_lossy().to_string(),
                                if is_directory { "directory".to_string() } else { "file".to_string() },
                                size,
                                modified_str,
                            );

                            entries.push(file_entry);
                        }
                        Err(_) => continue, // Skip entries that can't be read
                    }
                }
            }
            Err(_) => {
                return Err(AppError::filesystem_error("Failed to read directory"));
            }
        }

        // Sort entries: directories first, then files, alphabetically
        entries.sort_by(|a, b| {
            use std::cmp::Ordering;
            match (a.entry_type.as_str(), b.entry_type.as_str()) {
                ("directory", "file") => Ordering::Less,
                ("file", "directory") => Ordering::Greater,
                _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            }
        });

        // Determine navigation properties
        let parent_path = path_buf.parent().map(|p| p.to_string_lossy().to_string());
        let can_navigate_up = parent_path.is_some();
        let is_root = parent_path.is_none() || parent_path.as_ref().unwrap().is_empty();

        Ok(DirectoryListingDto::new(
            entries,
            is_root,
            parent_path,
            can_navigate_up,
        ))
    }

    /// Get file metadata (internal helper)
    async fn get_file_metadata(&self, path: &str) -> Result<FileEntryDto, AppError> {
        let path_buf = PathBuf::from(path);

        if !path_buf.exists() {
            return Err(AppError::filesystem_error("File not found"));
        }

        let name = path_buf.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let metadata = path_buf.metadata().map_err(|_| {
            AppError::filesystem_error("Failed to read file metadata")
        })?;

        let is_directory = metadata.is_dir();
        let size = if is_directory { None } else { Some(metadata.len()) };
        let modified = metadata.modified()
            .map_err(|_| AppError::filesystem_error("Failed to read modification time"))?
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| AppError::filesystem_error("Invalid modification time"))?;

        // Convert to ISO string format
        let modified_str = chrono::DateTime::from_timestamp(modified.as_secs() as i64, 0)
            .unwrap_or_default()
            .to_rfc3339();

        Ok(FileEntryDto::new(
            name,
            path.to_string(),
            if is_directory { "directory".to_string() } else { "file".to_string() },
            size,
            modified_str,
        ))
    }
}

impl Default for WorkspaceNavigationService {
    fn default() -> Self {
        Self::new()
    }
}