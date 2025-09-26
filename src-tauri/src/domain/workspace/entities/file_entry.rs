use crate::domain::workspace::errors::WorkspaceError;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

/// FileEntry represents a file or folder within the workspace with metadata
///
/// This entity encapsulates all information about a file system item
/// that's relevant for workspace navigation and display.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FileEntry {
    /// The name of the file or folder (without path)
    name: String,
    /// The full absolute path to the file or folder
    path: PathBuf,
    /// The type of entry (file or directory)
    entry_type: FileEntryType,
    /// The size in bytes (None for directories)
    size: Option<u64>,
    /// The last modification time
    modified: SystemTime,
}

/// Enum representing the type of file system entry
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileEntryType {
    /// Regular file
    File,
    /// Directory/folder
    Directory,
}

impl FileEntry {
    /// Create a new FileEntry
    ///
    /// # Arguments
    /// * `name` - The name of the file or folder
    /// * `path` - The full path to the file or folder
    /// * `entry_type` - Whether this is a file or directory
    /// * `size` - Size in bytes (should be None for directories)
    /// * `modified` - Last modification time
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Name is empty
    /// - Path is invalid
    /// - Size is provided for directories
    pub fn new(
        name: impl Into<String>,
        path: impl AsRef<Path>,
        entry_type: FileEntryType,
        size: Option<u64>,
        modified: SystemTime,
    ) -> Result<Self, WorkspaceError> {
        let name = name.into();
        let path = path.as_ref().to_path_buf();

        // Validate name
        if name.trim().is_empty() {
            return Err(WorkspaceError::invalid_workspace_context(
                "File entry name cannot be empty",
            ));
        }

        // Validate path
        if !path.is_absolute() {
            return Err(WorkspaceError::invalid_path(
                path.display().to_string(),
                "Path must be absolute",
            ));
        }

        // Validate size consistency
        match (entry_type, size) {
            (FileEntryType::Directory, Some(_)) => {
                return Err(WorkspaceError::invalid_workspace_context(
                    "Directories cannot have a size",
                ));
            }
            _ => {} // Files can have size or None (if unknown)
        }

        Ok(FileEntry {
            name,
            path,
            entry_type,
            size,
            modified,
        })
    }

    /// Create a file entry
    pub fn file(
        name: impl Into<String>,
        path: impl AsRef<Path>,
        size: Option<u64>,
        modified: SystemTime,
    ) -> Result<Self, WorkspaceError> {
        Self::new(name, path, FileEntryType::File, size, modified)
    }

    /// Create a directory entry
    pub fn directory(
        name: impl Into<String>,
        path: impl AsRef<Path>,
        modified: SystemTime,
    ) -> Result<Self, WorkspaceError> {
        Self::new(name, path, FileEntryType::Directory, None, modified)
    }

    /// Get the name of the file or folder
    pub fn name(&self) -> &str {
        &self.name
    }

    /// Get the full path
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Get the entry type
    pub fn entry_type(&self) -> FileEntryType {
        self.entry_type
    }

    /// Get the size in bytes (None for directories or unknown)
    pub fn size(&self) -> Option<u64> {
        self.size
    }

    /// Get the last modification time
    pub fn modified(&self) -> SystemTime {
        self.modified
    }

    /// Check if this is a file
    pub fn is_file(&self) -> bool {
        matches!(self.entry_type, FileEntryType::File)
    }

    /// Check if this is a directory
    pub fn is_directory(&self) -> bool {
        matches!(self.entry_type, FileEntryType::Directory)
    }

    /// Get the parent directory path
    pub fn parent(&self) -> Option<PathBuf> {
        self.path.parent().map(|p| p.to_path_buf())
    }

    /// Get the file extension (for files only)
    pub fn extension(&self) -> Option<&str> {
        if self.is_file() {
            self.path.extension().and_then(|ext| ext.to_str())
        } else {
            None
        }
    }

    /// Check if the entry is within the given workspace boundary
    pub fn is_within_workspace(&self, workspace_root: &Path) -> Result<bool, WorkspaceError> {
        let canonical_path = self.path.canonicalize().map_err(|e| {
            WorkspaceError::metadata_retrieval_failed(
                self.path.display().to_string(),
                format!("Failed to canonicalize path: {}", e),
            )
        })?;

        let canonical_workspace = workspace_root.canonicalize().map_err(|e| {
            WorkspaceError::source_folder_not_found(format!("Workspace root invalid: {}", e))
        })?;

        Ok(canonical_path.starts_with(canonical_workspace))
    }

    /// Get a display-friendly size string
    pub fn size_display(&self) -> String {
        match self.size {
            Some(bytes) => format_file_size(bytes),
            None => {
                if self.is_directory() {
                    "-".to_string()
                } else {
                    "Unknown".to_string()
                }
            }
        }
    }

    /// Sort comparison for file entries (directories first, then alphabetical)
    pub fn compare_for_listing(&self, other: &FileEntry) -> std::cmp::Ordering {
        use std::cmp::Ordering;

        // Directories come first
        match (self.is_directory(), other.is_directory()) {
            (true, false) => Ordering::Less,
            (false, true) => Ordering::Greater,
            _ => {
                // Same type, sort alphabetically (case-insensitive)
                self.name.to_lowercase().cmp(&other.name.to_lowercase())
            }
        }
    }
}

impl FileEntryType {
    /// Get string representation for serialization
    pub fn as_str(&self) -> &'static str {
        match self {
            FileEntryType::File => "file",
            FileEntryType::Directory => "directory",
        }
    }

    /// Create from string representation
    pub fn from_str(s: &str) -> Result<Self, WorkspaceError> {
        match s.to_lowercase().as_str() {
            "file" => Ok(FileEntryType::File),
            "directory" => Ok(FileEntryType::Directory),
            _ => Err(WorkspaceError::invalid_workspace_context(format!(
                "Invalid file entry type: {}",
                s
            ))),
        }
    }
}

/// Format file size in human-readable format
fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: u64 = 1024;

    if bytes == 0 {
        return "0 B".to_string();
    }

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= THRESHOLD as f64 && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD as f64;
        unit_index += 1;
    }

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::UNIX_EPOCH;
    use tempfile::TempDir;

    #[test]
    fn test_file_entry_creation() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let modified = SystemTime::now();

        let file_entry = FileEntry::file("test.txt", &file_path, Some(1024), modified).unwrap();

        assert_eq!(file_entry.name(), "test.txt");
        assert_eq!(file_entry.path(), file_path.as_path());
        assert!(file_entry.is_file());
        assert!(!file_entry.is_directory());
        assert_eq!(file_entry.size(), Some(1024));
        assert_eq!(file_entry.modified(), modified);
    }

    #[test]
    fn test_directory_entry_creation() {
        let temp_dir = TempDir::new().unwrap();
        let dir_path = temp_dir.path().join("subdir");
        let modified = SystemTime::now();

        let dir_entry = FileEntry::directory("subdir", &dir_path, modified).unwrap();

        assert_eq!(dir_entry.name(), "subdir");
        assert_eq!(dir_entry.path(), dir_path.as_path());
        assert!(!dir_entry.is_file());
        assert!(dir_entry.is_directory());
        assert_eq!(dir_entry.size(), None);
        assert_eq!(dir_entry.modified(), modified);
    }

    #[test]
    fn test_empty_name_validation() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.txt");

        let result = FileEntry::file("", &file_path, Some(1024), SystemTime::now());

        assert!(result.is_err());
        match result.unwrap_err() {
            WorkspaceError::InvalidWorkspaceContext { reason } => {
                assert!(reason.contains("name cannot be empty"));
            }
            _ => panic!("Expected InvalidWorkspaceContext error"),
        }
    }

    #[test]
    fn test_directory_with_size_validation() {
        let temp_dir = TempDir::new().unwrap();
        let dir_path = temp_dir.path().join("subdir");

        let result = FileEntry::new(
            "subdir",
            &dir_path,
            FileEntryType::Directory,
            Some(1024), // Invalid - directories can't have size
            SystemTime::now(),
        );

        assert!(result.is_err());
    }

    #[test]
    fn test_file_extension() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("document.pdf");

        let file_entry =
            FileEntry::file("document.pdf", &file_path, Some(2048), SystemTime::now()).unwrap();

        assert_eq!(file_entry.extension(), Some("pdf"));

        // Test directory - should return None
        let dir_entry = FileEntry::directory("folder", temp_dir.path(), SystemTime::now()).unwrap();

        assert_eq!(dir_entry.extension(), None);
    }

    #[test]
    fn test_parent_path() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("subfolder").join("file.txt");

        let file_entry =
            FileEntry::file("file.txt", &file_path, Some(512), SystemTime::now()).unwrap();

        let parent = file_entry.parent().unwrap();
        assert_eq!(parent, temp_dir.path().join("subfolder"));
    }

    #[test]
    fn test_size_display() {
        let temp_dir = TempDir::new().unwrap();

        // Test file with size
        let file_entry = FileEntry::file(
            "large.bin",
            temp_dir.path().join("large.bin"),
            Some(1536), // 1.5 KB
            SystemTime::now(),
        )
        .unwrap();
        assert_eq!(file_entry.size_display(), "1.5 KB");

        // Test directory (no size)
        let dir_entry =
            FileEntry::directory("folder", temp_dir.path().join("folder"), SystemTime::now())
                .unwrap();
        assert_eq!(dir_entry.size_display(), "-");

        // Test file without size
        let unknown_file = FileEntry::file(
            "unknown.dat",
            temp_dir.path().join("unknown.dat"),
            None,
            SystemTime::now(),
        )
        .unwrap();
        assert_eq!(unknown_file.size_display(), "Unknown");
    }

    #[test]
    fn test_listing_sort_order() {
        let temp_dir = TempDir::new().unwrap();
        let now = SystemTime::now();

        let file1 = FileEntry::file(
            "zebra.txt",
            temp_dir.path().join("zebra.txt"),
            Some(100),
            now,
        )
        .unwrap();
        let file2 = FileEntry::file(
            "apple.txt",
            temp_dir.path().join("apple.txt"),
            Some(200),
            now,
        )
        .unwrap();
        let dir1 =
            FileEntry::directory("zebra_dir", temp_dir.path().join("zebra_dir"), now).unwrap();
        let dir2 =
            FileEntry::directory("apple_dir", temp_dir.path().join("apple_dir"), now).unwrap();

        // Directories should come before files
        assert_eq!(dir1.compare_for_listing(&file1), std::cmp::Ordering::Less);
        assert_eq!(
            file1.compare_for_listing(&dir1),
            std::cmp::Ordering::Greater
        );

        // Within same type, alphabetical order
        assert_eq!(dir2.compare_for_listing(&dir1), std::cmp::Ordering::Less); // apple < zebra
        assert_eq!(file2.compare_for_listing(&file1), std::cmp::Ordering::Less);
        // apple < zebra
    }

    #[test]
    fn test_file_entry_type_string_conversion() {
        assert_eq!(FileEntryType::File.as_str(), "file");
        assert_eq!(FileEntryType::Directory.as_str(), "directory");

        assert_eq!(
            FileEntryType::from_str("file").unwrap(),
            FileEntryType::File
        );
        assert_eq!(
            FileEntryType::from_str("directory").unwrap(),
            FileEntryType::Directory
        );
        assert_eq!(
            FileEntryType::from_str("FILE").unwrap(),
            FileEntryType::File
        ); // Case insensitive

        assert!(FileEntryType::from_str("invalid").is_err());
    }

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
        assert_eq!(format_file_size(1073741824), "1.0 GB");
    }

    #[test]
    fn test_workspace_boundary_check() {
        let workspace = TempDir::new().unwrap();
        let outside = TempDir::new().unwrap();

        // Create file inside workspace
        let inside_file = workspace.path().join("inside.txt");
        std::fs::write(&inside_file, "test").unwrap();

        let inside_entry =
            FileEntry::file("inside.txt", &inside_file, Some(4), SystemTime::now()).unwrap();

        // Create file outside workspace
        let outside_file = outside.path().join("outside.txt");
        std::fs::write(&outside_file, "test").unwrap();

        let outside_entry =
            FileEntry::file("outside.txt", &outside_file, Some(4), SystemTime::now()).unwrap();

        // Test boundary checks
        assert!(inside_entry.is_within_workspace(workspace.path()).unwrap());
        assert!(!outside_entry.is_within_workspace(workspace.path()).unwrap());
    }
}
