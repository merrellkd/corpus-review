use tauri::State;
use regex::Regex;
use std::sync::OnceLock;

use crate::application::{
    AppState,
    DocumentPreviewDto,
};
use crate::infrastructure::AppError;
use crate::domain::extraction::value_objects::DocumentId;

/// Regex pattern for validating document IDs (doc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
static DOCUMENT_ID_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_document_id_regex() -> &'static Regex {
    DOCUMENT_ID_PATTERN.get_or_init(|| {
        Regex::new(r"^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            .expect("Invalid document ID regex pattern")
    })
}

/// Validates document ID format
fn validate_document_id(document_id: &str) -> Result<(), AppError> {
    if !get_document_id_regex().is_match(document_id) {
        return Err(AppError::validation_error(
            format!(
                "Invalid document ID format: {}. Expected pattern: doc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                document_id
            ),
            None
        ));
    }
    Ok(())
}

/// Tauri command to get preview/metadata for original document viewing
///
/// This command returns preview content and metadata for displaying original
/// documents in read-only mode in the DocumentCaddy component. It supports
/// PDF, DOCX, and Markdown files with appropriate preview generation.
///
/// # Parameters
/// - `document_id`: The original document ID (doc_*)
///
/// # Returns
/// - `DocumentPreviewDto`: Preview content and metadata for read-only display
///
/// # Errors
/// - `VALIDATION_ERROR`: Invalid document ID format
/// - `DOCUMENT_NOT_FOUND`: Document doesn't exist in repository
/// - `FILE_NOT_ACCESSIBLE`: Document file cannot be read from disk
/// - `FILE_SYSTEM_ERROR`: Error reading file content or metadata
///
/// # Preview Generation Strategy
/// - **PDF files**: Extract metadata and first-page preview or summary
/// - **DOCX files**: Extract text content and document properties
/// - **Markdown files**: Convert to HTML for display with proper formatting
///
/// # Usage
/// This command is used by the DocumentCaddy component when displaying
/// original documents in read-only mode, before users decide to extract
/// them for editing.
#[tauri::command]
pub async fn get_original_document_preview(
    document_id: String,
    app_state: State<'_, AppState>,
) -> Result<DocumentPreviewDto, AppError> {
    // Validate document ID format
    validate_document_id(&document_id)?;

    // Parse document ID
    let doc_id = DocumentId::from_string(document_id.clone())
        .map_err(|e| AppError::validation_error(format!("Invalid document ID: {}", e), None))?;

    // Get document service
    let document_service = app_state.document_service();

    // Generate document preview
    document_service
        .get_document_preview(&doc_id)
        .await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_document_id_valid() {
        let valid_id = "doc_12345678-1234-1234-1234-123456789012";
        assert!(validate_document_id(valid_id).is_ok());
    }

    #[test]
    fn test_validate_document_id_invalid() {
        let invalid_ids = vec![
            "invalid_id",
            "proj_12345678-1234-1234-1234-123456789012",
            "det_12345678-1234-1234-1234-123456789012",
            "doc_invalid-format",
            "doc_12345678-1234-1234-1234",
            "doc_12345678-1234-1234-1234-1234567890123", // Too long
            "",
        ];

        for id in invalid_ids {
            assert!(validate_document_id(id).is_err(), "ID should be invalid: {}", id);
        }
    }

    #[test]
    fn test_document_id_regex_pattern() {
        let regex = get_document_id_regex();

        // Valid patterns
        assert!(regex.is_match("doc_12345678-1234-1234-1234-123456789012"));
        assert!(regex.is_match("doc_abcdef01-2345-6789-abcd-ef0123456789"));
        assert!(regex.is_match("doc_00000000-0000-0000-0000-000000000000"));

        // Invalid patterns
        assert!(!regex.is_match("doc_invalid"));
        assert!(!regex.is_match("proj_12345678-1234-1234-1234-123456789012"));
        assert!(!regex.is_match("det_12345678-1234-1234-1234-123456789012"));
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-1234567890123")); // Too long
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-12345678901")); // Too short
        assert!(!regex.is_match("DOC_12345678-1234-1234-1234-123456789012")); // Wrong case
    }

    #[test]
    fn test_document_id_regex_components() {
        let regex = get_document_id_regex();

        // Test the pattern components
        let valid_uuid = "12345678-1234-1234-1234-123456789012";

        // Should match with doc_ prefix
        assert!(regex.is_match(&format!("doc_{}", valid_uuid)));

        // Should not match with other prefixes
        assert!(!regex.is_match(&format!("ext_{}", valid_uuid)));
        assert!(!regex.is_match(&format!("det_{}", valid_uuid)));
        assert!(!regex.is_match(&format!("proj_{}", valid_uuid)));

        // Should not match without prefix
        assert!(!regex.is_match(valid_uuid));
    }

    #[test]
    fn test_document_id_regex_hex_validation() {
        let regex = get_document_id_regex();

        // Should match with lowercase hex
        assert!(regex.is_match("doc_abcdef01-2345-6789-abcd-ef0123456789"));

        // Should not match with uppercase hex (regex requires lowercase)
        assert!(!regex.is_match("doc_ABCDEF01-2345-6789-ABCD-EF0123456789"));

        // Should not match with invalid hex characters
        assert!(!regex.is_match("doc_ghijklmn-1234-1234-1234-123456789012"));
        assert!(!regex.is_match("doc_1234567g-1234-1234-1234-123456789012"));
    }
}