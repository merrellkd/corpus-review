use tauri::State;
use tracing::{info, warn, error};
use regex::Regex;

use crate::application::AppState;
use crate::infrastructure::AppError;
use crate::domain::extraction::value_objects::{DocumentId, ExtractionId, DocumentIdError, ExtractionIdError};
use crate::application::dtos::ExtractionStatusDto;

/// Regular expression for validating document ID format (doc_[UUID])
const DOCUMENT_ID_PATTERN: &str = r"^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

/// Regular expression for validating extraction ID format (ext_[UUID])
const EXTRACTION_ID_PATTERN: &str = r"^ext_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";

// ============================================================================
// Extraction Workflow Commands
// ============================================================================

/// Tauri command to start document extraction
///
/// This command initiates the extraction process for a document, converting it
/// from its original format (PDF, DOCX, Markdown) to an editable .det file
/// containing TipTap/ProseMirror JSON content.
///
/// # Parameters
/// - `document_id`: Document identifier in format "doc_[UUID]"
/// - `force_reextract`: Whether to force re-extraction if one already exists
///
/// # Returns
/// - `ExtractionStatusDto` with initial extraction status and progress information
///
/// # Errors
/// - `VALIDATION_ERROR` if document_id format is invalid
/// - `DOCUMENT_NOT_FOUND` if document doesn't exist
/// - `EXTRACTION_IN_PROGRESS` if extraction is already running (unless force is true)
/// - `UNSUPPORTED_FILE_TYPE` if file type cannot be extracted
/// - `FILE_TOO_LARGE` if file exceeds 10MB limit
/// - `RESOURCE_EXHAUSTED` if maximum concurrent extractions reached
#[tauri::command]
pub async fn start_document_extraction(
    document_id: String,
    force_reextract: Option<bool>,
    app_state: State<'_, AppState>,
) -> Result<ExtractionStatusDto, AppError> {
    info!(
        "🔧 Starting document extraction: document_id={}, force_reextract={:?}",
        document_id, force_reextract
    );

    // Record command execution
    app_state.record_command_execution().await;

    // Validate document_id format
    let _doc_id = validate_document_id(&document_id)?;
    let _force = force_reextract.unwrap_or(false);

    // Get extraction service (placeholder for now since it's not in AppState yet)
    // TODO: Add ExtractionService to AppState and uncomment below
    /*
    let extraction_service = app_state.extraction_service();
    let result = extraction_service
        .start_document_extraction(&doc_id, force)
        .await
        .map_err(AppError::from);
    */

    // Temporary placeholder response until ExtractionService is integrated
    warn!("⚠️ ExtractionService not yet integrated into AppState - returning placeholder response");
    let result = Ok(ExtractionStatusDto {
        extraction_id: format!("ext_{}", uuid::Uuid::new_v4()),
        document_id: document_id.clone(),
        status: crate::application::dtos::original_document_dto::ExtractionStatus::Pending,
        extraction_method: None,
        started_at: chrono::Utc::now(),
        completed_at: None,
        error_message: None,
        progress_percentage: Some(0),
    });

    match &result {
        Ok(status) => {
            info!(
                "✅ Document extraction started successfully: extraction_id={}, document_id={}, status={:?}",
                status.extraction_id, status.document_id, status.status
            );
        }
        Err(e) => {
            error!("❌ Failed to start document extraction: {:?}", e);
        }
    }

    result
}

/// Tauri command to get extraction status
///
/// This command retrieves the current status and progress of a document extraction.
/// It provides real-time updates including progress percentage, current status,
/// and any error messages.
///
/// # Parameters
/// - `extraction_id`: Extraction identifier in format "ext_[UUID]"
///
/// # Returns
/// - `ExtractionStatusDto` with current extraction status and progress
///
/// # Errors
/// - `VALIDATION_ERROR` if extraction_id format is invalid
/// - `EXTRACTION_NOT_FOUND` if extraction doesn't exist
#[tauri::command]
pub async fn get_extraction_status(
    extraction_id: String,
    app_state: State<'_, AppState>,
) -> Result<ExtractionStatusDto, AppError> {
    info!("🔍 Getting extraction status: extraction_id={}", extraction_id);

    // Record command execution
    app_state.record_command_execution().await;

    // Validate extraction_id format
    let _ext_id = validate_extraction_id(&extraction_id)?;

    // Get extraction service (placeholder for now since it's not in AppState yet)
    // TODO: Add ExtractionService to AppState and uncomment below
    /*
    let extraction_service = app_state.extraction_service();
    let result = extraction_service
        .get_extraction_status(&ext_id)
        .await
        .map_err(AppError::from);
    */

    // Temporary placeholder response until ExtractionService is integrated
    warn!("⚠️ ExtractionService not yet integrated into AppState - returning placeholder response");
    let result = Ok(ExtractionStatusDto {
        extraction_id: extraction_id.clone(),
        document_id: format!("doc_{}", uuid::Uuid::new_v4()),
        status: crate::application::dtos::original_document_dto::ExtractionStatus::Processing,
        extraction_method: Some(crate::application::dtos::extraction_status_dto::ExtractionMethod::PdfTextExtraction),
        started_at: chrono::Utc::now() - chrono::Duration::minutes(2),
        completed_at: None,
        error_message: None,
        progress_percentage: Some(45),
    });

    match &result {
        Ok(status) => {
            info!(
                "✅ Extraction status retrieved successfully: extraction_id={}, status={:?}, progress={:?}%",
                status.extraction_id, status.status, status.progress_percentage
            );
        }
        Err(e) => {
            error!("❌ Failed to get extraction status: {:?}", e);
        }
    }

    result
}

/// Tauri command to cancel an in-progress extraction
///
/// This command attempts to cancel a running extraction. Only extractions
/// in Pending or Processing status can be cancelled. Completed or already
/// failed extractions cannot be cancelled.
///
/// # Parameters
/// - `extraction_id`: Extraction identifier in format "ext_[UUID]"
///
/// # Returns
/// - `bool` indicating whether the cancellation was successful
///
/// # Errors
/// - `VALIDATION_ERROR` if extraction_id format is invalid
/// - `EXTRACTION_NOT_FOUND` if extraction doesn't exist
/// - `EXTRACTION_NOT_CANCELLABLE` if extraction is not in a cancellable state
#[tauri::command]
pub async fn cancel_extraction(
    extraction_id: String,
    app_state: State<'_, AppState>,
) -> Result<bool, AppError> {
    info!("🛑 Cancelling extraction: extraction_id={}", extraction_id);

    // Record command execution
    app_state.record_command_execution().await;

    // Validate extraction_id format
    let _ext_id = validate_extraction_id(&extraction_id)?;

    // Get extraction service (placeholder for now since it's not in AppState yet)
    // TODO: Add ExtractionService to AppState and uncomment below
    /*
    let extraction_service = app_state.extraction_service();
    let result = extraction_service
        .cancel_extraction(&ext_id)
        .await
        .map_err(AppError::from);
    */

    // Temporary placeholder response until ExtractionService is integrated
    warn!("⚠️ ExtractionService not yet integrated into AppState - returning placeholder response");
    let result = Ok(true);

    match &result {
        Ok(cancelled) => {
            if *cancelled {
                info!("✅ Extraction cancelled successfully: extraction_id={}", extraction_id);
            } else {
                warn!("⚠️ Extraction could not be cancelled: extraction_id={}", extraction_id);
            }
        }
        Err(e) => {
            error!("❌ Failed to cancel extraction: {:?}", e);
        }
    }

    result
}

// ============================================================================
// Validation Helper Functions
// ============================================================================

/// Validates document ID format and converts to DocumentId value object
///
/// # Parameters
/// - `document_id`: String representation of document ID
///
/// # Returns
/// - `DocumentId` value object if validation succeeds
///
/// # Errors
/// - `VALIDATION_ERROR` if format is invalid
fn validate_document_id(document_id: &str) -> Result<DocumentId, AppError> {
    // Check format using regex
    let regex = Regex::new(DOCUMENT_ID_PATTERN)
        .map_err(|e| AppError::internal_error(format!("Invalid document ID regex: {}", e)))?;

    if !regex.is_match(document_id) {
        return Err(AppError::new(
            "VALIDATION_ERROR",
            "Invalid document ID format",
            Some(format!("Expected format: doc_[UUID], got: {}", document_id)),
            true,
            true
        ));
    }

    // Convert to DocumentId value object
    DocumentId::from_string(document_id.to_string())
        .map_err(|e| match e {
            DocumentIdError::InvalidPrefix => AppError::new(
                "VALIDATION_ERROR",
                "Invalid document ID prefix",
                Some("Document ID must start with 'doc_'".to_string()),
                true,
                true
            ),
            DocumentIdError::InvalidUuid => AppError::new(
                "VALIDATION_ERROR",
                "Invalid document ID UUID format",
                Some(format!("Invalid UUID in document ID: {}", document_id)),
                true,
                true
            ),
        })
}

/// Validates extraction ID format and converts to ExtractionId value object
///
/// # Parameters
/// - `extraction_id`: String representation of extraction ID
///
/// # Returns
/// - `ExtractionId` value object if validation succeeds
///
/// # Errors
/// - `VALIDATION_ERROR` if format is invalid
fn validate_extraction_id(extraction_id: &str) -> Result<ExtractionId, AppError> {
    // Check format using regex
    let regex = Regex::new(EXTRACTION_ID_PATTERN)
        .map_err(|e| AppError::internal_error(format!("Invalid extraction ID regex: {}", e)))?;

    if !regex.is_match(extraction_id) {
        return Err(AppError::new(
            "VALIDATION_ERROR",
            "Invalid extraction ID format",
            Some(format!("Expected format: ext_[UUID], got: {}", extraction_id)),
            true,
            true
        ));
    }

    // Convert to ExtractionId value object
    ExtractionId::from_string(extraction_id.to_string())
        .map_err(|e| match e {
            ExtractionIdError::InvalidPrefix => AppError::new(
                "VALIDATION_ERROR",
                "Invalid extraction ID prefix",
                Some("Extraction ID must start with 'ext_'".to_string()),
                true,
                true
            ),
            ExtractionIdError::InvalidUuid => AppError::new(
                "VALIDATION_ERROR",
                "Invalid extraction ID UUID format",
                Some(format!("Invalid UUID in extraction ID: {}", extraction_id)),
                true,
                true
            ),
        })
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_document_id_valid() {
        let valid_id = "doc_12345678-1234-1234-1234-123456789012";
        let result = validate_document_id(valid_id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_str(), valid_id);
    }

    #[test]
    fn test_validate_document_id_invalid_prefix() {
        let invalid_id = "invalid_12345678-1234-1234-1234-123456789012";
        let result = validate_document_id(invalid_id);
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "VALIDATION_ERROR");
        assert!(error.message.contains("Invalid document ID format"));
    }

    #[test]
    fn test_validate_document_id_invalid_uuid() {
        let invalid_id = "doc_not-a-valid-uuid";
        let result = validate_document_id(invalid_id);
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "VALIDATION_ERROR");
        assert!(error.message.contains("Invalid document ID format"));
    }

    #[test]
    fn test_validate_extraction_id_valid() {
        let valid_id = "ext_12345678-1234-1234-1234-123456789012";
        let result = validate_extraction_id(valid_id);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().as_str(), valid_id);
    }

    #[test]
    fn test_validate_extraction_id_invalid_prefix() {
        let invalid_id = "invalid_12345678-1234-1234-1234-123456789012";
        let result = validate_extraction_id(invalid_id);
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "VALIDATION_ERROR");
        assert!(error.message.contains("Invalid extraction ID format"));
    }

    #[test]
    fn test_validate_extraction_id_invalid_uuid() {
        let invalid_id = "ext_not-a-valid-uuid";
        let result = validate_extraction_id(invalid_id);
        assert!(result.is_err());

        let error = result.unwrap_err();
        assert_eq!(error.code, "VALIDATION_ERROR");
        assert!(error.message.contains("Invalid extraction ID format"));
    }

    #[test]
    fn test_document_id_pattern_validation() {
        let regex = Regex::new(DOCUMENT_ID_PATTERN).unwrap();

        // Valid cases
        assert!(regex.is_match("doc_12345678-1234-1234-1234-123456789012"));
        assert!(regex.is_match("doc_abcdef12-3456-7890-abcd-ef1234567890"));

        // Invalid cases
        assert!(!regex.is_match("doc_12345678-1234-1234-1234"));  // Too short
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-123456789012-extra"));  // Too long
        assert!(!regex.is_match("doc_GGGGGGGG-1234-1234-1234-123456789012"));  // Invalid chars
        assert!(!regex.is_match("invalid_12345678-1234-1234-1234-123456789012"));  // Wrong prefix
        assert!(!regex.is_match("12345678-1234-1234-1234-123456789012"));  // No prefix
    }

    #[test]
    fn test_extraction_id_pattern_validation() {
        let regex = Regex::new(EXTRACTION_ID_PATTERN).unwrap();

        // Valid cases
        assert!(regex.is_match("ext_12345678-1234-1234-1234-123456789012"));
        assert!(regex.is_match("ext_abcdef12-3456-7890-abcd-ef1234567890"));

        // Invalid cases
        assert!(!regex.is_match("ext_12345678-1234-1234-1234"));  // Too short
        assert!(!regex.is_match("ext_12345678-1234-1234-1234-123456789012-extra"));  // Too long
        assert!(!regex.is_match("ext_GGGGGGGG-1234-1234-1234-123456789012"));  // Invalid chars
        assert!(!regex.is_match("invalid_12345678-1234-1234-1234-123456789012"));  // Wrong prefix
        assert!(!regex.is_match("12345678-1234-1234-1234-123456789012"));  // No prefix
    }

    // Integration tests would require AppState setup, which is complex
    // These would typically be in a separate integration test module
}