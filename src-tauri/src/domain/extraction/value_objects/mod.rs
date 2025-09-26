//! Value objects for the extraction domain
//!
//! Value objects are immutable objects that represent concepts from the domain.
//! They are identified by their values rather than identity.

pub mod document_id;
pub mod extraction_id;
pub mod extracted_document_id;
pub mod file_path;
pub mod document_type;
pub mod extraction_status;
pub mod prosemirror_json;

// Re-exports for convenience
pub use document_id::{DocumentId, DocumentIdError};
pub use extraction_id::{ExtractionId, ExtractionIdError};
pub use extracted_document_id::{ExtractedDocumentId, ExtractedDocumentIdError};
pub use file_path::{FilePath, FilePathError};
pub use document_type::{DocumentType, DocumentTypeError};
pub use extraction_status::{ExtractionStatus, ExtractionStatusError};
pub use prosemirror_json::{ProseMirrorJson, ProseMirrorMark, ProseMirrorJsonError};

// Additional value objects that may be needed for the extraction domain

/// FileName value object - Display-friendly file name
pub type FileName = String;

/// ProjectId re-export from project domain
pub use crate::domain::project::value_objects::ProjectId;

/// ExtractionMethod enum for different processing approaches
#[derive(Debug, Clone, PartialEq, Eq, Hash, serde::Serialize, serde::Deserialize)]
pub enum ExtractionMethod {
    /// Standard PDF text extraction
    PdfTextExtraction,
    /// OCR-based PDF processing
    PdfOcrExtraction,
    /// DOCX XML parsing
    DocxStructureExtraction,
    /// Markdown to ProseMirror conversion
    MarkdownConversion,
}

impl ExtractionMethod {
    /// Returns the display name for this extraction method
    pub fn display_name(&self) -> &'static str {
        match self {
            ExtractionMethod::PdfTextExtraction => "PDF Text Extraction",
            ExtractionMethod::PdfOcrExtraction => "PDF OCR Extraction",
            ExtractionMethod::DocxStructureExtraction => "Word Document Parsing",
            ExtractionMethod::MarkdownConversion => "Markdown Conversion",
        }
    }

    /// Returns the method for a given document type
    pub fn for_document_type(doc_type: &DocumentType) -> Self {
        match doc_type {
            DocumentType::Pdf => ExtractionMethod::PdfTextExtraction,
            DocumentType::Docx => ExtractionMethod::DocxStructureExtraction,
            DocumentType::Markdown => ExtractionMethod::MarkdownConversion,
        }
    }

    /// Returns whether this method supports OCR fallback
    pub fn supports_ocr_fallback(&self) -> bool {
        matches!(self, ExtractionMethod::PdfTextExtraction)
    }

    /// Returns the expected processing time category
    pub fn processing_time_category(&self) -> ProcessingTimeCategory {
        match self {
            ExtractionMethod::MarkdownConversion => ProcessingTimeCategory::Fast,
            ExtractionMethod::DocxStructureExtraction => ProcessingTimeCategory::Medium,
            ExtractionMethod::PdfTextExtraction => ProcessingTimeCategory::Medium,
            ExtractionMethod::PdfOcrExtraction => ProcessingTimeCategory::Slow,
        }
    }

    /// Parse ExtractionMethod from string
    pub fn from_string(s: &str) -> Result<Self, String> {
        match s {
            "PDF Text Extraction" | "PdfTextExtraction" => Ok(ExtractionMethod::PdfTextExtraction),
            "PDF OCR Extraction" | "PdfOcrExtraction" => Ok(ExtractionMethod::PdfOcrExtraction),
            "Word Document Parsing" | "DocxStructureExtraction" => Ok(ExtractionMethod::DocxStructureExtraction),
            "Markdown Conversion" | "MarkdownConversion" => Ok(ExtractionMethod::MarkdownConversion),
            _ => Err(format!("Unknown extraction method: {}", s)),
        }
    }
}

impl std::fmt::Display for ExtractionMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.display_name())
    }
}

/// Processing time categories for extraction methods
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProcessingTimeCategory {
    /// < 5 seconds
    Fast,
    /// 5-30 seconds
    Medium,
    /// > 30 seconds
    Slow,
}

impl ProcessingTimeCategory {
    /// Returns the expected time range in seconds
    pub fn time_range(&self) -> (u32, u32) {
        match self {
            ProcessingTimeCategory::Fast => (0, 5),
            ProcessingTimeCategory::Medium => (5, 30),
            ProcessingTimeCategory::Slow => (30, 300),
        }
    }
}