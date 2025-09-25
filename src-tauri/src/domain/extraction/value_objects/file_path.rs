use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use std::path::{Path, PathBuf};

/// FilePath value object - Type-safe file system path representation
/// Validates that path is absolute, exists, and is readable
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct FilePath(PathBuf);

impl FilePath {
    /// Creates a new FilePath from PathBuf with validation
    pub fn new(path: PathBuf) -> Result<Self, FilePathError> {
        Self::validate(&path)?;
        Ok(Self(path))
    }

    /// Creates a new FilePath from string with validation
    pub fn from_str(path: &str) -> Result<Self, FilePathError> {
        let path_buf = PathBuf::from(path);
        Self::new(path_buf)
    }

    /// Creates FilePath without validation (for testing/internal use)
    pub fn new_unchecked(path: PathBuf) -> Self {
        Self(path)
    }

    /// Returns the underlying PathBuf
    pub fn as_path(&self) -> &Path {
        &self.0
    }

    /// Returns the path as a string
    pub fn as_str(&self) -> &str {
        self.0.to_str().unwrap_or("")
    }

    /// Returns the file name component
    pub fn file_name(&self) -> Option<&str> {
        self.0.file_name()?.to_str()
    }

    /// Returns the file extension
    pub fn extension(&self) -> Option<&str> {
        self.0.extension()?.to_str()
    }

    /// Returns the parent directory
    pub fn parent(&self) -> Option<&Path> {
        self.0.parent()
    }

    /// Checks if the file exists
    pub fn exists(&self) -> bool {
        self.0.exists()
    }

    /// Checks if the path points to a file (not directory)
    pub fn is_file(&self) -> bool {
        self.0.is_file()
    }

    /// Creates a .det file path by appending .det extension
    pub fn with_det_extension(&self) -> Self {
        let mut det_path = self.0.clone();
        let current_extension = det_path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("");

        if current_extension.is_empty() {
            det_path.set_extension("det");
        } else {
            det_path.set_extension(format!("{}.det", current_extension));
        }

        Self::new_unchecked(det_path)
    }

    fn validate(path: &Path) -> Result<(), FilePathError> {
        // Must be absolute path
        if !path.is_absolute() {
            return Err(FilePathError::NotAbsolute);
        }

        // File must exist
        if !path.exists() {
            return Err(FilePathError::NotFound);
        }

        // Must be a file (not directory)
        if !path.is_file() {
            return Err(FilePathError::NotFile);
        }

        // Must be readable (basic check)
        if let Err(_) = std::fs::File::open(path) {
            return Err(FilePathError::NotReadable);
        }

        Ok(())
    }

    /// Validates path is within workspace boundaries
    pub fn is_within_workspace(&self, workspace_root: &Path) -> bool {
        self.0.starts_with(workspace_root)
    }
}

impl Display for FilePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.display())
    }
}

impl From<FilePath> for PathBuf {
    fn from(file_path: FilePath) -> Self {
        file_path.0
    }
}

impl From<FilePath> for String {
    fn from(file_path: FilePath) -> Self {
        file_path.0.to_string_lossy().to_string()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum FilePathError {
    #[error("Path must be absolute")]
    NotAbsolute,
    #[error("File not found")]
    NotFound,
    #[error("Path must point to a file, not a directory")]
    NotFile,
    #[error("File is not readable")]
    NotReadable,
    #[error("Path is outside workspace boundaries")]
    OutsideWorkspace,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::NamedTempFile;

    #[test]
    fn test_new_with_valid_file() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path().to_path_buf();
        let file_path = FilePath::new(path).unwrap();
        assert!(file_path.exists());
        assert!(file_path.is_file());
    }

    #[test]
    fn test_new_with_relative_path() {
        let path = PathBuf::from("./test.txt");
        let result = FilePath::new(path);
        assert!(matches!(result, Err(FilePathError::NotAbsolute)));
    }

    #[test]
    fn test_new_with_nonexistent_file() {
        let path = PathBuf::from("/nonexistent/file.txt");
        let result = FilePath::new(path);
        assert!(matches!(result, Err(FilePathError::NotFound)));
    }

    #[test]
    fn test_with_det_extension() {
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document.pdf"));
        let det_path = file_path.with_det_extension();
        assert_eq!(det_path.as_str(), "/test/document.pdf.det");
    }

    #[test]
    fn test_with_det_extension_no_extension() {
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document"));
        let det_path = file_path.with_det_extension();
        assert_eq!(det_path.as_str(), "/test/document.det");
    }

    #[test]
    fn test_file_name() {
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document.pdf"));
        assert_eq!(file_path.file_name(), Some("document.pdf"));
    }

    #[test]
    fn test_extension() {
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document.pdf"));
        assert_eq!(file_path.extension(), Some("pdf"));
    }

    #[test]
    fn test_is_within_workspace() {
        let workspace = PathBuf::from("/workspace");
        let file_path = FilePath::new_unchecked(PathBuf::from("/workspace/docs/file.pdf"));
        assert!(file_path.is_within_workspace(&workspace));

        let outside_path = FilePath::new_unchecked(PathBuf::from("/other/file.pdf"));
        assert!(!outside_path.is_within_workspace(&workspace));
    }
}