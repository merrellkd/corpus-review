use crate::domain::project::aggregates::Project;
use crate::domain::workspace::{
    entities::{FileSystemItem, FileSystemItemType},
    repositories::{FileSystemRepository, RepositoryError},
    value_objects::FilePath,
};
use async_trait::async_trait;
use std::path::Path;
use tokio::fs;

pub struct TauriFileSystemRepository;

impl TauriFileSystemRepository {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl FileSystemRepository for TauriFileSystemRepository {
    async fn is_path_accessible(&self, path: &FilePath) -> Result<bool, RepositoryError> {
        let std_path = Path::new(path.as_str());

        match fs::metadata(&std_path).await {
            Ok(_) => Ok(true),
            Err(e) => {
                if e.kind() == std::io::ErrorKind::NotFound
                    || e.kind() == std::io::ErrorKind::PermissionDenied
                {
                    Ok(false)
                } else {
                    Err(RepositoryError::FileSystemError(e.to_string()))
                }
            }
        }
    }

    async fn list_directory_contents(
        &self,
        folder_path: &FilePath,
    ) -> Result<Vec<FileSystemItem>, RepositoryError> {
        let std_path = Path::new(folder_path.as_str());

        if !std_path.is_dir() {
            return Err(RepositoryError::ValidationError(
                "Path is not a directory".to_string(),
            ));
        }

        let mut entries = fs::read_dir(&std_path)
            .await
            .map_err(|e| RepositoryError::FileSystemError(e.to_string()))?;

        let mut items = Vec::new();

        while let Some(entry) = entries
            .next_entry()
            .await
            .map_err(|e| RepositoryError::FileSystemError(e.to_string()))?
        {
            let path = entry.path();
            let metadata = entry
                .metadata()
                .await
                .map_err(|e| RepositoryError::FileSystemError(e.to_string()))?;

            let file_path = FilePath::new(path.to_string_lossy().to_string())
                .map_err(|e| RepositoryError::ValidationError(e))?;

            let item_type = if metadata.is_dir() {
                FileSystemItemType::Directory
            } else {
                FileSystemItemType::File
            };
            let size = if metadata.is_dir() {
                None
            } else {
                Some(metadata.len())
            };
            let modified = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|duration| chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0))
                .flatten()
                .unwrap_or_else(chrono::Utc::now);

            let item = FileSystemItem::new(file_path, item_type, modified, size, true)
                .map_err(|e| RepositoryError::ValidationError(e))?;

            items.push(item);
        }

        items.sort_by(|a, b| match (&a.item_type, &b.item_type) {
            (FileSystemItemType::Directory, FileSystemItemType::File) => std::cmp::Ordering::Less,
            (FileSystemItemType::File, FileSystemItemType::Directory) => {
                std::cmp::Ordering::Greater
            }
            _ => a.path.as_str().cmp(b.path.as_str()),
        });

        Ok(items)
    }

    async fn path_exists(&self, path: &FilePath) -> Result<bool, RepositoryError> {
        let std_path = Path::new(path.as_str());
        Ok(std_path.exists())
    }

    async fn get_item_metadata(
        &self,
        file_path: &FilePath,
    ) -> Result<Option<FileSystemItem>, RepositoryError> {
        let std_path = Path::new(file_path.as_str());

        match fs::metadata(&std_path).await {
            Ok(metadata) => {
                let item_type = if metadata.is_dir() {
                    FileSystemItemType::Directory
                } else {
                    FileSystemItemType::File
                };
                let size = if metadata.is_dir() {
                    None
                } else {
                    Some(metadata.len())
                };
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|duration| chrono::DateTime::from_timestamp(duration.as_secs() as i64, 0))
                    .flatten()
                    .unwrap_or_else(chrono::Utc::now);

                let item = FileSystemItem::new(file_path.clone(), item_type, modified, size, true)
                    .map_err(|e| RepositoryError::ValidationError(e))?;

                Ok(Some(item))
            }
            Err(e) => {
                if e.kind() == std::io::ErrorKind::NotFound {
                    Ok(None)
                } else {
                    Err(RepositoryError::FileSystemError(e.to_string()))
                }
            }
        }
    }

    async fn watch_directory(&self, _path: &FilePath) -> Result<(), RepositoryError> {
        // File watching not implemented in basic Tauri repository
        // Could be implemented with notify crate if needed
        Ok(())
    }

    async fn validate_path_within_project(
        &self,
        path: &FilePath,
        project: &Project,
    ) -> Result<bool, RepositoryError> {
        let file_std_path = Path::new(path.as_str());
        let source_path_str = project.source_folder().as_string();
        let source_std_path = Path::new(&source_path_str);

        let file_canonical = file_std_path
            .canonicalize()
            .map_err(|e| RepositoryError::FileSystemError(e.to_string()))?;
        let source_canonical = source_std_path
            .canonicalize()
            .map_err(|e| RepositoryError::FileSystemError(e.to_string()))?;

        let within_source = file_canonical.starts_with(&source_canonical);

        Ok(within_source)
    }
}
