use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

/// ProjectId value object with prefixed UUID for type safety and debugging clarity
///
/// All project identifiers use the format: proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
/// This follows the constitutional requirement for prefixed identifiers.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProjectId(String);

impl ProjectId {
    /// Create a new ProjectId with a generated UUID
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        ProjectId(format!("proj_{}", uuid))
    }

    /// Create a ProjectId from an existing string, validating the prefix format
    pub fn from_string<S: Into<String>>(value: S) -> Result<Self, ProjectIdError> {
        let value = value.into();
        if !value.starts_with("proj_") {
            return Err(ProjectIdError::InvalidFormat);
        }

        // Validate that the part after "proj_" is a valid UUID
        let uuid_part = value.strip_prefix("proj_").unwrap();
        if uuid_part.parse::<Uuid>().is_err() {
            return Err(ProjectIdError::InvalidUuid);
        }

        Ok(ProjectId(value))
    }

    /// Get the string value of this ProjectId
    pub fn value(&self) -> &str {
        &self.0
    }

    /// Get the string value of this ProjectId (alias for value)
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Extract just the UUID part (without the proj_ prefix)
    pub fn uuid_part(&self) -> &str {
        self.0.strip_prefix("proj_").unwrap_or(&self.0)
    }
}

impl Default for ProjectId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for ProjectId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<ProjectId> for String {
    fn from(id: ProjectId) -> Self {
        id.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectIdError {
    #[error("Invalid project ID format - must start with 'proj_'")]
    InvalidFormat,
    #[error("Invalid UUID in project ID")]
    InvalidUuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_project_id_has_correct_format() {
        let id = ProjectId::new();
        assert!(id.value().starts_with("proj_"));
        assert_eq!(id.value().len(), 41); // "proj_" (5) + UUID (36) = 41
    }

    #[test]
    fn test_from_string_with_valid_id() {
        let uuid = Uuid::new_v4();
        let id_string = format!("proj_{}", uuid);
        let result = ProjectId::from_string(id_string.clone());

        assert!(result.is_ok());
        assert_eq!(result.unwrap().value(), &id_string);
    }

    #[test]
    fn test_from_string_with_invalid_prefix() {
        let uuid = Uuid::new_v4();
        let id_string = format!("user_{}", uuid);
        let result = ProjectId::from_string(id_string);

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ProjectIdError::InvalidFormat));
    }

    #[test]
    fn test_from_string_with_invalid_uuid() {
        let id_string = "proj_not-a-valid-uuid".to_string();
        let result = ProjectId::from_string(id_string);

        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ProjectIdError::InvalidUuid));
    }

    #[test]
    fn test_uuid_part_extraction() {
        let uuid = Uuid::new_v4();
        let id = ProjectId::from_string(format!("proj_{}", uuid)).unwrap();
        assert_eq!(id.uuid_part(), uuid.to_string());
    }

    #[test]
    fn test_project_id_equality() {
        let uuid = Uuid::new_v4();
        let id1 = ProjectId::from_string(format!("proj_{}", uuid)).unwrap();
        let id2 = ProjectId::from_string(format!("proj_{}", uuid)).unwrap();
        let id3 = ProjectId::new();

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
    }

    #[test]
    fn test_project_id_display() {
        let uuid = Uuid::new_v4();
        let id_string = format!("proj_{}", uuid);
        let id = ProjectId::from_string(id_string.clone()).unwrap();

        assert_eq!(format!("{}", id), id_string);
    }

    #[test]
    fn test_project_id_serialization() {
        let id = ProjectId::new();
        let serialized = serde_json::to_string(&id).unwrap();
        let deserialized: ProjectId = serde_json::from_str(&serialized).unwrap();

        assert_eq!(id, deserialized);
    }
}