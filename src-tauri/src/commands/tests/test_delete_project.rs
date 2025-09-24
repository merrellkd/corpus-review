#[cfg(test)]
mod tests {
    use crate::commands::delete_project;
    use crate::infrastructure::errors::AppError;
    use crate::application::app_state::AppState;

    #[tokio::test]
    async fn test_delete_existing_project() {
        // Arrange
        let project_id = "proj_12345678-1234-1234-1234-123456789012".to_string();

        // This will fail until we implement the command
        let result = delete_project(project_id, mock_app_state()).await;

        // Assert
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_delete_nonexistent_project() {
        // Arrange
        let project_id = "proj_nonexistent-1234-1234-1234-123456789012".to_string();

        // This will fail until we implement the command
        let result = delete_project(project_id, mock_app_state()).await;

        // Assert
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::NotFound { resource, id, message: _ } => {
                assert_eq!(resource, "project");
                assert_eq!(id, "proj_nonexistent-1234-1234-1234-123456789012");
            }
            _ => panic!("Expected NotFound error"),
        }
    }

    #[tokio::test]
    async fn test_delete_project_with_invalid_id() {
        // Arrange
        let project_id = "invalid-id-format".to_string();

        // This will fail until we implement validation
        let result = delete_project(project_id, mock_app_state()).await;

        // Assert
        assert!(result.is_err());
        match result.unwrap_err() {
            AppError::ValidationError { field, message } => {
                assert_eq!(field, "project_id");
                assert!(message.contains("Invalid project ID format"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    fn mock_app_state() -> tauri::State<'static, AppState> {
        // This will need to be implemented when we create AppState
        todo!("Mock AppState for testing")
    }
}