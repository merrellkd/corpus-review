use tauri::State;
use regex::Regex;
use std::sync::OnceLock;

use crate::application::{
    AppState,
    ExtractedDocumentDto,
    SaveResultDto,
};
use crate::infrastructure::AppError;
use crate::domain::extraction::value_objects::{DocumentId, ExtractedDocumentId};

/// Regex pattern for validating document IDs (doc_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
static DOCUMENT_ID_PATTERN: OnceLock<Regex> = OnceLock::new();

/// Regex pattern for validating extracted document IDs (det_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
static EXTRACTED_DOCUMENT_ID_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_document_id_regex() -> &'static Regex {
    DOCUMENT_ID_PATTERN.get_or_init(|| {
        Regex::new(r"^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            .expect("Invalid document ID regex pattern")
    })
}

fn get_extracted_document_id_regex() -> &'static Regex {
    EXTRACTED_DOCUMENT_ID_PATTERN.get_or_init(|| {
        Regex::new(r"^det_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
            .expect("Invalid extracted document ID regex pattern")
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

/// Validates extracted document ID format
fn validate_extracted_document_id(extracted_document_id: &str) -> Result<(), AppError> {
    if !get_extracted_document_id_regex().is_match(extracted_document_id) {
        return Err(AppError::validation_error(
            format!(
                "Invalid extracted document ID format: {}. Expected pattern: det_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                extracted_document_id
            ),
            None
        ));
    }
    Ok(())
}

/// Validates TipTap/ProseMirror JSON content structure
fn validate_tiptap_content(content: &serde_json::Value) -> Result<(), AppError> {
    // Basic validation - TipTap content should be a JSON object with a "type" field
    if !content.is_object() {
        return Err(AppError::validation_error("TipTap content must be a JSON object".to_string(), None));
    }

    let obj = content.as_object().unwrap();

    // Check for required "type" field
    if !obj.contains_key("type") {
        return Err(AppError::validation_error("TipTap content must have a 'type' field".to_string(), None));
    }

    // Validate type is a string
    if !obj.get("type").unwrap().is_string() {
        return Err(AppError::validation_error("TipTap content 'type' field must be a string".to_string(), None));
    }

    // For document type, expect "content" array
    let content_type = obj.get("type").unwrap().as_str().unwrap();
    if content_type == "doc" {
        if let Some(content_array) = obj.get("content") {
            if !content_array.is_array() {
                return Err(AppError::validation_error("TipTap document 'content' field must be an array".to_string(), None));
            }
        }
    }

    Ok(())
}

/// Tauri command to retrieve extracted document content for editing
///
/// This command loads the .det file associated with the original document
/// and returns it in TipTap/ProseMirror JSON format for editing in the
/// DocumentCaddy component.
///
/// # Parameters
/// - `document_id`: The original document ID (doc_*)
///
/// # Returns
/// - `ExtractedDocumentDto`: Complete extracted document with TipTap content
///
/// # Errors
/// - `VALIDATION_ERROR`: Invalid document ID format
/// - `DOCUMENT_NOT_FOUND`: Document doesn't exist
/// - `EXTRACTION_NOT_COMPLETED`: Document hasn't been successfully extracted
/// - `EXTRACTED_DOCUMENT_NOT_FOUND`: .det file not found
/// - `FILE_SYSTEM_ERROR`: Cannot read .det file
#[tauri::command]
pub async fn get_extracted_document(
    document_id: String,
    app_state: State<'_, AppState>,
) -> Result<ExtractedDocumentDto, AppError> {
    // Validate document ID format
    validate_document_id(&document_id)?;

    // Parse document ID
    let doc_id = DocumentId::from_string(document_id.clone())
        .map_err(|e| AppError::validation_error(format!("Invalid document ID: {}", e), None))?;

    // Get extraction service
    let extraction_service = app_state.extraction_service();

    // Retrieve extracted document
    extraction_service
        .get_extracted_document(&doc_id)
        .await
}

/// Tauri command to save changes to extracted document content
///
/// This command validates the TipTap/ProseMirror JSON content and saves it
/// to the corresponding .det file, updating metadata and statistics.
///
/// # Parameters
/// - `extracted_document_id`: The extracted document ID (det_*)
/// - `tiptap_content`: Valid TipTap/ProseMirror JSON structure
///
/// # Returns
/// - `SaveResultDto`: Save operation result with updated statistics
///
/// # Errors
/// - `VALIDATION_ERROR`: Invalid extracted document ID format
/// - `INVALID_CONTENT`: TipTap content doesn't match expected ProseMirror format
/// - `EXTRACTED_DOCUMENT_NOT_FOUND`: .det document doesn't exist
/// - `FILE_SYSTEM_ERROR`: Cannot write to .det file
#[tauri::command]
pub async fn save_extracted_document(
    extracted_document_id: String,
    tiptap_content: serde_json::Value,
    app_state: State<'_, AppState>,
) -> Result<SaveResultDto, AppError> {
    // Validate extracted document ID format
    validate_extracted_document_id(&extracted_document_id)?;

    // Validate TipTap content structure
    validate_tiptap_content(&tiptap_content)?;

    // Parse extracted document ID
    let extracted_doc_id = ExtractedDocumentId::from_string(extracted_document_id.clone())
        .map_err(|e| AppError::validation_error(format!("Invalid extracted document ID: {}", e), None))?;

    // Get extraction service
    let extraction_service = app_state.extraction_service();

    // Save extracted document
    extraction_service
        .save_extracted_document(&extracted_doc_id, tiptap_content)
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
            "doc_invalid-format",
            "doc_12345678-1234-1234-1234",
            "",
        ];

        for id in invalid_ids {
            assert!(validate_document_id(id).is_err(), "ID should be invalid: {}", id);
        }
    }

    #[test]
    fn test_validate_extracted_document_id_valid() {
        let valid_id = "det_12345678-1234-1234-1234-123456789012";
        assert!(validate_extracted_document_id(valid_id).is_ok());
    }

    #[test]
    fn test_validate_extracted_document_id_invalid() {
        let invalid_ids = vec![
            "invalid_id",
            "doc_12345678-1234-1234-1234-123456789012",
            "det_invalid-format",
            "det_12345678-1234-1234-1234",
            "",
        ];

        for id in invalid_ids {
            assert!(validate_extracted_document_id(id).is_err(), "ID should be invalid: {}", id);
        }
    }

    #[test]
    fn test_validate_tiptap_content_valid() {
        let valid_content = serde_json::json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Hello world"
                        }
                    ]
                }
            ]
        });

        assert!(validate_tiptap_content(&valid_content).is_ok());
    }

    #[test]
    fn test_validate_tiptap_content_invalid() {
        let invalid_contents = vec![
            serde_json::json!("not an object"),
            serde_json::json!(123),
            serde_json::json!({}), // Missing type
            serde_json::json!({"type": 123}), // Type not a string
            serde_json::json!({"type": "doc", "content": "not an array"}),
        ];

        for content in invalid_contents {
            assert!(validate_tiptap_content(&content).is_err());
        }
    }

    #[test]
    fn test_document_id_regex_pattern() {
        let regex = get_document_id_regex();

        // Valid patterns
        assert!(regex.is_match("doc_12345678-1234-1234-1234-123456789012"));
        assert!(regex.is_match("doc_abcdef01-2345-6789-abcd-ef0123456789"));

        // Invalid patterns
        assert!(!regex.is_match("doc_invalid"));
        assert!(!regex.is_match("proj_12345678-1234-1234-1234-123456789012"));
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-1234567890123")); // Too long
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-12345678901")); // Too short
    }

    #[test]
    fn test_extracted_document_id_regex_pattern() {
        let regex = get_extracted_document_id_regex();

        // Valid patterns
        assert!(regex.is_match("det_12345678-1234-1234-1234-123456789012"));
        assert!(regex.is_match("det_abcdef01-2345-6789-abcd-ef0123456789"));

        // Invalid patterns
        assert!(!regex.is_match("det_invalid"));
        assert!(!regex.is_match("doc_12345678-1234-1234-1234-123456789012"));
        assert!(!regex.is_match("det_12345678-1234-1234-1234-1234567890123")); // Too long
        assert!(!regex.is_match("det_12345678-1234-1234-1234-12345678901")); // Too short
    }
}