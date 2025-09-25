pub mod pdf_parser;
pub mod docx_parser;
pub mod markdown_parser;

pub use pdf_parser::{PdfParser, PdfExtractionResult};
pub use docx_parser::{DocxParser, DocxExtractionResult};
pub use markdown_parser::{MarkdownParser, MarkdownExtractionResult};

/// Common parser trait for different document formats
pub trait DocumentParser {
    type ExtractionResult;

    /// Parse a document file and extract content
    async fn parse_file<P: AsRef<std::path::Path>>(&self, file_path: P) -> crate::infrastructure::errors::AppResult<Self::ExtractionResult>;
}

/// Factory for creating appropriate parser based on file extension
pub struct ParserFactory;

impl ParserFactory {
    /// Create parser for the given file extension
    pub fn create_parser_for_extension(extension: &str) -> Option<Box<dyn std::any::Any>> {
        match extension.to_lowercase().as_str() {
            "pdf" => Some(Box::new(PdfParser::new())),
            "docx" | "doc" => Some(Box::new(DocxParser::new())),
            "md" | "markdown" | "mdown" | "mkdn" | "mkd" => Some(Box::new(MarkdownParser::new())),
            _ => None,
        }
    }

    /// Check if the file extension is supported
    pub fn is_supported_extension(extension: &str) -> bool {
        matches!(
            extension.to_lowercase().as_str(),
            "pdf" | "docx" | "doc" | "md" | "markdown" | "mdown" | "mkdn" | "mkd"
        )
    }

    /// Get list of all supported file extensions
    pub fn supported_extensions() -> Vec<&'static str> {
        vec!["pdf", "docx", "doc", "md", "markdown", "mdown", "mkdn", "mkd"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parser_factory_supported_extensions() {
        assert!(ParserFactory::is_supported_extension("pdf"));
        assert!(ParserFactory::is_supported_extension("docx"));
        assert!(ParserFactory::is_supported_extension("md"));
        assert!(ParserFactory::is_supported_extension("markdown"));
        assert!(!ParserFactory::is_supported_extension("txt"));
        assert!(!ParserFactory::is_supported_extension("jpg"));
    }

    #[test]
    fn test_supported_extensions_list() {
        let extensions = ParserFactory::supported_extensions();
        assert!(extensions.contains(&"pdf"));
        assert!(extensions.contains(&"docx"));
        assert!(extensions.contains(&"md"));
        assert!(extensions.len() >= 3);
    }
}