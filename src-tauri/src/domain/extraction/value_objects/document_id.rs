use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use uuid::Uuid;

/// DocumentId value object - Prefixed UUID identifier for original documents
/// Format: doc_{uuid} (e.g., doc_12345678-1234-1234-1234-123456789012)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct DocumentId(String);

impl DocumentId {
    const PREFIX: &'static str = "doc_";

    /// Creates a new DocumentId with random UUID
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self(format!("{}{}", Self::PREFIX, uuid))
    }

    /// Creates DocumentId from existing prefixed string
    /// Returns error if format is invalid
    pub fn from_string<S: Into<String>>(value: S) -> Result<Self, DocumentIdError> {
        let value = value.into();
        if !value.starts_with(Self::PREFIX) {
            return Err(DocumentIdError::InvalidPrefix);
        }

        let uuid_part = &value[Self::PREFIX.len()..];
        Uuid::parse_str(uuid_part)
            .map_err(|_| DocumentIdError::InvalidUuid)?;

        Ok(Self(value))
    }

    /// Returns the string representation
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Returns the UUID part without prefix
    pub fn uuid_part(&self) -> &str {
        &self.0[Self::PREFIX.len()..]
    }

    /// Create DocumentId from internal database ID (placeholder)
    pub fn from_internal_id(id: i64) -> Self {
        // TODO: Implement proper mapping from internal DB ID to DocumentId
        // For now, generate a new ID as placeholder
        let _ = id; // silence unused warning
        Self::new()
    }
}

impl Default for DocumentId {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for DocumentId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<DocumentId> for String {
    fn from(id: DocumentId) -> Self {
        id.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DocumentIdError {
    #[error("DocumentId must start with 'doc_'")]
    InvalidPrefix,
    #[error("Invalid UUID format")]
    InvalidUuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_document_id() {
        let id = DocumentId::new();
        assert!(id.as_str().starts_with("doc_"));
        assert_eq!(id.as_str().len(), 40); // "doc_" + 36 char UUID
    }

    #[test]
    fn test_from_string_valid() {
        let uuid = Uuid::new_v4();
        let id_str = format!("doc_{}", uuid);
        let id = DocumentId::from_string(id_str.clone()).unwrap();
        assert_eq!(id.as_str(), id_str);
    }

    #[test]
    fn test_from_string_invalid_prefix() {
        let uuid = Uuid::new_v4();
        let id_str = format!("invalid_{}", uuid);
        let result = DocumentId::from_string(id_str);
        assert!(matches!(result, Err(DocumentIdError::InvalidPrefix)));
    }

    #[test]
    fn test_from_string_invalid_uuid() {
        let id_str = "doc_not-a-valid-uuid".to_string();
        let result = DocumentId::from_string(id_str);
        assert!(matches!(result, Err(DocumentIdError::InvalidUuid)));
    }

    #[test]
    fn test_uuid_part() {
        let uuid = Uuid::new_v4();
        let id_str = format!("doc_{}", uuid);
        let id = DocumentId::from_string(id_str).unwrap();
        assert_eq!(id.uuid_part(), uuid.to_string());
    }
}