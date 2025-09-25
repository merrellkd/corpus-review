use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};

/// ExtractionStatus enum - Processing state tracking for document extractions
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ExtractionStatus {
    /// Queued for processing
    Pending,
    /// Currently extracting
    Processing,
    /// Successfully finished
    Completed,
    /// Failed with error message
    Error,
}

impl ExtractionStatus {
    /// Returns all possible extraction statuses
    pub fn all() -> Vec<ExtractionStatus> {
        vec![
            ExtractionStatus::Pending,
            ExtractionStatus::Processing,
            ExtractionStatus::Completed,
            ExtractionStatus::Error,
        ]
    }

    /// Returns true if this status represents a finished state (success or failure)
    pub fn is_finished(&self) -> bool {
        matches!(self, ExtractionStatus::Completed | ExtractionStatus::Error)
    }

    /// Returns true if this status represents an active/ongoing state
    pub fn is_active(&self) -> bool {
        matches!(self, ExtractionStatus::Pending | ExtractionStatus::Processing)
    }

    /// Returns true if this status represents a successful completion
    pub fn is_successful(&self) -> bool {
        matches!(self, ExtractionStatus::Completed)
    }

    /// Returns true if this status represents an error state
    pub fn is_error(&self) -> bool {
        matches!(self, ExtractionStatus::Error)
    }

    /// Returns true if extraction can be retried from this status
    pub fn can_retry(&self) -> bool {
        matches!(self, ExtractionStatus::Error)
    }

    /// Returns true if extraction can be cancelled from this status
    pub fn can_cancel(&self) -> bool {
        matches!(self, ExtractionStatus::Pending | ExtractionStatus::Processing)
    }

    /// Validates if transition to new status is allowed
    pub fn can_transition_to(&self, new_status: &ExtractionStatus) -> bool {
        match (self, new_status) {
            // From Pending
            (ExtractionStatus::Pending, ExtractionStatus::Processing) => true,
            (ExtractionStatus::Pending, ExtractionStatus::Error) => true,

            // From Processing
            (ExtractionStatus::Processing, ExtractionStatus::Completed) => true,
            (ExtractionStatus::Processing, ExtractionStatus::Error) => true,

            // From Error (can retry)
            (ExtractionStatus::Error, ExtractionStatus::Pending) => true,

            // From Completed (can re-extract)
            (ExtractionStatus::Completed, ExtractionStatus::Pending) => true,

            // Invalid transitions
            _ => false,
        }
    }

    /// Returns the next logical status in the success path
    pub fn next_success_status(&self) -> Option<ExtractionStatus> {
        match self {
            ExtractionStatus::Pending => Some(ExtractionStatus::Processing),
            ExtractionStatus::Processing => Some(ExtractionStatus::Completed),
            ExtractionStatus::Completed | ExtractionStatus::Error => None,
        }
    }

    /// Returns display color for UI representation
    pub fn display_color(&self) -> &'static str {
        match self {
            ExtractionStatus::Pending => "orange",
            ExtractionStatus::Processing => "blue",
            ExtractionStatus::Completed => "green",
            ExtractionStatus::Error => "red",
        }
    }

    /// Returns icon name for UI representation
    pub fn icon_name(&self) -> &'static str {
        match self {
            ExtractionStatus::Pending => "clock",
            ExtractionStatus::Processing => "loader",
            ExtractionStatus::Completed => "check-circle",
            ExtractionStatus::Error => "alert-circle",
        }
    }

    /// Returns user-friendly description
    pub fn description(&self) -> &'static str {
        match self {
            ExtractionStatus::Pending => "Waiting to start extraction",
            ExtractionStatus::Processing => "Extracting document content",
            ExtractionStatus::Completed => "Extraction completed successfully",
            ExtractionStatus::Error => "Extraction failed with error",
        }
    }
}

impl Display for ExtractionStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ExtractionStatus::Pending => write!(f, "Pending"),
            ExtractionStatus::Processing => write!(f, "Processing"),
            ExtractionStatus::Completed => write!(f, "Completed"),
            ExtractionStatus::Error => write!(f, "Error"),
        }
    }
}

impl std::str::FromStr for ExtractionStatus {
    type Err = ExtractionStatusError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(ExtractionStatus::Pending),
            "processing" => Ok(ExtractionStatus::Processing),
            "completed" => Ok(ExtractionStatus::Completed),
            "error" => Ok(ExtractionStatus::Error),
            _ => Err(ExtractionStatusError::InvalidStatus(s.to_string())),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ExtractionStatusError {
    #[error("Invalid extraction status: {0}")]
    InvalidStatus(String),
    #[error("Invalid status transition from {from} to {to}")]
    InvalidTransition { from: String, to: String },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_finished() {
        assert!(!ExtractionStatus::Pending.is_finished());
        assert!(!ExtractionStatus::Processing.is_finished());
        assert!(ExtractionStatus::Completed.is_finished());
        assert!(ExtractionStatus::Error.is_finished());
    }

    #[test]
    fn test_is_active() {
        assert!(ExtractionStatus::Pending.is_active());
        assert!(ExtractionStatus::Processing.is_active());
        assert!(!ExtractionStatus::Completed.is_active());
        assert!(!ExtractionStatus::Error.is_active());
    }

    #[test]
    fn test_is_successful() {
        assert!(!ExtractionStatus::Pending.is_successful());
        assert!(!ExtractionStatus::Processing.is_successful());
        assert!(ExtractionStatus::Completed.is_successful());
        assert!(!ExtractionStatus::Error.is_successful());
    }

    #[test]
    fn test_can_retry() {
        assert!(!ExtractionStatus::Pending.can_retry());
        assert!(!ExtractionStatus::Processing.can_retry());
        assert!(!ExtractionStatus::Completed.can_retry());
        assert!(ExtractionStatus::Error.can_retry());
    }

    #[test]
    fn test_can_cancel() {
        assert!(ExtractionStatus::Pending.can_cancel());
        assert!(ExtractionStatus::Processing.can_cancel());
        assert!(!ExtractionStatus::Completed.can_cancel());
        assert!(!ExtractionStatus::Error.can_cancel());
    }

    #[test]
    fn test_valid_transitions() {
        // From Pending
        assert!(ExtractionStatus::Pending.can_transition_to(&ExtractionStatus::Processing));
        assert!(ExtractionStatus::Pending.can_transition_to(&ExtractionStatus::Error));
        assert!(!ExtractionStatus::Pending.can_transition_to(&ExtractionStatus::Completed));

        // From Processing
        assert!(ExtractionStatus::Processing.can_transition_to(&ExtractionStatus::Completed));
        assert!(ExtractionStatus::Processing.can_transition_to(&ExtractionStatus::Error));
        assert!(!ExtractionStatus::Processing.can_transition_to(&ExtractionStatus::Pending));

        // From Error (can retry)
        assert!(ExtractionStatus::Error.can_transition_to(&ExtractionStatus::Pending));
        assert!(!ExtractionStatus::Error.can_transition_to(&ExtractionStatus::Processing));
        assert!(!ExtractionStatus::Error.can_transition_to(&ExtractionStatus::Completed));

        // From Completed (can re-extract)
        assert!(ExtractionStatus::Completed.can_transition_to(&ExtractionStatus::Pending));
        assert!(!ExtractionStatus::Completed.can_transition_to(&ExtractionStatus::Processing));
        assert!(!ExtractionStatus::Completed.can_transition_to(&ExtractionStatus::Error));
    }

    #[test]
    fn test_next_success_status() {
        assert_eq!(
            ExtractionStatus::Pending.next_success_status(),
            Some(ExtractionStatus::Processing)
        );
        assert_eq!(
            ExtractionStatus::Processing.next_success_status(),
            Some(ExtractionStatus::Completed)
        );
        assert_eq!(ExtractionStatus::Completed.next_success_status(), None);
        assert_eq!(ExtractionStatus::Error.next_success_status(), None);
    }

    #[test]
    fn test_display_properties() {
        assert_eq!(ExtractionStatus::Pending.display_color(), "orange");
        assert_eq!(ExtractionStatus::Processing.display_color(), "blue");
        assert_eq!(ExtractionStatus::Completed.display_color(), "green");
        assert_eq!(ExtractionStatus::Error.display_color(), "red");

        assert_eq!(ExtractionStatus::Pending.icon_name(), "clock");
        assert_eq!(ExtractionStatus::Processing.icon_name(), "loader");
        assert_eq!(ExtractionStatus::Completed.icon_name(), "check-circle");
        assert_eq!(ExtractionStatus::Error.icon_name(), "alert-circle");
    }

    #[test]
    fn test_from_str() {
        assert_eq!("pending".parse::<ExtractionStatus>().unwrap(), ExtractionStatus::Pending);
        assert_eq!("PROCESSING".parse::<ExtractionStatus>().unwrap(), ExtractionStatus::Processing);
        assert_eq!("Completed".parse::<ExtractionStatus>().unwrap(), ExtractionStatus::Completed);
        assert_eq!("ERROR".parse::<ExtractionStatus>().unwrap(), ExtractionStatus::Error);

        assert!("invalid".parse::<ExtractionStatus>().is_err());
    }

    #[test]
    fn test_display() {
        assert_eq!(ExtractionStatus::Pending.to_string(), "Pending");
        assert_eq!(ExtractionStatus::Processing.to_string(), "Processing");
        assert_eq!(ExtractionStatus::Completed.to_string(), "Completed");
        assert_eq!(ExtractionStatus::Error.to_string(), "Error");
    }

    #[test]
    fn test_all() {
        let all_statuses = ExtractionStatus::all();
        assert_eq!(all_statuses.len(), 4);
        assert!(all_statuses.contains(&ExtractionStatus::Pending));
        assert!(all_statuses.contains(&ExtractionStatus::Processing));
        assert!(all_statuses.contains(&ExtractionStatus::Completed));
        assert!(all_statuses.contains(&ExtractionStatus::Error));
    }
}