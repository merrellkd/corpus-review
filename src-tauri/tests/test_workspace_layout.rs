// T006: Contract test for get_workspace_layout command
// This test MUST FAIL initially - implementing TDD approach

use corpus_review::commands::workspace_commands::get_workspace_layout;

#[tokio::test]
async fn test_get_workspace_layout_with_valid_project_id() {
    // Arrange
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();

    // Act
    let result = get_workspace_layout(project_id).await;

    // Assert
    assert!(
        result.is_ok(),
        "get_workspace_layout should return Ok for valid project ID"
    );
    let layout_json = result.unwrap();

    // Should return a valid JSON structure matching WorkspaceLayoutDto
    let parsed: serde_json::Value =
        serde_json::from_str(&layout_json).expect("Result should be valid JSON");

    // Verify required fields are present (even if null initially)
    assert!(parsed.get("id").is_some(), "Layout should have an id field");
    assert!(
        parsed.get("projectId").is_some(),
        "Layout should have a projectId field"
    );
    assert!(
        parsed.get("panelStates").is_some(),
        "Layout should have a panelStates field"
    );
    assert!(
        parsed.get("panelSizes").is_some(),
        "Layout should have a panelSizes field"
    );
    assert!(
        parsed.get("lastModified").is_some(),
        "Layout should have a lastModified field"
    );
}

#[tokio::test]
async fn test_get_workspace_layout_with_nonexistent_project() {
    // Arrange
    let nonexistent_project_id = "project_00000000-0000-0000-0000-000000000000".to_string();

    // Act
    let result = get_workspace_layout(nonexistent_project_id).await;

    // Assert - should return Ok with null/empty layout for nonexistent project
    assert!(
        result.is_ok(),
        "get_workspace_layout should handle nonexistent projects gracefully"
    );
    let layout_json = result.unwrap();

    // Should return null or empty object for nonexistent project
    let parsed: serde_json::Value =
        serde_json::from_str(&layout_json).expect("Result should be valid JSON");

    // Could be null or an empty object, both are valid responses
    assert!(
        parsed.is_null() || (parsed.is_object() && parsed.as_object().unwrap().is_empty()),
        "Nonexistent project should return null or empty object"
    );
}

#[tokio::test]
async fn test_get_workspace_layout_with_invalid_project_id() {
    // Arrange
    let invalid_project_id = "not-a-valid-uuid".to_string();

    // Act
    let result = get_workspace_layout(invalid_project_id).await;

    // Assert - should return error for invalid UUID format
    assert!(
        result.is_err(),
        "get_workspace_layout should return error for invalid project ID format"
    );
    let error_message = result.unwrap_err();
    assert!(
        error_message.contains("invalid") || error_message.contains("format"),
        "Error message should indicate invalid format: {}",
        error_message
    );
}

#[tokio::test]
async fn test_get_workspace_layout_response_schema() {
    // Arrange
    let project_id = "project_123e4567-e89b-12d3-a456-426614174000".to_string();

    // Act
    let result = get_workspace_layout(project_id).await;

    // Assert
    assert!(result.is_ok(), "get_workspace_layout should return Ok");
    let layout_json = result.unwrap();
    let parsed: serde_json::Value =
        serde_json::from_str(&layout_json).expect("Result should be valid JSON");

    // If layout exists, verify schema matches GetWorkspaceLayoutResponse
    if !parsed.is_null() {
        // Verify panelStates structure
        if let Some(panel_states) = parsed.get("panelStates") {
            assert!(panel_states.get("fileExplorerVisible").is_some());
            assert!(panel_states.get("categoryExplorerVisible").is_some());
            assert!(panel_states.get("searchPanelVisible").is_some());
            assert!(panel_states.get("documentWorkspaceVisible").is_some());
        }

        // Verify panelSizes structure
        if let Some(panel_sizes) = parsed.get("panelSizes") {
            assert!(panel_sizes.get("explorerWidth").is_some());
            assert!(panel_sizes.get("workspaceWidth").is_some());
            assert!(panel_sizes.get("panelHeights").is_some());
        }
    }
}
