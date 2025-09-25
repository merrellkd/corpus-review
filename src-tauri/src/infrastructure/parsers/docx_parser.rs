use crate::infrastructure::errors::{AppError, AppResult};
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;
use docx_rs::*;

/// DOCX parser for extracting structured content and converting to ProseMirror JSON format
pub struct DocxParser;

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

    /// Create a text node
    pub fn text_node(text: String, marks: Option<Vec<Value>>) -> Self {
        Self {
            node_type: "text".to_string(),
            attrs: None,
            content: None,
            text: Some(text),
            marks,
        }
    }

    /// Create a paragraph node
    pub fn paragraph_node(content: Vec<ProseMirrorNode>) -> Self {
        Self {
            node_type: "paragraph".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        }
    }

    /// Create a heading node
    pub fn heading_node(level: u32, content: Vec<ProseMirrorNode>) -> Self {
        Self {
            node_type: "heading".to_string(),
            attrs: Some(json!({"level": level})),
            content: Some(content),
            text: None,
            marks: None,
        }
    }

    /// Create a list item node
    pub fn list_item_node(content: Vec<ProseMirrorNode>) -> Self {
        Self {
            node_type: "listItem".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        }
    }

    /// Create a bullet list node
    pub fn bullet_list_node(items: Vec<ProseMirrorNode>) -> Self {
        Self {
            node_type: "bulletList".to_string(),
            attrs: None,
            content: Some(items),
            text: None,
            marks: None,
        }
    }

    /// Create an ordered list node
    pub fn ordered_list_node(items: Vec<ProseMirrorNode>, start: Option<u32>) -> Self {
        let attrs = start.map(|s| json!({"order": s}));
        Self {
            node_type: "orderedList".to_string(),
            attrs,
            content: Some(items),
            text: None,
            marks: None,
        }
    }
}

/// Extraction result containing ProseMirror document and metadata
#[derive(Debug)]
pub struct DocxExtractionResult {
    pub prosemirror_doc: Value,
    pub word_count: u32,
    pub character_count: u32,
    pub page_count: u32,
}

impl DocxParser {
    /// Create a new DOCX parser instance
    pub fn new() -> Self {
        Self
    }

    /// Parse DOCX file and extract structured content as ProseMirror JSON
    ///
    /// # Arguments
    /// * `file_path` - Path to the DOCX file to parse
    ///
    /// # Returns
    /// * `AppResult<DocxExtractionResult>` - Extraction result with ProseMirror JSON and metadata
    pub async fn parse_file<P: AsRef<Path>>(&self, file_path: P) -> AppResult<DocxExtractionResult> {
        let path = file_path.as_ref();

        // Validate file exists and check size limit (10MB)
        self.validate_file(path).await?;

        // Read and parse DOCX file
        let docx = self.read_docx_file(path).await?;

        // Convert DOCX structure to ProseMirror format
        let prosemirror_doc = self.convert_to_prosemirror(&docx)?;

        // Calculate metadata from the document
        let text_content = self.extract_text_content(&docx);
        let word_count = self.count_words(&text_content);
        let character_count = text_content.len() as u32;
        let page_count = self.estimate_page_count(&text_content);

        Ok(DocxExtractionResult {
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
                "DOCX file not found: {}",
                path.display()
            )));
        }

        // Check file extension
        if let Some(extension) = path.extension() {
            let ext_lower = extension.to_string_lossy().to_lowercase();
            if ext_lower != "docx" && ext_lower != "doc" {
                return Err(AppError::ValidationError(
                    "File is not a Word document (.docx or .doc)".to_string()
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
                "DOCX file too large: {} bytes (max: {} bytes)",
                metadata.len(),
                MAX_FILE_SIZE
            )));
        }

        Ok(())
    }

    /// Read and parse DOCX file
    async fn read_docx_file(&self, path: &Path) -> AppResult<Docx> {
        let file_bytes = fs::read(path).await.map_err(|e| {
            AppError::IOError(format!("Cannot read DOCX file: {}", e))
        })?;

        // Use blocking task for DOCX parsing to avoid blocking async runtime
        let path_str = path.to_string_lossy().to_string();
        let docx = tokio::task::spawn_blocking(move || {
            docx_rs::read_docx(&file_bytes)
        })
        .await
        .map_err(|e| AppError::ProcessingError(format!("Task execution failed: {}", e)))?
        .map_err(|e| AppError::ProcessingError(format!("DOCX parsing failed: {} (file: {})", e, path_str)))?;

        Ok(docx)
    }

    /// Convert DOCX document to ProseMirror format
    fn convert_to_prosemirror(&self, docx: &Docx) -> AppResult<Value> {
        let mut content = Vec::new();

        // Process document body
        let document = &docx.document;

        for child in &document.children {
            if let Ok(node) = self.convert_document_child(child) {
                if let Some(node) = node {
                    content.push(node);
                }
            }
        }

        // If no content was generated, create a single empty paragraph
        if content.is_empty() {
            content.push(ProseMirrorNode::paragraph_node(vec![]));
        }

        // Create root document node
        let document_node = ProseMirrorNode {
            node_type: "doc".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        };

        Ok(document_node.to_json())
    }

    /// Convert a document child element to ProseMirror node
    fn convert_document_child(&self, child: &DocumentChild) -> AppResult<Option<ProseMirrorNode>> {
        match child {
            DocumentChild::Paragraph(paragraph) => {
                Ok(Some(self.convert_paragraph(paragraph)?))
            }
            DocumentChild::Table(_table) => {
                // For MVP, convert tables to simple text
                // TODO: Implement proper table support in future versions
                Ok(Some(ProseMirrorNode::paragraph_node(vec![
                    ProseMirrorNode::text_node(
                        "[Table content - not yet supported in editor]".to_string(),
                        Some(vec![json!({"type": "italic"})])
                    )
                ])))
            }
            DocumentChild::BookmarkStart(_) | DocumentChild::BookmarkEnd(_) => {
                // Skip bookmarks for now
                Ok(None)
            }
        }
    }

    /// Convert a paragraph to ProseMirror node
    fn convert_paragraph(&self, paragraph: &Paragraph) -> AppResult<ProseMirrorNode> {
        let mut paragraph_content = Vec::new();

        // Check if this is a heading by examining paragraph properties
        if let Some(heading_level) = self.detect_heading_level(paragraph) {
            // Process runs within the heading
            for child in &paragraph.children {
                if let ParagraphChild::Run(run) = child {
                    if let Some(text_node) = self.convert_run(run)? {
                        paragraph_content.push(text_node);
                    }
                }
            }

            return Ok(ProseMirrorNode::heading_node(heading_level, paragraph_content));
        }

        // Check if this is a list item
        if self.is_list_item(paragraph) {
            // For MVP, treat as regular paragraph
            // TODO: Implement proper list support in future versions
        }

        // Process regular paragraph runs
        for child in &paragraph.children {
            match child {
                ParagraphChild::Run(run) => {
                    if let Some(text_node) = self.convert_run(run)? {
                        paragraph_content.push(text_node);
                    }
                }
                ParagraphChild::Insert(_) | ParagraphChild::Delete(_) => {
                    // Skip track changes for now
                }
                ParagraphChild::BookmarkStart(_) | ParagraphChild::BookmarkEnd(_) => {
                    // Skip bookmarks
                }
                ParagraphChild::CommentRangeStart(_) | ParagraphChild::CommentRangeEnd(_) => {
                    // Skip comments for now
                }
            }
        }

        // If no content, create empty paragraph
        if paragraph_content.is_empty() {
            paragraph_content.push(ProseMirrorNode::text_node("".to_string(), None));
        }

        Ok(ProseMirrorNode::paragraph_node(paragraph_content))
    }

    /// Convert a run to ProseMirror text node with marks
    fn convert_run(&self, run: &Run) -> AppResult<Option<ProseMirrorNode>> {
        let mut text_content = String::new();
        let mut marks = Vec::new();

        // Extract text from run children
        for child in &run.children {
            match child {
                RunChild::Text(text) => {
                    text_content.push_str(&text.text);
                }
                RunChild::Tab(_) => {
                    text_content.push('\t');
                }
                RunChild::Break(_) => {
                    text_content.push('\n');
                }
                _ => {
                    // Skip other run children for now (images, fields, etc.)
                }
            }
        }

        // Skip empty runs
        if text_content.is_empty() {
            return Ok(None);
        }

        // Apply formatting marks based on run properties
        if let Some(run_property) = &run.run_property {
            if let Some(bold) = &run_property.bold {
                if bold.val {
                    marks.push(json!({"type": "bold"}));
                }
            }

            if let Some(italic) = &run_property.italic {
                if italic.val {
                    marks.push(json!({"type": "italic"}));
                }
            }

            if let Some(underline) = &run_property.underline {
                if underline.underline_type != UnderlineType::None {
                    marks.push(json!({"type": "underline"}));
                }
            }
        }

        let marks_option = if marks.is_empty() { None } else { Some(marks) };

        Ok(Some(ProseMirrorNode::text_node(text_content, marks_option)))
    }

    /// Detect if paragraph is a heading and return its level
    fn detect_heading_level(&self, paragraph: &Paragraph) -> Option<u32> {
        // Check paragraph style for heading patterns
        if let Some(property) = &paragraph.property {
            if let Some(style) = &property.style {
                let style_id = &style.val;

                // Common heading style patterns
                if style_id.starts_with("Heading") {
                    // Extract number from "Heading1", "Heading2", etc.
                    if let Some(level_char) = style_id.chars().last() {
                        if let Some(level) = level_char.to_digit(10) {
                            if level >= 1 && level <= 6 {
                                return Some(level);
                            }
                        }
                    }
                } else if style_id.starts_with("H") {
                    // Extract number from "H1", "H2", etc.
                    if let Some(level_str) = style_id.strip_prefix("H") {
                        if let Ok(level) = level_str.parse::<u32>() {
                            if level >= 1 && level <= 6 {
                                return Some(level);
                            }
                        }
                    }
                }
            }
        }

        None
    }

    /// Check if paragraph is part of a list
    fn is_list_item(&self, paragraph: &Paragraph) -> bool {
        // Check for numbering properties
        if let Some(property) = &paragraph.property {
            property.numbering_property.is_some()
        } else {
            false
        }
    }

    /// Extract all text content from DOCX for metadata calculation
    fn extract_text_content(&self, docx: &Docx) -> String {
        let mut text = String::new();

        for child in &docx.document.children {
            match child {
                DocumentChild::Paragraph(paragraph) => {
                    for para_child in &paragraph.children {
                        if let ParagraphChild::Run(run) = para_child {
                            for run_child in &run.children {
                                if let RunChild::Text(text_element) = run_child {
                                    text.push_str(&text_element.text);
                                    text.push(' ');
                                }
                            }
                        }
                    }
                    text.push('\n');
                }
                _ => {}
            }
        }

        text
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

    #[tokio::test]
    async fn test_validate_file_extension() {
        let parser = DocxParser::new();

        // Test with non-existent file
        let result = parser.validate_file(Path::new("/non/existent/file.docx")).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_count_words() {
        let parser = DocxParser::new();
        assert_eq!(parser.count_words("Hello world test"), 3);
        assert_eq!(parser.count_words("  Hello   world  "), 2);
        assert_eq!(parser.count_words(""), 0);
    }

    #[test]
    fn test_estimate_page_count() {
        let parser = DocxParser::new();
        let short_text = "Hello world";
        let long_text = "word ".repeat(300);

        assert_eq!(parser.estimate_page_count(short_text), 1);
        assert_eq!(parser.estimate_page_count(&long_text), 2);
    }

    #[test]
    fn test_prosemirror_node_creation() {
        let text_node = ProseMirrorNode::text_node("Hello".to_string(), None);
        let json = text_node.to_json();

        assert_eq!(json["type"], "text");
        assert_eq!(json["text"], "Hello");

        let para_node = ProseMirrorNode::paragraph_node(vec![text_node]);
        let para_json = para_node.to_json();

        assert_eq!(para_json["type"], "paragraph");
        assert!(para_json["content"].is_array());
    }

    #[test]
    fn test_heading_node_creation() {
        let text_node = ProseMirrorNode::text_node("Heading Text".to_string(), None);
        let heading_node = ProseMirrorNode::heading_node(2, vec![text_node]);
        let json = heading_node.to_json();

        assert_eq!(json["type"], "heading");
        assert_eq!(json["attrs"]["level"], 2);
        assert!(json["content"].is_array());
    }
}