use serde::{Deserialize, Serialize};
use std::fmt::{self, Display};
use std::str::FromStr;

/// DocumentType enum - Supported file format classification
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum DocumentType {
    #[serde(rename = "PDF")]
    Pdf,
    #[serde(rename = "DOCX")]
    Docx,
    #[serde(rename = "Markdown")]
    Markdown,
}

impl DocumentType {
    /// Returns all supported document types
    pub fn all() -> Vec<DocumentType> {
        vec![
            DocumentType::Pdf,
            DocumentType::Docx,
            DocumentType::Markdown,
        ]
    }

    /// Returns the file extensions for this document type
    pub fn extensions(&self) -> Vec<&'static str> {
        match self {
            DocumentType::Pdf => vec!["pdf"],
            DocumentType::Docx => vec!["docx"],
            DocumentType::Markdown => vec!["md", "markdown"],
        }
    }

    /// Returns the MIME type for this document type
    pub fn mime_type(&self) -> &'static str {
        match self {
            DocumentType::Pdf => "application/pdf",
            DocumentType::Docx => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            DocumentType::Markdown => "text/markdown",
        }
    }

    /// Returns the display name for this document type
    pub fn display_name(&self) -> &'static str {
        match self {
            DocumentType::Pdf => "PDF",
            DocumentType::Docx => "Word Document",
            DocumentType::Markdown => "Markdown",
        }
    }

    /// Determines document type from file extension
    pub fn from_extension(extension: &str) -> Option<Self> {
        let ext = extension.to_lowercase();
        match ext.as_str() {
            "pdf" => Some(DocumentType::Pdf),
            "docx" => Some(DocumentType::Docx),
            "md" | "markdown" => Some(DocumentType::Markdown),
            _ => None,
        }
    }

    /// Determines document type from file path
    pub fn from_path<P: AsRef<std::path::Path>>(path: P) -> Option<Self> {
        path.as_ref()
            .extension()?
            .to_str()
            .and_then(Self::from_extension)
    }

    /// Returns true if the file size is within acceptable limits for this type
    pub fn is_size_acceptable(&self, size_bytes: u64) -> bool {
        const MAX_SIZE: u64 = 10 * 1024 * 1024; // 10MB
        size_bytes <= MAX_SIZE
    }

    /// Returns the maximum acceptable file size in bytes
    pub const fn max_size_bytes() -> u64 {
        10 * 1024 * 1024 // 10MB
    }

    /// Returns true if this document type supports extraction
    pub fn supports_extraction(&self) -> bool {
        // All current types support extraction
        true
    }

    /// Parse DocumentType from string (compatibility method)
    pub fn from_string(s: &str) -> Result<Self, DocumentTypeError> {
        Self::from_str(s)
    }
}

impl Display for DocumentType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

impl FromStr for DocumentType {
    type Err = DocumentTypeError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_uppercase().as_str() {
            "PDF" => Ok(DocumentType::Pdf),
            "DOCX" => Ok(DocumentType::Docx),
            "MARKDOWN" | "MD" => Ok(DocumentType::Markdown),
            _ => Err(DocumentTypeError::UnsupportedType(s.to_string())),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DocumentTypeError {
    #[error("Unsupported document type: {0}")]
    UnsupportedType(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_from_extension() {
        assert_eq!(DocumentType::from_extension("pdf"), Some(DocumentType::Pdf));
        assert_eq!(DocumentType::from_extension("PDF"), Some(DocumentType::Pdf));
        assert_eq!(DocumentType::from_extension("docx"), Some(DocumentType::Docx));
        assert_eq!(DocumentType::from_extension("DOCX"), Some(DocumentType::Docx));
        assert_eq!(DocumentType::from_extension("md"), Some(DocumentType::Markdown));
        assert_eq!(DocumentType::from_extension("markdown"), Some(DocumentType::Markdown));
        assert_eq!(DocumentType::from_extension("txt"), None);
    }

    #[test]
    fn test_from_path() {
        assert_eq!(
            DocumentType::from_path(PathBuf::from("/test/doc.pdf")),
            Some(DocumentType::Pdf)
        );
        assert_eq!(
            DocumentType::from_path(PathBuf::from("/test/doc.docx")),
            Some(DocumentType::Docx)
        );
        assert_eq!(
            DocumentType::from_path(PathBuf::from("/test/readme.md")),
            Some(DocumentType::Markdown)
        );
        assert_eq!(
            DocumentType::from_path(PathBuf::from("/test/file.txt")),
            None
        );
    }

    #[test]
    fn test_extensions() {
        assert_eq!(DocumentType::Pdf.extensions(), vec!["pdf"]);
        assert_eq!(DocumentType::Docx.extensions(), vec!["docx"]);
        assert_eq!(DocumentType::Markdown.extensions(), vec!["md", "markdown"]);
    }

    #[test]
    fn test_is_size_acceptable() {
        let small_size = 1024; // 1KB
        let large_size = 15 * 1024 * 1024; // 15MB
        let max_size = DocumentType::max_size_bytes();

        assert!(DocumentType::Pdf.is_size_acceptable(small_size));
        assert!(!DocumentType::Pdf.is_size_acceptable(large_size));
        assert!(DocumentType::Pdf.is_size_acceptable(max_size));
    }

    #[test]
    fn test_mime_types() {
        assert_eq!(DocumentType::Pdf.mime_type(), "application/pdf");
        assert!(DocumentType::Docx.mime_type().contains("wordprocessingml"));
        assert_eq!(DocumentType::Markdown.mime_type(), "text/markdown");
    }

    #[test]
    fn test_display_names() {
        assert_eq!(DocumentType::Pdf.display_name(), "PDF");
        assert_eq!(DocumentType::Docx.display_name(), "Word Document");
        assert_eq!(DocumentType::Markdown.display_name(), "Markdown");
    }

    #[test]
    fn test_from_str() {
        assert_eq!("PDF".parse::<DocumentType>().unwrap(), DocumentType::Pdf);
        assert_eq!("pdf".parse::<DocumentType>().unwrap(), DocumentType::Pdf);
        assert_eq!("DOCX".parse::<DocumentType>().unwrap(), DocumentType::Docx);
        assert_eq!("MARKDOWN".parse::<DocumentType>().unwrap(), DocumentType::Markdown);
        assert_eq!("MD".parse::<DocumentType>().unwrap(), DocumentType::Markdown);

        assert!("TXT".parse::<DocumentType>().is_err());
    }

    #[test]
    fn test_supports_extraction() {
        assert!(DocumentType::Pdf.supports_extraction());
        assert!(DocumentType::Docx.supports_extraction());
        assert!(DocumentType::Markdown.supports_extraction());
    }

    #[test]
    fn test_all() {
        let all_types = DocumentType::all();
        assert_eq!(all_types.len(), 3);
        assert!(all_types.contains(&DocumentType::Pdf));
        assert!(all_types.contains(&DocumentType::Docx));
        assert!(all_types.contains(&DocumentType::Markdown));
    }
}