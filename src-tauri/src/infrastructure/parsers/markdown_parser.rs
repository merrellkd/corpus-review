use crate::infrastructure::errors::{AppError, AppResult};
use serde_json::{json, Value};
use std::path::Path;
use tokio::fs;
use pulldown_cmark::{Parser, Event, Tag, TagEnd, CodeBlockKind};

/// Markdown parser for converting Markdown to ProseMirror JSON format
pub struct MarkdownParser;

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

    /// Create a code block node
    pub fn code_block_node(content: String, language: Option<String>) -> Self {
        let attrs = language.map(|lang| json!({"language": lang}));
        Self {
            node_type: "codeBlock".to_string(),
            attrs,
            content: Some(vec![ProseMirrorNode::text_node(content, None)]),
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

    /// Create a blockquote node
    pub fn blockquote_node(content: Vec<ProseMirrorNode>) -> Self {
        Self {
            node_type: "blockquote".to_string(),
            attrs: None,
            content: Some(content),
            text: None,
            marks: None,
        }
    }

    /// Create a hard break node
    pub fn hard_break_node() -> Self {
        Self {
            node_type: "hardBreak".to_string(),
            attrs: None,
            content: None,
            text: None,
            marks: None,
        }
    }
}

/// Extraction result containing ProseMirror document and metadata
#[derive(Debug)]
pub struct MarkdownExtractionResult {
    pub prosemirror_doc: Value,
    pub word_count: u32,
    pub character_count: u32,
    pub page_count: u32,
}

/// Parsing state for building ProseMirror document
#[derive(Debug)]
struct ParsingState {
    nodes: Vec<ProseMirrorNode>,
    current_paragraph: Option<Vec<ProseMirrorNode>>,
    list_stack: Vec<ListContext>,
    blockquote_stack: Vec<Vec<ProseMirrorNode>>,
    current_marks: Vec<Value>,
}

#[derive(Debug)]
struct ListContext {
    list_type: ListType,
    items: Vec<ProseMirrorNode>,
    current_item: Option<Vec<ProseMirrorNode>>,
}

#[derive(Debug, PartialEq)]
enum ListType {
    Bullet,
    Ordered(u64),
}

impl MarkdownParser {
    /// Create a new Markdown parser instance
    pub fn new() -> Self {
        Self
    }

    /// Parse Markdown file and convert to ProseMirror JSON
    ///
    /// # Arguments
    /// * `file_path` - Path to the Markdown file to parse
    ///
    /// # Returns
    /// * `AppResult<MarkdownExtractionResult>` - Extraction result with ProseMirror JSON and metadata
    pub async fn parse_file<P: AsRef<Path>>(&self, file_path: P) -> AppResult<MarkdownExtractionResult> {
        let path = file_path.as_ref();

        // Validate file exists and check size limit (10MB)
        self.validate_file(path).await?;

        // Read markdown content
        let markdown_content = self.read_markdown_file(path).await?;

        // Convert to ProseMirror format
        let prosemirror_doc = self.convert_to_prosemirror(&markdown_content)?;

        // Calculate metadata
        let word_count = self.count_words(&markdown_content);
        let character_count = markdown_content.len() as u32;
        let page_count = self.estimate_page_count(&markdown_content);

        Ok(MarkdownExtractionResult {
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
                "Markdown file not found: {}",
                path.display()
            )));
        }

        // Check file extension
        if let Some(extension) = path.extension() {
            let ext_lower = extension.to_string_lossy().to_lowercase();
            if !["md", "markdown", "mdown", "mkdn", "mkd"].contains(&ext_lower.as_str()) {
                return Err(AppError::ValidationError(
                    "File is not a Markdown document".to_string()
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
                "Markdown file too large: {} bytes (max: {} bytes)",
                metadata.len(),
                MAX_FILE_SIZE
            )));
        }

        Ok(())
    }

    /// Read markdown file content
    async fn read_markdown_file(&self, path: &Path) -> AppResult<String> {
        fs::read_to_string(path).await.map_err(|e| {
            AppError::IOError(format!("Cannot read Markdown file: {}", e))
        })
    }

    /// Convert markdown text to ProseMirror document format
    fn convert_to_prosemirror(&self, markdown: &str) -> AppResult<Value> {
        let parser = Parser::new(markdown);
        let mut state = ParsingState {
            nodes: Vec::new(),
            current_paragraph: None,
            list_stack: Vec::new(),
            blockquote_stack: Vec::new(),
            current_marks: Vec::new(),
        };

        for event in parser {
            self.process_event(event, &mut state)?;
        }

        // Finalize any remaining content
        self.finalize_parsing(&mut state)?;

        // If no content was generated, create a single empty paragraph
        if state.nodes.is_empty() {
            state.nodes.push(ProseMirrorNode::paragraph_node(vec![]));
        }

        // Create root document node
        let document_node = ProseMirrorNode {
            node_type: "doc".to_string(),
            attrs: None,
            content: Some(state.nodes),
            text: None,
            marks: None,
        };

        Ok(document_node.to_json())
    }

    /// Process a single markdown event
    fn process_event(&self, event: Event, state: &mut ParsingState) -> AppResult<()> {
        match event {
            Event::Start(tag) => self.handle_start_tag(tag, state)?,
            Event::End(tag_end) => self.handle_end_tag(tag_end, state)?,
            Event::Text(text) => self.handle_text(text.to_string(), state)?,
            Event::Code(code) => self.handle_inline_code(code.to_string(), state)?,
            Event::SoftBreak => self.handle_soft_break(state)?,
            Event::HardBreak => self.handle_hard_break(state)?,
            Event::Rule => self.handle_horizontal_rule(state)?,
            Event::Html(_) => {
                // Skip HTML for MVP - warn about ignored content
                // In production, this could log a warning to the user
            }
            Event::InlineHtml(_) => {
                // Skip inline HTML for MVP
            }
            Event::FootnoteReference(_) => {
                // Skip footnotes for MVP
            }
        }
        Ok(())
    }

    /// Handle opening tags
    fn handle_start_tag(&self, tag: Tag, state: &mut ParsingState) -> AppResult<()> {
        match tag {
            Tag::Paragraph => {
                state.current_paragraph = Some(Vec::new());
            }
            Tag::Heading { level, .. } => {
                // Heading will be handled when we get the text and end tag
                state.current_paragraph = Some(Vec::new());
            }
            Tag::BlockQuote => {
                state.blockquote_stack.push(Vec::new());
            }
            Tag::CodeBlock(kind) => {
                // Code blocks will be handled when we get the text
                state.current_paragraph = Some(Vec::new());
            }
            Tag::List(start_number) => {
                let list_type = if let Some(start) = start_number {
                    ListType::Ordered(start)
                } else {
                    ListType::Bullet
                };
                state.list_stack.push(ListContext {
                    list_type,
                    items: Vec::new(),
                    current_item: None,
                });
            }
            Tag::Item => {
                if let Some(list_context) = state.list_stack.last_mut() {
                    list_context.current_item = Some(Vec::new());
                }
            }
            Tag::Emphasis => {
                state.current_marks.push(json!({"type": "italic"}));
            }
            Tag::Strong => {
                state.current_marks.push(json!({"type": "bold"}));
            }
            Tag::Strikethrough => {
                state.current_marks.push(json!({"type": "strike"}));
            }
            Tag::Link { .. } => {
                // For MVP, treat links as regular text
                // TODO: Implement proper link support
            }
            Tag::Image { .. } => {
                // Skip images as per business rules - warn user
                self.handle_text("[Image ignored - images not supported in editor]".to_string(), state)?;
            }
            _ => {
                // Handle other tags as needed
            }
        }
        Ok(())
    }

    /// Handle closing tags
    fn handle_end_tag(&self, tag_end: TagEnd, state: &mut ParsingState) -> AppResult<()> {
        match tag_end {
            TagEnd::Paragraph => {
                if let Some(content) = state.current_paragraph.take() {
                    let para_node = ProseMirrorNode::paragraph_node(content);
                    self.add_node_to_context(para_node, state);
                }
            }
            TagEnd::Heading(level) => {
                if let Some(content) = state.current_paragraph.take() {
                    let heading_node = ProseMirrorNode::heading_node(level as u32, content);
                    self.add_node_to_context(heading_node, state);
                }
            }
            TagEnd::BlockQuote => {
                if let Some(content) = state.blockquote_stack.pop() {
                    let blockquote_node = ProseMirrorNode::blockquote_node(content);
                    self.add_node_to_context(blockquote_node, state);
                }
            }
            TagEnd::CodeBlock => {
                if let Some(content) = state.current_paragraph.take() {
                    // Extract text from content nodes
                    let code_text = content.iter()
                        .filter_map(|node| node.text.as_ref())
                        .cloned()
                        .collect::<Vec<_>>()
                        .join("");

                    let code_block_node = ProseMirrorNode::code_block_node(code_text, None);
                    self.add_node_to_context(code_block_node, state);
                }
            }
            TagEnd::List(_) => {
                if let Some(list_context) = state.list_stack.pop() {
                    let list_node = match list_context.list_type {
                        ListType::Bullet => ProseMirrorNode::bullet_list_node(list_context.items),
                        ListType::Ordered(start) => {
                            let start_num = if start > 1 { Some(start as u32) } else { None };
                            ProseMirrorNode::ordered_list_node(list_context.items, start_num)
                        }
                    };
                    self.add_node_to_context(list_node, state);
                }
            }
            TagEnd::Item => {
                if let Some(list_context) = state.list_stack.last_mut() {
                    if let Some(item_content) = list_context.current_item.take() {
                        let item_node = ProseMirrorNode::list_item_node(vec![
                            ProseMirrorNode::paragraph_node(item_content)
                        ]);
                        list_context.items.push(item_node);
                    }
                }
            }
            TagEnd::Emphasis => {
                state.current_marks.retain(|mark| mark["type"] != "italic");
            }
            TagEnd::Strong => {
                state.current_marks.retain(|mark| mark["type"] != "bold");
            }
            TagEnd::Strikethrough => {
                state.current_marks.retain(|mark| mark["type"] != "strike");
            }
            TagEnd::Link => {
                // End of link - no special handling needed for MVP
            }
            TagEnd::Image => {
                // Images are ignored, nothing to do
            }
            _ => {
                // Handle other end tags as needed
            }
        }
        Ok(())
    }

    /// Handle text content
    fn handle_text(&self, text: String, state: &mut ParsingState) -> AppResult<()> {
        if text.is_empty() {
            return Ok(());
        }

        let marks = if state.current_marks.is_empty() {
            None
        } else {
            Some(state.current_marks.clone())
        };

        let text_node = ProseMirrorNode::text_node(text, marks);

        // Add to appropriate context
        if let Some(paragraph) = &mut state.current_paragraph {
            paragraph.push(text_node);
        } else if let Some(list_context) = state.list_stack.last_mut() {
            if let Some(item_content) = &mut list_context.current_item {
                item_content.push(text_node);
            }
        } else if let Some(blockquote_content) = state.blockquote_stack.last_mut() {
            // Add to blockquote - create paragraph if needed
            blockquote_content.push(ProseMirrorNode::paragraph_node(vec![text_node]));
        }

        Ok(())
    }

    /// Handle inline code
    fn handle_inline_code(&self, code: String, state: &mut ParsingState) -> AppResult<()> {
        let mut marks = state.current_marks.clone();
        marks.push(json!({"type": "code"}));

        let code_node = ProseMirrorNode::text_node(code, Some(marks));

        if let Some(paragraph) = &mut state.current_paragraph {
            paragraph.push(code_node);
        } else if let Some(list_context) = state.list_stack.last_mut() {
            if let Some(item_content) = &mut list_context.current_item {
                item_content.push(code_node);
            }
        }

        Ok(())
    }

    /// Handle soft break (treated as space)
    fn handle_soft_break(&self, state: &mut ParsingState) -> AppResult<()> {
        self.handle_text(" ".to_string(), state)
    }

    /// Handle hard break
    fn handle_hard_break(&self, state: &mut ParsingState) -> AppResult<()> {
        let break_node = ProseMirrorNode::hard_break_node();

        if let Some(paragraph) = &mut state.current_paragraph {
            paragraph.push(break_node);
        } else if let Some(list_context) = state.list_stack.last_mut() {
            if let Some(item_content) = &mut list_context.current_item {
                item_content.push(break_node);
            }
        }

        Ok(())
    }

    /// Handle horizontal rule
    fn handle_horizontal_rule(&self, state: &mut ParsingState) -> AppResult<()> {
        // For MVP, represent horizontal rule as a paragraph with special text
        let rule_node = ProseMirrorNode::paragraph_node(vec![
            ProseMirrorNode::text_node(
                "---".to_string(),
                Some(vec![json!({"type": "italic"})])
            )
        ]);

        self.add_node_to_context(rule_node, state);
        Ok(())
    }

    /// Add a node to the appropriate context
    fn add_node_to_context(&self, node: ProseMirrorNode, state: &mut ParsingState) {
        if let Some(blockquote_content) = state.blockquote_stack.last_mut() {
            blockquote_content.push(node);
        } else {
            state.nodes.push(node);
        }
    }

    /// Finalize parsing by handling any remaining state
    fn finalize_parsing(&self, state: &mut ParsingState) -> AppResult<()> {
        // Close any remaining paragraph
        if let Some(content) = state.current_paragraph.take() {
            let para_node = ProseMirrorNode::paragraph_node(content);
            self.add_node_to_context(para_node, state);
        }

        // Close any remaining lists
        while let Some(list_context) = state.list_stack.pop() {
            let list_node = match list_context.list_type {
                ListType::Bullet => ProseMirrorNode::bullet_list_node(list_context.items),
                ListType::Ordered(start) => {
                    let start_num = if start > 1 { Some(start as u32) } else { None };
                    ProseMirrorNode::ordered_list_node(list_context.items, start_num)
                }
            };
            self.add_node_to_context(list_node, state);
        }

        // Close any remaining blockquotes
        while let Some(content) = state.blockquote_stack.pop() {
            let blockquote_node = ProseMirrorNode::blockquote_node(content);
            self.add_node_to_context(blockquote_node, state);
        }

        Ok(())
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
        let parser = MarkdownParser::new();

        // Test with non-existent file
        let result = parser.validate_file(Path::new("/non/existent/file.md")).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_count_words() {
        let parser = MarkdownParser::new();
        assert_eq!(parser.count_words("Hello world test"), 3);
        assert_eq!(parser.count_words("  Hello   world  "), 2);
        assert_eq!(parser.count_words(""), 0);
    }

    #[test]
    fn test_estimate_page_count() {
        let parser = MarkdownParser::new();
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

    #[test]
    fn test_simple_markdown_conversion() {
        let parser = MarkdownParser::new();
        let markdown = "# Heading\n\nParagraph text";
        let result = parser.convert_to_prosemirror(markdown).unwrap();

        assert_eq!(result["type"], "doc");
        assert!(result["content"].is_array());

        let content = result["content"].as_array().unwrap();
        assert_eq!(content.len(), 2); // heading + paragraph

        assert_eq!(content[0]["type"], "heading");
        assert_eq!(content[0]["attrs"]["level"], 1);

        assert_eq!(content[1]["type"], "paragraph");
    }

    #[test]
    fn test_list_conversion() {
        let parser = MarkdownParser::new();
        let markdown = "- Item 1\n- Item 2";
        let result = parser.convert_to_prosemirror(markdown).unwrap();

        let content = result["content"].as_array().unwrap();
        assert_eq!(content[0]["type"], "bulletList");

        let list_items = content[0]["content"].as_array().unwrap();
        assert_eq!(list_items.len(), 2);
        assert_eq!(list_items[0]["type"], "listItem");
    }
}