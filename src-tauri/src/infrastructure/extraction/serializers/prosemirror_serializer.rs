use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::infrastructure::errors::{AppError, AppResult};

/// ProseMirror node structure for document content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProseMirrorNode {
    #[serde(rename = "type")]
    pub node_type: String,
    pub content: Option<Vec<ProseMirrorNode>>,
    pub marks: Option<Vec<ProseMirrorMark>>,
    pub text: Option<String>,
    pub attrs: Option<Value>,
}

/// ProseMirror mark structure for text formatting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProseMirrorMark {
    #[serde(rename = "type")]
    pub mark_type: String,
    pub attrs: Option<Value>,
}

/// Document-level structure containing ProseMirror content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProseMirrorDocument {
    #[serde(rename = "type")]
    pub doc_type: String,
    pub content: Vec<ProseMirrorNode>,
    pub version: Option<u32>,
}

/// Content statistics calculated from ProseMirror document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentStats {
    pub word_count: u32,
    pub character_count: u32,
    pub character_count_no_spaces: u32,
    pub paragraph_count: u32,
    pub heading_count: u32,
    pub node_count: u32,
}

/// ProseMirror serializer for handling TipTap content
pub struct ProseMirrorSerializer;

impl ProseMirrorSerializer {
    /// Serialize a ProseMirror document to JSON string
    pub fn serialize_to_json(document: &ProseMirrorDocument) -> AppResult<String> {
        serde_json::to_string_pretty(document)
            .map_err(|e| AppError::validation_error(
                "Failed to serialize ProseMirror document",
                Some(format!("Serialization error: {}", e))
            ))
    }

    /// Deserialize JSON string to ProseMirror document
    pub fn deserialize_from_json(json: &str) -> AppResult<ProseMirrorDocument> {
        // First validate that it's valid JSON
        let value: Value = serde_json::from_str(json)
            .map_err(|e| AppError::validation_error(
                "Invalid JSON format",
                Some(format!("JSON parsing error: {}", e))
            ))?;

        // Then validate ProseMirror structure
        Self::validate_prosemirror_structure(&value)?;

        // Finally deserialize to our structure
        serde_json::from_str(json)
            .map_err(|e| AppError::validation_error(
                "Invalid ProseMirror document structure",
                Some(format!("Structure validation error: {}", e))
            ))
    }

    /// Validate that JSON value represents a valid ProseMirror document
    fn validate_prosemirror_structure(value: &Value) -> AppResult<()> {
        let obj = value.as_object()
            .ok_or_else(|| AppError::validation_error(
                "ProseMirror document must be a JSON object",
                None
            ))?;

        // Check required fields
        if !obj.contains_key("type") {
            return Err(AppError::validation_error(
                "ProseMirror document missing 'type' field",
                None
            ));
        }

        if !obj.contains_key("content") {
            return Err(AppError::validation_error(
                "ProseMirror document missing 'content' field",
                None
            ));
        }

        // Validate document type
        let doc_type = obj.get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("");

        if doc_type != "doc" {
            return Err(AppError::validation_error(
                "ProseMirror document type must be 'doc'",
                Some(format!("Found type: '{}'", doc_type))
            ));
        }

        // Validate content is an array
        let content = obj.get("content")
            .ok_or_else(|| AppError::validation_error(
                "ProseMirror document content is required",
                None
            ))?;

        if !content.is_array() {
            return Err(AppError::validation_error(
                "ProseMirror document content must be an array",
                None
            ));
        }

        // Validate each node in content
        if let Some(content_array) = content.as_array() {
            for (index, node) in content_array.iter().enumerate() {
                Self::validate_node_structure(node, index)?;
            }
        }

        Ok(())
    }

    /// Validate individual node structure
    fn validate_node_structure(node: &Value, index: usize) -> AppResult<()> {
        let obj = node.as_object()
            .ok_or_else(|| AppError::validation_error(
                "ProseMirror node must be a JSON object",
                Some(format!("Node at index {}", index))
            ))?;

        // Check required type field
        if !obj.contains_key("type") {
            return Err(AppError::validation_error(
                "ProseMirror node missing 'type' field",
                Some(format!("Node at index {}", index))
            ));
        }

        let node_type = obj.get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("");

        // Validate known node types
        match node_type {
            "paragraph" | "heading" | "text" | "hard_break" | "blockquote" |
            "code_block" | "horizontal_rule" | "bullet_list" | "ordered_list" |
            "list_item" | "image" | "table" | "table_row" | "table_cell" |
            "table_header" => {
                // Valid node types - continue validation
            }
            _ => {
                return Err(AppError::validation_error(
                    "Unknown ProseMirror node type",
                    Some(format!("Node type '{}' at index {}", node_type, index))
                ));
            }
        }

        // Recursively validate child content if present
        if let Some(content) = obj.get("content") {
            if let Some(content_array) = content.as_array() {
                for (child_index, child_node) in content_array.iter().enumerate() {
                    Self::validate_node_structure(child_node, child_index)?;
                }
            }
        }

        // Validate marks if present
        if let Some(marks) = obj.get("marks") {
            if let Some(marks_array) = marks.as_array() {
                for (mark_index, mark) in marks_array.iter().enumerate() {
                    Self::validate_mark_structure(mark, mark_index)?;
                }
            }
        }

        Ok(())
    }

    /// Validate mark structure
    fn validate_mark_structure(mark: &Value, index: usize) -> AppResult<()> {
        let obj = mark.as_object()
            .ok_or_else(|| AppError::validation_error(
                "ProseMirror mark must be a JSON object",
                Some(format!("Mark at index {}", index))
            ))?;

        if !obj.contains_key("type") {
            return Err(AppError::validation_error(
                "ProseMirror mark missing 'type' field",
                Some(format!("Mark at index {}", index))
            ));
        }

        let mark_type = obj.get("type")
            .and_then(|t| t.as_str())
            .unwrap_or("");

        // Validate known mark types
        match mark_type {
            "bold" | "italic" | "underline" | "strike" | "code" | "link" |
            "subscript" | "superscript" | "highlight" => {
                // Valid mark types
            }
            _ => {
                return Err(AppError::validation_error(
                    "Unknown ProseMirror mark type",
                    Some(format!("Mark type '{}' at index {}", mark_type, index))
                ));
            }
        }

        Ok(())
    }

    /// Calculate content statistics from a ProseMirror document
    pub fn calculate_stats(document: &ProseMirrorDocument) -> ContentStats {
        let mut stats = ContentStats {
            word_count: 0,
            character_count: 0,
            character_count_no_spaces: 0,
            paragraph_count: 0,
            heading_count: 0,
            node_count: 0,
        };

        for node in &document.content {
            Self::calculate_node_stats(node, &mut stats);
        }

        stats
    }

    /// Recursively calculate statistics for a node and its children
    fn calculate_node_stats(node: &ProseMirrorNode, stats: &mut ContentStats) {
        stats.node_count += 1;

        match node.node_type.as_str() {
            "paragraph" => {
                stats.paragraph_count += 1;
                if let Some(content) = &node.content {
                    for child in content {
                        Self::calculate_node_stats(child, stats);
                    }
                }
            }
            "heading" => {
                stats.heading_count += 1;
                if let Some(content) = &node.content {
                    for child in content {
                        Self::calculate_node_stats(child, stats);
                    }
                }
            }
            "text" => {
                if let Some(text) = &node.text {
                    let chars = text.chars().count() as u32;
                    stats.character_count += chars;
                    stats.character_count_no_spaces += text.chars()
                        .filter(|c| !c.is_whitespace())
                        .count() as u32;

                    // Simple word counting - split by whitespace
                    stats.word_count += text.split_whitespace().count() as u32;
                }
            }
            _ => {
                // For other node types, recursively process content
                if let Some(content) = &node.content {
                    for child in content {
                        Self::calculate_node_stats(child, stats);
                    }
                }
            }
        }
    }

    /// Generate a content preview from the first few paragraphs
    pub fn generate_preview(document: &ProseMirrorDocument, max_chars: usize) -> String {
        let mut preview = String::new();
        let mut char_count = 0;

        for node in &document.content {
            if char_count >= max_chars {
                break;
            }

            let node_text = Self::extract_text_from_node(node);
            if !node_text.is_empty() {
                if !preview.is_empty() {
                    preview.push(' ');
                    char_count += 1;
                }

                let remaining_chars = max_chars - char_count;
                if node_text.len() <= remaining_chars {
                    preview.push_str(&node_text);
                    char_count += node_text.len();
                } else {
                    // Truncate at word boundary if possible
                    let truncated = &node_text[..remaining_chars];
                    if let Some(last_space) = truncated.rfind(' ') {
                        preview.push_str(&truncated[..last_space]);
                        preview.push_str("...");
                    } else {
                        preview.push_str(truncated);
                        preview.push_str("...");
                    }
                    break;
                }
            }
        }

        preview
    }

    /// Extract plain text from a ProseMirror node recursively
    fn extract_text_from_node(node: &ProseMirrorNode) -> String {
        let mut text = String::new();

        if let Some(node_text) = &node.text {
            text.push_str(node_text);
        }

        if let Some(content) = &node.content {
            for child in content {
                text.push_str(&Self::extract_text_from_node(child));
            }
        }

        text
    }

    /// Create an empty ProseMirror document
    pub fn create_empty_document() -> ProseMirrorDocument {
        ProseMirrorDocument {
            doc_type: "doc".to_string(),
            content: vec![
                ProseMirrorNode {
                    node_type: "paragraph".to_string(),
                    content: Some(vec![]),
                    marks: None,
                    text: None,
                    attrs: None,
                }
            ],
            version: Some(1),
        }
    }

    /// Convert plain text to ProseMirror document
    pub fn from_plain_text(text: &str) -> ProseMirrorDocument {
        let paragraphs: Vec<ProseMirrorNode> = text
            .lines()
            .filter(|line| !line.trim().is_empty())
            .map(|line| ProseMirrorNode {
                node_type: "paragraph".to_string(),
                content: Some(vec![ProseMirrorNode {
                    node_type: "text".to_string(),
                    content: None,
                    marks: None,
                    text: Some(line.to_string()),
                    attrs: None,
                }]),
                marks: None,
                text: None,
                attrs: None,
            })
            .collect();

        let content = if paragraphs.is_empty() {
            vec![ProseMirrorNode {
                node_type: "paragraph".to_string(),
                content: Some(vec![]),
                marks: None,
                text: None,
                attrs: None,
            }]
        } else {
            paragraphs
        };

        ProseMirrorDocument {
            doc_type: "doc".to_string(),
            content,
            version: Some(1),
        }
    }

    /// Validate and sanitize ProseMirror document
    pub fn sanitize_document(document: &mut ProseMirrorDocument) -> AppResult<()> {
        // Ensure document type is correct
        document.doc_type = "doc".to_string();

        // Ensure content exists and is not empty
        if document.content.is_empty() {
            document.content = vec![ProseMirrorNode {
                node_type: "paragraph".to_string(),
                content: Some(vec![]),
                marks: None,
                text: None,
                attrs: None,
            }];
        }

        // Recursively sanitize all nodes
        for node in &mut document.content {
            Self::sanitize_node(node)?;
        }

        Ok(())
    }

    /// Recursively sanitize a ProseMirror node
    fn sanitize_node(node: &mut ProseMirrorNode) -> AppResult<()> {
        // Remove any potentially dangerous attributes or content
        if let Some(attrs) = &mut node.attrs {
            // Remove script-like attributes that could be dangerous
            if let Some(obj) = attrs.as_object_mut() {
                obj.retain(|key, _| {
                    !key.to_lowercase().contains("script") &&
                    !key.to_lowercase().contains("onclick") &&
                    !key.to_lowercase().contains("onerror")
                });
            }
        }

        // Sanitize text content
        if let Some(text) = &mut node.text {
            // Remove any control characters except common whitespace
            *text = text.chars()
                .filter(|c| !c.is_control() || matches!(c, '\n' | '\r' | '\t'))
                .collect();
        }

        // Recursively sanitize child nodes
        if let Some(content) = &mut node.content {
            for child in content {
                Self::sanitize_node(child)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_serialize_empty_document() {
        let doc = ProseMirrorSerializer::create_empty_document();
        let json = ProseMirrorSerializer::serialize_to_json(&doc).unwrap();
        assert!(json.contains("\"type\":\"doc\""));
        assert!(json.contains("\"type\":\"paragraph\""));
    }

    #[test]
    fn test_deserialize_valid_document() {
        let json = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Hello world"
                        }
                    ]
                }
            ]
        }).to_string();

        let doc = ProseMirrorSerializer::deserialize_from_json(&json).unwrap();
        assert_eq!(doc.doc_type, "doc");
        assert_eq!(doc.content.len(), 1);
        assert_eq!(doc.content[0].node_type, "paragraph");
    }

    #[test]
    fn test_deserialize_invalid_document() {
        let json = json!({
            "type": "invalid",
            "content": []
        }).to_string();

        let result = ProseMirrorSerializer::deserialize_from_json(&json);
        assert!(result.is_err());
    }

    #[test]
    fn test_calculate_stats() {
        let doc = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Hello world"
                        }
                    ]
                },
                {
                    "type": "heading",
                    "attrs": { "level": 1 },
                    "content": [
                        {
                            "type": "text",
                            "text": "Title"
                        }
                    ]
                }
            ]
        });

        let document: ProseMirrorDocument = serde_json::from_value(doc).unwrap();
        let stats = ProseMirrorSerializer::calculate_stats(&document);

        assert_eq!(stats.word_count, 3); // "Hello world Title"
        assert_eq!(stats.paragraph_count, 1);
        assert_eq!(stats.heading_count, 1);
        assert!(stats.character_count > 0);
    }

    #[test]
    fn test_generate_preview() {
        let doc = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "This is a long text that should be truncated when generating a preview"
                        }
                    ]
                }
            ]
        });

        let document: ProseMirrorDocument = serde_json::from_value(doc).unwrap();
        let preview = ProseMirrorSerializer::generate_preview(&document, 20);

        assert!(preview.len() <= 23); // 20 + "..." = 23
        assert!(preview.contains("This is"));
    }

    #[test]
    fn test_from_plain_text() {
        let text = "Line 1\nLine 2\n\nLine 4";
        let doc = ProseMirrorSerializer::from_plain_text(text);

        assert_eq!(doc.doc_type, "doc");
        assert_eq!(doc.content.len(), 3); // Three non-empty lines
        assert_eq!(doc.content[0].node_type, "paragraph");
    }

    #[test]
    fn test_sanitize_document() {
        let mut doc = json!({
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "Safe text with\x00control chars"
                        }
                    ],
                    "attrs": {
                        "onclick": "alert('xss')",
                        "safe_attr": "value"
                    }
                }
            ]
        });

        let mut document: ProseMirrorDocument = serde_json::from_value(doc).unwrap();
        ProseMirrorSerializer::sanitize_document(&mut document).unwrap();

        // Should remove dangerous attributes but keep safe ones
        if let Some(attrs) = &document.content[0].attrs {
            let obj = attrs.as_object().unwrap();
            assert!(!obj.contains_key("onclick"));
            assert!(obj.contains_key("safe_attr"));
        }
    }
}