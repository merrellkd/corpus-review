use corpus_review::commands::workspace_commands::list_folder_contents;

#[tokio::test]
async fn test_list_folder_contents_with_valid_folder() {
    let folder_path = "/Users/test/Documents/Source".to_string();
    let result = list_folder_contents(folder_path).await;

    assert!(result.is_ok(), "list_folder_contents should return Ok for valid folder path");

    // Parse JSON response to verify structure
    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    assert!(response_json.get("items").is_some(), "Response should contain 'items' field");
    assert!(response_json["items"].is_array(), "Items field should be an array");
}

#[tokio::test]
async fn test_list_folder_contents_with_inaccessible_folder() {
    let folder_path = "/nonexistent/folder/path".to_string();
    let result = list_folder_contents(folder_path).await;

    // Should return Ok with error in response body (not Err) as per contract
    assert!(result.is_ok(), "list_folder_contents should return Ok even for inaccessible folders");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    assert!(response_json.get("error").is_some(), "Response should contain 'error' field for inaccessible folder");
    assert!(response_json["items"].is_array(), "Items field should still be an array (empty)");
    assert_eq!(response_json["items"].as_array().unwrap().len(), 0, "Items array should be empty for inaccessible folder");
}

#[tokio::test]
async fn test_list_folder_contents_with_empty_folder() {
    let folder_path = "/tmp/empty_test_folder".to_string();
    let result = list_folder_contents(folder_path).await;

    assert!(result.is_ok(), "list_folder_contents should return Ok for empty but accessible folder");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    assert!(response_json.get("items").is_some(), "Response should contain 'items' field");
    assert!(response_json["items"].is_array(), "Items field should be an array");
    // Empty folder should return empty array without error
    assert!(response_json.get("error").is_none(), "Should not have error for accessible empty folder");
}

#[tokio::test]
async fn test_list_folder_contents_response_structure() {
    let folder_path = "/Users/test/Documents".to_string();
    let result = list_folder_contents(folder_path).await;

    assert!(result.is_ok(), "list_folder_contents should return Ok");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON");

    // Verify response structure matches ListFolderContentsResponse
    assert!(response_json.get("items").is_some(), "Response should have 'items' field");
    assert!(response_json["items"].is_array(), "Items should be array");

    // If items exist, verify FileSystemItemDto structure
    if let Some(items) = response_json["items"].as_array() {
        if !items.is_empty() {
            let first_item = &items[0];
            assert!(first_item.get("path").is_some(), "Item should have 'path' field");
            assert!(first_item.get("name").is_some(), "Item should have 'name' field");
            assert!(first_item.get("type").is_some(), "Item should have 'type' field");
            assert!(first_item.get("lastModified").is_some(), "Item should have 'lastModified' field");
            assert!(first_item.get("isAccessible").is_some(), "Item should have 'isAccessible' field");

            // Verify type is either 'file' or 'directory'
            let item_type = first_item["type"].as_str().unwrap();
            assert!(item_type == "file" || item_type == "directory", "Type should be 'file' or 'directory'");
        }
    }
}

#[tokio::test]
async fn test_list_folder_contents_with_special_characters() {
    let folder_path = "/Users/test/Documents/Special Folder (&@#$)".to_string();
    let result = list_folder_contents(folder_path).await;

    // Should handle special characters gracefully
    assert!(result.is_ok(), "list_folder_contents should handle special characters in folder path");

    let response_json: serde_json::Value = serde_json::from_str(&result.unwrap())
        .expect("Response should be valid JSON even with special characters");

    assert!(response_json.get("items").is_some(), "Response should contain 'items' field");
}