use corpus_review::commands::workspace_commands::update_panel_visibility;

#[tokio::test]
async fn test_update_panel_visibility_with_valid_project_and_panel() {
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();
    let panel_type = "file_explorer".to_string();
    let visible = true;

    let result = update_panel_visibility(project_id, panel_type, visible).await;

    assert!(result.is_ok(), "update_panel_visibility should return Ok for valid inputs");

    // Parse JSON response to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    assert!(response_json.get("success").is_some(), "Response should contain 'success' field");
    assert!(response_json.get("new_layout").is_some(), "Response should contain 'new_layout' field");
    assert!(response_json["new_layout"].is_object(), "new_layout should be an object");
}

#[tokio::test]
async fn test_update_panel_visibility_with_invalid_project_id() {
    let project_id = "invalid-project-id".to_string();
    let panel_type = "file_explorer".to_string();
    let visible = false;

    let result = update_panel_visibility(project_id, panel_type, visible).await;

    assert!(result.is_ok(), "update_panel_visibility should return Ok even for invalid project ID");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    // Should return success: false for invalid project ID
    assert_eq!(response_json["success"].as_bool().unwrap(), false, "Should return success: false for invalid project ID");
}

#[tokio::test]
async fn test_update_panel_visibility_with_invalid_panel_type() {
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();
    let panel_type = "invalid_panel_type".to_string();
    let visible = true;

    let result = update_panel_visibility(project_id, panel_type, visible).await;

    assert!(result.is_ok(), "update_panel_visibility should return Ok even for invalid panel type");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    // Should return success: false for invalid panel type
    assert_eq!(response_json["success"].as_bool().unwrap(), false, "Should return success: false for invalid panel type");
}

#[tokio::test]
async fn test_update_panel_visibility_response_structure() {
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();
    let panel_type = "category_explorer".to_string();
    let visible = false;

    let result = update_panel_visibility(project_id, panel_type, visible).await;

    assert!(result.is_ok(), "update_panel_visibility should return Ok");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    // Verify response structure matches UpdatePanelVisibilityResponse
    assert!(response_json.get("success").is_some(), "Response should have 'success' field");
    assert!(response_json["success"].is_boolean(), "success should be boolean");
    assert!(response_json.get("new_layout").is_some(), "Response should have 'new_layout' field");

    // If successful, verify new_layout structure matches WorkspaceLayoutDto
    if response_json["success"].as_bool().unwrap() {
        let new_layout = &response_json["new_layout"];
        assert!(new_layout.get("id").is_some(), "new_layout should have 'id' field");
        assert!(new_layout.get("projectId").is_some(), "new_layout should have 'projectId' field");
        assert!(new_layout.get("panelStates").is_some(), "new_layout should have 'panelStates' field");
        assert!(new_layout.get("panelSizes").is_some(), "new_layout should have 'panelSizes' field");
        assert!(new_layout.get("lastModified").is_some(), "new_layout should have 'lastModified' field");

        // Verify panelStates structure
        let panel_states = &new_layout["panelStates"];
        assert!(panel_states.get("fileExplorerVisible").is_some(), "panelStates should have 'fileExplorerVisible' field");
        assert!(panel_states.get("categoryExplorerVisible").is_some(), "panelStates should have 'categoryExplorerVisible' field");
        assert!(panel_states.get("searchPanelVisible").is_some(), "panelStates should have 'searchPanelVisible' field");
        assert!(panel_states.get("documentWorkspaceVisible").is_some(), "panelStates should have 'documentWorkspaceVisible' field");
    }
}

#[tokio::test]
async fn test_update_panel_visibility_with_all_panel_types() {
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();
    let panel_types = vec!["file_explorer", "category_explorer", "search_panel"];

    for panel_type in panel_types {
        let result = update_panel_visibility(project_id.clone(), panel_type.to_string(), true).await;
        assert!(result.is_ok(), "update_panel_visibility should work for panel type: {}", panel_type);

        let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
            .expect("Response should be valid JSON");

        assert!(response_json.get("success").is_some(), "Response should contain 'success' field for panel type: {}", panel_type);
        assert!(response_json.get("new_layout").is_some(), "Response should contain 'new_layout' field for panel type: {}", panel_type);
    }
}

#[tokio::test]
async fn test_update_panel_visibility_with_both_visibility_states() {
    let project_id = "project_550e8400-e29b-41d4-a716-446655440000".to_string();
    let panel_type = "search_panel".to_string();

    // Test hiding panel
    let result_hide = update_panel_visibility(project_id.clone(), panel_type.clone(), false).await;
    assert!(result_hide.is_ok(), "update_panel_visibility should work when hiding panel");

    // Test showing panel
    let result_show = update_panel_visibility(project_id, panel_type, true).await;
    assert!(result_show.is_ok(), "update_panel_visibility should work when showing panel");

    // Both should return same response structure
    for result in vec![result_hide, result_show] {
        let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
            .expect("Response should be valid JSON");

        assert!(response_json.get("success").is_some(), "Response should contain 'success' field");
        assert!(response_json.get("new_layout").is_some(), "Response should contain 'new_layout' field");
    }
}