use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::fmt::{self, Display};

/// ProseMirrorJson value object - TipTap/ProseMirror document structure
/// Validates and wraps ProseMirror JSON to ensure proper document format
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProseMirrorJson {
    #[serde(rename = "type")]
    node_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    attrs: Option<Map<String, Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    content: Option<Vec<ProseMirrorJson>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    marks: Option<Vec<ProseMirrorMark>>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProseMirrorMark {
    #[serde(rename = "type")]
    mark_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    attrs: Option<Map<String, Value>>,
}

impl ProseMirrorJson {
    /// Creates a new document root node
    pub fn new_document() -> Self {
        Self {
            node_type: "doc".to_string(),
            attrs: None,
            content: Some(Vec::new()),
            text: None,
            marks: None,
        }
    }

    /// Creates a paragraph node with optional text content
    pub fn new_paragraph(text: Option<String>) -> Self {
        let content = text.map(|t| {
            vec![Self {
                node_type: "text".to_string(),
                attrs: None,
                content: None,
                text: Some(t),
                marks: None,
            }]
        });

        Self {
            node_type: "paragraph".to_string(),
            attrs: None,
            content,
            text: None,
            marks: None,
        }
    }

    /// Creates a heading node with specified level and text
    pub fn new_heading(level: u8, text: String) -> Result<Self, ProseMirrorJsonError> {
        if !(1..=6).contains(&level) {
            return Err(ProseMirrorJsonError::InvalidHeadingLevel(level));
        }

        let mut attrs = Map::new();
        attrs.insert("level".to_string(), Value::Number(level.into()));

        let content = vec![Self {
            node_type: "text".to_string(),
            attrs: None,
            content: None,
            text: Some(text),
            marks: None,
        }];

        Ok(Self {
            node_type: "heading".to_string(),
            attrs: Some(attrs),
            content: Some(content),
            text: None,
            marks: None,
        })
    }

    /// Creates a text node with optional marks (bold, italic, etc.)
    pub fn new_text(text: String, marks: Option<Vec<ProseMirrorMark>>) -> Self {
        Self {
            node_type: "text".to_string(),
            attrs: None,
            content: None,
            text: Some(text),
            marks,
        }
    }

    /// Creates a bullet list node
    pub fn new_bullet_list(items: Vec<ProseMirrorJson>) -> Self {
        let content = items
            .into_iter()
            .map(|item| Self {
                node_type: "listItem".to_string(),
                attrs: None,
                content: Some(vec![item]),
                text: None,
                marks: None,
            })
            .collect();

        Self {
            node_type: "bulletList".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        }
    }

    /// Creates a ProseMirrorJson from a JSON Value with validation
    pub fn from_json_value(value: Value) -> Result<Self, ProseMirrorJsonError> {
        let json: ProseMirrorJson = serde_json::from_value(value)
            .map_err(|e| ProseMirrorJsonError::InvalidFormat(e.to_string()))?;

        json.validate()?;
        Ok(json)
    }

    /// Converts to JSON Value
    pub fn to_json_value(&self) -> Result<Value, ProseMirrorJsonError> {
        serde_json::to_value(self)
            .map_err(|e| ProseMirrorJsonError::SerializationError(e.to_string()))
    }

    /// Converts to pretty-printed JSON string
    pub fn to_json_string(&self) -> Result<String, ProseMirrorJsonError> {
        serde_json::to_string_pretty(self)
            .map_err(|e| ProseMirrorJsonError::SerializationError(e.to_string()))
    }

    /// Creates ProseMirrorJson from JSON string
    pub fn from_json_string(json: &str) -> Result<Self, ProseMirrorJsonError> {
        serde_json::from_str(json)
            .map_err(|e| ProseMirrorJsonError::DeserializationError(e.to_string()))
    }

    /// Adds content to this node (if it supports content)
    pub fn add_content(&mut self, child: ProseMirrorJson) -> Result<(), ProseMirrorJsonError> {
        if self.text.is_some() {
            return Err(ProseMirrorJsonError::TextNodeCannotHaveContent);
        }

        if self.content.is_none() {
            self.content = Some(Vec::new());
        }

        self.content.as_mut().unwrap().push(child);
        Ok(())
    }

    /// Extracts plain text content from the entire document tree
    pub fn extract_text(&self) -> String {
        let mut result = String::new();
        self.extract_text_recursive(&mut result);
        result
    }

    /// Counts words in the document
    pub fn word_count(&self) -> u32 {
        self.extract_text()
            .split_whitespace()
            .count() as u32
    }

    /// Counts characters in the document
    pub fn character_count(&self) -> u32 {
        self.extract_text().len() as u32
    }

    /// Generates a preview string (first N characters)
    pub fn preview(&self, max_chars: usize) -> String {
        let text = self.extract_text();
        if text.len() <= max_chars {
            text
        } else {
            format!("{}...", &text[..max_chars.saturating_sub(3)])
        }
    }

    /// Convert to markdown format (placeholder implementation)
    pub fn to_markdown(&self) -> String {
        // TODO: Implement proper ProseMirror JSON to Markdown conversion
        self.extract_text()
    }

    /// Convert to HTML format (placeholder implementation)
    pub fn to_html(&self) -> String {
        // TODO: Implement proper ProseMirror JSON to HTML conversion
        format!("<p>{}</p>", self.extract_text().replace('\n', "</p><p>"))
    }

    /// Convert to plain text (alias for extract_text)
    pub fn to_plain_text(&self) -> String {
        self.extract_text()
    }

    /// Validates the ProseMirror JSON structure
    pub fn validate(&self) -> Result<(), ProseMirrorJsonError> {
        // Document root must be "doc"
        if self.node_type == "doc" && self.text.is_some() {
            return Err(ProseMirrorJsonError::InvalidDocumentStructure(
                "Document root cannot have text content".to_string(),
            ));
        }

        // Text nodes must have text content
        if self.node_type == "text" && self.text.is_none() {
            return Err(ProseMirrorJsonError::InvalidDocumentStructure(
                "Text nodes must have text content".to_string(),
            ));
        }

        // Text nodes cannot have child content
        if self.node_type == "text" && self.content.is_some() {
            return Err(ProseMirrorJsonError::TextNodeCannotHaveContent);
        }

        // Validate heading levels
        if self.node_type == "heading" {
            if let Some(attrs) = &self.attrs {
                if let Some(level) = attrs.get("level") {
                    if let Some(level_num) = level.as_u64() {
                        if !(1..=6).contains(&level_num) {
                            return Err(ProseMirrorJsonError::InvalidHeadingLevel(level_num as u8));
                        }
                    }
                }
            }
        }

        // Recursively validate content
        if let Some(content) = &self.content {
            for child in content {
                child.validate()?;
            }
        }

        Ok(())
    }

    fn extract_text_recursive(&self, result: &mut String) {
        if let Some(text) = &self.text {
            result.push_str(text);
            result.push(' '); // Add space between text nodes
        }

        if let Some(content) = &self.content {
            for child in content {
                child.extract_text_recursive(result);
            }
        }
    }
}

impl ProseMirrorMark {
    /// Creates a new mark with type and optional attributes
    pub fn new(mark_type: String, attrs: Option<Map<String, Value>>) -> Self {
        Self { mark_type, attrs }
    }

    /// Creates a bold mark
    pub fn bold() -> Self {
        Self::new("bold".to_string(), None)
    }

    /// Creates an italic mark
    pub fn italic() -> Self {
        Self::new("italic".to_string(), None)
    }

    /// Creates a link mark with URL
    pub fn link(href: String) -> Self {
        let mut attrs = Map::new();
        attrs.insert("href".to_string(), Value::String(href));
        Self::new("link".to_string(), Some(attrs))
    }
}

impl Display for ProseMirrorJson {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self.to_json_string() {
            Ok(json) => write!(f, "{}", json),
            Err(_) => write!(f, "Invalid ProseMirror JSON"),
        }
    }
}

#[derive(Debug, thiserror::Error, serde::Serialize, serde::Deserialize)]
pub enum ProseMirrorJsonError {
    #[error("Invalid ProseMirror JSON format: {0}")]
    InvalidFormat(String),
    #[error("Invalid document structure: {0}")]
    InvalidDocumentStructure(String),
    #[error("Text nodes cannot have content")]
    TextNodeCannotHaveContent,
    #[error("Invalid heading level: {0} (must be 1-6)")]
    InvalidHeadingLevel(u8),
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_new_document() {
        let doc = ProseMirrorJson::new_document();
        assert_eq!(doc.node_type, "doc");
        assert!(doc.content.is_some());
        assert!(doc.text.is_none());
    }

    #[test]
    fn test_new_paragraph() {
        let para = ProseMirrorJson::new_paragraph(Some("Hello world".to_string()));
        assert_eq!(para.node_type, "paragraph");

        let content = para.content.unwrap();
        assert_eq!(content.len(), 1);
        assert_eq!(content[0].node_type, "text");
        assert_eq!(content[0].text.as_ref().unwrap(), "Hello world");
    }

    #[test]
    fn test_new_heading() {
        let heading = ProseMirrorJson::new_heading(2, "Title".to_string()).unwrap();
        assert_eq!(heading.node_type, "heading");

        let attrs = heading.attrs.unwrap();
        assert_eq!(attrs.get("level").unwrap().as_u64().unwrap(), 2);

        let content = heading.content.unwrap();
        assert_eq!(content[0].text.as_ref().unwrap(), "Title");
    }

    #[test]
    fn test_invalid_heading_level() {
        let result = ProseMirrorJson::new_heading(7, "Title".to_string());
        assert!(matches!(result, Err(ProseMirrorJsonError::InvalidHeadingLevel(7))));
    }

    #[test]
    fn test_extract_text() {
        let mut doc = ProseMirrorJson::new_document();
        let para = ProseMirrorJson::new_paragraph(Some("Hello world".to_string()));
        doc.add_content(para).unwrap();

        let text = doc.extract_text();
        assert!(text.contains("Hello world"));
    }

    #[test]
    fn test_word_count() {
        let para = ProseMirrorJson::new_paragraph(Some("Hello world test".to_string()));
        assert_eq!(para.word_count(), 3);
    }

    #[test]
    fn test_character_count() {
        let para = ProseMirrorJson::new_paragraph(Some("Hello".to_string()));
        assert_eq!(para.character_count(), 6); // "Hello " (includes space from extract_text)
    }

    #[test]
    fn test_preview() {
        let para = ProseMirrorJson::new_paragraph(Some("This is a long text".to_string()));
        let preview = para.preview(10);
        assert_eq!(preview, "This is...");
    }

    #[test]
    fn test_prosemirror_marks() {
        let bold = ProseMirrorMark::bold();
        assert_eq!(bold.mark_type, "bold");
        assert!(bold.attrs.is_none());

        let link = ProseMirrorMark::link("https://example.com".to_string());
        assert_eq!(link.mark_type, "link");
        assert_eq!(
            link.attrs.unwrap().get("href").unwrap().as_str().unwrap(),
            "https://example.com"
        );
    }

    #[test]
    fn test_validation() {
        // Valid document
        let doc = ProseMirrorJson::new_document();
        assert!(doc.validate().is_ok());

        // Invalid: text node with content
        let invalid = ProseMirrorJson {
            node_type: "text".to_string(),
            attrs: None,
            content: Some(vec![]),
            text: Some("test".to_string()),
            marks: None,
        };
        assert!(matches!(
            invalid.validate(),
            Err(ProseMirrorJsonError::TextNodeCannotHaveContent)
        ));
    }

    #[test]
    fn test_json_serialization() {
        let doc = ProseMirrorJson::new_document();
        let json_value = doc.to_json_value().unwrap();

        assert_eq!(json_value["type"], "doc");
        assert!(json_value["content"].is_array());
    }

    #[test]
    fn test_from_json_value() {
        let json = json!({
            "type": "doc",
            "content": [{
                "type": "paragraph",
                "content": [{
                    "type": "text",
                    "text": "Hello world"
                }]
            }]
        });

        let doc = ProseMirrorJson::from_json_value(json).unwrap();
        assert_eq!(doc.node_type, "doc");
        assert!(doc.content.is_some());
    }
}