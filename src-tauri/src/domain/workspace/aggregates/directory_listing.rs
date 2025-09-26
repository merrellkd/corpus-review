use crate::domain::workspace::entities::{FileEntry, FileEntryType};
use crate::domain::workspace::errors::WorkspaceError;
use crate::domain::workspace::value_objects::WorkspaceContext;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// DirectoryListing aggregate root that manages a collection of file entries
/// with navigation operations and business rules for workspace navigation
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DirectoryListing {
    /// The workspace context for this directory listing
    workspace_context: WorkspaceContext,
    /// The file and folder entries in this directory
    entries: Vec<FileEntry>,
    /// Whether this listing represents the workspace root
    is_root: bool,
    /// The parent directory path if navigation up is possible
    parent_path: Option<PathBuf>,
}

impl DirectoryListing {
    /// Create a new DirectoryListing
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context
    /// * `entries` - The file and folder entries
    ///
    /// # Errors
    /// Returns `WorkspaceError` if validation fails
    pub fn new(
        workspace_context: WorkspaceContext,
        entries: Vec<FileEntry>,
    ) -> Result<Self, WorkspaceError> {
        let is_root = workspace_context.is_at_root();
        let parent_path = if is_root {
            None
        } else {
            workspace_context.get_parent_path()
        };

        // Validate all entries are within workspace boundaries
        for entry in &entries {
            if !entry.is_within_workspace(workspace_context.source_folder())? {
                return Err(WorkspaceError::navigation_boundary_violation(
                    entry.path().display().to_string(),
                    workspace_context.source_folder().display().to_string(),
                ));
            }
        }

        let mut directory_listing = DirectoryListing {
            workspace_context,
            entries,
            is_root,
            parent_path,
        };

        // Sort entries for consistent display
        directory_listing.sort_entries();

        Ok(directory_listing)
    }

    /// Create an empty DirectoryListing (for empty folders)
    pub fn empty(workspace_context: WorkspaceContext) -> Self {
        let is_root = workspace_context.is_at_root();
        let parent_path = if is_root {
            None
        } else {
            workspace_context.get_parent_path()
        };

        DirectoryListing {
            workspace_context,
            entries: Vec::new(),
            is_root,
            parent_path,
        }
    }

    /// Get the workspace context
    pub fn workspace_context(&self) -> &WorkspaceContext {
        &self.workspace_context
    }

    /// Get all entries
    pub fn entries(&self) -> &[FileEntry] {
        &self.entries
    }

    /// Check if this is the workspace root
    pub fn is_root(&self) -> bool {
        self.is_root
    }

    /// Get the parent path if available
    pub fn parent_path(&self) -> Option<&Path> {
        self.parent_path.as_deref()
    }

    /// Check if navigation up is possible
    pub fn can_navigate_up(&self) -> bool {
        !self.is_root && self.parent_path.is_some()
    }

    /// Navigate to a folder within this listing
    ///
    /// # Arguments
    /// * `folder_name` - Name of the folder to navigate to
    ///
    /// # Returns
    /// The new workspace context for the target folder
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Folder not found
    /// - Folder name is invalid
    /// - Target is not a directory
    pub fn navigate_to_folder(
        &self,
        folder_name: &str,
    ) -> Result<WorkspaceContext, WorkspaceError> {
        // Find the folder entry
        let folder_entry = self
            .entries
            .iter()
            .find(|entry| entry.name() == folder_name)
            .ok_or_else(|| {
                WorkspaceError::directory_listing_failed(
                    self.workspace_context.current_path().display().to_string(),
                    format!("Folder '{}' not found", folder_name),
                )
            })?;

        // Verify it's a directory
        if !folder_entry.is_directory() {
            return Err(WorkspaceError::invalid_path(
                folder_name.to_string(),
                "Target is not a directory",
            ));
        }

        // Navigate using workspace context
        self.workspace_context.navigate_to_folder(folder_name)
    }

    /// Navigate to parent directory
    ///
    /// # Returns
    /// The new workspace context for the parent directory
    ///
    /// # Errors
    /// Returns `WorkspaceError` if already at workspace root
    pub fn navigate_to_parent(&self) -> Result<WorkspaceContext, WorkspaceError> {
        self.workspace_context.navigate_to_parent()
    }

    /// Get only the directory entries
    pub fn directories(&self) -> Vec<&FileEntry> {
        self.entries
            .iter()
            .filter(|entry| entry.is_directory())
            .collect()
    }

    /// Get only the file entries
    pub fn files(&self) -> Vec<&FileEntry> {
        self.entries
            .iter()
            .filter(|entry| entry.is_file())
            .collect()
    }

    /// Get the total number of entries
    pub fn entry_count(&self) -> usize {
        self.entries.len()
    }

    /// Get the number of directories
    pub fn directory_count(&self) -> usize {
        self.entries.iter().filter(|e| e.is_directory()).count()
    }

    /// Get the number of files
    pub fn file_count(&self) -> usize {
        self.entries.iter().filter(|e| e.is_file()).count()
    }

    /// Check if the directory is empty
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }

    /// Find an entry by name (case-sensitive)
    pub fn find_entry(&self, name: &str) -> Option<&FileEntry> {
        self.entries.iter().find(|entry| entry.name() == name)
    }

    /// Find an entry by name (case-insensitive)
    pub fn find_entry_case_insensitive(&self, name: &str) -> Option<&FileEntry> {
        let name_lower = name.to_lowercase();
        self.entries
            .iter()
            .find(|entry| entry.name().to_lowercase() == name_lower)
    }

    /// Get entries filtered by type
    pub fn entries_by_type(&self, entry_type: FileEntryType) -> Vec<&FileEntry> {
        self.entries
            .iter()
            .filter(|entry| entry.entry_type() == entry_type)
            .collect()
    }

    /// Calculate total size of all files in this directory (excluding subdirectories)
    pub fn total_file_size(&self) -> u64 {
        self.entries
            .iter()
            .filter(|entry| entry.is_file())
            .filter_map(|entry| entry.size())
            .sum()
    }

    /// Get relative path from workspace root
    pub fn relative_path(&self) -> Result<PathBuf, WorkspaceError> {
        self.workspace_context.relative_path()
    }

    /// Create a new DirectoryListing with updated workspace context
    pub fn with_workspace_context(
        &self,
        new_context: WorkspaceContext,
    ) -> Result<Self, WorkspaceError> {
        DirectoryListing::new(new_context, self.entries.clone())
    }

    /// Add entries to this directory listing (for dynamic updates)
    pub fn with_additional_entries(
        &self,
        additional_entries: Vec<FileEntry>,
    ) -> Result<Self, WorkspaceError> {
        let mut all_entries = self.entries.clone();
        all_entries.extend(additional_entries);

        DirectoryListing::new(self.workspace_context.clone(), all_entries)
    }

    /// Remove entries by name (for dynamic updates)
    pub fn without_entries(&self, entry_names: &[&str]) -> Result<Self, WorkspaceError> {
        let filtered_entries = self
            .entries
            .iter()
            .filter(|entry| !entry_names.contains(&entry.name()))
            .cloned()
            .collect();

        DirectoryListing::new(self.workspace_context.clone(), filtered_entries)
    }

    /// Sort entries using the standard workspace navigation order
    /// (directories first, then files, both alphabetically case-insensitive)
    fn sort_entries(&mut self) {
        self.entries.sort_by(|a, b| a.compare_for_listing(b));
    }

    /// Validate that all entries belong to the current directory
    fn validate_entries_belong_to_directory(&self) -> Result<(), WorkspaceError> {
        let current_path = self.workspace_context.current_path();

        for entry in &self.entries {
            let entry_parent = entry.parent().ok_or_else(|| {
                WorkspaceError::invalid_workspace_context(format!(
                    "Entry '{}' has no parent directory",
                    entry.name()
                ))
            })?;

            if entry_parent != current_path {
                return Err(WorkspaceError::invalid_workspace_context(format!(
                    "Entry '{}' does not belong to current directory '{}' (parent: '{}')",
                    entry.name(),
                    current_path.display(),
                    entry_parent.display()
                )));
            }
        }

        Ok(())
    }

    /// Get navigation breadcrumb trail from workspace root to current location
    pub fn breadcrumb_trail(&self) -> Vec<String> {
        let relative_path = match self.relative_path() {
            Ok(path) => path,
            Err(_) => return vec![], // Return empty if we can't determine relative path
        };

        if relative_path.as_os_str().is_empty() {
            // At root
            vec![]
        } else {
            relative_path
                .components()
                .filter_map(|component| component.as_os_str().to_str().map(|s| s.to_string()))
                .collect()
        }
    }

    /// Check if the directory listing is valid (all invariants satisfied)
    pub fn validate(&self) -> Result<(), WorkspaceError> {
        // Validate workspace context consistency
        if self.is_root != self.workspace_context.is_at_root() {
            return Err(WorkspaceError::invalid_workspace_context(
                "Root status inconsistent with workspace context",
            ));
        }

        // Validate parent path consistency
        let expected_parent = if self.is_root {
            None
        } else {
            self.workspace_context.get_parent_path()
        };
        if self.parent_path != expected_parent {
            return Err(WorkspaceError::invalid_workspace_context(
                "Parent path inconsistent with workspace context",
            ));
        }

        // Validate entries belong to this directory
        self.validate_entries_belong_to_directory()?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::project::value_objects::ProjectId;
    use std::time::SystemTime;
    use tempfile::TempDir;

    fn create_test_workspace_context(temp_dir: &TempDir) -> WorkspaceContext {
        WorkspaceContext::new(ProjectId::new(), "Test Project", temp_dir.path(), None::<&str>).unwrap()
    }

    fn create_test_file_entry(name: &str, temp_dir: &TempDir, is_directory: bool) -> FileEntry {
        let path = temp_dir.path().join(name);
        let now = SystemTime::now();

        if is_directory {
            FileEntry::directory(name, &path, now).unwrap()
        } else {
            FileEntry::file(name, &path, Some(1024), now).unwrap()
        }
    }

    #[test]
    fn test_directory_listing_creation() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("documents", &temp_dir, true),
            create_test_file_entry("file.txt", &temp_dir, false),
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();

        assert_eq!(listing.entry_count(), 2);
        assert_eq!(listing.directory_count(), 1);
        assert_eq!(listing.file_count(), 1);
        assert!(listing.is_root());
        assert!(!listing.can_navigate_up());
    }

    #[test]
    fn test_empty_directory_listing() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let listing = DirectoryListing::empty(context);

        assert_eq!(listing.entry_count(), 0);
        assert!(listing.is_empty());
        assert!(listing.is_root());
    }

    #[test]
    fn test_navigate_to_folder() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("documents", &temp_dir, true),
            create_test_file_entry("data", &temp_dir, true),
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();

        let new_context = listing.navigate_to_folder("documents").unwrap();
        assert!(new_context.current_path().ends_with("documents"));
        assert!(!new_context.is_at_root());
    }

    #[test]
    fn test_navigate_to_nonexistent_folder() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![create_test_file_entry("documents", &temp_dir, true)];

        let listing = DirectoryListing::new(context, entries).unwrap();

        let result = listing.navigate_to_folder("nonexistent");
        assert!(result.is_err());

        match result.unwrap_err() {
            WorkspaceError::DirectoryListingFailed { .. } => {}
            _ => panic!("Expected DirectoryListingFailed error"),
        }
    }

    #[test]
    fn test_navigate_to_file_as_folder() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![create_test_file_entry("document.pdf", &temp_dir, false)];

        let listing = DirectoryListing::new(context, entries).unwrap();

        let result = listing.navigate_to_folder("document.pdf");
        assert!(result.is_err());

        match result.unwrap_err() {
            WorkspaceError::InvalidPath { reason, .. } => {
                assert!(reason.contains("not a directory"));
            }
            _ => panic!("Expected InvalidPath error"),
        }
    }

    #[test]
    fn test_entries_sorting() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("zebra.txt", &temp_dir, false),
            create_test_file_entry("apple", &temp_dir, true), // Directory
            create_test_file_entry("banana.txt", &temp_dir, false),
            create_test_file_entry("zebra", &temp_dir, true), // Directory
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();

        // Should be sorted: directories first (apple, zebra), then files (banana.txt, zebra.txt)
        let entry_names: Vec<&str> = listing.entries().iter().map(|e| e.name()).collect();
        assert_eq!(
            entry_names,
            vec!["apple", "zebra", "banana.txt", "zebra.txt"]
        );
    }

    #[test]
    fn test_find_entries() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("Documents", &temp_dir, true),
            create_test_file_entry("readme.txt", &temp_dir, false),
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();

        // Case-sensitive search
        assert!(listing.find_entry("Documents").is_some());
        assert!(listing.find_entry("documents").is_none());

        // Case-insensitive search
        assert!(listing.find_entry_case_insensitive("documents").is_some());
        assert!(listing.find_entry_case_insensitive("DOCUMENTS").is_some());
    }

    #[test]
    fn test_total_file_size() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("documents", &temp_dir, true), // No size
            FileEntry::file(
                "file1.txt",
                temp_dir.path().join("file1.txt"),
                Some(1000),
                SystemTime::now(),
            )
            .unwrap(),
            FileEntry::file(
                "file2.txt",
                temp_dir.path().join("file2.txt"),
                Some(2000),
                SystemTime::now(),
            )
            .unwrap(),
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();

        assert_eq!(listing.total_file_size(), 3000);
    }

    #[test]
    fn test_breadcrumb_trail() {
        let temp_dir = TempDir::new().unwrap();

        // Test at root
        let root_context = create_test_workspace_context(&temp_dir);
        let root_listing = DirectoryListing::empty(root_context);
        assert_eq!(root_listing.breadcrumb_trail(), Vec::<String>::new());

        // Test in subdirectory
        let sub_path = temp_dir.path().join("documents").join("archived");
        let sub_context = WorkspaceContext::new(
            ProjectId::new(),
            "Test Project",
            temp_dir.path(),
            Some(&sub_path),
        )
        .unwrap();

        let sub_listing = DirectoryListing::empty(sub_context);
        assert_eq!(
            sub_listing.breadcrumb_trail(),
            vec!["documents", "archived"]
        );
    }

    #[test]
    fn test_with_additional_entries() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let initial_entries = vec![create_test_file_entry("file1.txt", &temp_dir, false)];

        let listing = DirectoryListing::new(context, initial_entries).unwrap();
        assert_eq!(listing.entry_count(), 1);

        let additional_entries = vec![
            create_test_file_entry("file2.txt", &temp_dir, false),
            create_test_file_entry("documents", &temp_dir, true),
        ];

        let updated_listing = listing.with_additional_entries(additional_entries).unwrap();
        assert_eq!(updated_listing.entry_count(), 3);
    }

    #[test]
    fn test_without_entries() {
        let temp_dir = TempDir::new().unwrap();
        let context = create_test_workspace_context(&temp_dir);

        let entries = vec![
            create_test_file_entry("file1.txt", &temp_dir, false),
            create_test_file_entry("file2.txt", &temp_dir, false),
            create_test_file_entry("documents", &temp_dir, true),
        ];

        let listing = DirectoryListing::new(context, entries).unwrap();
        assert_eq!(listing.entry_count(), 3);

        let filtered_listing = listing
            .without_entries(&["file1.txt", "documents"])
            .unwrap();
        assert_eq!(filtered_listing.entry_count(), 1);
        assert_eq!(filtered_listing.entries()[0].name(), "file2.txt");
    }
}
