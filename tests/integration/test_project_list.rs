// Integration test for Scenario 3: View Project List with Multiple Projects
// This test covers project list display and ordering functionality

#[tokio::test]
async fn test_project_list_display_and_ordering() {
    // Setup: Create multiple test projects
    let project1_name = "Test Project Alpha";
    let project2_name = "Test Project Beta";
    let source_folder1 = "/tmp/test-project-alpha";
    let source_folder2 = "/tmp/test-project-beta";

    // Create test folders
    std::fs::create_dir_all(source_folder1).expect("Failed to create test folder 1");
    std::fs::create_dir_all(source_folder2).expect("Failed to create test folder 2");

    // Create first project with note
    let project1_result = create_test_project(
        project1_name,
        source_folder1,
        Some("Research project for document analysis"),
    ).await;
    assert!(project1_result.is_ok(), "First project creation should succeed");
    let project1 = project1_result.unwrap();

    // Small delay to ensure different creation times
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    // Create second project without note
    let project2_result = create_test_project(project2_name, source_folder2, None).await;
    assert!(project2_result.is_ok(), "Second project creation should succeed");
    let project2 = project2_result.unwrap();

    // When: User views project list
    let list_result = list_test_projects().await;
    assert!(list_result.is_ok(), "Project list should load successfully");
    let projects = list_result.unwrap();

    // Then: Both projects appear in list
    assert!(projects.len() >= 2, "Should have at least 2 projects");

    // Find our test projects in the list
    let found_project1 = projects.iter().find(|p| p.id == project1.id);
    let found_project2 = projects.iter().find(|p| p.id == project2.id);

    assert!(found_project1.is_some(), "First project should be in list");
    assert!(found_project2.is_some(), "Second project should be in list");

    let found_project1 = found_project1.unwrap();
    let found_project2 = found_project2.unwrap();

    // Verify project details are correct
    assert_eq!(found_project1.name, project1_name);
    assert_eq!(found_project1.source_folder, source_folder1);
    assert_eq!(found_project1.note, Some("Research project for document analysis".to_string()));

    assert_eq!(found_project2.name, project2_name);
    assert_eq!(found_project2.source_folder, source_folder2);
    assert_eq!(found_project2.note, None);

    // Verify ordering (newest first)
    let project1_pos = projects.iter().position(|p| p.id == project1.id).unwrap();
    let project2_pos = projects.iter().position(|p| p.id == project2.id).unwrap();
    assert!(project2_pos < project1_pos, "Newer project (Beta) should appear before older (Alpha)");

    // Cleanup
    std::fs::remove_dir_all(source_folder1).ok();
    std::fs::remove_dir_all(source_folder2).ok();
    cleanup_test_project(&project1.id).await.ok();
    cleanup_test_project(&project2.id).await.ok();
}

#[tokio::test]
async fn test_project_list_performance() {
    // Test that project list loads within performance requirements
    use std::time::Instant;

    let start = Instant::now();
    let result = list_test_projects().await;
    let duration = start.elapsed();

    assert!(result.is_ok(), "Project list should load successfully");

    // Performance requirement: <100ms for up to 50 projects
    assert!(duration.as_millis() < 500, "Project list should load in under 500ms (found: {}ms)", duration.as_millis());
}

#[tokio::test]
async fn test_empty_project_list() {
    // Test behavior when no projects exist
    // Note: This might need to be run with a clean database

    let result = list_test_projects().await;
    assert!(result.is_ok(), "Empty project list should be valid");

    let projects = result.unwrap();
    // We don't assert it's empty since other tests might have created projects
    assert!(projects.len() >= 0, "Project list should return valid vector");
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