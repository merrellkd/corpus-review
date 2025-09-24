#[cfg(test)]
mod tests {
    use crate::commands::create_project;
    use crate::infrastructure::errors::AppError;
    use crate::application::app_state::AppState;
    use tauri::test::mock_context;

    #[tokio::test]
    async fn test_create_project_with_valid_input() {
        // Arrange
        let name = "Test Project".to_string();
        let source_folder = "/tmp/test-folder".to_string();
        let note = Some("Test project note".to_string());

        // This will fail until we implement the command
        let result = create_project(name, source_folder, note, mock_app_state()).await;

        // Assert
        assert!(result.is_ok());
        let project_dto = result.unwrap();
        assert_eq!(project_dto.name, "Test Project");
        assert!(project_dto.id.starts_with("proj_"));
        assert_eq!(project_dto.note, Some("Test project note".to_string()));
    }

    #[tokio::test]
    async fn test_create_project_without_note() {
        // Arrange
        let name = "Test Project No Note".to_string();
        let source_folder = "/tmp/test-folder".to_string();
        let note = None;

        // This will fail until we implement the command
        let result = create_project(name, source_folder, note, mock_app_state()).await;

        // Assert
        assert!(result.is_ok());
        let project_dto = result.unwrap();
        assert_eq!(project_dto.name, "Test Project No Note");
        assert_eq!(project_dto.note, None);
    }

    #[tokio::test]
    async fn test_create_project_with_empty_name() {
        // Arrange
        let name = "".to_string();
        let source_folder = "/tmp/test-folder".to_string();
        let note = None;

        // This will fail until we implement validation
        let result = create_project(name, source_folder, note, mock_app_state()).await;

        // Assert
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError { field, message } => {
                assert_eq!(field, "name");
                assert_eq!(message, "Project name is required");
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[tokio::test]
    async fn test_create_project_with_long_note() {
        // Arrange
        let name = "Test Project".to_string();
        let source_folder = "/tmp/test-folder".to_string();
        let note = Some("x".repeat(1001)); // Exceeds 1000 character limit

        // This will fail until we implement validation
        let result = create_project(name, source_folder, note, mock_app_state()).await;

        // Assert
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError { field, message } => {
                assert_eq!(field, "note");
                assert_eq!(message, "Project note too long (max 1000 characters)");
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    fn mock_app_state() -> tauri::State<'static, AppState> {
        // This will need to be implemented when we create AppState
        todo!("Mock AppState for testing")
    }
}