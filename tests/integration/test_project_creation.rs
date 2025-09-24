// Integration test for Scenario 1: Create New Project (Happy Path)
// This test covers the full project creation workflow

use corpus_review::infrastructure::errors::AppError;

#[tokio::test]
async fn test_create_project_happy_path() {
    // Scenario 1: Create New Project with note
    // Given: Valid project data with name, folder, and note
    let project_name = "Test Project Alpha";
    let source_folder = "/tmp/test-project-1";
    let note = "Research project for document analysis";

    // Ensure test folder exists
    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // When: User creates project
    let result = create_test_project(project_name, source_folder, Some(note)).await;

    // Then: Project is created successfully
    assert!(result.is_ok(), "Project creation should succeed");
    let project_dto = result.unwrap();

    // Verify project details
    assert_eq!(project_dto.name, project_name);
    assert_eq!(project_dto.source_folder, source_folder);
    assert_eq!(project_dto.note, Some(note.to_string()));
    assert!(project_dto.id.starts_with("proj_"));
    assert!(!project_dto.created_at.is_empty());

    // Verify project appears in list
    let list_result = list_test_projects().await;
    assert!(list_result.is_ok());
    let projects = list_result.unwrap();
    assert!(projects.iter().any(|p| p.name == project_name));

    // Cleanup
    std::fs::remove_dir_all(source_folder).ok();
    cleanup_test_project(&project_dto.id).await.ok();
}

#[tokio::test]
async fn test_create_project_without_note() {
    // Scenario 2: Create Project Without Note
    let project_name = "Test Project Beta";
    let source_folder = "/tmp/test-project-2";

    // Ensure test folder exists
    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    // When: User creates project without note
    let result = create_test_project(project_name, source_folder, None).await;

    // Then: Project is created successfully
    assert!(result.is_ok(), "Project creation without note should succeed");
    let project_dto = result.unwrap();

    // Verify note field is empty
    assert_eq!(project_dto.note, None);
    assert_eq!(project_dto.name, project_name);

    // Cleanup
    std::fs::remove_dir_all(source_folder).ok();
    cleanup_test_project(&project_dto.id).await.ok();
}

#[tokio::test]
async fn test_create_project_with_folder_validation() {
    // Test folder validation during project creation
    let project_name = "Folder Validation Test";
    let nonexistent_folder = "/tmp/nonexistent-folder";

    // When: User tries to create project with non-existent folder
    let result = create_test_project(project_name, nonexistent_folder, None).await;

    // Then: Project creation fails with validation error
    assert!(result.is_err(), "Should fail with non-existent folder");
    match result.unwrap_err() {
        AppError::FileSystemError { message } => {
            assert!(message.contains("folder not found") || message.contains("not found"));
        }
        _ => panic!("Expected FileSystemError for non-existent folder"),
    }
}

// Helper functions - these will fail until we implement the actual commands
async fn create_test_project(
    name: &str,
    source_folder: &str,
    note: Option<&str>,
) -> Result<ProjectDto, AppError> {
    // This will call the actual create_project command once implemented
    todo!("Implement create_test_project helper")
}

async fn list_test_projects() -> Result<Vec<ProjectDto>, AppError> {
    // This will call the actual list_projects command once implemented
    todo!("Implement list_test_projects helper")
}

async fn cleanup_test_project(project_id: &str) -> Result<(), AppError> {
    // This will call the actual delete_project command once implemented
    todo!("Implement cleanup_test_project helper")
}

// This will be defined once we implement the DTOs
struct ProjectDto {
    pub id: String,
    pub name: String,
    pub source_folder: String,
    pub note: Option<String>,
    pub created_at: String,
}