use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// DTO for transferring original document data between layers
///
/// This represents a source document (PDF, DOCX, or Markdown) that can be extracted
/// for document processing and content analysis.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OriginalDocumentDto {
    /// Unique identifier for the document with doc_ prefix
    pub document_id: String,

    /// Project ID this document belongs to
    pub project_id: String,

    /// Full path to the original file
    pub file_path: String,

    /// Name of the file including extension
    pub file_name: String,

    /// File size in bytes
    pub file_size_bytes: i64,

    /// File type enum value
    pub file_type: DocumentFileType,

    /// When the document entity was created
    pub created_at: DateTime<Utc>,

    /// Last modification time of the original file
    pub modified_at: DateTime<Utc>,

    /// Whether an extraction exists for this document
    pub has_extraction: bool,

    /// Current extraction status if extraction exists
    pub extraction_status: Option<ExtractionStatus>,
}

/// Supported file types for document extraction
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DocumentFileType {
    #[serde(rename = "PDF")]
    Pdf,
    #[serde(rename = "DOCX")]
    Docx,
    #[serde(rename = "Markdown")]
    Markdown,
}

/// Extraction status enumeration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExtractionStatus {
    None,
    Pending,
    Processing,
    Completed,
    Error,
}

impl OriginalDocumentDto {
    /// Create a new OriginalDocumentDto
    pub fn new(
        document_id: String,
        project_id: String,
        file_path: String,
        file_name: String,
        file_size_bytes: i64,
        file_type: DocumentFileType,
        created_at: DateTime<Utc>,
        modified_at: DateTime<Utc>,
        has_extraction: bool,
        extraction_status: Option<ExtractionStatus>,
    ) -> Self {
        OriginalDocumentDto {
            document_id,
            project_id,
            file_path,
            file_name,
            file_size_bytes,
            file_type,
            created_at,
            modified_at,
            has_extraction,
            extraction_status,
        }
    }

    /// Check if the document can be extracted (file size within limits)
    pub fn can_extract(&self) -> bool {
        const MAX_FILE_SIZE: i64 = 10 * 1024 * 1024; // 10MB
        self.file_size_bytes <= MAX_FILE_SIZE
    }

    /// Get the file extension from the file name
    pub fn file_extension(&self) -> Option<&str> {
        self.file_name.rsplit('.').next()
    }

    /// Check if extraction is currently in progress
    pub fn is_extraction_in_progress(&self) -> bool {
        matches!(self.extraction_status, Some(ExtractionStatus::Pending | ExtractionStatus::Processing))
    }

    /// Check if extraction completed successfully
    pub fn is_extraction_completed(&self) -> bool {
        matches!(self.extraction_status, Some(ExtractionStatus::Completed))
    }

    /// Get human-readable file size
    pub fn file_size_human(&self) -> String {
        let size = self.file_size_bytes as f64;
        if size < 1024.0 {
            format!("{} B", size)
        } else if size < 1024.0 * 1024.0 {
            format!("{:.1} KB", size / 1024.0)
        } else {
            format!("{:.1} MB", size / (1024.0 * 1024.0))
        }
    }
}

impl DocumentFileType {
    /// Get the expected file extension for this type
    pub fn expected_extension(&self) -> &'static str {
        match self {
            DocumentFileType::Pdf => "pdf",
            DocumentFileType::Docx => "docx",
            DocumentFileType::Markdown => "md",
        }
    }

    /// Get the MIME type for this file type
    pub fn mime_type(&self) -> &'static str {
        match self {
            DocumentFileType::Pdf => "application/pdf",
            DocumentFileType::Docx => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            DocumentFileType::Markdown => "text/markdown",
        }
    }

    /// Parse file type from extension
    pub fn from_extension(extension: &str) -> Option<Self> {
        match extension.to_lowercase().as_str() {
            "pdf" => Some(DocumentFileType::Pdf),
            "docx" => Some(DocumentFileType::Docx),
            "md" | "markdown" => Some(DocumentFileType::Markdown),
            _ => None,
        }
    }
}

impl std::fmt::Display for DocumentFileType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DocumentFileType::Pdf => write!(f, "PDF"),
            DocumentFileType::Docx => write!(f, "DOCX"),
            DocumentFileType::Markdown => write!(f, "Markdown"),
        }
    }
}

impl std::fmt::Display for ExtractionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ExtractionStatus::None => write!(f, "None"),
            ExtractionStatus::Pending => write!(f, "Pending"),
            ExtractionStatus::Processing => write!(f, "Processing"),
            ExtractionStatus::Completed => write!(f, "Completed"),
            ExtractionStatus::Error => write!(f, "Error"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_original_document_dto_creation() {
        let now = Utc::now();
        let dto = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.pdf".to_string(),
            "document.pdf".to_string(),
            1024 * 1024, // 1MB
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );

        assert_eq!(dto.document_id, "doc_12345678-1234-1234-1234-123456789012");
        assert_eq!(dto.file_type, DocumentFileType::Pdf);
        assert!(!dto.has_extraction);
        assert!(dto.can_extract());
        assert!(!dto.is_extraction_in_progress());
        assert!(!dto.is_extraction_completed());
    }

    #[test]
    fn test_file_size_limits() {
        let now = Utc::now();
        let small_file = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/small.pdf".to_string(),
            "small.pdf".to_string(),
            1024 * 1024, // 1MB
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );
        assert!(small_file.can_extract());

        let large_file = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/large.pdf".to_string(),
            "large.pdf".to_string(),
            15 * 1024 * 1024, // 15MB
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );
        assert!(!large_file.can_extract());
    }

    #[test]
    fn test_document_file_type_from_extension() {
        assert_eq!(DocumentFileType::from_extension("pdf"), Some(DocumentFileType::Pdf));
        assert_eq!(DocumentFileType::from_extension("PDF"), Some(DocumentFileType::Pdf));
        assert_eq!(DocumentFileType::from_extension("docx"), Some(DocumentFileType::Docx));
        assert_eq!(DocumentFileType::from_extension("md"), Some(DocumentFileType::Markdown));
        assert_eq!(DocumentFileType::from_extension("markdown"), Some(DocumentFileType::Markdown));
        assert_eq!(DocumentFileType::from_extension("txt"), None);
    }

    #[test]
    fn test_extraction_status_checks() {
        let now = Utc::now();

        let processing_doc = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/doc.pdf".to_string(),
            "doc.pdf".to_string(),
            1024,
            DocumentFileType::Pdf,
            now,
            now,
            true,
            Some(ExtractionStatus::Processing),
        );
        assert!(processing_doc.is_extraction_in_progress());
        assert!(!processing_doc.is_extraction_completed());

        let completed_doc = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/doc2.pdf".to_string(),
            "doc2.pdf".to_string(),
            1024,
            DocumentFileType::Pdf,
            now,
            now,
            true,
            Some(ExtractionStatus::Completed),
        );
        assert!(!completed_doc.is_extraction_in_progress());
        assert!(completed_doc.is_extraction_completed());
    }

    #[test]
    fn test_file_size_human_readable() {
        let now = Utc::now();

        let small_doc = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/small.pdf".to_string(),
            "small.pdf".to_string(),
            512,
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );
        assert_eq!(small_doc.file_size_human(), "512 B");

        let kb_doc = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789013".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/kb.pdf".to_string(),
            "kb.pdf".to_string(),
            2048,
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );
        assert_eq!(kb_doc.file_size_human(), "2.0 KB");

        let mb_doc = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789014".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/mb.pdf".to_string(),
            "mb.pdf".to_string(),
            2 * 1024 * 1024,
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );
        assert_eq!(mb_doc.file_size_human(), "2.0 MB");
    }

    #[test]
    fn test_serialization() {
        let now = Utc::now();
        let dto = OriginalDocumentDto::new(
            "doc_12345678-1234-1234-1234-123456789012".to_string(),
            "proj_12345678-1234-1234-1234-123456789012".to_string(),
            "/path/to/document.pdf".to_string(),
            "document.pdf".to_string(),
            1024,
            DocumentFileType::Pdf,
            now,
            now,
            false,
            None,
        );

        let serialized = serde_json::to_string(&dto).unwrap();
        let deserialized: OriginalDocumentDto = serde_json::from_str(&serialized).unwrap();

        assert_eq!(dto, deserialized);

        // Check camelCase serialization
        assert!(serialized.contains("documentId"));
        assert!(serialized.contains("projectId"));
        assert!(serialized.contains("filePath"));
        assert!(serialized.contains("fileName"));
        assert!(serialized.contains("fileSizeBytes"));
        assert!(serialized.contains("fileType"));
        assert!(serialized.contains("createdAt"));
        assert!(serialized.contains("modifiedAt"));
        assert!(serialized.contains("hasExtraction"));
        assert!(serialized.contains("extractionStatus"));
    }
}