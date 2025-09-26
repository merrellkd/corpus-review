use crate::domain::project::value_objects::ProjectId;
use crate::domain::workspace::aggregates::DirectoryListing;
use crate::domain::workspace::entities::FileEntry;
use crate::domain::workspace::errors::WorkspaceError;
use crate::domain::workspace::value_objects::WorkspaceContext;
use async_trait::async_trait;
use std::path::Path;

/// Repository interface for workspace navigation operations
///
/// This repository provides access to file system operations needed for
/// workspace navigation while maintaining security boundaries and business rules.
#[async_trait]
pub trait WorkspaceRepository: Send + Sync {
    /// Load workspace context for a given project
    ///
    /// # Arguments
    /// * `project_id` - The project identifier
    ///
    /// # Returns
    /// The workspace context for the project
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Project not found
    /// - Source folder inaccessible
    /// - Permission denied
    async fn load_workspace(
        &self,
        project_id: &ProjectId,
    ) -> Result<WorkspaceContext, WorkspaceError>;

    /// List directory contents within a workspace
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context containing project and path info
    ///
    /// # Returns
    /// A directory listing with all files and folders in the specified path
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Directory not found
    /// - Access denied
    /// - Path outside workspace boundaries
    /// - File system error
    async fn list_directory(
        &self,
        workspace_context: &WorkspaceContext,
    ) -> Result<DirectoryListing, WorkspaceError>;

    /// Validate that a path is accessible within workspace boundaries
    ///
    /// # Arguments
    /// * `path` - The path to validate
    /// * `workspace_root` - The workspace root directory
    ///
    /// # Returns
    /// `true` if the path is accessible and within boundaries, `false` otherwise
    ///
    /// # Errors
    /// Returns `WorkspaceError` if validation fails due to system errors
    async fn validate_path_access(
        &self,
        path: &Path,
        workspace_root: &Path,
    ) -> Result<bool, WorkspaceError>;

    /// Get metadata for a specific file or directory
    ///
    /// # Arguments
    /// * `path` - The path to get metadata for
    /// * `workspace_root` - The workspace root for boundary validation
    ///
    /// # Returns
    /// File entry with metadata if the path exists and is accessible
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Path not found
    /// - Access denied
    /// - Path outside workspace boundaries
    /// - Metadata retrieval fails
    async fn get_file_metadata(
        &self,
        path: &Path,
        workspace_root: &Path,
    ) -> Result<Option<FileEntry>, WorkspaceError>;

    /// Check if a directory exists and is accessible
    ///
    /// # Arguments
    /// * `path` - The directory path to check
    /// * `workspace_root` - The workspace root for boundary validation
    ///
    /// # Returns
    /// `true` if directory exists and is accessible, `false` otherwise
    async fn directory_exists(
        &self,
        path: &Path,
        workspace_root: &Path,
    ) -> Result<bool, WorkspaceError>;

    /// Check if a path points to a directory (not a file)
    ///
    /// # Arguments
    /// * `path` - The path to check
    /// * `workspace_root` - The workspace root for boundary validation
    ///
    /// # Returns
    /// `true` if path is a directory, `false` if it's a file or doesn't exist
    async fn is_directory(
        &self,
        path: &Path,
        workspace_root: &Path,
    ) -> Result<bool, WorkspaceError>;

    /// Get the size of a directory (sum of all files, excluding subdirectories)
    ///
    /// # Arguments
    /// * `path` - The directory path
    /// * `workspace_root` - The workspace root for boundary validation
    ///
    /// # Returns
    /// Total size in bytes of all files in the directory
    ///
    /// # Errors
    /// Returns `WorkspaceError` if:
    /// - Directory not found
    /// - Access denied
    /// - Path outside workspace boundaries
    async fn get_directory_size(
        &self,
        path: &Path,
        workspace_root: &Path,
    ) -> Result<u64, WorkspaceError>;

    /// Watch a directory for changes (optional capability for future use)
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context to watch
    ///
    /// # Returns
    /// Success if watching started, error otherwise
    ///
    /// # Note
    /// This is designed for future real-time file updates but not required for MVP
    async fn watch_workspace(
        &self,
        workspace_context: &WorkspaceContext,
    ) -> Result<(), WorkspaceError>;

    /// Refresh directory listing (for cache invalidation if implemented)
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context to refresh
    ///
    /// # Returns
    /// Updated directory listing
    async fn refresh_directory(
        &self,
        workspace_context: &WorkspaceContext,
    ) -> Result<DirectoryListing, WorkspaceError>;
}

/// Extended workspace repository interface for advanced operations
///
/// This trait provides additional operations that may be useful for
/// advanced workspace navigation features in future iterations.
#[async_trait]
pub trait AdvancedWorkspaceRepository: WorkspaceRepository {
    /// Search for files matching a pattern within the workspace
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context to search within
    /// * `pattern` - The search pattern (filename or glob pattern)
    /// * `recursive` - Whether to search recursively in subdirectories
    ///
    /// # Returns
    /// List of matching file entries
    async fn search_files(
        &self,
        workspace_context: &WorkspaceContext,
        pattern: &str,
        recursive: bool,
    ) -> Result<Vec<FileEntry>, WorkspaceError>;

    /// Get recently modified files in the workspace
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context
    /// * `limit` - Maximum number of files to return
    ///
    /// # Returns
    /// List of recently modified files, sorted by modification time (newest first)
    async fn get_recent_files(
        &self,
        workspace_context: &WorkspaceContext,
        limit: usize,
    ) -> Result<Vec<FileEntry>, WorkspaceError>;

    /// Get workspace statistics (total files, size, etc.)
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context
    ///
    /// # Returns
    /// Statistics about the workspace
    async fn get_workspace_stats(
        &self,
        workspace_context: &WorkspaceContext,
    ) -> Result<WorkspaceStats, WorkspaceError>;

    /// Validate workspace integrity (all paths exist, permissions correct, etc.)
    ///
    /// # Arguments
    /// * `workspace_context` - The workspace context to validate
    ///
    /// # Returns
    /// Validation report with any issues found
    async fn validate_workspace_integrity(
        &self,
        workspace_context: &WorkspaceContext,
    ) -> Result<WorkspaceIntegrityReport, WorkspaceError>;
}

/// Statistics about a workspace
#[derive(Debug, Clone)]
pub struct WorkspaceStats {
    /// Total number of files in the workspace
    pub total_files: u64,
    /// Total number of directories in the workspace
    pub total_directories: u64,
    /// Total size of all files in bytes
    pub total_size: u64,
    /// Largest file in the workspace
    pub largest_file: Option<FileEntry>,
    /// Most recently modified file
    pub most_recent_file: Option<FileEntry>,
    /// Number of different file types (by extension)
    pub file_type_count: u32,
    /// Depth of deepest subdirectory
    pub max_depth: u32,
}

/// Report on workspace integrity validation
#[derive(Debug, Clone)]
pub struct WorkspaceIntegrityReport {
    /// Whether the workspace passed all integrity checks
    pub is_valid: bool,
    /// List of issues found during validation
    pub issues: Vec<WorkspaceIntegrityIssue>,
    /// Summary of validation results
    pub summary: String,
}

/// Individual integrity issue found in workspace
#[derive(Debug, Clone)]
pub struct WorkspaceIntegrityIssue {
    /// The type of issue
    pub issue_type: WorkspaceIssueType,
    /// Path where the issue was found
    pub path: String,
    /// Description of the issue
    pub description: String,
    /// Severity of the issue
    pub severity: IssueSeverity,
}

/// Types of workspace integrity issues
#[derive(Debug, Clone, PartialEq)]
pub enum WorkspaceIssueType {
    /// File or directory not found
    NotFound,
    /// Permission denied
    PermissionDenied,
    /// Path outside workspace boundaries
    BoundaryViolation,
    /// Corrupted file or metadata
    Corruption,
    /// Symlink pointing outside workspace
    DangerousSymlink,
    /// File size mismatch or other metadata issue
    MetadataMismatch,
}

/// Severity levels for workspace issues
#[derive(Debug, Clone, PartialEq, PartialOrd, Eq, Ord)]
pub enum IssueSeverity {
    /// Informational only
    Info,
    /// Warning that should be addressed
    Warning,
    /// Error that affects functionality
    Error,
    /// Critical error that prevents workspace use
    Critical,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_workspace_stats_creation() {
        let stats = WorkspaceStats {
            total_files: 42,
            total_directories: 7,
            total_size: 1024 * 1024, // 1MB
            largest_file: None,
            most_recent_file: None,
            file_type_count: 5,
            max_depth: 3,
        };

        assert_eq!(stats.total_files, 42);
        assert_eq!(stats.total_directories, 7);
        assert_eq!(stats.total_size, 1024 * 1024);
    }

    #[test]
    fn test_integrity_issue_severity_ordering() {
        use IssueSeverity::*;

        assert!(Info < Warning);
        assert!(Warning < Error);
        assert!(Error < Critical);

        let mut severities = vec![Critical, Info, Error, Warning];
        severities.sort();
        assert_eq!(severities, vec![Info, Warning, Error, Critical]);
    }

    #[test]
    fn test_workspace_integrity_report() {
        let issue = WorkspaceIntegrityIssue {
            issue_type: WorkspaceIssueType::NotFound,
            path: "/missing/file.txt".to_string(),
            description: "File referenced in index but not found on disk".to_string(),
            severity: IssueSeverity::Warning,
        };

        let report = WorkspaceIntegrityReport {
            is_valid: false,
            issues: vec![issue],
            summary: "1 warning found during validation".to_string(),
        };

        assert!(!report.is_valid);
        assert_eq!(report.issues.len(), 1);
        assert_eq!(report.issues[0].issue_type, WorkspaceIssueType::NotFound);
    }
}
