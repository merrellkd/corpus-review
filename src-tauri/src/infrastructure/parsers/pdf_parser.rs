use crate::infrastructure::errors::{AppError, AppResult};
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;

/// PDF parser for extracting text content and converting to ProseMirror JSON format
pub struct PdfParser;

/// Represents a ProseMirror node structure
#[derive(Debug, Clone)]
pub struct ProseMirrorNode {
    pub node_type: String,
    pub attrs: Option<Value>,
    pub content: Option<Vec<ProseMirrorNode>>,
    pub text: Option<String>,
    pub marks: Option<Vec<Value>>,
}

impl ProseMirrorNode {
    /// Convert to JSON value for serialization
    pub fn to_json(&self) -> Value {
        let mut node = json!({
            "type": self.node_type
        });

        if let Some(attrs) = &self.attrs {
            node["attrs"] = attrs.clone();
        }

        if let Some(content) = &self.content {
            let content_json: Vec<Value> = content.iter().map(|n| n.to_json()).collect();
            node["content"] = json!(content_json);
        }

        if let Some(text) = &self.text {
            node["text"] = json!(text);
        }

        if let Some(marks) = &self.marks {
            node["marks"] = json!(marks);
        }

        node
    }
}

/// Extraction result containing ProseMirror document and metadata
#[derive(Debug)]
pub struct PdfExtractionResult {
    pub prosemirror_doc: Value,
    pub word_count: u32,
    pub character_count: u32,
    pub page_count: u32,
}

impl PdfParser {
    /// Create a new PDF parser instance
    pub fn new() -> Self {
        Self
    }

    /// Parse PDF file and extract text content as ProseMirror JSON
    ///
    /// # Arguments
    /// * `file_path` - Path to the PDF file to parse
    ///
    /// # Returns
    /// * `AppResult<PdfExtractionResult>` - Extraction result with ProseMirror JSON and metadata
    pub async fn parse_file<P: AsRef<Path>>(&self, file_path: P) -> AppResult<PdfExtractionResult> {
        let path = file_path.as_ref();

        // Validate file exists and check size limit (10MB)
        self.validate_file(path).await?;

        // Extract text from PDF using pdf-extract crate
        let text_content = self.extract_text(path).await?;

        // Convert extracted text to ProseMirror format
        let prosemirror_doc = self.convert_to_prosemirror(&text_content)?;

        // Calculate metadata
        let word_count = self.count_words(&text_content);
        let character_count = text_content.len() as u32;
        let page_count = self.estimate_page_count(&text_content);

        Ok(PdfExtractionResult {
            prosemirror_doc,
            word_count,
            character_count,
            page_count,
        })
    }

    /// Validate file exists, is readable, and within size limits
    async fn validate_file(&self, path: &Path) -> AppResult<()> {
        // Check if file exists
        if !path.exists() {
            return Err(AppError::ValidationError(format!(
                "PDF file not found: {}",
                path.display()
            )));
        }

        // Check file extension
        if let Some(extension) = path.extension() {
            if extension.to_string_lossy().to_lowercase() != "pdf" {
                return Err(AppError::ValidationError(
                    "File is not a PDF document".to_string()
                ));
            }
        } else {
            return Err(AppError::ValidationError(
                "File has no extension".to_string()
            ));
        }

        // Check file size (10MB limit)
        let metadata = fs::metadata(path).await.map_err(|e| {
            AppError::IOError(format!("Cannot read file metadata: {}", e))
        })?;

        const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10MB
        if metadata.len() > MAX_FILE_SIZE {
            return Err(AppError::ValidationError(format!(
                "PDF file too large: {} bytes (max: {} bytes)",
                metadata.len(),
                MAX_FILE_SIZE
            )));
        }

        Ok(())
    }

    /// Extract text content from PDF file
    async fn extract_text(&self, path: &Path) -> AppResult<String> {
        // Convert path to string for pdf-extract
        let path_str = path.to_string_lossy().to_string();

        // Use blocking task for PDF extraction to avoid blocking async runtime
        let text = tokio::task::spawn_blocking(move || {
            pdf_extract::extract_text(&path_str)
        })
        .await
        .map_err(|e| AppError::ProcessingError(format!("Task execution failed: {}", e)))?
        .map_err(|e| AppError::ProcessingError(format!("PDF text extraction failed: {}", e)))?;

        // Clean up extracted text
        let cleaned_text = self.clean_extracted_text(&text);

        if cleaned_text.trim().is_empty() {
            return Err(AppError::ProcessingError(
                "No text content found in PDF (may be image-only or encrypted)".to_string()
            ));
        }

        Ok(cleaned_text)
    }

    /// Clean and normalize extracted PDF text
    fn clean_extracted_text(&self, text: &str) -> String {
        text
            // Normalize line breaks
            .replace("\r\n", "\n")
            .replace('\r', "\n")
            // Remove excessive whitespace
            .lines()
            .map(|line| line.trim())
            .filter(|line| !line.is_empty())
            .collect::<Vec<_>>()
            .join("\n")
    }

    /// Convert extracted text to ProseMirror document format
    fn convert_to_prosemirror(&self, text: &str) -> AppResult<Value> {
        let mut content = Vec::new();

        // Split text into logical sections and create ProseMirror nodes
        let sections = self.split_into_sections(text);

        for section in sections {
            if section.trim().is_empty() {
                continue;
            }

            // Create paragraph node for each section
            let paragraph_node = ProseMirrorNode {
                node_type: "paragraph".to_string(),
                attrs: None,
                content: Some(vec![ProseMirrorNode {
                    node_type: "text".to_string(),
                    attrs: None,
                    content: None,
                    text: Some(section.trim().to_string()),
                    marks: None,
                }]),
                text: None,
                marks: None,
            };

            content.push(paragraph_node);
        }

        // If no content was generated, create a single empty paragraph
        if content.is_empty() {
            content.push(ProseMirrorNode {
                node_type: "paragraph".to_string(),
                attrs: None,
                content: Some(vec![]),
                text: None,
                marks: None,
            });
        }

        // Create root document node
        let document = ProseMirrorNode {
            node_type: "doc".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        };

        Ok(document.to_json())
    }

    /// Split text into logical sections for paragraph creation
    fn split_into_sections(&self, text: &str) -> Vec<String> {
        // Split by double line breaks (paragraph breaks) or by sentences if no clear breaks
        let sections: Vec<String> = if text.contains("\n\n") {
            text.split("\n\n")
                .map(|s| s.replace('\n', " ").trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        } else {
            // If no clear paragraph breaks, split by single line breaks
            text.split('\n')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        };

        // Merge very short sections with subsequent ones to avoid too many tiny paragraphs
        let mut merged_sections = Vec::new();
        let mut current_section = String::new();

        for section in sections {
            if current_section.len() + section.len() < 100 && !current_section.is_empty() {
                current_section.push(' ');
                current_section.push_str(&section);
            } else {
                if !current_section.is_empty() {
                    merged_sections.push(current_section);
                }
                current_section = section;
            }
        }

        if !current_section.is_empty() {
            merged_sections.push(current_section);
        }

        merged_sections
    }

    /// Count words in the text
    fn count_words(&self, text: &str) -> u32 {
        text.split_whitespace().count() as u32
    }

    /// Estimate page count based on word count (roughly 250 words per page)
    fn estimate_page_count(&self, text: &str) -> u32 {
        let word_count = self.count_words(text);
        std::cmp::max(1, (word_count + 249) / 250) // Round up
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;
    use std::io::Write;

    #[tokio::test]
    async fn test_validate_file_size_limit() {
        let parser = PdfParser::new();

        // Test with non-existent file
        let result = parser.validate_file(Path::new("/non/existent/file.pdf")).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_clean_extracted_text() {
        let parser = PdfParser::new();
        let messy_text = "  Line 1  \r\n\r\n  Line 2  \r  Line 3  \n\n  ";
        let cleaned = parser.clean_extracted_text(messy_text);
        assert_eq!(cleaned, "Line 1\nLine 2\nLine 3");
    }

    #[test]
    fn test_count_words() {
        let parser = PdfParser::new();
        assert_eq!(parser.count_words("Hello world test"), 3);
        assert_eq!(parser.count_words("  Hello   world  "), 2);
        assert_eq!(parser.count_words(""), 0);
    }

    #[test]
    fn test_estimate_page_count() {
        let parser = PdfParser::new();
        let short_text = "Hello world";
        let long_text = "word ".repeat(300);

        assert_eq!(parser.estimate_page_count(short_text), 1);
        assert_eq!(parser.estimate_page_count(&long_text), 2);
    }

    #[test]
    fn test_convert_to_prosemirror() {
        let parser = PdfParser::new();
        let text = "First paragraph\n\nSecond paragraph";
        let result = parser.convert_to_prosemirror(text).unwrap();

        assert_eq!(result["type"], "doc");
        assert!(result["content"].is_array());
        assert_eq!(result["content"].as_array().unwrap().len(), 2);
    }
}