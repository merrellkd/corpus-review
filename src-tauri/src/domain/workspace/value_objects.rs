use serde::{Deserialize, Serialize};
use uuid::Uuid;
use std::path::PathBuf;
use std::fmt::{self, Display};

/// FilePath value object - represents an absolute filesystem path
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct FilePath {
    path: String,
}

impl FilePath {
    pub fn new(path: String) -> Result<Self, String> {
        Self::validate_path(&path)?;
        let normalized = Self::normalize_path(&path)?;
        Ok(Self { path: normalized })
    }

    pub fn as_str(&self) -> &str {
        &self.path
    }

    fn validate_path(path: &str) -> Result<(), String> {
        if path.trim().is_empty() {
            return Err("Path cannot be empty".to_string());
        }

        let path_buf = PathBuf::from(path);

        if !path_buf.is_absolute() {
            return Err("Path must be absolute".to_string());
        }

        // Check for path traversal attempts
        if path.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }

        // Check for null bytes (security concern)
        if path.contains('\0') {
            return Err("Path cannot contain null bytes".to_string());
        }

        Ok(())
    }

    fn normalize_path(path: &str) -> Result<String, String> {
        let path_buf = PathBuf::from(path);

        // Canonicalize if possible, otherwise just clean up the path
        match path_buf.canonicalize() {
            Ok(canonical) => Ok(canonical.to_string_lossy().to_string()),
            Err(_) => {
                // If canonicalize fails (path doesn't exist), just normalize separators
                Ok(path_buf.to_string_lossy().to_string())
            }
        }
    }
}

impl Display for FilePath {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.path)
    }
}

/// WorkspaceLayoutId value object - prefixed UUID for workspace layouts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WorkspaceLayoutId {
    id: String,
}

impl WorkspaceLayoutId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self {
            id: format!("workspace_{}", uuid.hyphenated()),
        }
    }

    pub fn from_string(id: String) -> Result<Self, String> {
        if !id.starts_with("workspace_") {
            return Err("WorkspaceLayoutId must start with 'workspace_'".to_string());
        }

        let uuid_part = &id[10..]; // Remove "workspace_" prefix
        if uuid_part.len() != 36 {
            return Err("Invalid UUID format".to_string());
        }

        // Validate UUID format
        Uuid::parse_str(uuid_part)
            .map_err(|_| "Invalid UUID format".to_string())?;

        Ok(Self { id })
    }

    pub fn as_str(&self) -> &str {
        &self.id
    }
}

impl Display for WorkspaceLayoutId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.id)
    }
}

/// ProjectId value object - prefixed UUID for projects
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ProjectId {
    id: String,
}

impl ProjectId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self {
            id: format!("project_{}", uuid.hyphenated()),
        }
    }

    pub fn from_string(id: String) -> Result<Self, String> {
        if !id.starts_with("project_") {
            return Err("ProjectId must start with 'project_'".to_string());
        }

        let uuid_part = &id[8..]; // Remove "project_" prefix
        if uuid_part.len() != 36 {
            return Err("Invalid UUID format".to_string());
        }

        // Validate UUID format
        Uuid::parse_str(uuid_part)
            .map_err(|_| "Invalid UUID format".to_string())?;

        Ok(Self { id })
    }

    pub fn as_str(&self) -> &str {
        &self.id
    }
}

impl Display for ProjectId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.id)
    }
}

/// DocumentCaddyId value object - prefixed UUID for document caddies
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct DocumentCaddyId {
    id: String,
}

impl DocumentCaddyId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self {
            id: format!("doc_{}", uuid.hyphenated()),
        }
    }

    pub fn from_string(id: String) -> Result<Self, String> {
        if !id.starts_with("doc_") {
            return Err("DocumentCaddyId must start with 'doc_'".to_string());
        }

        let uuid_part = &id[4..]; // Remove "doc_" prefix
        if uuid_part.len() != 36 {
            return Err("Invalid UUID format".to_string());
        }

        // Validate UUID format
        Uuid::parse_str(uuid_part)
            .map_err(|_| "Invalid UUID format".to_string())?;

        Ok(Self { id })
    }

    pub fn as_str(&self) -> &str {
        &self.id
    }
}

impl Display for DocumentCaddyId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_path_validation() {
        // Valid absolute path
        let valid_path = FilePath::new("/Users/test/Documents/file.txt".to_string());
        assert!(valid_path.is_ok());

        // Empty path
        let empty_path = FilePath::new("".to_string());
        assert!(empty_path.is_err());

        // Relative path
        let relative_path = FilePath::new("Documents/file.txt".to_string());
        assert!(relative_path.is_err());

        // Path traversal
        let traversal_path = FilePath::new("/Users/test/../../../etc/passwd".to_string());
        assert!(traversal_path.is_err());

        // Null byte
        let null_path = FilePath::new("/Users/test/file\0.txt".to_string());
        assert!(null_path.is_err());
    }

    #[test]
    fn test_workspace_layout_id() {
        let id = WorkspaceLayoutId::new();
        assert!(id.as_str().starts_with("workspace_"));
        assert_eq!(id.as_str().len(), 46); // "workspace_" (10) + UUID (36)

        // Test from_string validation
        let valid_id = WorkspaceLayoutId::from_string(id.as_str().to_string());
        assert!(valid_id.is_ok());

        let invalid_id = WorkspaceLayoutId::from_string("invalid_id".to_string());
        assert!(invalid_id.is_err());
    }

    #[test]
    fn test_project_id() {
        let id = ProjectId::new();
        assert!(id.as_str().starts_with("project_"));
        assert_eq!(id.as_str().len(), 44); // "project_" (8) + UUID (36)

        // Test from_string validation
        let valid_id = ProjectId::from_string(id.as_str().to_string());
        assert!(valid_id.is_ok());

        let invalid_id = ProjectId::from_string("invalid_id".to_string());
        assert!(invalid_id.is_err());
    }

    #[test]
    fn test_document_caddy_id() {
        let id = DocumentCaddyId::new();
        assert!(id.as_str().starts_with("doc_"));
        assert_eq!(id.as_str().len(), 40); // "doc_" (4) + UUID (36)

        // Test from_string validation
        let valid_id = DocumentCaddyId::from_string(id.as_str().to_string());
        assert!(valid_id.is_ok());

        let invalid_id = DocumentCaddyId::from_string("invalid_id".to_string());
        assert!(invalid_id.is_err());
    }

    #[test]
    fn test_id_uniqueness() {
        let id1 = ProjectId::new();
        let id2 = ProjectId::new();
        assert_ne!(id1, id2);

        let layout_id1 = WorkspaceLayoutId::new();
        let layout_id2 = WorkspaceLayoutId::new();
        assert_ne!(layout_id1, layout_id2);

        let caddy_id1 = DocumentCaddyId::new();
        let caddy_id2 = DocumentCaddyId::new();
        assert_ne!(caddy_id1, caddy_id2);
    }

    #[test]
    fn test_display_implementation() {
        let project_id = ProjectId::new();
        let display_string = format!("{}", project_id);
        assert_eq!(display_string, project_id.as_str());

        let file_path = FilePath::new("/Users/test/document.txt".to_string()).unwrap();
        let display_string = format!("{}", file_path);
        assert_eq!(display_string, file_path.as_str());
    }

    #[test]
    fn test_serialization() {
        let project_id = ProjectId::new();
        let serialized = serde_json::to_string(&project_id).unwrap();
        let deserialized: ProjectId = serde_json::from_str(&serialized).unwrap();
        assert_eq!(project_id, deserialized);

        let file_path = FilePath::new("/Users/test/document.txt".to_string()).unwrap();
        let serialized = serde_json::to_string(&file_path).unwrap();
        let deserialized: FilePath = serde_json::from_str(&serialized).unwrap();
        assert_eq!(file_path, deserialized);
    }
}