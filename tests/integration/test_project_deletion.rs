// Integration test for Scenario 5: Delete Project with Confirmation
// This test covers project deletion functionality

#[tokio::test]
async fn test_delete_project_success() {
    // Setup: Create a test project to delete
    let project_name = "Project To Delete";
    let source_folder = "/tmp/delete-test-project";

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    let create_result = create_test_project(project_name, source_folder, None).await;
    assert!(create_result.is_ok(), "Project creation should succeed");
    let project = create_result.unwrap();

    // Verify project exists in list
    let list_before = list_test_projects().await.unwrap();
    assert!(list_before.iter().any(|p| p.id == project.id), "Project should exist before deletion");

    // When: User deletes the project
    let delete_result = delete_test_project(&project.id).await;

    // Then: Deletion succeeds
    assert!(delete_result.is_ok(), "Project deletion should succeed");

    // Verify project is removed from list
    let list_after = list_test_projects().await.unwrap();
    assert!(!list_after.iter().any(|p| p.id == project.id), "Project should be removed from list");

    // Cleanup
    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_delete_nonexistent_project() {
    // When: User tries to delete a non-existent project
    let nonexistent_id = "proj_nonexistent-1234-1234-1234-123456789012";
    let delete_result = delete_test_project(nonexistent_id).await;

    // Then: Deletion fails with NotFound error
    assert!(delete_result.is_err(), "Deleting non-existent project should fail");

    match delete_result.unwrap_err() {
        AppError::NotFound { resource, id, message: _ } => {
            assert_eq!(resource, "project");
            assert_eq!(id, nonexistent_id);
        }
        _ => panic!("Expected NotFound error for non-existent project"),
    }
}

#[tokio::test]
async fn test_delete_project_with_invalid_id() {
    // When: User tries to delete with invalid ID format
    let invalid_id = "not-a-valid-project-id";
    let delete_result = delete_test_project(invalid_id).await;

    // Then: Deletion fails with validation error
    assert!(delete_result.is_err(), "Deleting with invalid ID should fail");

    match delete_result.unwrap_err() {
        AppError::ValidationError { field, message } => {
            assert_eq!(field, "project_id");
            assert!(message.contains("Invalid project ID format"));
        }
        _ => panic!("Expected ValidationError for invalid ID format"),
    }
}

#[tokio::test]
async fn test_delete_project_persistence() {
    // Test that deletion persists across application restarts
    // Setup: Create a project
    let project_name = "Persistence Test Project";
    let source_folder = "/tmp/persistence-test-project";

    std::fs::create_dir_all(source_folder).expect("Failed to create test folder");

    let create_result = create_test_project(project_name, source_folder, None).await;
    assert!(create_result.is_ok(), "Project creation should succeed");
    let project = create_result.unwrap();

    // Delete the project
    let delete_result = delete_test_project(&project.id).await;
    assert!(delete_result.is_ok(), "Project deletion should succeed");

    // Simulate application restart by creating new service instances
    // (This would involve reinitializing database connections, etc.)

    // Verify project is still deleted after "restart"
    let list_after_restart = list_test_projects().await.unwrap();
    assert!(!list_after_restart.iter().any(|p| p.id == project.id),
           "Project should remain deleted after restart");

    // Cleanup
    std::fs::remove_dir_all(source_folder).ok();
}

#[tokio::test]
async fn test_multiple_project_deletions() {
    // Test deleting multiple projects
    let mut created_projects = Vec::new();

    for i in 0..3 {
        let project_name = format!("Multi Delete Test {}", i);
        let source_folder = format!("/tmp/multi-delete-{}", i);

        std::fs::create_dir_all(&source_folder).expect("Failed to create test folder");

        let result = create_test_project(&project_name, &source_folder, None).await;
        assert!(result.is_ok(), "Project creation should succeed");
        created_projects.push((result.unwrap(), source_folder));
    }

    // Delete all created projects
    for (project, source_folder) in &created_projects {
        let delete_result = delete_test_project(&project.id).await;
        assert!(delete_result.is_ok(), "Project deletion should succeed");

        std::fs::remove_dir_all(source_folder).ok();
    }

    // Verify all are deleted
    let final_list = list_test_projects().await.unwrap();
    for (project, _) in &created_projects {
        assert!(!final_list.iter().any(|p| p.id == project.id),
               "Project {} should be deleted", project.name);
    }
}

// Helper functions - these will fail until we implement the actual commands
async fn create_test_project(
    name: &str,
    source_folder: &str,
    note: Option<&str>,
) -> Result<ProjectDto, AppError> {
    todo!("Implement create_test_project helper")
}

async fn list_test_projects() -> Result<Vec<ProjectDto>, AppError> {
    todo!("Implement list_test_projects helper")
}

async fn delete_test_project(project_id: &str) -> Result<(), AppError> {
    todo!("Implement delete_test_project helper")
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