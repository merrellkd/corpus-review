use std::fmt;

/// Application-layer errors for file metadata extraction operations
///
/// This enum covers all possible errors that can occur during the extraction workflow,
/// from document scanning to content saving, with detailed context for debugging
/// and user-friendly messages for display.
#[derive(Debug, Clone, PartialEq)]
pub enum ExtractionError {
    // Document and Project Errors
    /// Project with the specified ID does not exist
    ProjectNotFound { project_id: String },

    /// Document with the specified ID does not exist
    DocumentNotFound { document_id: String },

    /// Extraction with the specified ID does not exist
    ExtractionNotFound { extraction_id: String },

    /// Extracted document with the specified ID does not exist
    ExtractedDocumentNotFound { extracted_document_id: String },

    // Extraction State Errors
    /// An extraction is already in progress for this document
    ExtractionInProgress {
        document_id: String,
        current_extraction_id: String,
    },

    /// Document extraction has not completed successfully
    ExtractionNotCompleted {
        document_id: String,
        current_status: String,
    },

    /// Extraction cannot be cancelled in its current state
    ExtractionNotCancellable {
        extraction_id: String,
        current_status: String,
        reason: String,
    },

    // File Type and Size Validation Errors
    /// File type is not supported for extraction
    UnsupportedFileType {
        file_path: String,
        file_extension: Option<String>,
        supported_types: Vec<String>,
    },

    /// File exceeds the maximum size limit for extraction
    FileTooLarge {
        file_path: String,
        file_size_bytes: i64,
        max_size_bytes: i64,
    },

    // File System and Access Errors
    /// Cannot read or access the specified file
    FileNotAccessible {
        file_path: String,
        reason: String,
    },

    /// Generic file system error during extraction operations
    FileSystemError {
        operation: String,
        path: Option<String>,
        reason: String,
    },

    // Content and Format Errors
    /// Content does not match expected TipTap/ProseMirror format
    InvalidContent {
        extracted_document_id: String,
        validation_error: String,
    },

    /// Document content is corrupted or unreadable
    ContentCorrupted {
        document_id: String,
        extraction_method: Option<String>,
        corruption_details: String,
    },

    /// Error during content parsing or conversion
    ContentParsingError {
        document_id: String,
        parser_type: String,
        error_details: String,
    },

    // Processing and Extraction Errors
    /// Extraction process failed during execution
    ExtractionFailed {
        extraction_id: String,
        document_id: String,
        extraction_method: Option<String>,
        failure_reason: String,
    },

    /// OCR processing failed for image-based PDF extraction
    OcrProcessingFailed {
        document_id: String,
        page_number: Option<i32>,
        ocr_error: String,
    },

    /// DOCX structure extraction failed
    DocxParsingFailed {
        document_id: String,
        parsing_stage: String,
        error_details: String,
    },

    /// Markdown conversion failed
    MarkdownConversionFailed {
        document_id: String,
        conversion_error: String,
    },

    // Validation and Input Errors
    /// Request parameters failed validation
    ValidationError {
        parameter: String,
        value: String,
        validation_rule: String,
    },

    /// Invalid UUID format for IDs
    InvalidIdFormat {
        id: String,
        expected_prefix: String,
    },

    // System and Infrastructure Errors
    /// Database operation failed
    DatabaseError {
        operation: String,
        table: Option<String>,
        error_details: String,
    },

    /// Timeout occurred during extraction
    ExtractionTimeout {
        extraction_id: String,
        timeout_seconds: u64,
    },

    /// System resource exhausted (memory, disk space, etc.)
    ResourceExhausted {
        resource_type: String,
        current_usage: Option<String>,
        limit: Option<String>,
    },

    /// External dependency failed (PDF library, DOCX parser, etc.)
    DependencyError {
        dependency_name: String,
        operation: String,
        error_message: String,
    },

    // Concurrency and State Management Errors
    /// Resource is locked by another process
    ResourceLocked {
        resource_type: String,
        resource_id: String,
        lock_holder: Option<String>,
    },

    /// Version conflict detected during save
    VersionConflict {
        extracted_document_id: String,
        expected_version: Option<String>,
        actual_version: Option<String>,
    },

    // Configuration and Setup Errors
    /// Required configuration is missing or invalid
    ConfigurationError {
        setting_name: String,
        error_description: String,
    },

    /// Extraction service is not properly initialized
    ServiceNotInitialized {
        service_name: String,
    },

    // Generic and Unknown Errors
    /// An unexpected error occurred during extraction
    UnexpectedError {
        context: String,
        error_message: String,
    },
}

impl ExtractionError {
    /// Get the error code for API responses and logging
    pub fn code(&self) -> &'static str {
        match self {
            ExtractionError::ProjectNotFound { .. } => "PROJECT_NOT_FOUND",
            ExtractionError::DocumentNotFound { .. } => "DOCUMENT_NOT_FOUND",
            ExtractionError::ExtractionNotFound { .. } => "EXTRACTION_NOT_FOUND",
            ExtractionError::ExtractedDocumentNotFound { .. } => "EXTRACTED_DOCUMENT_NOT_FOUND",

            ExtractionError::ExtractionInProgress { .. } => "EXTRACTION_IN_PROGRESS",
            ExtractionError::ExtractionNotCompleted { .. } => "EXTRACTION_NOT_COMPLETED",
            ExtractionError::ExtractionNotCancellable { .. } => "EXTRACTION_NOT_CANCELLABLE",

            ExtractionError::UnsupportedFileType { .. } => "UNSUPPORTED_FILE_TYPE",
            ExtractionError::FileTooLarge { .. } => "FILE_TOO_LARGE",

            ExtractionError::FileNotAccessible { .. } => "FILE_NOT_ACCESSIBLE",
            ExtractionError::FileSystemError { .. } => "FILE_SYSTEM_ERROR",

            ExtractionError::InvalidContent { .. } => "INVALID_CONTENT",
            ExtractionError::ContentCorrupted { .. } => "CONTENT_CORRUPTED",
            ExtractionError::ContentParsingError { .. } => "CONTENT_PARSING_ERROR",

            ExtractionError::ExtractionFailed { .. } => "EXTRACTION_FAILED",
            ExtractionError::OcrProcessingFailed { .. } => "OCR_PROCESSING_FAILED",
            ExtractionError::DocxParsingFailed { .. } => "DOCX_PARSING_FAILED",
            ExtractionError::MarkdownConversionFailed { .. } => "MARKDOWN_CONVERSION_FAILED",

            ExtractionError::ValidationError { .. } => "VALIDATION_ERROR",
            ExtractionError::InvalidIdFormat { .. } => "INVALID_ID_FORMAT",

            ExtractionError::DatabaseError { .. } => "DATABASE_ERROR",
            ExtractionError::ExtractionTimeout { .. } => "EXTRACTION_TIMEOUT",
            ExtractionError::ResourceExhausted { .. } => "RESOURCE_EXHAUSTED",
            ExtractionError::DependencyError { .. } => "DEPENDENCY_ERROR",

            ExtractionError::ResourceLocked { .. } => "RESOURCE_LOCKED",
            ExtractionError::VersionConflict { .. } => "VERSION_CONFLICT",

            ExtractionError::ConfigurationError { .. } => "CONFIGURATION_ERROR",
            ExtractionError::ServiceNotInitialized { .. } => "SERVICE_NOT_INITIALIZED",

            ExtractionError::UnexpectedError { .. } => "UNEXPECTED_ERROR",
        }
    }

    /// Get a user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            ExtractionError::ProjectNotFound { project_id } => {
                format!("Project '{}' was not found. It may have been deleted or moved.", project_id)
            },
            ExtractionError::DocumentNotFound { document_id } => {
                format!("Document '{}' was not found. The file may have been deleted or moved.", document_id)
            },
            ExtractionError::ExtractionNotFound { extraction_id } => {
                format!("Extraction '{}' was not found. It may have been cancelled or expired.", extraction_id)
            },
            ExtractionError::ExtractedDocumentNotFound { extracted_document_id } => {
                format!("Extracted document '{}' was not found. The extraction may not have completed successfully.", extracted_document_id)
            },

            ExtractionError::ExtractionInProgress { document_id, .. } => {
                format!("Document '{}' is already being extracted. Please wait for the current extraction to complete.", document_id)
            },
            ExtractionError::ExtractionNotCompleted { document_id, current_status } => {
                format!("Document '{}' extraction has not completed successfully (status: {}). Please try extracting again.", document_id, current_status)
            },
            ExtractionError::ExtractionNotCancellable { extraction_id, current_status, reason } => {
                format!("Extraction '{}' cannot be cancelled (status: {}): {}", extraction_id, current_status, reason)
            },

            ExtractionError::UnsupportedFileType { file_path, file_extension, supported_types } => {
                let ext_msg = file_extension.as_deref().unwrap_or("unknown");
                let supported = supported_types.join(", ");
                format!("File '{}' has unsupported type '{}'. Supported types: {}", file_path, ext_msg, supported)
            },
            ExtractionError::FileTooLarge { file_path, file_size_bytes, max_size_bytes } => {
                let size_mb = *file_size_bytes as f64 / (1024.0 * 1024.0);
                let max_mb = *max_size_bytes as f64 / (1024.0 * 1024.0);
                format!("File '{}' is too large ({:.1} MB). Maximum allowed size is {:.1} MB.", file_path, size_mb, max_mb)
            },

            ExtractionError::FileNotAccessible { file_path, reason } => {
                format!("Cannot access file '{}': {}", file_path, reason)
            },
            ExtractionError::FileSystemError { operation, path, reason } => {
                if let Some(path) = path {
                    format!("File system error during '{}' at '{}': {}", operation, path, reason)
                } else {
                    format!("File system error during '{}': {}", operation, reason)
                }
            },

            ExtractionError::InvalidContent { extracted_document_id, validation_error } => {
                format!("Document '{}' contains invalid content: {}", extracted_document_id, validation_error)
            },
            ExtractionError::ContentCorrupted { document_id, extraction_method, corruption_details } => {
                let method_msg = extraction_method.as_deref().unwrap_or("unknown method");
                format!("Document '{}' content is corrupted ({}): {}", document_id, method_msg, corruption_details)
            },
            ExtractionError::ContentParsingError { document_id, parser_type, error_details } => {
                format!("Failed to parse document '{}' with {} parser: {}", document_id, parser_type, error_details)
            },

            ExtractionError::ExtractionFailed { extraction_id, document_id, extraction_method, failure_reason } => {
                let method_msg = extraction_method.as_deref().unwrap_or("unknown method");
                format!("Extraction '{}' failed for document '{}' using {}: {}", extraction_id, document_id, method_msg, failure_reason)
            },
            ExtractionError::OcrProcessingFailed { document_id, page_number, ocr_error } => {
                if let Some(page) = page_number {
                    format!("OCR processing failed for document '{}' on page {}: {}", document_id, page, ocr_error)
                } else {
                    format!("OCR processing failed for document '{}': {}", document_id, ocr_error)
                }
            },
            ExtractionError::DocxParsingFailed { document_id, parsing_stage, error_details } => {
                format!("DOCX parsing failed for document '{}' during {}: {}", document_id, parsing_stage, error_details)
            },
            ExtractionError::MarkdownConversionFailed { document_id, conversion_error } => {
                format!("Markdown conversion failed for document '{}': {}", document_id, conversion_error)
            },

            ExtractionError::ValidationError { parameter, value, validation_rule } => {
                format!("Invalid parameter '{}' with value '{}': {}", parameter, value, validation_rule)
            },
            ExtractionError::InvalidIdFormat { id, expected_prefix } => {
                format!("Invalid ID format '{}'. Expected format: {}_[UUID]", id, expected_prefix)
            },

            ExtractionError::DatabaseError { operation, table, error_details } => {
                if let Some(table) = table {
                    format!("Database error during '{}' on table '{}': {}", operation, table, error_details)
                } else {
                    format!("Database error during '{}': {}", operation, error_details)
                }
            },
            ExtractionError::ExtractionTimeout { extraction_id, timeout_seconds } => {
                format!("Extraction '{}' timed out after {} seconds. Large files may require more time.", extraction_id, timeout_seconds)
            },
            ExtractionError::ResourceExhausted { resource_type, current_usage, limit } => {
                match (current_usage, limit) {
                    (Some(usage), Some(limit)) => {
                        format!("{} exhausted: {} used of {} available. Please try again later.", resource_type, usage, limit)
                    },
                    _ => format!("{} exhausted. Please try again later.", resource_type),
                }
            },
            ExtractionError::DependencyError { dependency_name, operation, error_message } => {
                format!("External service '{}' failed during '{}': {}", dependency_name, operation, error_message)
            },

            ExtractionError::ResourceLocked { resource_type, resource_id, lock_holder } => {
                if let Some(holder) = lock_holder {
                    format!("{} '{}' is locked by '{}'. Please try again later.", resource_type, resource_id, holder)
                } else {
                    format!("{} '{}' is currently locked. Please try again later.", resource_type, resource_id)
                }
            },
            ExtractionError::VersionConflict { extracted_document_id, .. } => {
                format!("Document '{}' was modified by another user. Please refresh and try again.", extracted_document_id)
            },

            ExtractionError::ConfigurationError { setting_name, error_description } => {
                format!("Configuration error in '{}': {}", setting_name, error_description)
            },
            ExtractionError::ServiceNotInitialized { service_name } => {
                format!("Service '{}' is not properly initialized. Please contact support.", service_name)
            },

            ExtractionError::UnexpectedError { context, error_message } => {
                format!("An unexpected error occurred during '{}': {}", context, error_message)
            },
        }
    }

    /// Get detailed technical information for logging and debugging
    pub fn technical_details(&self) -> String {
        format!("{:?}", self)
    }

    /// Check if this error is recoverable (user can retry the operation)
    pub fn is_recoverable(&self) -> bool {
        match self {
            // Non-recoverable errors (configuration, system issues)
            ExtractionError::ProjectNotFound { .. } |
            ExtractionError::DocumentNotFound { .. } |
            ExtractionError::ExtractedDocumentNotFound { .. } |
            ExtractionError::UnsupportedFileType { .. } |
            ExtractionError::FileTooLarge { .. } |
            ExtractionError::InvalidIdFormat { .. } |
            ExtractionError::ValidationError { .. } |
            ExtractionError::ConfigurationError { .. } |
            ExtractionError::ServiceNotInitialized { .. } => false,

            // Potentially recoverable errors (temporary conditions)
            ExtractionError::ExtractionInProgress { .. } |
            ExtractionError::FileNotAccessible { .. } |
            ExtractionError::FileSystemError { .. } |
            ExtractionError::DatabaseError { .. } |
            ExtractionError::ExtractionTimeout { .. } |
            ExtractionError::ResourceExhausted { .. } |
            ExtractionError::DependencyError { .. } |
            ExtractionError::ResourceLocked { .. } |
            ExtractionError::VersionConflict { .. } => true,

            // Content and extraction errors (may be recoverable with different approach)
            ExtractionError::ExtractionNotCompleted { .. } |
            ExtractionError::InvalidContent { .. } |
            ExtractionError::ContentCorrupted { .. } |
            ExtractionError::ContentParsingError { .. } |
            ExtractionError::ExtractionFailed { .. } |
            ExtractionError::OcrProcessingFailed { .. } |
            ExtractionError::DocxParsingFailed { .. } |
            ExtractionError::MarkdownConversionFailed { .. } => true,

            // Cancellation errors (depends on context)
            ExtractionError::ExtractionNotFound { .. } |
            ExtractionError::ExtractionNotCancellable { .. } => false,

            // Unknown errors (assume recoverable to allow retry)
            ExtractionError::UnexpectedError { .. } => true,
        }
    }

    /// Check if this error requires user attention/notification
    pub fn requires_user_attention(&self) -> bool {
        match self {
            // System and internal errors don't require immediate user attention
            ExtractionError::DatabaseError { .. } |
            ExtractionError::ConfigurationError { .. } |
            ExtractionError::ServiceNotInitialized { .. } |
            ExtractionError::DependencyError { .. } => false,

            // All other errors should notify the user
            _ => true,
        }
    }

    /// Get the severity level for logging
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            // Critical system errors
            ExtractionError::DatabaseError { .. } |
            ExtractionError::ConfigurationError { .. } |
            ExtractionError::ServiceNotInitialized { .. } |
            ExtractionError::UnexpectedError { .. } => ErrorSeverity::Critical,

            // High severity errors that prevent functionality
            ExtractionError::FileSystemError { .. } |
            ExtractionError::ResourceExhausted { .. } |
            ExtractionError::DependencyError { .. } |
            ExtractionError::ExtractionTimeout { .. } => ErrorSeverity::High,

            // Medium severity errors (content/processing issues)
            ExtractionError::ContentCorrupted { .. } |
            ExtractionError::ExtractionFailed { .. } |
            ExtractionError::OcrProcessingFailed { .. } |
            ExtractionError::DocxParsingFailed { .. } |
            ExtractionError::MarkdownConversionFailed { .. } |
            ExtractionError::ContentParsingError { .. } |
            ExtractionError::InvalidContent { .. } => ErrorSeverity::Medium,

            // Low severity errors (user input, state issues)
            ExtractionError::ProjectNotFound { .. } |
            ExtractionError::DocumentNotFound { .. } |
            ExtractionError::ExtractionNotFound { .. } |
            ExtractionError::ExtractedDocumentNotFound { .. } |
            ExtractionError::ExtractionInProgress { .. } |
            ExtractionError::ExtractionNotCompleted { .. } |
            ExtractionError::ExtractionNotCancellable { .. } |
            ExtractionError::UnsupportedFileType { .. } |
            ExtractionError::FileTooLarge { .. } |
            ExtractionError::FileNotAccessible { .. } |
            ExtractionError::ValidationError { .. } |
            ExtractionError::InvalidIdFormat { .. } |
            ExtractionError::ResourceLocked { .. } |
            ExtractionError::VersionConflict { .. } => ErrorSeverity::Low,
        }
    }
}

/// Error severity levels for logging and monitoring
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ErrorSeverity {
    Low,    // User errors, validation issues
    Medium, // Processing failures, content issues
    High,   // System issues, resource problems
    Critical, // Configuration errors, service failures
}

impl fmt::Display for ExtractionError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.user_message())
    }
}

impl std::error::Error for ExtractionError {}

/// Utility functions for creating common extraction errors
impl ExtractionError {
    /// Create a project not found error
    pub fn project_not_found(project_id: impl Into<String>) -> Self {
        ExtractionError::ProjectNotFound {
            project_id: project_id.into(),
        }
    }

    /// Create a document not found error
    pub fn document_not_found(document_id: impl Into<String>) -> Self {
        ExtractionError::DocumentNotFound {
            document_id: document_id.into(),
        }
    }

    /// Create an unsupported file type error
    pub fn unsupported_file_type(
        file_path: impl Into<String>,
        file_extension: Option<String>,
    ) -> Self {
        ExtractionError::UnsupportedFileType {
            file_path: file_path.into(),
            file_extension,
            supported_types: vec!["PDF".to_string(), "DOCX".to_string(), "Markdown".to_string()],
        }
    }

    /// Create a file too large error
    pub fn file_too_large(file_path: impl Into<String>, file_size_bytes: i64) -> Self {
        const MAX_FILE_SIZE: i64 = 10 * 1024 * 1024; // 10MB
        ExtractionError::FileTooLarge {
            file_path: file_path.into(),
            file_size_bytes,
            max_size_bytes: MAX_FILE_SIZE,
        }
    }

    /// Create an extraction in progress error
    pub fn extraction_in_progress(
        document_id: impl Into<String>,
        current_extraction_id: impl Into<String>,
    ) -> Self {
        ExtractionError::ExtractionInProgress {
            document_id: document_id.into(),
            current_extraction_id: current_extraction_id.into(),
        }
    }

    /// Create an invalid content error
    pub fn invalid_content(
        extracted_document_id: impl Into<String>,
        validation_error: impl Into<String>,
    ) -> Self {
        ExtractionError::InvalidContent {
            extracted_document_id: extracted_document_id.into(),
            validation_error: validation_error.into(),
        }
    }

    /// Create a validation error
    pub fn validation_error(
        parameter: impl Into<String>,
        value: impl Into<String>,
        validation_rule: impl Into<String>,
    ) -> Self {
        ExtractionError::ValidationError {
            parameter: parameter.into(),
            value: value.into(),
            validation_rule: validation_rule.into(),
        }
    }

    /// Create an extraction failed error
    pub fn extraction_failed(
        extraction_id: impl Into<String>,
        document_id: impl Into<String>,
        extraction_method: Option<String>,
        failure_reason: impl Into<String>,
    ) -> Self {
        ExtractionError::ExtractionFailed {
            extraction_id: extraction_id.into(),
            document_id: document_id.into(),
            extraction_method,
            failure_reason: failure_reason.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_codes() {
        assert_eq!(ExtractionError::project_not_found("test").code(), "PROJECT_NOT_FOUND");
        assert_eq!(ExtractionError::document_not_found("test").code(), "DOCUMENT_NOT_FOUND");
        assert_eq!(ExtractionError::unsupported_file_type("test.txt", Some("txt".to_string())).code(), "UNSUPPORTED_FILE_TYPE");
        assert_eq!(ExtractionError::file_too_large("test.pdf", 20 * 1024 * 1024).code(), "FILE_TOO_LARGE");
    }

    #[test]
    fn test_user_messages() {
        let error = ExtractionError::project_not_found("proj_123");
        assert!(error.user_message().contains("proj_123"));
        assert!(error.user_message().contains("not found"));

        let error = ExtractionError::file_too_large("large.pdf", 15 * 1024 * 1024);
        let message = error.user_message();
        assert!(message.contains("large.pdf"));
        assert!(message.contains("too large"));
        assert!(message.contains("15.0 MB"));
        assert!(message.contains("10.0 MB"));
    }

    #[test]
    fn test_recoverability() {
        // Non-recoverable errors
        assert!(!ExtractionError::project_not_found("test").is_recoverable());
        assert!(!ExtractionError::unsupported_file_type("test.txt", None).is_recoverable());
        assert!(!ExtractionError::validation_error("param", "value", "rule").is_recoverable());

        // Recoverable errors
        assert!(ExtractionError::extraction_in_progress("doc", "ext").is_recoverable());
        assert!(ExtractionError::extraction_failed("ext", "doc", None, "reason").is_recoverable());

        let timeout_error = ExtractionError::ExtractionTimeout {
            extraction_id: "ext_123".to_string(),
            timeout_seconds: 300,
        };
        assert!(timeout_error.is_recoverable());
    }

    #[test]
    fn test_user_attention_requirement() {
        // Should require user attention
        assert!(ExtractionError::project_not_found("test").requires_user_attention());
        assert!(ExtractionError::file_too_large("test.pdf", 20 * 1024 * 1024).requires_user_attention());

        // Should not require immediate user attention
        let db_error = ExtractionError::DatabaseError {
            operation: "select".to_string(),
            table: Some("documents".to_string()),
            error_details: "connection failed".to_string(),
        };
        assert!(!db_error.requires_user_attention());

        let config_error = ExtractionError::ConfigurationError {
            setting_name: "pdf_parser".to_string(),
            error_description: "missing config".to_string(),
        };
        assert!(!config_error.requires_user_attention());
    }

    #[test]
    fn test_severity_levels() {
        // Critical errors
        let db_error = ExtractionError::DatabaseError {
            operation: "insert".to_string(),
            table: None,
            error_details: "error".to_string(),
        };
        assert_eq!(db_error.severity(), ErrorSeverity::Critical);

        // High severity errors
        let resource_error = ExtractionError::ResourceExhausted {
            resource_type: "memory".to_string(),
            current_usage: None,
            limit: None,
        };
        assert_eq!(resource_error.severity(), ErrorSeverity::High);

        // Medium severity errors
        assert_eq!(ExtractionError::extraction_failed("ext", "doc", None, "reason").severity(), ErrorSeverity::Medium);

        // Low severity errors
        assert_eq!(ExtractionError::project_not_found("test").severity(), ErrorSeverity::Low);
        assert_eq!(ExtractionError::validation_error("param", "value", "rule").severity(), ErrorSeverity::Low);
    }

    #[test]
    fn test_error_display() {
        let error = ExtractionError::project_not_found("proj_123");
        let display_message = format!("{}", error);
        let user_message = error.user_message();
        assert_eq!(display_message, user_message);
    }

    #[test]
    fn test_utility_constructors() {
        let project_error = ExtractionError::project_not_found("proj_123");
        assert_eq!(project_error.code(), "PROJECT_NOT_FOUND");

        let doc_error = ExtractionError::document_not_found("doc_456");
        assert_eq!(doc_error.code(), "DOCUMENT_NOT_FOUND");

        let unsupported_error = ExtractionError::unsupported_file_type("test.txt", Some("txt".to_string()));
        assert_eq!(unsupported_error.code(), "UNSUPPORTED_FILE_TYPE");

        let large_file_error = ExtractionError::file_too_large("large.pdf", 15 * 1024 * 1024);
        assert_eq!(large_file_error.code(), "FILE_TOO_LARGE");

        let in_progress_error = ExtractionError::extraction_in_progress("doc_123", "ext_456");
        assert_eq!(in_progress_error.code(), "EXTRACTION_IN_PROGRESS");

        let invalid_content_error = ExtractionError::invalid_content("det_123", "Invalid JSON");
        assert_eq!(invalid_content_error.code(), "INVALID_CONTENT");

        let validation_error = ExtractionError::validation_error("project_id", "invalid", "must be UUID format");
        assert_eq!(validation_error.code(), "VALIDATION_ERROR");

        let failed_error = ExtractionError::extraction_failed("ext_123", "doc_456", Some("PDF OCR".to_string()), "OCR service unavailable");
        assert_eq!(failed_error.code(), "EXTRACTION_FAILED");
    }

    #[test]
    fn test_technical_details() {
        let error = ExtractionError::project_not_found("proj_123");
        let details = error.technical_details();
        assert!(details.contains("ProjectNotFound"));
        assert!(details.contains("proj_123"));
    }

    #[test]
    fn test_complex_error_scenarios() {
        // Test OCR processing error with page number
        let ocr_error = ExtractionError::OcrProcessingFailed {
            document_id: "doc_123".to_string(),
            page_number: Some(5),
            ocr_error: "Image quality too low".to_string(),
        };
        let message = ocr_error.user_message();
        assert!(message.contains("doc_123"));
        assert!(message.contains("page 5"));
        assert!(message.contains("Image quality too low"));

        // Test resource locked error with lock holder
        let lock_error = ExtractionError::ResourceLocked {
            resource_type: "Document".to_string(),
            resource_id: "doc_456".to_string(),
            lock_holder: Some("user_789".to_string()),
        };
        let lock_message = lock_error.user_message();
        assert!(lock_message.contains("doc_456"));
        assert!(lock_message.contains("locked by 'user_789'"));

        // Test resource exhausted with usage details
        let exhausted_error = ExtractionError::ResourceExhausted {
            resource_type: "Memory".to_string(),
            current_usage: Some("8GB".to_string()),
            limit: Some("10GB".to_string()),
        };
        let exhausted_message = exhausted_error.user_message();
        assert!(exhausted_message.contains("Memory exhausted"));
        assert!(exhausted_message.contains("8GB used of 10GB"));
    }
}