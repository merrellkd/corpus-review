use corpus_review::commands::workspace_commands::create_document_caddy;

#[tokio::test]
async fn test_create_document_caddy_with_valid_file_path() {
    let file_path = "/Users/test/Documents/Source/document.txt".to_string();
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    assert!(
        result.is_ok(),
        "create_document_caddy should return Ok for valid file path"
    );

    // Parse JSON response to verify structure
    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    assert!(
        response_json.get("caddy").is_some(),
        "Response should contain 'caddy' field"
    );
    assert!(
        response_json["caddy"].is_object(),
        "caddy should be an object"
    );
}

#[tokio::test]
async fn test_create_document_caddy_with_nonexistent_file() {
    let file_path = "/nonexistent/file/path.txt".to_string();
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    // Should return Ok with error in response body (not Err) as per contract
    assert!(
        result.is_ok(),
        "create_document_caddy should return Ok even for nonexistent files"
    );

    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    assert!(
        response_json.get("error").is_some(),
        "Response should contain 'error' field for nonexistent file"
    );
}

#[tokio::test]
async fn test_create_document_caddy_with_invalid_workspace_id() {
    let file_path = "/Users/test/Documents/Source/document.txt".to_string();
    let workspace_id = "invalid-workspace-id".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    assert!(
        result.is_ok(),
        "create_document_caddy should return Ok even for invalid workspace ID"
    );

    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    // Should return error for invalid workspace ID
    assert!(
        response_json.get("error").is_some(),
        "Response should contain 'error' field for invalid workspace ID"
    );
}

#[tokio::test]
async fn test_create_document_caddy_response_structure() {
    let file_path = "/Users/test/Documents/Reports/report.pdf".to_string();
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    assert!(result.is_ok(), "create_document_caddy should return Ok");

    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    // Verify response structure matches CreateDocumentCaddyResponse
    if response_json.get("error").is_none() {
        // Success case - verify caddy structure
        assert!(
            response_json.get("caddy").is_some(),
            "Response should have 'caddy' field"
        );
        let caddy = &response_json["caddy"];

        // Verify DocumentCaddyDto structure
        assert!(caddy.get("id").is_some(), "caddy should have 'id' field");
        assert!(
            caddy.get("filePath").is_some(),
            "caddy should have 'filePath' field"
        );
        assert!(
            caddy.get("title").is_some(),
            "caddy should have 'title' field"
        );
        assert!(
            caddy.get("isActive").is_some(),
            "caddy should have 'isActive' field"
        );
        assert!(
            caddy.get("position").is_some(),
            "caddy should have 'position' field"
        );
        assert!(
            caddy.get("dimensions").is_some(),
            "caddy should have 'dimensions' field"
        );
        assert!(
            caddy.get("scrollPosition").is_some(),
            "caddy should have 'scrollPosition' field"
        );

        // Verify position structure (CaddyPositionDto)
        let position = &caddy["position"];
        assert!(
            position.get("x").is_some(),
            "position should have 'x' field"
        );
        assert!(
            position.get("y").is_some(),
            "position should have 'y' field"
        );
        assert!(
            position.get("zIndex").is_some(),
            "position should have 'zIndex' field"
        );

        // Verify dimensions structure (CaddyDimensionsDto)
        let dimensions = &caddy["dimensions"];
        assert!(
            dimensions.get("width").is_some(),
            "dimensions should have 'width' field"
        );
        assert!(
            dimensions.get("height").is_some(),
            "dimensions should have 'height' field"
        );
        assert!(
            dimensions.get("minWidth").is_some(),
            "dimensions should have 'minWidth' field"
        );
        assert!(
            dimensions.get("minHeight").is_some(),
            "dimensions should have 'minHeight' field"
        );

        // Verify data types
        assert!(caddy["id"].is_string(), "caddy.id should be string");
        assert!(
            caddy["filePath"].is_string(),
            "caddy.filePath should be string"
        );
        assert!(caddy["title"].is_string(), "caddy.title should be string");
        assert!(
            caddy["isActive"].is_boolean(),
            "caddy.isActive should be boolean"
        );
        assert!(
            caddy["scrollPosition"].is_number(),
            "caddy.scrollPosition should be number"
        );

        assert!(position["x"].is_number(), "position.x should be number");
        assert!(position["y"].is_number(), "position.y should be number");
        assert!(
            position["zIndex"].is_number(),
            "position.zIndex should be number"
        );

        assert!(
            dimensions["width"].is_number(),
            "dimensions.width should be number"
        );
        assert!(
            dimensions["height"].is_number(),
            "dimensions.height should be number"
        );
        assert!(
            dimensions["minWidth"].is_number(),
            "dimensions.minWidth should be number"
        );
        assert!(
            dimensions["minHeight"].is_number(),
            "dimensions.minHeight should be number"
        );
    }
}

#[tokio::test]
async fn test_create_document_caddy_with_various_file_types() {
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();
    let file_paths = vec![
        "/Users/test/Documents/Source/readme.md",
        "/Users/test/Documents/Source/config.json",
        "/Users/test/Documents/Reports/analysis.csv",
        "/Users/test/Documents/Reports/presentation.pptx",
        "/Users/test/Documents/Source/data.xml",
    ];

    for file_path in file_paths {
        let result = create_document_caddy(file_path.to_string(), workspace_id.clone()).await;
        assert!(
            result.is_ok(),
            "create_document_caddy should work for file type: {}",
            file_path
        );

        let response_json: serde_json::Value =
            serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

        // Should either have caddy or error, but always be valid JSON
        assert!(
            response_json.get("caddy").is_some() || response_json.get("error").is_some(),
            "Response should contain either 'caddy' or 'error' field for file: {}",
            file_path
        );
    }
}

#[tokio::test]
async fn test_create_document_caddy_caddy_id_format() {
    let file_path = "/Users/test/Documents/Source/example.txt".to_string();
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    assert!(result.is_ok(), "create_document_caddy should return Ok");

    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    if response_json.get("error").is_none() {
        let caddy_id = response_json["caddy"]["id"].as_str().unwrap();

        // According to design docs, should be prefixed UUID format
        assert!(
            caddy_id.starts_with("doc_"),
            "caddy ID should start with 'doc_' prefix"
        );
        assert!(
            caddy_id.len() > 4,
            "caddy ID should be longer than just the prefix"
        );

        // Should be valid UUID format after prefix
        let uuid_part = &caddy_id[4..];
        assert_eq!(uuid_part.len(), 36, "UUID part should be 36 characters");
        assert!(uuid_part.contains("-"), "UUID part should contain hyphens");
    }
}

#[tokio::test]
async fn test_create_document_caddy_title_extraction() {
    let file_path = "/Users/test/Documents/Source/My Important Document.txt".to_string();
    let workspace_id = "workspace_550e8400-e29b-41d4-a716-446655440000".to_string();

    let result = create_document_caddy(file_path, workspace_id).await;

    assert!(result.is_ok(), "create_document_caddy should return Ok");

    let response_json: serde_json::Value =
        serde_json::from_str(&result.unwrap()).expect("Response should be valid JSON");

    if response_json.get("error").is_none() {
        let title = response_json["caddy"]["title"].as_str().unwrap();

        // Title should be extracted from filename without path and extension
        assert_eq!(
            title, "My Important Document",
            "Title should be extracted from filename"
        );
        assert!(
            !title.contains("/"),
            "Title should not contain path separators"
        );
        assert!(
            !title.contains(".txt"),
            "Title should not contain file extension"
        );
    }
}
