use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fmt;

/// FolderPath value object ensuring source folder validation
///
/// Business Rules:
/// - Must exist on the filesystem
/// - Must be a directory (not a file)
/// - Path is stored as an absolute path when possible
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FolderPath(PathBuf);

impl FolderPath {
    /// Create a new FolderPath with validation
    pub fn new(path: String) -> Result<Self, FolderPathError> {
        let path_buf = PathBuf::from(&path);

        if !path_buf.exists() {
            return Err(FolderPathError::NotFound { path });
        }

        if !path_buf.is_dir() {
            return Err(FolderPathError::NotADirectory { path });
        }

        // Try to canonicalize the path to get absolute path, but fall back to original if it fails
        let canonical_path = path_buf.canonicalize().unwrap_or(path_buf);

        Ok(FolderPath(canonical_path))
    }

    /// Create a FolderPath without filesystem validation (for testing)
    /// This should only be used in test scenarios
    #[cfg(test)]
    pub fn new_unchecked(path: String) -> Self {
        FolderPath(PathBuf::from(path))
    }

    /// Get the Path reference
    pub fn value(&self) -> &Path {
        &self.0
    }

    /// Get the path as a string
    pub fn as_string(&self) -> String {
        self.0.to_string_lossy().to_string()
    }

    /// Get the file name of the folder
    pub fn folder_name(&self) -> Option<String> {
        self.0
            .file_name()
            .and_then(|name| name.to_str())
            .map(|s| s.to_string())
    }

    /// Check if the folder is accessible (exists and is readable)
    pub fn is_accessible(&self) -> bool {
        self.0.exists() && self.0.is_dir()
    }

    /// Get the parent directory
    pub fn parent(&self) -> Option<&Path> {
        self.0.parent()
    }
}

impl fmt::Display for FolderPath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.display())
    }
}

impl From<FolderPath> for String {
    fn from(path: FolderPath) -> Self {
        path.as_string()
    }
}

impl From<FolderPath> for PathBuf {
    fn from(path: FolderPath) -> Self {
        path.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum FolderPathError {
    #[error("Source folder not found: {path}")]
    NotFound { path: String },
    #[error("Path is not a directory: {path}")]
    NotADirectory { path: String },
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/corpus_review_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    #[test]
    fn test_valid_folder_path() {
        let test_folder = setup_test_folder("valid");
        let folder_path = FolderPath::new(test_folder.clone());

        assert!(folder_path.is_ok());
        let path = folder_path.unwrap();
        assert!(path.is_accessible());

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_nonexistent_folder_fails() {
        let nonexistent_path = "/tmp/this_folder_should_not_exist_12345";
        let folder_path = FolderPath::new(nonexistent_path.to_string());

        assert!(folder_path.is_err());
        match folder_path.unwrap_err() {
            FolderPathError::NotFound { path } => {
                assert_eq!(path, nonexistent_path);
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[test]
    fn test_file_instead_of_directory_fails() {
        let test_folder = setup_test_folder("file_test");
        let file_path = format!("{}/test_file.txt", test_folder);
        fs::write(&file_path, "test content").expect("Failed to create test file");

        let folder_path = FolderPath::new(file_path.clone());

        assert!(folder_path.is_err());
        match folder_path.unwrap_err() {
            FolderPathError::NotADirectory { path } => {
                assert_eq!(path, file_path);
            }
            _ => panic!("Expected NotADirectory error"),
        }

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_folder_name_extraction() {
        let path = FolderPath::new_unchecked("/home/user/my_project".to_string());
        assert_eq!(path.folder_name(), Some("my_project".to_string()));
    }

    #[test]
    fn test_path_display() {
        let path = FolderPath::new_unchecked("/test/path".to_string());
        let display_str = format!("{}", path);
        assert!(display_str.contains("test") && display_str.contains("path"));
    }

    #[test]
    fn test_path_equality() {
        let path1 = FolderPath::new_unchecked("/same/path".to_string());
        let path2 = FolderPath::new_unchecked("/same/path".to_string());
        let path3 = FolderPath::new_unchecked("/different/path".to_string());

        assert_eq!(path1, path2);
        assert_ne!(path1, path3);
    }

    #[test]
    fn test_path_serialization() {
        let path = FolderPath::new_unchecked("/test/serialization".to_string());
        let serialized = serde_json::to_string(&path).unwrap();
        let deserialized: FolderPath = serde_json::from_str(&serialized).unwrap();

        assert_eq!(path, deserialized);
    }

    #[test]
    fn test_relative_path_handling() {
        let test_folder = setup_test_folder("relative");

        // Test with relative path
        let current_dir = std::env::current_dir().unwrap();
        let relative_path = if test_folder.starts_with(&current_dir.to_string_lossy()) {
            test_folder.strip_prefix(&format!("{}/", current_dir.to_string_lossy()))
                .unwrap_or(&test_folder)
                .to_string()
        } else {
            test_folder.clone()
        };

        if relative_path != test_folder {
            let folder_path = FolderPath::new(relative_path);
            assert!(folder_path.is_ok());
        }

        cleanup_test_folder(&test_folder);
    }

    #[test]
    fn test_parent_directory() {
        let path = FolderPath::new_unchecked("/home/user/project".to_string());
        let parent = path.parent();
        assert!(parent.is_some());
        assert!(parent.unwrap().to_string_lossy().contains("user"));
    }

    #[test]
    fn test_accessibility_check() {
        let test_folder = setup_test_folder("accessible");
        let path = FolderPath::new(test_folder.clone()).unwrap();

        assert!(path.is_accessible());

        cleanup_test_folder(&test_folder);

        // After cleanup, it should not be accessible
        assert!(!path.is_accessible());
    }
}