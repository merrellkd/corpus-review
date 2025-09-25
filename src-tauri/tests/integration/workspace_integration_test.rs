use corpus_review::application::services::WorkspaceNavigationService;
use corpus_review::application::dtos::{WorkspaceDto, DirectoryListingDto};
use corpus_review::infrastructure::AppError;
use std::path::PathBuf;
use tempfile::TempDir;
use std::fs;

/// Integration tests for workspace backend integration with rich UI
///
/// These tests validate that the workspace navigation service works correctly
/// with real file system operations for the rich workspace UI.

#[tokio::test]
async fn test_open_workspace_with_real_project() {
    // Create temporary directory structure for testing
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    // Create test files and directories
    let src_dir = project_root.join("src");
    fs::create_dir_all(&src_dir).expect("Failed to create src directory");
    fs::write(src_dir.join("main.rs"), "fn main() {}").expect("Failed to create main.rs");

    let docs_dir = project_root.join("docs");
    fs::create_dir_all(&docs_dir).expect("Failed to create docs directory");
    fs::write(docs_dir.join("README.md"), "# Test Project").expect("Failed to create README.md");

    fs::write(project_root.join("Cargo.toml"), "[package]\nname = \"test\"").expect("Failed to create Cargo.toml");

    // Initialize workspace service
    let service = WorkspaceNavigationService::new();

    // Test opening workspace
    let result = service.open_workspace(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy()
    ).await;

    assert!(result.is_ok(), "Failed to open workspace: {:?}", result.err());

    let workspace = result.unwrap();

    // Validate workspace structure
    assert_eq!(workspace.project_id, "test_proj_123");
    assert_eq!(workspace.project_name, "Test Project");
    assert_eq!(workspace.source_folder, project_root.to_string_lossy());
    assert_eq!(workspace.current_path, project_root.to_string_lossy());

    // Validate directory listing contains expected files
    let entries = &workspace.directory_listing.entries;
    assert!(entries.len() >= 3, "Should have at least 3 entries (src, docs, Cargo.toml)");

    // Check for expected directories and files
    let entry_names: Vec<String> = entries.iter().map(|e| e.name.clone()).collect();
    assert!(entry_names.contains(&"src".to_string()), "Should contain src directory");
    assert!(entry_names.contains(&"docs".to_string()), "Should contain docs directory");
    assert!(entry_names.contains(&"Cargo.toml".to_string()), "Should contain Cargo.toml file");
}

#[tokio::test]
async fn test_navigate_to_folder_real_directory() {
    // Create temporary directory structure
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    let src_dir = project_root.join("src");
    fs::create_dir_all(&src_dir).expect("Failed to create src directory");
    fs::write(src_dir.join("lib.rs"), "pub mod test;").expect("Failed to create lib.rs");
    fs::write(src_dir.join("test.rs"), "#[test] fn test() {}").expect("Failed to create test.rs");

    let service = WorkspaceNavigationService::new();

    // Navigate to src folder
    let result = service.navigate_to_folder(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy(),
        &project_root.to_string_lossy(),
        "src"
    ).await;

    assert!(result.is_ok(), "Failed to navigate to folder: {:?}", result.err());

    let workspace = result.unwrap();

    // Validate navigation worked
    assert_eq!(workspace.current_path, src_dir.to_string_lossy());

    // Validate src directory contents
    let entries = &workspace.directory_listing.entries;
    let entry_names: Vec<String> = entries.iter().map(|e| e.name.clone()).collect();
    assert!(entry_names.contains(&"lib.rs".to_string()), "Should contain lib.rs");
    assert!(entry_names.contains(&"test.rs".to_string()), "Should contain test.rs");
}

#[tokio::test]
async fn test_navigate_to_parent_directory() {
    // Create temporary directory structure
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    let src_dir = project_root.join("src");
    fs::create_dir_all(&src_dir).expect("Failed to create src directory");

    let service = WorkspaceNavigationService::new();

    // Navigate to parent from src directory
    let result = service.navigate_to_parent(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy(),
        &src_dir.to_string_lossy()
    ).await;

    assert!(result.is_ok(), "Failed to navigate to parent: {:?}", result.err());

    let workspace = result.unwrap();

    // Should be back at project root
    assert_eq!(workspace.current_path, project_root.to_string_lossy());
}

#[tokio::test]
async fn test_workspace_boundary_enforcement() {
    // Create temporary directory structure
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    let service = WorkspaceNavigationService::new();

    // Try to navigate above project root (should fail)
    let result = service.navigate_to_parent(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy(),
        &project_root.to_string_lossy()
    ).await;

    // Should return error for attempting to navigate above workspace root
    assert!(result.is_err(), "Should not allow navigation above workspace root");
}

#[tokio::test]
async fn test_inaccessible_directory_handling() {
    let service = WorkspaceNavigationService::new();

    // Try to open workspace with non-existent directory
    let result = service.open_workspace(
        "test_proj_123",
        "Test Project",
        "/this/path/does/not/exist"
    ).await;

    // Should return appropriate error
    assert!(result.is_err(), "Should return error for non-existent directory");

    if let Err(AppError::FilesystemError { message }) = result {
        assert!(message.contains("not found") || message.contains("Directory not found"),
               "Error message should indicate directory not found");
    } else {
        panic!("Should return FilesystemError for non-existent directory");
    }
}

#[tokio::test]
async fn test_list_directory_real_files() {
    // Create temporary directory with various file types
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    // Create mixed content
    fs::write(project_root.join("README.md"), "# Documentation").expect("Failed to create README.md");
    fs::write(project_root.join("config.json"), r#"{"key": "value"}"#).expect("Failed to create config.json");

    let sub_dir = project_root.join("subdirectory");
    fs::create_dir_all(&sub_dir).expect("Failed to create subdirectory");
    fs::write(sub_dir.join("nested.txt"), "nested content").expect("Failed to create nested.txt");

    let service = WorkspaceNavigationService::new();

    // List directory contents
    let result = service.list_directory(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy(),
        &project_root.to_string_lossy()
    ).await;

    assert!(result.is_ok(), "Failed to list directory: {:?}", result.err());

    let listing = result.unwrap();

    // Validate listing structure
    assert!(listing.entries.len() >= 3, "Should have at least 3 entries");

    let entry_names: Vec<String> = listing.entries.iter().map(|e| e.name.clone()).collect();
    assert!(entry_names.contains(&"README.md".to_string()), "Should contain README.md");
    assert!(entry_names.contains(&"config.json".to_string()), "Should contain config.json");
    assert!(entry_names.contains(&"subdirectory".to_string()), "Should contain subdirectory");

    // Validate entry types
    let subdirectory_entry = listing.entries.iter()
        .find(|e| e.name == "subdirectory")
        .expect("Should find subdirectory entry");
    assert_eq!(subdirectory_entry.entry_type, "directory", "Subdirectory should be marked as directory");

    let readme_entry = listing.entries.iter()
        .find(|e| e.name == "README.md")
        .expect("Should find README.md entry");
    assert_eq!(readme_entry.entry_type, "file", "README.md should be marked as file");
}

#[tokio::test]
async fn test_workspace_performance_large_directory() {
    // Create directory with many files to test performance
    let temp_dir = TempDir::new().expect("Failed to create temp directory");
    let project_root = temp_dir.path().to_path_buf();

    // Create 50 test files
    for i in 0..50 {
        fs::write(project_root.join(format!("file_{}.txt", i)), format!("content {}", i))
            .expect(&format!("Failed to create file_{}.txt", i));
    }

    let service = WorkspaceNavigationService::new();

    // Measure time to open workspace
    let start = std::time::Instant::now();
    let result = service.open_workspace(
        "test_proj_123",
        "Test Project",
        &project_root.to_string_lossy()
    ).await;
    let duration = start.elapsed();

    assert!(result.is_ok(), "Failed to open workspace with many files");
    assert!(duration.as_millis() < 2000, "Workspace loading should complete within 2 seconds, took {}ms", duration.as_millis());

    let workspace = result.unwrap();
    assert_eq!(workspace.directory_listing.entries.len(), 50, "Should list all 50 files");
}