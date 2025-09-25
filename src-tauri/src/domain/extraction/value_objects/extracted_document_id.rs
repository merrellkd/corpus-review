use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use uuid::Uuid;

/// ExtractedDocumentId value object - Prefixed UUID identifier for extracted documents
/// Format: det_{uuid} (e.g., det_12345678-1234-1234-1234-123456789012)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ExtractedDocumentId(String);

impl ExtractedDocumentId {
    const PREFIX: &'static str = "det_";

    /// Creates a new ExtractedDocumentId with random UUID
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self(format!("{}{}", Self::PREFIX, uuid))
    }

    /// Creates ExtractedDocumentId from existing prefixed string
    /// Returns error if format is invalid
    pub fn from_string(value: String) -> Result<Self, ExtractedDocumentIdError> {
        if !value.starts_with(Self::PREFIX) {
            return Err(ExtractedDocumentIdError::InvalidPrefix);
        }

        let uuid_part = &value[Self::PREFIX.len()..];
        Uuid::parse_str(uuid_part)
            .map_err(|_| ExtractedDocumentIdError::InvalidUuid)?;

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
}

impl Default for ExtractedDocumentId {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for ExtractedDocumentId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<ExtractedDocumentId> for String {
    fn from(id: ExtractedDocumentId) -> Self {
        id.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ExtractedDocumentIdError {
    #[error("ExtractedDocumentId must start with 'det_'")]
    InvalidPrefix,
    #[error("Invalid UUID format")]
    InvalidUuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_extracted_document_id() {
        let id = ExtractedDocumentId::new();
        assert!(id.as_str().starts_with("det_"));
        assert_eq!(id.as_str().len(), 40); // "det_" + 36 char UUID
    }

    #[test]
    fn test_from_string_valid() {
        let uuid = Uuid::new_v4();
        let id_str = format!("det_{}", uuid);
        let id = ExtractedDocumentId::from_string(id_str.clone()).unwrap();
        assert_eq!(id.as_str(), id_str);
    }

    #[test]
    fn test_from_string_invalid_prefix() {
        let uuid = Uuid::new_v4();
        let id_str = format!("invalid_{}", uuid);
        let result = ExtractedDocumentId::from_string(id_str);
        assert!(matches!(result, Err(ExtractedDocumentIdError::InvalidPrefix)));
    }

    #[test]
    fn test_from_string_invalid_uuid() {
        let id_str = "det_not-a-valid-uuid".to_string();
        let result = ExtractedDocumentId::from_string(id_str);
        assert!(matches!(result, Err(ExtractedDocumentIdError::InvalidUuid)));
    }

    #[test]
    fn test_uuid_part() {
        let uuid = Uuid::new_v4();
        let id_str = format!("det_{}", uuid);
        let id = ExtractedDocumentId::from_string(id_str).unwrap();
        assert_eq!(id.uuid_part(), uuid.to_string());
    }
}