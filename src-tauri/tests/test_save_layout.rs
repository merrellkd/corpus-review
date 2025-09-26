// T007: Contract test for save_workspace_layout command
// This test MUST FAIL initially - implementing TDD approach

use corpus_review::commands::workspace_commands::save_workspace_layout;

#[tokio::test]
async fn test_save_workspace_layout_with_valid_data() {
    // Arrange
    let layout_json = r#"{
        "id": "workspace_550e8400-e29b-41d4-a716-446655440000",
        "projectId": "project_550e8400-e29b-41d4-a716-446655440000",
        "panelStates": {
            "fileExplorerVisible": true,
            "categoryExplorerVisible": true,
            "searchPanelVisible": false,
            "documentWorkspaceVisible": true
        },
        "panelSizes": {
            "explorerWidth": 25.0,
            "workspaceWidth": 75.0,
            "panelHeights": {
                "fileExplorer": 50.0,
                "categoryExplorer": 50.0
            }
        },
        "lastModified": "2025-09-19T20:00:00Z"
    }"#
    .to_string();

    // Act
    let result = save_workspace_layout(layout_json).await;

    // Assert
    assert!(
        result.is_ok(),
        "save_workspace_layout should return Ok for valid data"
    );
    let response_json = result.unwrap();

    // Should return a success response matching SaveWorkspaceLayoutResponse
    let parsed: serde_json::Value =
        serde_json::from_str(&response_json).expect("Result should be valid JSON");

    assert!(
        parsed.get("success").is_some(),
        "Response should have a success field"
    );
    assert_eq!(
        parsed.get("success").unwrap().as_bool(),
        Some(true),
        "Success should be true"
    );
}

#[tokio::test]
async fn test_save_workspace_layout_with_invalid_json() {
    // Arrange
    let invalid_json = r#"{ invalid json structure }"#.to_string();

    // Act
    let result = save_workspace_layout(invalid_json).await;

    // Assert
    assert!(
        result.is_err(),
        "save_workspace_layout should return error for invalid JSON"
    );
    let error_message = result.unwrap_err();
    assert!(
        error_message.contains("invalid") || error_message.contains("JSON"),
        "Error message should indicate invalid JSON: {}",
        error_message
    );
}

#[tokio::test]
async fn test_save_workspace_layout_with_missing_required_fields() {
    // Arrange
    let incomplete_json = r#"{
        "id": "workspace_550e8400-e29b-41d4-a716-446655440000"
    }"#
    .to_string();

    // Act
    let result = save_workspace_layout(incomplete_json).await;

    // Assert
    assert!(
        result.is_err(),
        "save_workspace_layout should return error for incomplete data"
    );
    let error_message = result.unwrap_err();
    assert!(
        error_message.contains("missing") || error_message.contains("required"),
        "Error message should indicate missing required fields: {}",
        error_message
    );
}

#[tokio::test]
async fn test_save_workspace_layout_with_invalid_uuid() {
    // Arrange
    let layout_with_invalid_uuid = r#"{
        "id": "not-a-valid-uuid",
        "projectId": "project_550e8400-e29b-41d4-a716-446655440000",
        "panelStates": {
            "fileExplorerVisible": true,
            "categoryExplorerVisible": true,
            "searchPanelVisible": false,
            "documentWorkspaceVisible": true
        },
        "panelSizes": {
            "explorerWidth": 25.0,
            "workspaceWidth": 75.0,
            "panelHeights": {}
        },
        "lastModified": "2025-09-19T20:00:00Z"
    }"#
    .to_string();

    // Act
    let result = save_workspace_layout(layout_with_invalid_uuid).await;

    // Assert
    assert!(
        result.is_err(),
        "save_workspace_layout should return error for invalid UUID"
    );
    let error_message = result.unwrap_err();
    assert!(
        error_message.contains("invalid") || error_message.contains("UUID"),
        "Error message should indicate invalid UUID: {}",
        error_message
    );
}

#[tokio::test]
async fn test_save_workspace_layout_with_invalid_panel_dimensions() {
    // Arrange
    let layout_with_invalid_dimensions = r#"{
        "id": "workspace_550e8400-e29b-41d4-a716-446655440000",
        "projectId": "project_550e8400-e29b-41d4-a716-446655440000",
        "panelStates": {
            "fileExplorerVisible": true,
            "categoryExplorerVisible": true,
            "searchPanelVisible": false,
            "documentWorkspaceVisible": true
        },
        "panelSizes": {
            "explorerWidth": -10.0,
            "workspaceWidth": 110.0,
            "panelHeights": {}
        },
        "lastModified": "2025-09-19T20:00:00Z"
    }"#
    .to_string();

    // Act
    let result = save_workspace_layout(layout_with_invalid_dimensions).await;

    // Assert
    assert!(
        result.is_err(),
        "save_workspace_layout should return error for invalid dimensions"
    );
    let error_message = result.unwrap_err();
    assert!(
        error_message.contains("invalid")
            || error_message.contains("dimension")
            || error_message.contains("range"),
        "Error message should indicate invalid dimensions: {}",
        error_message
    );
}
