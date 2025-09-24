// Integration test for Scenario 6: Validation and Error Handling
// This test covers all validation scenarios from the quickstart guide

#[tokio::test]
async fn test_empty_project_name_validation() {
    // 6A: Empty Project Name Validation
    let empty_name = "";
    let source_folder = "/tmp/validation-test";

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // When: User tries to create project with empty name
    let result = create_test_project(empty_name, source_folder, None).await;

    // Then: Creation fails with validation error
    assert!(result.is_err(), "Empty name should cause validation error");

    match result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "name");
            assert_eq!(message, "Project name is required");
        }
        _ => panic!("Expected ValidationError for empty name"),
    }

    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_project_name_too_long() {
    // 6B: Project Name Too Long
    let long_name = "x".repeat(300); // Exceeds 255 character limit
    let source_folder = "/tmp/validation-test-long";

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // When: User tries to create project with long name
    let result = create_test_project(&long_name, source_folder, None).await;

    // Then: Creation fails with validation error
    assert!(result.is_err(), "Long name should cause validation error");

    match result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "name");
            assert_eq!(message, "Project name too long (max 255 characters)");
        }
        _ => panic!("Expected ValidationError for long name"),
    }

    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_invalid_folder_path() {
    // 6C: Invalid Folder Path
    let valid_name = "Valid Name";
    let invalid_folder = "/tmp/nonexistent-folder";

    // When: User tries to create project with non-existent folder
    let result = create_test_project(valid_name, invalid_folder, None).await;

    // Then: Creation fails with file system error
    assert!(result.is_err(), "Invalid folder should cause error");

    match result.unwrap_err() {
        AppError::FileSystemError { message } => {
            assert!(message.contains("not found") || message.contains("nonexistent"));
        }
        _ => panic!("Expected FileSystemError for invalid folder"),
    }
}

#[tokio::test]
async fn test_duplicate_project_name() {
    // 6D: Duplicate Project Name
    let project_name = "Duplicate Test Project";
    let source_folder1 = "/tmp/duplicate-test-1";
    let source_folder2 = "/tmp/duplicate-test-2";

    // Create test folders
    std::fs::create_dir_all(source_folder1).expect("Failed to create test folder 1");
    std::fs::create_dir_all(source_folder2).expect("Failed to create test folder 2");

    // Create first project
    let first_result = create_test_project(project_name, source_folder1, None).await;
    assert!(first_result.is_ok(), "First project with name should succeed");
    let first_project = first_result.unwrap();

    // When: User tries to create second project with same name
    let duplicate_result = create_test_project(project_name, source_folder2, None).await;

    // Then: Creation fails with validation error
    assert!(duplicate_result.is_err(), "Duplicate name should cause validation error");

    match duplicate_result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "name");
            assert!(message.contains("already exists"));
            assert!(message.contains(project_name));
        }
        _ => panic!("Expected ValidationError for duplicate name"),
    }

    // Cleanup
    std::fs::remove_dir_all(source_folder1).ok();
    std::fs::remove_dir_all(source_folder2).ok();
    cleanup_test_project(&first_project.id).await.ok();
}

#[tokio::test]
async fn test_note_too_long_validation() {
    // 6E: Note Too Long Validation
    let valid_name = "Note Length Test";
    let source_folder = "/tmp/note-validation-test";
    let long_note = "x".repeat(1500); // Exceeds 1000 character limit

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // When: User tries to create project with long note
    let result = create_test_project(valid_name, source_folder, Some(&long_note)).await;

    // Then: Creation fails with validation error
    assert!(result.is_err(), "Long note should cause validation error");

    match result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "note");
            assert_eq!(message, "Project note too long (max 1000 characters)");
        }
        _ => panic!("Expected ValidationError for long note"),
    }

    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_whitespace_only_name() {
    // Test that names with only whitespace are treated as empty
    let whitespace_name = "   \t\n   ";
    let source_folder = "/tmp/whitespace-test";

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    let result = create_test_project(whitespace_name, source_folder, None).await;

    assert!(result.is_err(), "Whitespace-only name should cause validation error");

    match result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "name");
            assert_eq!(message, "Project name is required");
        }
        _ => panic!("Expected ValidationError for whitespace-only name"),
    }

    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_valid_edge_cases() {
    // Test valid edge cases that should succeed
    let test_cases = vec![
        ("a", "Single character name"),
        ("x".repeat(255).as_str(), "Maximum length name"),
        ("Project with Special-Characters_123", "Special characters in name"),
    ];

    for (i, (name, description)) in test_cases.iter().enumerate() {
        let source_folder = format!("/tmp/edge-case-{}", i);
        std::fs::create_dir_all(&source_folder).expect("Failed to create test folder");

        let result = create_test_project(name, &source_folder, None).await;
        assert!(result.is_ok(), "Valid edge case should succeed: {}", description);

        let project = result.unwrap();
        cleanup_test_project(&project.id).await.ok();
        std::fs::remove_dir_all(&source_folder).ok();
    }
}

#[tokio::test]
async fn test_note_edge_cases() {
    // Test valid note edge cases
    let name = "Note Edge Case Test";
    let source_folder = "/tmp/note-edge-test";
    let max_length_note = "x".repeat(1000); // Exactly 1000 characters

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // Test exactly 1000 character note (should succeed)
    let result = create_test_project(name, source_folder, Some(&max_length_note)).await;
    assert!(result.is_ok(), "1000 character note should succeed");

    let project = result.unwrap();
    assert_eq!(project.note, Some(max_length_note));

    cleanup_test_project(&project.id).await.ok();
    std::fs::remove_dir_all(source_folder).ok();
}

// Helper functions - these will fail until we implement the actual commands
async fn create_test_project(
    name: &str,
    source_folder: &str,
    note: Option<&str>,
) -> Result<ProjectDto, AppError> {
    todo!("Implement create_test_project helper")
}

async fn cleanup_test_project(project_id: &str) -> Result<(), AppError> {
    todo!("Implement cleanup_test_project helper")
}

use corpus_review::infrastructure::errors::AppError;

// This will be defined once we implement the DTOs
struct ProjectDto {
    pub id: String,
    pub name: String,
    pub source_folder: String,
    pub note: Option<String>,
    pub created_at: String,
}