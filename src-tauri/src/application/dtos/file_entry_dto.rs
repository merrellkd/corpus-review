use serde::{Deserialize, Serialize};

/// DTO for transferring file entry data
///
/// Represents a file or directory with its metadata for
/// communication between backend and frontend layers.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct FileEntryDto {
    /// The name of the file or directory
    pub name: String,

    /// The full path to the file or directory
    pub path: String,

    /// The type of entry ("file" or "directory")
    pub entry_type: String,

    /// Size in bytes (None for directories)
    pub size: Option<u64>,

    /// Last modification time as ISO string
    pub modified: String,
}

impl FileEntryDto {
    /// Create a new FileEntryDto
    pub fn new(
        name: String,
        path: String,
        entry_type: String,
        size: Option<u64>,
        modified: String,
    ) -> Self {
        FileEntryDto {
            name,
            path,
            entry_type,
            size,
            modified,
        }
    }

    /// Create a file entry DTO
    pub fn file(name: String, path: String, size: Option<u64>, modified: String) -> Self {
        FileEntryDto::new(name, path, "file".to_string(), size, modified)
    }

    /// Create a directory entry DTO
    pub fn directory(name: String, path: String, modified: String) -> Self {
        FileEntryDto::new(name, path, "directory".to_string(), None, modified)
    }

    /// Check if this is a file
    pub fn is_file(&self) -> bool {
        self.entry_type == "file"
    }

    /// Check if this is a directory
    pub fn is_directory(&self) -> bool {
        self.entry_type == "directory"
    }

    /// Get display-friendly size string
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

    /// Get file extension (for files only)
    pub fn extension(&self) -> Option<String> {
        if !self.is_file() {
            return None;
        }

        let name_parts: Vec<&str> = self.name.split('.').collect();
        if name_parts.len() > 1 {
            Some(name_parts.last().unwrap().to_lowercase())
        } else {
            None
        }
    }

    /// Get parent directory path
    pub fn parent_path(&self) -> Option<String> {
        let path_parts: Vec<&str> = self.path.rsplitn(2, '/').collect();
        if path_parts.len() == 2 && !path_parts[1].is_empty() {
            Some(path_parts[1].to_string())
        } else if path_parts.len() == 2 && path_parts[1].is_empty() {
            Some("/".to_string())
        } else {
            None
        }
    }

    /// Validate the DTO data
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() {
            return Err("Name cannot be empty".to_string());
        }

        if self.path.trim().is_empty() {
            return Err("Path cannot be empty".to_string());
        }

        if !matches!(self.entry_type.as_str(), "file" | "directory") {
            return Err("Entry type must be 'file' or 'directory'".to_string());
        }

        if self.entry_type == "directory" && self.size.is_some() {
            return Err("Directories cannot have a size".to_string());
        }

        Ok(())
    }

    /// Sort comparison for file listings (directories first, then alphabetical)
    pub fn compare_for_listing(&self, other: &FileEntryDto) -> std::cmp::Ordering {
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

    #[test]
    fn test_file_entry_dto_creation() {
        let file_dto = FileEntryDto::file(
            "document.pdf".to_string(),
            "/users/test/document.pdf".to_string(),
            Some(1024),
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(file_dto.name, "document.pdf");
        assert_eq!(file_dto.path, "/users/test/document.pdf");
        assert!(file_dto.is_file());
        assert!(!file_dto.is_directory());
        assert_eq!(file_dto.size, Some(1024));
        assert_eq!(file_dto.extension(), Some("pdf".to_string()));
    }

    #[test]
    fn test_directory_entry_dto_creation() {
        let dir_dto = FileEntryDto::directory(
            "documents".to_string(),
            "/users/test/documents".to_string(),
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(dir_dto.name, "documents");
        assert_eq!(dir_dto.path, "/users/test/documents");
        assert!(!dir_dto.is_file());
        assert!(dir_dto.is_directory());
        assert_eq!(dir_dto.size, None);
        assert_eq!(dir_dto.extension(), None);
    }

    #[test]
    fn test_size_display() {
        let file_dto = FileEntryDto::file(
            "large.bin".to_string(),
            "/test/large.bin".to_string(),
            Some(1536), // 1.5 KB
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(file_dto.size_display(), "1.5 KB");

        let dir_dto = FileEntryDto::directory(
            "folder".to_string(),
            "/test/folder".to_string(),
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(dir_dto.size_display(), "-");

        let unknown_file = FileEntryDto::file(
            "unknown.dat".to_string(),
            "/test/unknown.dat".to_string(),
            None,
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(unknown_file.size_display(), "Unknown");
    }

    #[test]
    fn test_parent_path() {
        let file_dto = FileEntryDto::file(
            "test.txt".to_string(),
            "/users/documents/test.txt".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(file_dto.parent_path(), Some("/users/documents".to_string()));

        let root_file = FileEntryDto::file(
            "root.txt".to_string(),
            "/root.txt".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );

        assert_eq!(root_file.parent_path(), Some("/".to_string()));
    }

    #[test]
    fn test_validation() {
        // Valid file
        let valid_file = FileEntryDto::file(
            "test.txt".to_string(),
            "/test.txt".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );
        assert!(valid_file.validate().is_ok());

        // Valid directory
        let valid_dir = FileEntryDto::directory(
            "folder".to_string(),
            "/folder".to_string(),
            "2025-09-25T12:00:00Z".to_string(),
        );
        assert!(valid_dir.validate().is_ok());

        // Invalid: empty name
        let invalid_name = FileEntryDto::file(
            "".to_string(),
            "/test.txt".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );
        assert!(invalid_name.validate().is_err());

        // Invalid: directory with size
        let invalid_dir_size = FileEntryDto::new(
            "folder".to_string(),
            "/folder".to_string(),
            "directory".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );
        assert!(invalid_dir_size.validate().is_err());

        // Invalid: bad entry type
        let invalid_type = FileEntryDto::new(
            "test".to_string(),
            "/test".to_string(),
            "invalid".to_string(),
            None,
            "2025-09-25T12:00:00Z".to_string(),
        );
        assert!(invalid_type.validate().is_err());
    }

    #[test]
    fn test_listing_sort_order() {
        let file1 = FileEntryDto::file(
            "zebra.txt".to_string(),
            "/zebra.txt".to_string(),
            Some(100),
            "2025-09-25T12:00:00Z".to_string(),
        );
        let file2 = FileEntryDto::file(
            "apple.txt".to_string(),
            "/apple.txt".to_string(),
            Some(200),
            "2025-09-25T12:00:00Z".to_string(),
        );
        let dir1 = FileEntryDto::directory(
            "zebra_dir".to_string(),
            "/zebra_dir".to_string(),
            "2025-09-25T12:00:00Z".to_string(),
        );
        let dir2 = FileEntryDto::directory(
            "apple_dir".to_string(),
            "/apple_dir".to_string(),
            "2025-09-25T12:00:00Z".to_string(),
        );

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
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
        assert_eq!(format_file_size(1073741824), "1.0 GB");
    }

    #[test]
    fn test_serialization() {
        let file_dto = FileEntryDto::file(
            "test.txt".to_string(),
            "/test.txt".to_string(),
            Some(1024),
            "2025-09-25T12:00:00Z".to_string(),
        );

        let serialized = serde_json::to_string(&file_dto).unwrap();
        let deserialized: FileEntryDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(file_dto, deserialized);
    }
}
