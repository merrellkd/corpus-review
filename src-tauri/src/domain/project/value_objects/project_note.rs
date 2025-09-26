use serde::{Deserialize, Serialize};
use std::fmt;

/// ProjectNote value object for optional project descriptions
///
/// Business Rules:
/// - Optional field (use Option<ProjectNote> in domain)
/// - Maximum length of 1000 characters when provided
/// - Leading and trailing whitespace is automatically trimmed
/// - Empty strings after trimming are converted to None at the domain level
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectNote(String);

impl ProjectNote {
    /// Create a new ProjectNote with validation
    /// Returns error for empty strings - use None at domain level instead
    pub fn new(value: String) -> Result<Self, ProjectNoteError> {
        let trimmed = value.trim();

        if trimmed.is_empty() {
            return Err(ProjectNoteError::Empty);
        }

        if trimmed.len() > 1000 {
            return Err(ProjectNoteError::TooLong);
        }

        Ok(ProjectNote(trimmed.to_string()))
    }

    /// Create a ProjectNote from optional string, handling empty cases
    /// Returns None for empty/whitespace-only strings
    pub fn from_optional(value: Option<String>) -> Result<Option<Self>, ProjectNoteError> {
        match value {
            None => Ok(None),
            Some(s) => {
                let trimmed = s.trim();
                if trimmed.is_empty() {
                    Ok(None)
                } else {
                    ProjectNote::new(s).map(Some)
                }
            }
        }
    }

    /// Get the string value of this ProjectNote
    pub fn value(&self) -> &str {
        &self.0
    }

    /// Get the length of the project note
    pub fn len(&self) -> usize {
        self.0.len()
    }

    /// Check if the project note is empty (should never be true for valid instances)
    pub fn is_empty(&self) -> bool {
        self.0.is_empty()
    }

    /// Get a preview of the note (first N characters)
    pub fn preview(&self, max_chars: usize) -> String {
        if self.0.len() <= max_chars {
            self.0.clone()
        } else {
            format!("{}...", &self.0[..max_chars])
        }
    }

    /// Count the number of lines in the note
    pub fn line_count(&self) -> usize {
        self.0.lines().count()
    }
}

impl fmt::Display for ProjectNote {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<ProjectNote> for String {
    fn from(note: ProjectNote) -> Self {
        note.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProjectNoteError {
    #[error("Empty note provided")]
    Empty,
    #[error("Project note too long (max 1000 characters)")]
    TooLong,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_project_note() {
        let note = ProjectNote::new("This is a valid project note".to_string());
        assert!(note.is_ok());
        assert_eq!(note.unwrap().value(), "This is a valid project note");
    }

    #[test]
    fn test_note_with_whitespace_is_trimmed() {
        let note = ProjectNote::new("  Trimmed note  ".to_string());
        assert!(note.is_ok());
        assert_eq!(note.unwrap().value(), "Trimmed note");
    }

    #[test]
    fn test_empty_note_fails() {
        let note = ProjectNote::new("".to_string());
        assert!(note.is_err());
        assert!(matches!(note.unwrap_err(), ProjectNoteError::Empty));
    }

    #[test]
    fn test_whitespace_only_note_fails() {
        let note = ProjectNote::new("   \t\n   ".to_string());
        assert!(note.is_err());
        assert!(matches!(note.unwrap_err(), ProjectNoteError::Empty));
    }

    #[test]
    fn test_note_too_long_fails() {
        let long_note = "x".repeat(1001);
        let note = ProjectNote::new(long_note);
        assert!(note.is_err());
        assert!(matches!(note.unwrap_err(), ProjectNoteError::TooLong));
    }

    #[test]
    fn test_max_length_note_succeeds() {
        let max_note = "x".repeat(1000);
        let note = ProjectNote::new(max_note);
        assert!(note.is_ok());
        assert_eq!(note.unwrap().len(), 1000);
    }

    #[test]
    fn test_from_optional_with_none() {
        let result = ProjectNote::from_optional(None);
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn test_from_optional_with_empty_string() {
        let result = ProjectNote::from_optional(Some("".to_string()));
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn test_from_optional_with_whitespace_only() {
        let result = ProjectNote::from_optional(Some("   \t   ".to_string()));
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn test_from_optional_with_valid_content() {
        let content = "Valid note content".to_string();
        let result = ProjectNote::from_optional(Some(content.clone()));
        assert!(result.is_ok());
        let note_opt = result.unwrap();
        assert!(note_opt.is_some());
        assert_eq!(note_opt.unwrap().value(), "Valid note content");
    }

    #[test]
    fn test_from_optional_with_too_long_content() {
        let long_content = "x".repeat(1001);
        let result = ProjectNote::from_optional(Some(long_content));
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ProjectNoteError::TooLong));
    }

    #[test]
    fn test_note_preview() {
        let note =
            ProjectNote::new("This is a longer note that should be truncated".to_string()).unwrap();

        assert_eq!(note.preview(10), "This is a ...");
        assert_eq!(
            note.preview(100),
            "This is a longer note that should be truncated"
        );
    }

    #[test]
    fn test_multiline_note() {
        let multiline = "Line 1\nLine 2\nLine 3".to_string();
        let note = ProjectNote::new(multiline).unwrap();

        assert_eq!(note.line_count(), 3);
        assert_eq!(note.len(), 20); // Including newline characters
    }

    #[test]
    fn test_note_display() {
        let note = ProjectNote::new("Display test note".to_string()).unwrap();
        assert_eq!(format!("{}", note), "Display test note");
    }

    #[test]
    fn test_note_equality() {
        let note1 = ProjectNote::new("Same content".to_string()).unwrap();
        let note2 = ProjectNote::new("Same content".to_string()).unwrap();
        let note3 = ProjectNote::new("Different content".to_string()).unwrap();

        assert_eq!(note1, note2);
        assert_ne!(note1, note3);
    }

    #[test]
    fn test_note_serialization() {
        let note = ProjectNote::new("Serialization test".to_string()).unwrap();
        let serialized = serde_json::to_string(&note).unwrap();
        let deserialized: ProjectNote = serde_json::from_str(&serialized).unwrap();

        assert_eq!(note, deserialized);
    }

    #[test]
    fn test_unicode_in_note() {
        let unicode_note = "Note with émojis 🚀 and special characters ñáéíóú";
        let note = ProjectNote::new(unicode_note.to_string());
        assert!(note.is_ok());
        assert_eq!(note.unwrap().value(), unicode_note);
    }

    #[test]
    fn test_trimming_preserves_internal_whitespace() {
        let note = ProjectNote::new("  Note   with   internal   spaces  ".to_string());
        assert!(note.is_ok());
        assert_eq!(note.unwrap().value(), "Note   with   internal   spaces");
    }
}
