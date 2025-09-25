use serde::{Deserialize, Serialize};
use crate::application::dtos::FileEntryDto;

/// DTO for transferring directory listing data
///
/// Represents the contents of a directory within a workspace,
/// including navigation context and metadata.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DirectoryListingDto {
    /// The file and folder entries in this directory
    pub entries: Vec<FileEntryDto>,

    /// Whether this listing represents the workspace root
    pub is_root: bool,

    /// The parent directory path if navigation up is possible
    pub parent_path: Option<String>,

    /// Whether navigation up is possible
    pub can_navigate_up: bool,
}

impl DirectoryListingDto {
    /// Create a new DirectoryListingDto
    pub fn new(
        entries: Vec<FileEntryDto>,
        is_root: bool,
        parent_path: Option<String>,
        can_navigate_up: bool,
    ) -> Self {
        DirectoryListingDto {
            entries,
            is_root,
            parent_path,
            can_navigate_up,
        }
    }

    /// Create an empty directory listing
    pub fn empty(is_root: bool, parent_path: Option<String>) -> Self {
        DirectoryListingDto {
            entries: Vec::new(),
            is_root,
            parent_path: parent_path.clone(),
            can_navigate_up: !is_root && parent_path.is_some(),
        }
    }

    /// Get the number of entries
    pub fn entry_count(&self) -> usize {
        self.entries.len()
    }

    /// Get the number of directories
    pub fn directory_count(&self) -> usize {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type == "directory")
            .count()
    }

    /// Get the number of files
    pub fn file_count(&self) -> usize {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type == "file")
            .count()
    }

    /// Check if the directory is empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Get only directory entries
    pub fn directories(&self) -> Vec<&FileEntryDto> {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type == "directory")
            .collect()
    }

    /// Get only file entries
    pub fn files(&self) -> Vec<&FileEntryDto> {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type == "file")
            .collect()
    }

    /// Find an entry by name
    pub fn find_entry(&self, name: &str) -> Option<&FileEntryDto> {
        self.entries.iter().find(|entry| entry.name == name)
    }

    /// Calculate total size of all files (excluding directories)
    pub fn total_file_size(&self) -> u64 {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type == "file")
            .filter_map(|entry| entry.size)
            .sum()
    }

    /// Sort entries by name (directories first, then files)
    pub fn sort_entries(&mut self) {
        self.entries.sort_by(|a, b| {
            // Directories first
            match (a.entry_type.as_str(), b.entry_type.as_str()) {
                ("directory", "file") => std::cmp::Ordering::Less,
                ("file", "directory") => std::cmp::Ordering::Greater,
                _ => {
                    // Same type, sort by name (case-insensitive)
                    a.name.to_lowercase().cmp(&b.name.to_lowercase())
                }
            }
        });
    }

    /// Create a sorted copy of this directory listing
    pub fn sorted(mut self) -> Self {
        self.sort_entries();
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_file_entry(name: &str, is_directory: bool) -> FileEntryDto {
        FileEntryDto {
            name: name.to_string(),
            path: format!("/test/{}", name),
            entry_type: if is_directory { "directory".to_string() } else { "file".to_string() },
            size: if is_directory { None } else { Some(1024) },
            modified: "2025-09-25T12:00:00Z".to_string(),
        }
    }

    #[test]
    fn test_directory_listing_dto_creation() {
        let entries = vec![
            create_test_file_entry("documents", true),
            create_test_file_entry("file.txt", false),
        ];

        let listing = DirectoryListingDto::new(
            entries,
            true,
            None,
            false,
        );

        assert_eq!(listing.entry_count(), 2);
        assert_eq!(listing.directory_count(), 1);
        assert_eq!(listing.file_count(), 1);
        assert!(listing.is_root);
        assert!(!listing.can_navigate_up);
        assert!(listing.parent_path.is_none());
    }

    #[test]
    fn test_empty_directory_listing() {
        let listing = DirectoryListingDto::empty(true, None);

        assert_eq!(listing.entry_count(), 0);
        assert!(listing.is_empty());
        assert!(listing.is_root);
        assert!(!listing.can_navigate_up);
    }

    #[test]
    fn test_directory_listing_filters() {
        let entries = vec![
            create_test_file_entry("docs", true),
            create_test_file_entry("data", true),
            create_test_file_entry("file1.txt", false),
            create_test_file_entry("file2.pdf", false),
        ];

        let listing = DirectoryListingDto::new(entries, false, Some("/parent".to_string()), true);

        assert_eq!(listing.directories().len(), 2);
        assert_eq!(listing.files().len(), 2);
        assert_eq!(listing.total_file_size(), 2048); // 2 files * 1024 bytes each
    }

    #[test]
    fn test_find_entry() {
        let entries = vec![
            create_test_file_entry("documents", true),
            create_test_file_entry("readme.txt", false),
        ];

        let listing = DirectoryListingDto::new(entries, true, None, false);

        assert!(listing.find_entry("documents").is_some());
        assert!(listing.find_entry("readme.txt").is_some());
        assert!(listing.find_entry("nonexistent").is_none());
    }

    #[test]
    fn test_sorting() {
        let mut entries = vec![
            create_test_file_entry("zebra.txt", false),
            create_test_file_entry("apple", true),
            create_test_file_entry("banana.txt", false),
            create_test_file_entry("cherry", true),
        ];

        let mut listing = DirectoryListingDto::new(entries, true, None, false);
        listing.sort_entries();

        // Should be: apple (dir), cherry (dir), banana.txt (file), zebra.txt (file)
        let names: Vec<&str> = listing.entries.iter().map(|e| e.name.as_str()).collect();
        assert_eq!(names, vec!["apple", "cherry", "banana.txt", "zebra.txt"]);
    }

    #[test]
    fn test_serialization() {
        let entries = vec![create_test_file_entry("test.txt", false)];
        let listing = DirectoryListingDto::new(entries, true, None, false);

        let serialized = serde_json::to_string(&listing).unwrap();
        let deserialized: DirectoryListingDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(listing, deserialized);
    }
}