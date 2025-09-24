use serde::{Deserialize, Serialize};
use std::fmt;

/// ProjectName value object ensuring name validation rules
///
/// Business Rules:
/// - Must be non-empty after trimming whitespace
/// - Maximum length of 255 characters
/// - Leading and trailing whitespace is automatically trimmed
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectName(String);

impl ProjectName {
    /// Create a new ProjectName with validation
    pub fn new(value: String) -> Result<Self, ProjectNameError> {
        let trimmed = value.trim();

        if trimmed.is_empty() {
            return Err(ProjectNameError::Required);
        }

        if trimmed.len() > 255 {
            return Err(ProjectNameError::TooLong);
        }

        Ok(ProjectName(trimmed.to_string()))
    }

    /// Get the string value of this ProjectName
    pub fn value(&self) -> &str {
        &self.0
    }

    /// Get the length of the project name
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// Check if the project name is empty (should never be true for valid instances)
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

impl fmt::Display for ProjectName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<ProjectName> for String {
    fn from(name: ProjectName) -> Self {
        name.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectNameError {
    #[error("Project name is required")]
    Required,
    #[error("Project name too long (max 255 characters)")]
    TooLong,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_project_name() {
        let name = ProjectName::new("Valid Project Name".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "Valid Project Name");
    }

    #[test]
    fn test_name_with_whitespace_is_trimmed() {
        let name = ProjectName::new("  Trimmed Name  ".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "Trimmed Name");
    }

    #[test]
    fn test_empty_name_fails() {
        let name = ProjectName::new("".to_string());
        assert!(name.is_err());
        assert!(matches!(name.unwrap_err(), ProjectNameError::Required));
    }

    #[test]
    fn test_whitespace_only_name_fails() {
        let name = ProjectName::new("   \t\n   ".to_string());
        assert!(name.is_err());
        assert!(matches!(name.unwrap_err(), ProjectNameError::Required));
    }

    #[test]
    fn test_name_too_long_fails() {
        let long_name = "x".repeat(256);
        let name = ProjectName::new(long_name);
        assert!(name.is_err());
        assert!(matches!(name.unwrap_err(), ProjectNameError::TooLong));
    }

    #[test]
    fn test_max_length_name_succeeds() {
        let max_name = "x".repeat(255);
        let name = ProjectName::new(max_name);
        assert!(name.is_ok());
        assert_eq!(name.unwrap().len(), 255);
    }

    #[test]
    fn test_single_character_name() {
        let name = ProjectName::new("a".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "a");
    }

    #[test]
    fn test_name_with_special_characters() {
        let name = ProjectName::new("Project-Name_123 (Test)".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "Project-Name_123 (Test)");
    }

    #[test]
    fn test_name_display() {
        let name = ProjectName::new("Display Test".to_string()).unwrap();
        assert_eq!(format!("{}", name), "Display Test");
    }

    #[test]
    fn test_name_equality() {
        let name1 = ProjectName::new("Same Name".to_string()).unwrap();
        let name2 = ProjectName::new("Same Name".to_string()).unwrap();
        let name3 = ProjectName::new("Different Name".to_string()).unwrap();

        assert_eq!(name1, name2);
        assert_ne!(name1, name3);
    }

    #[test]
    fn test_name_serialization() {
        let name = ProjectName::new("Serialization Test".to_string()).unwrap();
        let serialized = serde_json::to_string(&name).unwrap();
        let deserialized: ProjectName = serde_json::from_str(&serialized).unwrap();

        assert_eq!(name, deserialized);
    }

    #[test]
    fn test_unicode_characters() {
        let name = ProjectName::new("Projekt ñáme with ümläuts 🚀".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "Projekt ñáme with ümläuts 🚀");
    }

    #[test]
    fn test_trimming_preserves_internal_whitespace() {
        let name = ProjectName::new("  Project   with   spaces  ".to_string());
        assert!(name.is_ok());
        assert_eq!(name.unwrap().value(), "Project   with   spaces");
    }
}