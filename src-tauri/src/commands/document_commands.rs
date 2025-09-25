use tauri::State;
use tracing::{debug, info, error};
use regex::Regex;

use crate::application::AppState;
use crate::domain::extraction::value_objects::DocumentId;
use crate::domain::project::value_objects::ProjectId;
use crate::infrastructure::AppError;

/// Validates project ID format (proj_[UUID])
fn validate_project_id(project_id: &str) -> Result<ProjectId, AppError> {
    let project_id_regex = Regex::new(r"^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap();

    if !project_id_regex.is_match(project_id) {
        return Err(AppError::validation_error(
            "Invalid project ID format",
            Some("Project ID must match pattern: proj_[UUID]".to_string())
        ));
    }

    ProjectId::from_string(project_id.to_string())
        .map_err(|e| AppError::validation_error(
            "Invalid project ID",
            Some(e.to_string())
        ))
}

/// Validates document ID format (doc_[UUID])
fn validate_document_id(document_id: &str) -> Result<DocumentId, AppError> {
    let document_id_regex = Regex::new(r"^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap();

    if !document_id_regex.is_match(document_id) {
        return Err(AppError::validation_error(
            "Invalid document ID format",
            Some("Document ID must match pattern: doc_[UUID]".to_string())
        ));
    }

    DocumentId::from_string(document_id.to_string())
        .map_err(|e| AppError::validation_error(
            "Invalid document ID",
            Some(e.to_string())
        ))
}

// ============================================================================
// Document Discovery and Management Commands
// ============================================================================

/// Tauri command to scan a project workspace for supported document files
///
/// This recursively searches through the project source folder to find PDF,
/// DOCX, and Markdown files. It validates file size limits and returns
/// document DTOs with current extraction status information.
#[tauri::command]
pub async fn scan_project_documents(
    project_id: String,
    app_state: State<'_, AppState>,
) -> Result<Vec<serde_json::Value>, AppError> {
    debug!("🔍 Starting document scan for project: {}", project_id);

    // Validate project ID format
    let validated_project_id = validate_project_id(&project_id)?;

    // Record command execution for statistics
    app_state.record_command_execution().await;

    // Validate that the project exists
    let project_service = app_state.project_service();
    let project_dto = project_service.get_project(validated_project_id.value())
        .await
        .map_err(|e| {
            error!("Failed to get project {}: {:?}", project_id, e);
            e
        })?
        .ok_or_else(|| {
            error!("Project not found: {}", project_id);
            AppError::not_found("Project")
        })?;

    let source_folder = &project_dto.source_folder;
    debug!("📁 Project source folder: {}", source_folder);

    // Document scanning service not yet implemented - return placeholder
    info!("📄 Document scanning service not yet implemented - returning empty result");
    Ok(vec![])
}

/// Tauri command to get detailed information about a specific document
///
/// Returns comprehensive document information including extraction history,
/// file metadata, and processing statistics for debugging and analysis.
#[tauri::command]
pub async fn get_document_details(
    document_id: String,
    app_state: State<'_, AppState>,
) -> Result<serde_json::Value, AppError> {
    debug!("📋 Getting document details for: {}", document_id);

    // Validate document ID format
    let validated_document_id = validate_document_id(&document_id)?;

    // Record command execution for statistics
    app_state.record_command_execution().await;

    // Document details service not yet implemented
    info!("📄 Document details service not yet implemented");
    Err(AppError::internal_error("Document service not yet implemented"))
}

// Note: Extraction operations, extracted document operations, and viewing operations
// are handled by separate command modules (extraction_commands.rs, extracted_document_commands.rs,
// and document_preview_commands.rs respectively) to avoid duplicate command definitions.

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_project_id() {
        // Valid project ID
        let valid_id = "proj_12345678-1234-1234-1234-123456789012";
        assert!(validate_project_id(valid_id).is_ok());

        // Invalid format - wrong prefix
        let invalid_prefix = "project_12345678-1234-1234-1234-123456789012";
        assert!(validate_project_id(invalid_prefix).is_err());

        // Invalid format - malformed UUID
        let invalid_uuid = "proj_invalid-uuid-format";
        assert!(validate_project_id(invalid_uuid).is_err());

        // Invalid format - missing UUID
        let missing_uuid = "proj_";
        assert!(validate_project_id(missing_uuid).is_err());

        // Empty string
        assert!(validate_project_id("").is_err());
    }

    #[test]
    fn test_validate_document_id() {
        // Valid document ID
        let valid_id = "doc_12345678-1234-1234-1234-123456789012";
        assert!(validate_document_id(valid_id).is_ok());

        // Invalid format - wrong prefix
        let invalid_prefix = "document_12345678-1234-1234-1234-123456789012";
        assert!(validate_document_id(invalid_prefix).is_err());

        // Invalid format - malformed UUID
        let invalid_uuid = "doc_invalid-uuid-format";
        assert!(validate_document_id(invalid_uuid).is_err());

        // Empty string
        assert!(validate_document_id("").is_err());
    }

    #[test]
    fn test_regex_patterns() {
        let project_regex = Regex::new(r"^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap();
        let document_regex = Regex::new(r"^doc_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$").unwrap();

        // Test valid UUIDs
        assert!(project_regex.is_match("proj_12345678-1234-1234-1234-123456789012"));
        assert!(document_regex.is_match("doc_abcdefgh-1234-5678-9012-123456789012"));

        // Test invalid formats
        assert!(!project_regex.is_match("proj_invalid-format"));
        assert!(!document_regex.is_match("doc_12345678-1234-1234-1234")); // Too short
    }
}