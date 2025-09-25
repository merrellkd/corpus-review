use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use uuid::Uuid;

/// ExtractionId value object - Prefixed UUID identifier for extraction processes
/// Format: ext_{uuid} (e.g., ext_12345678-1234-1234-1234-123456789012)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ExtractionId(String);

impl ExtractionId {
    const PREFIX: &'static str = "ext_";

    /// Creates a new ExtractionId with random UUID
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        Self(format!("{}{}", Self::PREFIX, uuid))
    }

    /// Creates ExtractionId from existing prefixed string
    /// Returns error if format is invalid
    pub fn from_string(value: String) -> Result<Self, ExtractionIdError> {
        if !value.starts_with(Self::PREFIX) {
            return Err(ExtractionIdError::InvalidPrefix);
        }

        let uuid_part = &value[Self::PREFIX.len()..];
        Uuid::parse_str(uuid_part)
            .map_err(|_| ExtractionIdError::InvalidUuid)?;

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

impl Default for ExtractionId {
    fn default() -> Self {
        Self::new()
    }
}

impl Display for ExtractionId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<ExtractionId> for String {
    fn from(id: ExtractionId) -> Self {
        id.0
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ExtractionIdError {
    #[error("ExtractionId must start with 'ext_'")]
    InvalidPrefix,
    #[error("Invalid UUID format")]
    InvalidUuid,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_extraction_id() {
        let id = ExtractionId::new();
        assert!(id.as_str().starts_with("ext_"));
        assert_eq!(id.as_str().len(), 40); // "ext_" + 36 char UUID
    }

    #[test]
    fn test_from_string_valid() {
        let uuid = Uuid::new_v4();
        let id_str = format!("ext_{}", uuid);
        let id = ExtractionId::from_string(id_str.clone()).unwrap();
        assert_eq!(id.as_str(), id_str);
    }

    #[test]
    fn test_from_string_invalid_prefix() {
        let uuid = Uuid::new_v4();
        let id_str = format!("invalid_{}", uuid);
        let result = ExtractionId::from_string(id_str);
        assert!(matches!(result, Err(ExtractionIdError::InvalidPrefix)));
    }

    #[test]
    fn test_from_string_invalid_uuid() {
        let id_str = "ext_not-a-valid-uuid".to_string();
        let result = ExtractionId::from_string(id_str);
        assert!(matches!(result, Err(ExtractionIdError::InvalidUuid)));
    }

    #[test]
    fn test_uuid_part() {
        let uuid = Uuid::new_v4();
        let id_str = format!("ext_{}", uuid);
        let id = ExtractionId::from_string(id_str).unwrap();
        assert_eq!(id.uuid_part(), uuid.to_string());
    }
}