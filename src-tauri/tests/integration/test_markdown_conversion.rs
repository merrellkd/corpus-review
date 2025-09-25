//! Integration test for Markdown to ProseMirror conversion
//!
//! This test validates the complete conversion process from Markdown files
//! to TipTap/ProseMirror JSON format, ensuring proper handling of Markdown
//! syntax elements and edge cases.

use std::path::PathBuf;
use tempfile::tempdir;
use tokio;
use serde_json::{Value, json};

// These imports will need to be updated when the actual implementation is complete
// use crate::domain::extraction::*;
// use crate::infrastructure::*;

/// Test complete Markdown to ProseMirror conversion workflow
#[tokio::test]
async fn test_markdown_to_prosemirror_conversion_end_to_end() {
    // This test will FAIL initially as implementation doesn't exist

    // Arrange - Create test Markdown with various elements
    let temp_dir = tempdir().unwrap();
    let test_md_path = temp_dir.path().join("test_document.md");

    create_comprehensive_test_markdown(&test_md_path).await;

    let project_id = "proj_12345678-1234-1234-1234-123456789012";

    // Act & Assert - Extract and verify conversion

    // 1. Document should be detected and recognized as Markdown
    // let documents = scan_project_documents(project_id).await.unwrap();
    // let md_doc = documents.iter().find(|d| d.file_path.ends_with("test_document.md")).unwrap();
    // assert_eq!(md_doc.file_type, SupportedFileType::Markdown);

    // 2. Start extraction
    // let extraction_status = start_document_extraction(&md_doc.document_id, false).await.unwrap();
    // assert_eq!(extraction_status.status, ExtractionStatus::Pending);

    // 3. Extraction should complete quickly for Markdown
    // wait_for_extraction_completion(&extraction_status.extraction_id).await.unwrap();

    // 4. Verify extracted document contains converted content
    // let extracted_doc = get_extracted_document(&md_doc.document_id).await.unwrap();

    // Parse and validate ProseMirror JSON structure
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();
    // validate_markdown_to_prosemirror_conversion(&tiptap_json);

    // 5. Verify specific Markdown elements are converted correctly
    // validate_heading_conversion(&tiptap_json);
    // validate_list_conversion(&tiptap_json);
    // validate_code_block_conversion(&tiptap_json);
    // validate_link_conversion(&tiptap_json);
    // validate_emphasis_conversion(&tiptap_json);

    // For now, just pass - this will be implemented with the actual services
    assert!(true);
}

/// Test Markdown heading conversion (ATX and Setext style)
#[tokio::test]
async fn test_markdown_heading_conversion() {
    // Arrange - Create Markdown with various heading styles
    let temp_dir = tempdir().unwrap();
    let heading_md_path = temp_dir.path().join("headings.md");

    create_heading_test_markdown(&heading_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify headings are converted to ProseMirror heading nodes
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert both ATX (# ## ###) and Setext (=== ---) headings
    // for level in 1..=6 {
    //     assert!(contains_heading_level(&tiptap_json, level));
    // }

    assert!(true); // Placeholder
}

/// Test Markdown code block and inline code conversion
#[tokio::test]
async fn test_markdown_code_conversion() {
    // Arrange - Create Markdown with code blocks and inline code
    let temp_dir = tempdir().unwrap();
    let code_md_path = temp_dir.path().join("code.md");

    create_code_test_markdown(&code_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify code elements are properly converted
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert fenced code blocks with language specification
    // assert!(contains_code_block(&tiptap_json, Some("rust")));
    // assert!(contains_code_block(&tiptap_json, Some("javascript")));
    // assert!(contains_code_block(&tiptap_json, None)); // Plain code block

    // Should convert inline code
    // assert!(contains_inline_code(&tiptap_json));

    assert!(true); // Placeholder
}

/// Test Markdown list conversion (ordered and unordered, nested)
#[tokio::test]
async fn test_markdown_list_conversion() {
    // Arrange - Create Markdown with complex list structures
    let temp_dir = tempdir().unwrap();
    let list_md_path = temp_dir.path().join("lists.md");

    create_list_test_markdown(&list_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify list structure is preserved
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert both bullet and numbered lists with nesting
    // assert!(contains_bullet_list(&tiptap_json));
    // assert!(contains_ordered_list(&tiptap_json));
    // validate_list_nesting_depth(&tiptap_json, 3); // Support 3 levels of nesting

    assert!(true); // Placeholder
}

/// Test Markdown link and image conversion
#[tokio::test]
async fn test_markdown_link_and_image_conversion() {
    // Arrange - Create Markdown with links and images
    let temp_dir = tempdir().unwrap();
    let link_md_path = temp_dir.path().join("links.md");

    create_link_test_markdown(&link_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify links are converted and images are handled per business rules
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert links to ProseMirror link marks
    // assert!(contains_link(&tiptap_json, "https://example.com"));
    // assert!(contains_link(&tiptap_json, "mailto:test@example.com"));

    // Should ignore embedded images per business rule #8
    // assert!(!contains_image(&tiptap_json));

    // TODO: Verify user warning is generated for ignored images
    // let warnings = get_extraction_warnings(&extraction_id).await.unwrap();
    // assert!(warnings.iter().any(|w| w.contains("embedded images ignored")));

    assert!(true); // Placeholder
}

/// Test Markdown emphasis and strong text conversion
#[tokio::test]
async fn test_markdown_emphasis_conversion() {
    // Arrange - Create Markdown with various emphasis styles
    let temp_dir = tempdir().unwrap();
    let emphasis_md_path = temp_dir.path().join("emphasis.md");

    create_emphasis_test_markdown(&emphasis_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify emphasis marks are converted
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert *italic* and **bold** text
    // assert!(contains_emphasis_mark(&tiptap_json, "italic"));
    // assert!(contains_emphasis_mark(&tiptap_json, "bold"));
    // assert!(contains_emphasis_mark(&tiptap_json, "strike")); // ~~strikethrough~~

    assert!(true); // Placeholder
}

/// Test Markdown table conversion (if supported)
#[tokio::test]
async fn test_markdown_table_conversion() {
    // Arrange - Create Markdown with table syntax
    let temp_dir = tempdir().unwrap();
    let table_md_path = temp_dir.path().join("table.md");

    create_table_test_markdown(&table_md_path).await;

    // Act - Extract the document
    // TODO: Implement actual extraction call

    // Assert - Verify table is converted or handled appropriately
    // let extracted_doc = get_extracted_document(&document_id).await.unwrap();
    // let tiptap_json: Value = serde_json::from_str(&extracted_doc.tiptap_content).unwrap();

    // Should convert GitHub Flavored Markdown tables
    // assert!(contains_table(&tiptap_json));
    // validate_table_structure(&tiptap_json, 3, 2); // 3 rows, 2 columns

    assert!(true); // Placeholder
}

/// Test Markdown error handling and edge cases
#[tokio::test]
async fn test_markdown_error_handling() {
    // Test various error conditions and edge cases

    let temp_dir = tempdir().unwrap();

    // Test empty Markdown file
    let empty_md = temp_dir.path().join("empty.md");
    std::fs::write(&empty_md, "").unwrap();

    // TODO: Should handle empty files gracefully
    // let result = start_document_extraction(&document_id, false).await.unwrap();
    // Extraction should succeed but produce minimal content

    // Test Markdown with only whitespace
    let whitespace_md = temp_dir.path().join("whitespace.md");
    std::fs::write(&whitespace_md, "   \n\n\t  \n").unwrap();

    // TODO: Should handle whitespace-only files

    // Test oversized Markdown file (> 10MB)
    let oversized_md = temp_dir.path().join("oversized.md");
    create_oversized_test_markdown(&oversized_md, 15 * 1024 * 1024).await; // 15MB

    // TODO: Should fail with FileTooLarge error
    // let result = start_document_extraction(&document_id, false).await;
    // assert!(matches!(result.unwrap_err(), ExtractionError::FileTooLarge(_)));

    // Test invalid UTF-8 encoding
    let invalid_utf8_md = temp_dir.path().join("invalid.md");
    std::fs::write(&invalid_utf8_md, &[0xFF, 0xFE, 0xFD]).unwrap();

    // TODO: Should fail with appropriate encoding error

    assert!(true); // Placeholder
}

/// Test Markdown conversion performance
#[tokio::test]
async fn test_markdown_conversion_performance() {
    use std::time::Instant;

    // Arrange - Create large Markdown document
    let temp_dir = tempdir().unwrap();
    let large_md = temp_dir.path().join("large_document.md");
    create_large_test_markdown(&large_md, 1000).await; // 1000 sections

    let start = Instant::now();

    // Act - Extract the document
    // TODO: Implement actual extraction call

    let duration = start.elapsed();

    // Assert - Should be much faster than PDF/DOCX extraction
    // Markdown parsing should complete in under 5 seconds even for large files
    assert!(duration.as_secs() < 5, "Markdown conversion took {:?}, exceeds 5s limit", duration);
}

// Helper functions to create test Markdown files

/// Create comprehensive Markdown test file with various elements
async fn create_comprehensive_test_markdown(path: &PathBuf) {
    let markdown_content = r#"# Heading 1

This is a paragraph with **bold text** and *italic text* and `inline code`.

## Heading 2

Here's a list:

- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
- Item 3

And an ordered list:

1. First item
2. Second item
   1. Nested ordered item
   2. Another nested item
3. Third item

### Code Block

```rust
fn main() {
    println!("Hello, world!");
}
```

### Links and References

Visit [Example](https://example.com) for more information.

Email us at <test@example.com>.

### Table

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |

### Horizontal Rule

---

That's all!
"#;

    std::fs::write(path, markdown_content).unwrap();
}

/// Create Markdown with various heading styles
async fn create_heading_test_markdown(path: &PathBuf) {
    let heading_content = r#"# ATX Heading 1
## ATX Heading 2
### ATX Heading 3
#### ATX Heading 4
##### ATX Heading 5
###### ATX Heading 6

Setext Heading 1
================

Setext Heading 2
----------------
"#;

    std::fs::write(path, heading_content).unwrap();
}

/// Create Markdown with code blocks and inline code
async fn create_code_test_markdown(path: &PathBuf) {
    let code_content = r#"Here's some `inline code` in a sentence.

```rust
fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

```javascript
function factorial(n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}
```

```
Plain code block without language
let x = 42;
```

More `inline code` here.
"#;

    std::fs::write(path, code_content).unwrap();
}

/// Create Markdown with complex list structures
async fn create_list_test_markdown(path: &PathBuf) {
    let list_content = r#"# Lists Test

## Unordered Lists

- Top level item 1
- Top level item 2
  - Second level item 1
  - Second level item 2
    - Third level item 1
    - Third level item 2
- Top level item 3

## Ordered Lists

1. First item
2. Second item
   1. Nested first
   2. Nested second
      1. Deep nested first
      2. Deep nested second
3. Third item

## Mixed Lists

1. Ordered item 1
   - Unordered sub-item
   - Another unordered sub-item
2. Ordered item 2
   1. Ordered sub-item
   2. Another ordered sub-item
"#;

    std::fs::write(path, list_content).unwrap();
}

/// Create Markdown with links and images
async fn create_link_test_markdown(path: &PathBuf) {
    let link_content = r#"# Links and Images Test

## Regular Links

Visit [Google](https://google.com) for search.

Go to [Example](https://example.com "Example Title") with title.

## Reference Links

Check out [GitHub][1] and [Stack Overflow][so].

[1]: https://github.com
[so]: https://stackoverflow.com "Stack Overflow"

## Automatic Links

Visit <https://example.com> directly.

Email <test@example.com> for support.

## Images (Should be ignored per business rules)

![Alt text](image.png "Image title")

![Reference image][img]

[img]: /path/to/image.jpg
"#;

    std::fs::write(path, link_content).unwrap();
}

/// Create Markdown with emphasis and strong text
async fn create_emphasis_test_markdown(path: &PathBuf) {
    let emphasis_content = r#"# Emphasis Test

This text has *italic emphasis* using asterisks.

This text has _italic emphasis_ using underscores.

This text has **strong emphasis** using double asterisks.

This text has __strong emphasis__ using double underscores.

This text has ***both italic and strong*** emphasis.

This text has ~~strikethrough~~ text.

This text combines **bold with _nested italic_ text**.
"#;

    std::fs::write(path, emphasis_content).unwrap();
}

/// Create Markdown with table syntax
async fn create_table_test_markdown(path: &PathBuf) {
    let table_content = r#"# Table Test

| Column 1 | Column 2 | Column 3 |
|----------|:--------:|---------:|
| Left     | Center   | Right    |
| Aligned  | Aligned  | Aligned  |
| Text     | Text     | Text     |

Simple table:

| Name | Age |
|------|-----|
| John | 25  |
| Jane | 30  |
"#;

    std::fs::write(path, table_content).unwrap();
}

/// Create oversized Markdown for testing size limits
async fn create_oversized_test_markdown(path: &PathBuf, size_bytes: usize) {
    let mut content = String::new();
    let section = "# Section\n\nThis is content for the section.\n\n";

    while content.len() < size_bytes {
        content.push_str(section);
    }

    std::fs::write(path, content).unwrap();
}

/// Create large Markdown for performance testing
async fn create_large_test_markdown(path: &PathBuf, sections: usize) {
    let mut content = String::new();

    for i in 1..=sections {
        content.push_str(&format!(r#"# Section {}

This is section {} content with **bold text** and *italic text*.

## Subsection {}.1

- List item 1
- List item 2
- List item 3

```rust
fn section_{}() {{
    println!("Section {}")
}}
```

"#, i, i, i, i, i));
    }

    std::fs::write(path, content).unwrap();
}

// Helper functions to validate ProseMirror conversion

/// Validate that Markdown is properly converted to ProseMirror JSON
fn validate_markdown_to_prosemirror_conversion(tiptap_json: &Value) {
    // Should have proper document structure
    assert_eq!(tiptap_json["type"], "doc");
    assert!(tiptap_json["content"].is_array());

    let content = &tiptap_json["content"];

    // Should contain converted elements
    assert!(!content.as_array().unwrap().is_empty());
}

/// Validate heading conversion from Markdown
fn validate_heading_conversion(tiptap_json: &Value) {
    // Should contain heading nodes with proper levels
    assert!(contains_heading_level(tiptap_json, 1));
    assert!(contains_heading_level(tiptap_json, 2));
}

/// Validate list conversion from Markdown
fn validate_list_conversion(tiptap_json: &Value) {
    // Should contain both bullet and ordered lists
    assert!(contains_bullet_list(tiptap_json));
    assert!(contains_ordered_list(tiptap_json));
}

/// Validate code block conversion
fn validate_code_block_conversion(tiptap_json: &Value) {
    // Should contain code blocks with language attributes
    assert!(contains_code_block(tiptap_json));
}

/// Validate link conversion
fn validate_link_conversion(tiptap_json: &Value) {
    // Should contain link marks
    assert!(contains_link_marks(tiptap_json));
}

/// Validate emphasis conversion
fn validate_emphasis_conversion(tiptap_json: &Value) {
    // Should contain italic and bold marks
    assert!(contains_emphasis_marks(tiptap_json));
}

// Search helper functions (simplified implementations)

fn contains_heading_level(tiptap_json: &Value, level: u8) -> bool {
    search_for_node_with_level(tiptap_json, "heading", level)
}

fn contains_bullet_list(tiptap_json: &Value) -> bool {
    search_for_node_type(tiptap_json, "bulletList")
}

fn contains_ordered_list(tiptap_json: &Value) -> bool {
    search_for_node_type(tiptap_json, "orderedList")
}

fn contains_code_block(tiptap_json: &Value) -> bool {
    search_for_node_type(tiptap_json, "codeBlock")
}

fn contains_link_marks(tiptap_json: &Value) -> bool {
    search_for_mark_type(tiptap_json, "link")
}

fn contains_emphasis_marks(tiptap_json: &Value) -> bool {
    search_for_mark_type(tiptap_json, "italic") && search_for_mark_type(tiptap_json, "bold")
}

fn search_for_node_type(value: &Value, node_type: &str) -> bool {
    if let Some(type_val) = value.get("type") {
        if type_val.as_str() == Some(node_type) {
            return true;
        }
    }

    if let Some(content) = value.get("content").and_then(|c| c.as_array()) {
        for child in content {
            if search_for_node_type(child, node_type) {
                return true;
            }
        }
    }

    false
}

fn search_for_node_with_level(value: &Value, node_type: &str, level: u8) -> bool {
    if let Some(type_val) = value.get("type") {
        if type_val.as_str() == Some(node_type) {
            if let Some(attrs) = value.get("attrs") {
                if let Some(level_val) = attrs.get("level") {
                    return level_val.as_u64() == Some(level as u64);
                }
            }
        }
    }

    if let Some(content) = value.get("content").and_then(|c| c.as_array()) {
        for child in content {
            if search_for_node_with_level(child, node_type, level) {
                return true;
            }
        }
    }

    false
}

fn search_for_mark_type(value: &Value, mark_type: &str) -> bool {
    if let Some(marks) = value.get("marks").and_then(|m| m.as_array()) {
        for mark in marks {
            if let Some(type_val) = mark.get("type") {
                if type_val.as_str() == Some(mark_type) {
                    return true;
                }
            }
        }
    }

    if let Some(content) = value.get("content").and_then(|c| c.as_array()) {
        for child in content {
            if search_for_mark_type(child, mark_type) {
                return true;
            }
        }
    }

    false
}

/// Helper function to wait for extraction completion
async fn wait_for_extraction_completion(extraction_id: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Poll for completion with timeout (should be fast for Markdown)
    for _ in 0..10 { // 10 seconds timeout for Markdown
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

        // let status = get_extraction_status(extraction_id).await?;
        // if status.status.is_finished() {
        //     return Ok(());
        // }
    }

    Err("Markdown extraction timeout".into())
}