use serde::{Deserialize, Serialize};

use crate::domain::project::ProjectError;
use crate::application::errors::ExtractionError;
use crate::infrastructure::dtos::{
    CreateProjectRequestError, UpdateProjectRequestError, DeleteProjectRequestError, ProjectDtoError
};

/// Application-level error type that maps domain and infrastructure errors
/// to a format suitable for the frontend and external APIs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppError {
    /// Error code for programmatic handling
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Additional context or details
    pub details: Option<String>,
    /// Whether the error is recoverable (user can retry)
    pub recoverable: bool,
    /// Whether the error requires user attention
    pub requires_user_attention: bool,
}

impl AppError {
    /// Create a new AppError
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        details: Option<String>,
        recoverable: bool,
        requires_user_attention: bool,
    ) -> Self {
        AppError {
            code: code.into(),
            message: message.into(),
            details,
            recoverable,
            requires_user_attention,
        }
    }

    /// Create an internal server error
    pub fn internal_error(message: impl Into<String>) -> Self {
        AppError::new(
            "INTERNAL_ERROR",
            message,
            None,
            false,
            true,
        )
    }

    /// Create a validation error
    pub fn validation_error(message: impl Into<String>, details: Option<String>) -> Self {
        AppError::new(
            "VALIDATION_ERROR",
            message,
            details,
            true,
            true,
        )
    }

    /// Create a not found error
    pub fn not_found(resource: impl Into<String>) -> Self {
        AppError::new(
            "NOT_FOUND",
            format!("{} not found", resource.into()),
            None,
            false,
            true,
        )
    }

    /// Create a conflict error
    pub fn conflict(message: impl Into<String>) -> Self {
        AppError::new(
            "CONFLICT",
            message,
            None,
            true,
            true,
        )
    }

    /// Create a database error
    pub fn database_error(operation: impl Into<String>) -> Self {
        AppError::new(
            "DATABASE_ERROR",
            "Database operation failed",
            Some(operation.into()),
            true,
            false,
        )
    }

    /// Create a filesystem error
    pub fn filesystem_error(message: impl Into<String>) -> Self {
        AppError::new(
            "FILESYSTEM_ERROR",
            message,
            None,
            true,
            true,
        )
    }

    /// Create a permission error
    pub fn permission_error(message: impl Into<String>) -> Self {
        AppError::new(
            "PERMISSION_ERROR",
            message,
            None,
            false,
            true,
        )
    }

    /// Get a user-friendly error message with details
    pub fn user_message(&self) -> String {
        match &self.details {
            Some(details) => format!("{}: {}", self.message, details),
            None => self.message.clone(),
        }
    }

    /// Check if this error should be logged
    pub fn should_log(&self) -> bool {
        // Log internal errors and database errors, but not validation errors
        matches!(self.code.as_str(), "INTERNAL_ERROR" | "DATABASE_ERROR" | "FILESYSTEM_ERROR")
    }

    /// Get the log level for this error
    pub fn log_level(&self) -> LogLevel {
        match self.code.as_str() {
            "INTERNAL_ERROR" => LogLevel::Error,
            "DATABASE_ERROR" => LogLevel::Error,
            "FILESYSTEM_ERROR" => LogLevel::Warning,
            "NOT_FOUND" => LogLevel::Info,
            "VALIDATION_ERROR" => LogLevel::Info,
            "CONFLICT" => LogLevel::Info,
            _ => LogLevel::Warning,
        }
    }
}

#[derive(Debug, Clone)]
pub enum LogLevel {
    Error,
    Warning,
    Info,
}

/// Convert domain ProjectError to AppError
impl From<ProjectError> for AppError {
    fn from(error: ProjectError) -> Self {
        match error {
            // Value object validation errors
            ProjectError::InvalidName(e) => AppError::validation_error(
                "Invalid project name",
                Some(e.to_string())
            ),
            ProjectError::InvalidPath(e) => AppError::validation_error(
                "Invalid folder path",
                Some(e.to_string())
            ),
            ProjectError::InvalidNote(e) => AppError::validation_error(
                "Invalid project note",
                Some(e.to_string())
            ),
            ProjectError::InvalidTimestamp(e) => AppError::validation_error(
                "Invalid timestamp",
                Some(e.to_string())
            ),
            ProjectError::InvalidId => AppError::validation_error(
                "Invalid project ID format",
                None
            ),

            // Business rule violations
            ProjectError::SourceNotAccessible => AppError::filesystem_error(
                "Source folder cannot be accessed. It may have been moved or deleted."
            ),
            ProjectError::NotFound { id } => AppError::not_found(
                format!("Project with ID '{}'", id)
            ),
            ProjectError::DuplicateName { name } => AppError::conflict(
                format!("A project named '{}' already exists", name)
            ),
            ProjectError::CannotDelete { reason } => AppError::new(
                "CANNOT_DELETE",
                "Cannot delete project",
                Some(reason),
                false,
                true,
            ),
            ProjectError::CannotUpdate { reason } => AppError::new(
                "CANNOT_UPDATE",
                "Cannot update project",
                Some(reason),
                false,
                true,
            ),

            // Repository errors
            ProjectError::RepositoryError { operation } => AppError::database_error(operation),
            ProjectError::DatabaseConnection => AppError::database_error("Connection failed"),
            ProjectError::DataCorruption { id } => AppError::new(
                "DATA_CORRUPTION",
                "Data corruption detected",
                Some(format!("Project ID: {}", id)),
                false,
                true,
            ),

            // Concurrency errors
            ProjectError::Locked => AppError::new(
                "RESOURCE_LOCKED",
                "Project is currently being edited by another process",
                None,
                true,
                true,
            ),
            ProjectError::VersionConflict => AppError::new(
                "VERSION_CONFLICT",
                "Project was modified by another process. Please refresh and try again.",
                None,
                true,
                true,
            ),
        }
    }
}

/// Convert DTO validation errors to AppError
impl From<CreateProjectRequestError> for AppError {
    fn from(error: CreateProjectRequestError) -> Self {
        match error {
            CreateProjectRequestError::NameRequired => AppError::validation_error(
                "Project name is required",
                None
            ),
            CreateProjectRequestError::NameTooLong => AppError::validation_error(
                "Project name is too long (max 255 characters)",
                None
            ),
            CreateProjectRequestError::SourceFolderRequired => AppError::validation_error(
                "Source folder is required",
                None
            ),
            CreateProjectRequestError::NoteTooLong => AppError::validation_error(
                "Project note is too long (max 1000 characters)",
                None
            ),
        }
    }
}

impl From<UpdateProjectRequestError> for AppError {
    fn from(error: UpdateProjectRequestError) -> Self {
        match error {
            UpdateProjectRequestError::InvalidIdFormat => AppError::validation_error(
                "Invalid project ID format",
                None
            ),
            UpdateProjectRequestError::NameRequired => AppError::validation_error(
                "Project name is required when updating",
                None
            ),
            UpdateProjectRequestError::NameTooLong => AppError::validation_error(
                "Project name is too long (max 255 characters)",
                None
            ),
            UpdateProjectRequestError::NoteTooLong => AppError::validation_error(
                "Project note is too long (max 1000 characters)",
                None
            ),
        }
    }
}

impl From<DeleteProjectRequestError> for AppError {
    fn from(error: DeleteProjectRequestError) -> Self {
        match error {
            DeleteProjectRequestError::InvalidIdFormat => AppError::validation_error(
                "Invalid project ID format",
                None
            ),
            DeleteProjectRequestError::NotConfirmed => AppError::validation_error(
                "Deletion must be confirmed",
                None
            ),
        }
    }
}

impl From<ProjectDtoError> for AppError {
    fn from(error: ProjectDtoError) -> Self {
        match error {
            ProjectDtoError::InvalidIdFormat => AppError::validation_error(
                "Invalid project ID format",
                None
            ),
            ProjectDtoError::EmptyName => AppError::validation_error(
                "Project name cannot be empty",
                None
            ),
            ProjectDtoError::NameTooLong => AppError::validation_error(
                "Project name is too long",
                None
            ),
            ProjectDtoError::EmptySourceFolder => AppError::validation_error(
                "Source folder cannot be empty",
                None
            ),
            ProjectDtoError::NoteTooLong => AppError::validation_error(
                "Project note is too long",
                None
            ),
            ProjectDtoError::InvalidTimestamp => AppError::validation_error(
                "Invalid timestamp format",
                None
            ),
        }
    }
}

/// Convert application ExtractionError to AppError
impl From<ExtractionError> for AppError {
    fn from(error: ExtractionError) -> Self {
        match error {
            // Not found errors
            ExtractionError::ProjectNotFound { project_id } => AppError::new(
                "PROJECT_NOT_FOUND",
                "Project not found",
                Some(format!("Project ID: {}", project_id)),
                false,
                true,
            ),
            ExtractionError::DocumentNotFound { document_id } => AppError::new(
                "DOCUMENT_NOT_FOUND",
                "Document not found",
                Some(format!("Document ID: {}", document_id)),
                false,
                true,
            ),
            ExtractionError::ExtractionNotFound { extraction_id } => AppError::new(
                "EXTRACTION_NOT_FOUND",
                "Extraction not found",
                Some(format!("Extraction ID: {}", extraction_id)),
                false,
                true,
            ),
            ExtractionError::ExtractedDocumentNotFound { extracted_document_id } => AppError::new(
                "EXTRACTED_DOCUMENT_NOT_FOUND",
                "Extracted document not found",
                Some(format!("Extracted Document ID: {}", extracted_document_id)),
                false,
                true,
            ),

            // State errors
            ExtractionError::ExtractionInProgress { document_id, current_extraction_id } => AppError::new(
                "EXTRACTION_IN_PROGRESS",
                "Document extraction is already in progress",
                Some(format!("Document ID: {}, Current Extraction: {}", document_id, current_extraction_id)),
                true,
                true,
            ),
            ExtractionError::ExtractionNotCompleted { document_id, current_status } => AppError::new(
                "EXTRACTION_NOT_COMPLETED",
                "Document extraction has not completed successfully",
                Some(format!("Document ID: {}, Status: {}", document_id, current_status)),
                true,
                true,
            ),
            ExtractionError::ExtractionNotCancellable { extraction_id, current_status, reason } => AppError::new(
                "EXTRACTION_NOT_CANCELLABLE",
                "Extraction cannot be cancelled in current state",
                Some(format!("Extraction ID: {}, Status: {}, Reason: {}", extraction_id, current_status, reason)),
                false,
                true,
            ),

            // File validation errors
            ExtractionError::UnsupportedFileType { file_path, file_extension, supported_types } => {
                let ext_msg = file_extension.as_deref().unwrap_or("unknown");
                let supported = supported_types.join(", ");
                AppError::new(
                    "UNSUPPORTED_FILE_TYPE",
                    "File type not supported for extraction",
                    Some(format!("File: {}, Extension: {}, Supported: {}", file_path, ext_msg, supported)),
                    false,
                    true,
                )
            },
            ExtractionError::FileTooLarge { file_path, file_size_bytes, max_size_bytes } => AppError::new(
                "FILE_TOO_LARGE",
                "File exceeds maximum size limit for extraction",
                Some(format!("File: {}, Size: {} bytes, Max: {} bytes", file_path, file_size_bytes, max_size_bytes)),
                false,
                true,
            ),

            // File access errors
            ExtractionError::FileNotAccessible { file_path, reason } => AppError::new(
                "FILE_NOT_ACCESSIBLE",
                "Cannot read or access the specified file",
                Some(format!("File: {}, Reason: {}", file_path, reason)),
                true,
                true,
            ),
            ExtractionError::FileSystemError { operation, path, reason } => {
                let path_info = path.as_deref().unwrap_or("N/A");
                AppError::new(
                    "FILE_SYSTEM_ERROR",
                    "Error accessing file system",
                    Some(format!("Operation: {}, Path: {}, Reason: {}", operation, path_info, reason)),
                    true,
                    true,
                )
            },

            // Content errors
            ExtractionError::InvalidContent { extracted_document_id, validation_error } => AppError::new(
                "INVALID_CONTENT",
                "Content does not match expected format",
                Some(format!("Document ID: {}, Error: {}", extracted_document_id, validation_error)),
                true,
                true,
            ),
            ExtractionError::ContentCorrupted { document_id, extraction_method, corruption_details } => {
                let method_info = extraction_method.as_deref().unwrap_or("unknown");
                AppError::new(
                    "CONTENT_CORRUPTED",
                    "Document content is corrupted or unreadable",
                    Some(format!("Document ID: {}, Method: {}, Details: {}", document_id, method_info, corruption_details)),
                    false,
                    true,
                )
            },
            ExtractionError::ContentParsingError { document_id, parser_type, error_details } => AppError::new(
                "CONTENT_PARSING_ERROR",
                "Error during content parsing or conversion",
                Some(format!("Document ID: {}, Parser: {}, Error: {}", document_id, parser_type, error_details)),
                true,
                true,
            ),

            // Processing errors
            ExtractionError::ExtractionFailed { extraction_id, document_id, extraction_method, failure_reason } => {
                let method_info = extraction_method.as_deref().unwrap_or("unknown");
                AppError::new(
                    "EXTRACTION_FAILED",
                    "Extraction process failed during execution",
                    Some(format!("Extraction ID: {}, Document ID: {}, Method: {}, Reason: {}", extraction_id, document_id, method_info, failure_reason)),
                    true,
                    true,
                )
            },
            ExtractionError::OcrProcessingFailed { document_id, page_number, ocr_error } => {
                let page_info = page_number.map(|p| format!("Page: {}, ", p)).unwrap_or_default();
                AppError::new(
                    "OCR_PROCESSING_FAILED",
                    "OCR processing failed for image-based PDF extraction",
                    Some(format!("Document ID: {}, {}Error: {}", document_id, page_info, ocr_error)),
                    true,
                    true,
                )
            },
            ExtractionError::DocxParsingFailed { document_id, parsing_stage, error_details } => AppError::new(
                "DOCX_PARSING_FAILED",
                "DOCX structure extraction failed",
                Some(format!("Document ID: {}, Stage: {}, Error: {}", document_id, parsing_stage, error_details)),
                true,
                true,
            ),
            ExtractionError::MarkdownConversionFailed { document_id, conversion_error } => AppError::new(
                "MARKDOWN_CONVERSION_FAILED",
                "Markdown conversion failed",
                Some(format!("Document ID: {}, Error: {}", document_id, conversion_error)),
                true,
                true,
            ),

            // Validation errors
            ExtractionError::ValidationError { parameter, value, validation_rule } => AppError::validation_error(
                "Request parameters failed validation",
                Some(format!("Parameter: {}, Value: {}, Rule: {}", parameter, value, validation_rule))
            ),
            ExtractionError::InvalidIdFormat { id, expected_prefix } => AppError::validation_error(
                "Invalid ID format",
                Some(format!("ID: {}, Expected format: {}_[UUID]", id, expected_prefix))
            ),

            // System errors
            ExtractionError::DatabaseError { operation, table, error_details } => {
                let table_info = table.as_deref().unwrap_or("N/A");
                AppError::database_error(format!("Operation: {}, Table: {}, Error: {}", operation, table_info, error_details))
            },
            ExtractionError::ExtractionTimeout { extraction_id, timeout_seconds } => AppError::new(
                "EXTRACTION_TIMEOUT",
                "Extraction operation timed out",
                Some(format!("Extraction ID: {}, Timeout: {} seconds", extraction_id, timeout_seconds)),
                true,
                true,
            ),
            ExtractionError::ResourceExhausted { resource_type, current_usage, limit } => {
                let usage_info = match (current_usage, limit) {
                    (Some(usage), Some(limit)) => format!("Usage: {}, Limit: {}", usage, limit),
                    _ => "Usage information unavailable".to_string(),
                };
                AppError::new(
                    "RESOURCE_EXHAUSTED",
                    "System resource exhausted",
                    Some(format!("Resource: {}, {}", resource_type, usage_info)),
                    true,
                    false,
                )
            },
            ExtractionError::DependencyError { dependency_name, operation, error_message } => AppError::new(
                "DEPENDENCY_ERROR",
                "External dependency failed",
                Some(format!("Service: {}, Operation: {}, Error: {}", dependency_name, operation, error_message)),
                true,
                false,
            ),

            // Concurrency errors
            ExtractionError::ResourceLocked { resource_type, resource_id, lock_holder } => {
                let holder_info = lock_holder.as_deref().unwrap_or("unknown");
                AppError::new(
                    "RESOURCE_LOCKED",
                    "Resource is locked by another process",
                    Some(format!("Type: {}, ID: {}, Holder: {}", resource_type, resource_id, holder_info)),
                    true,
                    true,
                )
            },
            ExtractionError::VersionConflict { extracted_document_id, expected_version, actual_version } => {
                let version_info = match (expected_version, actual_version) {
                    (Some(expected), Some(actual)) => format!("Expected: {}, Actual: {}", expected, actual),
                    _ => "Version information unavailable".to_string(),
                };
                AppError::new(
                    "VERSION_CONFLICT",
                    "Version conflict detected during save",
                    Some(format!("Document ID: {}, {}", extracted_document_id, version_info)),
                    true,
                    true,
                )
            },

            // Configuration errors
            ExtractionError::ConfigurationError { setting_name, error_description } => AppError::new(
                "CONFIGURATION_ERROR",
                "Required configuration is missing or invalid",
                Some(format!("Setting: {}, Error: {}", setting_name, error_description)),
                false,
                false,
            ),
            ExtractionError::ServiceNotInitialized { service_name } => AppError::new(
                "SERVICE_NOT_INITIALIZED",
                "Extraction service is not properly initialized",
                Some(format!("Service: {}", service_name)),
                false,
                false,
            ),

            // Unknown errors
            ExtractionError::UnexpectedError { context, error_message } => AppError::new(
                "UNEXPECTED_ERROR",
                "An unexpected error occurred during extraction",
                Some(format!("Context: {}, Error: {}", context, error_message)),
                true,
                true,
            ),
        }
    }
}

// Note: InvokeError conversion is handled automatically by Tauri
// when commands return Result<T, String>

/// Result type for application operations
pub type AppResult<T> = Result<T, AppError>;

/// Error response format for consistent API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: AppError,
    pub timestamp: String,
    pub request_id: Option<String>,
}

impl ErrorResponse {
    /// Create a new error response
    pub fn new(error: AppError, request_id: Option<String>) -> Self {
        ErrorResponse {
            error,
            timestamp: chrono::Utc::now().to_rfc3339(),
            request_id,
        }
    }

    /// Create from any error that can be converted to AppError
    pub fn from_error<E: Into<AppError>>(error: E, request_id: Option<String>) -> Self {
        Self::new(error.into(), request_id)
    }
}

/// Utility trait for converting Results to AppResults with context
pub trait IntoAppResult<T> {
    fn into_app_result(self) -> AppResult<T>;
    fn into_app_result_with_context(self, context: &str) -> AppResult<T>;
}

impl<T, E: Into<AppError>> IntoAppResult<T> for Result<T, E> {
    fn into_app_result(self) -> AppResult<T> {
        self.map_err(|e| e.into())
    }

    fn into_app_result_with_context(self, context: &str) -> AppResult<T> {
        self.map_err(|e| {
            let mut app_error = e.into();
            app_error.details = Some(match app_error.details {
                Some(existing) => format!("{}: {}", context, existing),
                None => context.to_string(),
            });
            app_error
        })
    }
}

/// Macro for creating AppErrors with context
#[macro_export]
macro_rules! app_error {
    ($code:expr, $message:expr) => {
        AppError::new($code, $message, None, false, true)
    };
    ($code:expr, $message:expr, $details:expr) => {
        AppError::new($code, $message, Some($details), false, true)
    };
    ($code:expr, $message:expr, $details:expr, $recoverable:expr) => {
        AppError::new($code, $message, Some($details), $recoverable, true)
    };
    ($code:expr, $message:expr, $details:expr, $recoverable:expr, $attention:expr) => {
        AppError::new($code, $message, Some($details), $recoverable, $attention)
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::project::value_objects::project_name::ProjectNameError;

    #[test]
    fn test_app_error_creation() {
        let error = AppError::validation_error("Test error", Some("Test details".to_string()));

        assert_eq!(error.code, "VALIDATION_ERROR");
        assert_eq!(error.message, "Test error");
        assert_eq!(error.details, Some("Test details".to_string()));
        assert!(error.recoverable);
        assert!(error.requires_user_attention);
    }

    #[test]
    fn test_project_error_conversion() {
        let domain_error = ProjectError::InvalidName(ProjectNameError::Required);
        let app_error: AppError = domain_error.into();

        assert_eq!(app_error.code, "VALIDATION_ERROR");
        assert!(app_error.message.contains("Invalid project name"));
        assert!(app_error.recoverable);
    }

    #[test]
    fn test_not_found_error() {
        let error = AppError::not_found("Project");
        assert_eq!(error.code, "NOT_FOUND");
        assert_eq!(error.message, "Project not found");
    }

    #[test]
    fn test_user_message() {
        let error_with_details = AppError::new(
            "TEST_ERROR",
            "Test message",
            Some("Additional details"),
            false,
            true
        );
        assert_eq!(error_with_details.user_message(), "Test message: Additional details");

        let error_without_details = AppError::new(
            "TEST_ERROR",
            "Test message",
            None,
            false,
            true
        );
        assert_eq!(error_without_details.user_message(), "Test message");
    }

    #[test]
    fn test_should_log() {
        let internal_error = AppError::internal_error("Test");
        assert!(internal_error.should_log());

        let validation_error = AppError::validation_error("Test", None);
        assert!(!validation_error.should_log());

        let database_error = AppError::database_error("SELECT failed");
        assert!(database_error.should_log());
    }

    #[test]
    fn test_log_level() {
        let internal_error = AppError::internal_error("Test");
        assert!(matches!(internal_error.log_level(), LogLevel::Error));

        let validation_error = AppError::validation_error("Test", None);
        assert!(matches!(validation_error.log_level(), LogLevel::Info));

        let filesystem_error = AppError::filesystem_error("Test");
        assert!(matches!(filesystem_error.log_level(), LogLevel::Warning));
    }

    #[test]
    fn test_error_response() {
        let error = AppError::validation_error("Test error", None);
        let response = ErrorResponse::new(error.clone(), Some("req-123".to_string()));

        assert_eq!(response.error.code, error.code);
        assert_eq!(response.request_id, Some("req-123".to_string()));
        assert!(!response.timestamp.is_empty());
    }

    #[test]
    fn test_into_app_result_trait() {
        use crate::infrastructure::dtos::CreateProjectRequestError;

        let domain_result: Result<String, CreateProjectRequestError> = Err(CreateProjectRequestError::NameRequired);
        let app_result = domain_result.into_app_result();

        assert!(app_result.is_err());
        let app_error = app_result.unwrap_err();
        assert_eq!(app_error.code, "VALIDATION_ERROR");
    }

    #[test]
    fn test_into_app_result_with_context() {
        use crate::infrastructure::dtos::CreateProjectRequestError;

        let domain_result: Result<String, CreateProjectRequestError> = Err(CreateProjectRequestError::NameRequired);
        let app_result = domain_result.into_app_result_with_context("Creating project");

        assert!(app_result.is_err());
        let app_error = app_result.unwrap_err();
        assert!(app_error.details.unwrap().contains("Creating project"));
    }

    #[test]
    fn test_app_error_macro() {
        let error1 = app_error!("TEST_CODE", "Test message");
        assert_eq!(error1.code, "TEST_CODE");
        assert_eq!(error1.message, "Test message");
        assert!(error1.details.is_none());

        let error2 = app_error!("TEST_CODE", "Test message", "Test details".to_string());
        assert!(error2.details.is_some());
        assert_eq!(error2.details.unwrap(), "Test details");
    }
}