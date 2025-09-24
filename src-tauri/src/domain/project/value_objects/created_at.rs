use serde::{Deserialize, Serialize};
use std::fmt;
use chrono::{DateTime, Utc};

/// CreatedAt value object for tracking project creation timestamp
///
/// Business Rules:
/// - Must be a valid UTC datetime
/// - Cannot be in the future (validation at creation time)
/// - Immutable once set
/// - Used for sorting and auditing purposes
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreatedAt(DateTime<Utc>);

impl CreatedAt {
    /// Create a new CreatedAt with the current UTC timestamp
    pub fn now() -> Self {
        CreatedAt(Utc::now())
    }

    /// Create a CreatedAt from a specific DateTime<Utc>
    /// Returns error if the datetime is in the future
    pub fn new(datetime: DateTime<Utc>) -> Result<Self, CreatedAtError> {
        let now = Utc::now();
        if datetime > now {
            return Err(CreatedAtError::FutureDate);
        }
        Ok(CreatedAt(datetime))
    }

    /// Create a CreatedAt from a string in RFC3339 format
    pub fn from_string(value: String) -> Result<Self, CreatedAtError> {
        let datetime = value.parse::<DateTime<Utc>>()
            .map_err(|_| CreatedAtError::InvalidFormat)?;
        Self::new(datetime)
    }

    /// Get the DateTime<Utc> value
    pub fn value(&self) -> DateTime<Utc> {
        self.0
    }

    /// Get the timestamp as RFC3339 string
    pub fn to_string(&self) -> String {
        self.0.to_rfc3339()
    }

    /// Get the timestamp as Unix epoch seconds
    pub fn to_timestamp(&self) -> i64 {
        self.0.timestamp()
    }

    /// Format for display purposes
    pub fn format_display(&self) -> String {
        self.0.format("%Y-%m-%d %H:%M:%S UTC").to_string()
    }

    /// Check if this timestamp is before another
    pub fn is_before(&self, other: &CreatedAt) -> bool {
        self.0 < other.0
    }

    /// Check if this timestamp is after another
    pub fn is_after(&self, other: &CreatedAt) -> bool {
        self.0 > other.0
    }

    /// Get the age in seconds from now
    pub fn age_seconds(&self) -> i64 {
        let now = Utc::now();
        (now - self.0).num_seconds()
    }
}

impl Default for CreatedAt {
    fn default() -> Self {
        Self::now()
    }
}

impl fmt::Display for CreatedAt {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0.to_rfc3339())
    }
}

impl From<CreatedAt> for DateTime<Utc> {
    fn from(created_at: CreatedAt) -> Self {
        created_at.0
    }
}

impl From<CreatedAt> for String {
    fn from(created_at: CreatedAt) -> Self {
        created_at.to_string()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum CreatedAtError {
    #[error("Cannot create timestamp in the future")]
    FutureDate,
    #[error("Invalid datetime format")]
    InvalidFormat,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Duration};

    #[test]
    fn test_now_creates_valid_timestamp() {
        let before = Utc::now();
        let created_at = CreatedAt::now();
        let after = Utc::now();

        assert!(created_at.value() >= before);
        assert!(created_at.value() <= after);
    }

    #[test]
    fn test_new_with_valid_past_date() {
        let past_date = Utc::now() - Duration::hours(1);
        let created_at = CreatedAt::new(past_date);

        assert!(created_at.is_ok());
        assert_eq!(created_at.unwrap().value(), past_date);
    }

    #[test]
    fn test_new_with_future_date_fails() {
        let future_date = Utc::now() + Duration::hours(1);
        let created_at = CreatedAt::new(future_date);

        assert!(created_at.is_err());
        assert!(matches!(created_at.unwrap_err(), CreatedAtError::FutureDate));
    }

    #[test]
    fn test_from_string_with_valid_rfc3339() {
        let rfc3339_str = "2023-12-01T10:30:00Z".to_string();
        let created_at = CreatedAt::from_string(rfc3339_str);

        assert!(created_at.is_ok());
        let timestamp = created_at.unwrap();
        assert_eq!(timestamp.value().year(), 2023);
        assert_eq!(timestamp.value().month(), 12);
        assert_eq!(timestamp.value().day(), 1);
    }

    #[test]
    fn test_from_string_with_invalid_format() {
        let invalid_str = "not-a-date".to_string();
        let created_at = CreatedAt::from_string(invalid_str);

        assert!(created_at.is_err());
        assert!(matches!(created_at.unwrap_err(), CreatedAtError::InvalidFormat));
    }

    #[test]
    fn test_to_timestamp() {
        let datetime = Utc.with_ymd_and_hms(2023, 1, 1, 0, 0, 0).unwrap();
        let created_at = CreatedAt::new(datetime).unwrap();

        assert_eq!(created_at.to_timestamp(), 1672531200); // 2023-01-01 00:00:00 UTC
    }

    #[test]
    fn test_format_display() {
        let datetime = Utc.with_ymd_and_hms(2023, 12, 25, 15, 30, 45).unwrap();
        let created_at = CreatedAt::new(datetime).unwrap();

        assert_eq!(created_at.format_display(), "2023-12-25 15:30:45 UTC");
    }

    #[test]
    fn test_timestamp_comparison() {
        let earlier = Utc::now() - Duration::hours(2);
        let later = Utc::now() - Duration::hours(1);

        let created_at1 = CreatedAt::new(earlier).unwrap();
        let created_at2 = CreatedAt::new(later).unwrap();

        assert!(created_at1.is_before(&created_at2));
        assert!(created_at2.is_after(&created_at1));
        assert!(!created_at1.is_after(&created_at2));
        assert!(!created_at2.is_before(&created_at1));
    }

    #[test]
    fn test_age_calculation() {
        let one_hour_ago = Utc::now() - Duration::hours(1);
        let created_at = CreatedAt::new(one_hour_ago).unwrap();

        let age = created_at.age_seconds();
        assert!(age >= 3500 && age <= 3700); // Approximately 1 hour (3600 seconds) with some tolerance
    }

    #[test]
    fn test_timestamp_equality() {
        let datetime = Utc::now() - Duration::hours(1);
        let created_at1 = CreatedAt::new(datetime).unwrap();
        let created_at2 = CreatedAt::new(datetime).unwrap();
        let different_time = CreatedAt::now();

        assert_eq!(created_at1, created_at2);
        assert_ne!(created_at1, different_time);
    }

    #[test]
    fn test_timestamp_display() {
        let datetime = Utc.with_ymd_and_hms(2023, 6, 15, 14, 30, 0).unwrap();
        let created_at = CreatedAt::new(datetime).unwrap();

        let display_str = format!("{}", created_at);
        assert!(display_str.contains("2023-06-15"));
        assert!(display_str.contains("14:30:00"));
    }

    #[test]
    fn test_timestamp_serialization() {
        let created_at = CreatedAt::now();
        let serialized = serde_json::to_string(&created_at).unwrap();
        let deserialized: CreatedAt = serde_json::from_str(&serialized).unwrap();

        assert_eq!(created_at, deserialized);
    }

    #[test]
    fn test_default_creates_now() {
        let before = Utc::now();
        let created_at = CreatedAt::default();
        let after = Utc::now();

        assert!(created_at.value() >= before);
        assert!(created_at.value() <= after);
    }

    #[test]
    fn test_conversion_to_datetime() {
        let original_datetime = Utc::now() - Duration::hours(1);
        let created_at = CreatedAt::new(original_datetime).unwrap();
        let converted: DateTime<Utc> = created_at.into();

        assert_eq!(converted, original_datetime);
    }

    #[test]
    fn test_conversion_to_string() {
        let datetime = Utc.with_ymd_and_hms(2023, 3, 15, 10, 0, 0).unwrap();
        let created_at = CreatedAt::new(datetime).unwrap();
        let string_value: String = created_at.into();

        assert!(string_value.contains("2023-03-15"));
        assert!(string_value.contains("10:00:00"));
    }

    #[test]
    fn test_edge_case_exact_now() {
        // Test that a timestamp created exactly now is valid
        let now = Utc::now();
        let created_at = CreatedAt::new(now);

        assert!(created_at.is_ok());
    }
}