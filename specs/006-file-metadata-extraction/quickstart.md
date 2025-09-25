# Quickstart Guide: File Metadata Extraction

**Feature**: File Metadata Extraction
**Date**: 2025-09-25
**Purpose**: Validate implementation with end-to-end test scenarios

## Prerequisites

### Test Environment Setup
1. **Project workspace** with sample documents:
   - `sample.pdf` (text-based, 5 pages, ~2MB)
   - `formatted.docx` (with headings, lists, formatting, ~1MB)
   - `notes.md` (markdown with headers, links, lists, ~50KB)
   - `encrypted.pdf` (password protected, for error testing)

2. **Database state**: Clean project with no existing extractions

3. **File system**: Ensure documents are readable and within 10MB limit

## Core Workflow Validation

### Scenario 1: PDF Text Extraction
**Purpose**: Validate basic PDF processing workflow

**Steps**:
1. Navigate to project workspace containing `sample.pdf`
2. Verify document appears in file browser with PDF icon
3. Click "Extract" button next to `sample.pdf`
4. Observe status changes: None → Pending → Processing → Completed
5. Verify `sample.det` file appears alongside original
6. Open `sample.pdf` in DocumentCaddy → should display read-only PDF viewer
7. Open `sample.det` in DocumentCaddy → should display TipTap editor
8. Verify extracted content matches original text structure

**Expected Results**:
- ✅ Extraction completes within 30 seconds
- ✅ Status indicators update within 2 seconds
- ✅ `.det` file contains valid TipTap JSON
- ✅ Text content preserved with basic paragraph structure
- ✅ Word count and character count populated
- ✅ DocumentCaddy renders both modes correctly

### Scenario 2: DOCX Structure Preservation
**Purpose**: Validate formatted document processing

**Steps**:
1. Navigate to workspace containing `formatted.docx`
2. Start extraction on DOCX file
3. Monitor extraction progress and completion
4. Open extracted `.det` file in TipTap editor
5. Verify document structure preservation:
   - Headings maintain hierarchy (H1, H2, H3)
   - Bullet lists and numbered lists preserved
   - Basic formatting (bold, italic) maintained
   - Paragraph breaks correct

**Expected Results**:
- ✅ Document structure maps to TipTap nodes correctly
- ✅ Headings convert to `{ type: "heading", attrs: { level: N } }`
- ✅ Lists convert to `bulletList` or `orderedList` nodes
- ✅ Text formatting preserved as marks
- ✅ Content editable in TipTap interface

### Scenario 3: Markdown Conversion
**Purpose**: Validate markdown-to-TipTap processing

**Steps**:
1. Navigate to workspace containing `notes.md`
2. Extract markdown document
3. Compare original markdown syntax with TipTap JSON output:
   - `# Header` → `heading` node with level 1
   - `**bold text**` → text node with `bold` mark
   - `[link](url)` → text node with `link` mark
   - `- list item` → `bulletList` with `listItem` nodes
4. Verify original markdown renders as HTML in read-only mode
5. Verify `.det` version editable with preserved formatting

**Expected Results**:
- ✅ Markdown syntax correctly converted to ProseMirror structure
- ✅ Links functional and preserved
- ✅ List structure maintained
- ✅ Original displays as formatted HTML
- ✅ Extracted version fully editable

### Scenario 4: Dual-Mode DocumentCaddy Operation
**Purpose**: Validate viewing vs editing modes

**Steps**:
1. Ensure both `sample.pdf` and `sample.det` exist from Scenario 1
2. Open original `sample.pdf` in DocumentCaddy:
   - Verify read-only indicators visible
   - Attempt to edit content (should be blocked)
   - Verify appropriate viewer (PDF.js or HTML preview)
3. Open extracted `sample.det` in DocumentCaddy:
   - Verify TipTap editor loads with content
   - Edit text content and verify changes persist
   - Add annotations and formatting
   - Save changes to `.det` file

**Expected Results**:
- ✅ Original files clearly marked as read-only
- ✅ Extracted files fully editable in TipTap
- ✅ File type detection works correctly
- ✅ Mode switching preserves document context
- ✅ Changes saved successfully to file system

## Error Handling Validation

### Scenario 5: Password-Protected PDF
**Purpose**: Validate graceful error handling

**Steps**:
1. Attempt extraction on `encrypted.pdf`
2. Observe error status and messaging
3. Verify user-actionable error message
4. Confirm no partial `.det` file created
5. Verify retry mechanism available

**Expected Results**:
- ✅ Clear error message: "PDF is password protected"
- ✅ Extraction status shows "Error" state
- ✅ Guidance provided for resolution
- ✅ No corrupted output files created
- ✅ Retry option available after addressing issue

### Scenario 6: Unsupported File Type
**Purpose**: Validate file type filtering

**Steps**:
1. Add unsupported file (e.g., `.txt`, `.rtf`) to workspace
2. Verify file appears in browser but without extract option
3. Confirm clear messaging about supported formats

**Expected Results**:
- ✅ Unsupported files visible but not extractable
- ✅ Clear indication of supported formats (PDF, DOCX, MD)
- ✅ No confusing error messages

### Scenario 7: Large File Handling
**Purpose**: Validate size limit enforcement

**Steps**:
1. Add file larger than 10MB to workspace
2. Attempt extraction
3. Verify size limit error message
4. Confirm graceful degradation

**Expected Results**:
- ✅ File size detected and blocked before processing
- ✅ Clear error message about 10MB limit
- ✅ Guidance about file size optimization

## Status Tracking Validation

### Scenario 8: Multiple Extractions
**Purpose**: Validate concurrent extraction handling

**Steps**:
1. Start extraction on first document
2. Immediately attempt extraction on same document
3. Verify "extraction in progress" handling
4. Start extraction on different document (should work)
5. Monitor multiple extraction statuses

**Expected Results**:
- ✅ Only one extraction per document at a time
- ✅ Clear messaging about extraction in progress
- ✅ Multiple documents can extract concurrently
- ✅ Status tracking accurate for all extractions

### Scenario 9: Extraction History
**Purpose**: Validate extraction tracking over time

**Steps**:
1. Extract document successfully
2. Modify original file
3. Re-extract (force re-extraction)
4. View extraction history
5. Verify timestamp and status tracking

**Expected Results**:
- ✅ Extraction history preserved in database
- ✅ Timestamps accurate
- ✅ Status transitions logged correctly
- ✅ Error messages preserved for debugging

## Performance Validation

### Scenario 10: Performance Benchmarks
**Purpose**: Validate performance requirements

**Test Cases**:
1. **Small PDF** (1-5 pages): Extract and measure time
2. **Medium DOCX** (20-50 pages): Extract and measure time
3. **Large Document** (80-100 pages): Extract and measure time
4. **Status Update Speed**: Measure time from action to UI update
5. **File Browser Refresh**: Measure time to show completed extraction

**Performance Targets**:
- ✅ Small documents: < 5 seconds
- ✅ Medium documents: < 15 seconds
- ✅ Large documents: < 30 seconds
- ✅ Status updates: < 2 seconds
- ✅ UI refresh: < 1 second

## Data Validation

### Scenario 11: Content Quality Validation
**Purpose**: Ensure extracted content quality

**Steps**:
1. Extract documents with various formatting
2. Compare original vs extracted content:
   - Text accuracy and completeness
   - Structure preservation
   - Formatting retention
3. Verify metadata accuracy:
   - Word counts match expected
   - Character counts accurate
   - File paths correct

**Expected Results**:
- ✅ Text content 95%+ accurate
- ✅ Structure preserved appropriately
- ✅ Metadata calculations correct
- ✅ No content corruption or loss

## Integration Testing

### Scenario 12: End-to-End Workflow
**Purpose**: Validate complete user journey

**Steps**:
1. Start with clean project
2. Add multiple document types to workspace
3. Extract all documents using different methods:
   - Manual individual extraction
   - Extraction after error recovery
   - Re-extraction of modified files
4. Use DocumentCaddy for viewing and editing:
   - View all original documents
   - Edit all extracted documents
   - Save changes and verify persistence
5. Verify workspace state consistency

**Expected Results**:
- ✅ All supported document types process correctly
- ✅ Workspace state remains consistent
- ✅ File browser accurately reflects extraction status
- ✅ DocumentCaddy handles all file types appropriately
- ✅ Data persistence works correctly

## Acceptance Criteria

### Must Pass (Blocking Issues)
- [ ] All core workflow scenarios (1-4) complete successfully
- [ ] Error handling scenarios (5-7) show graceful degradation
- [ ] Performance targets met for small-medium documents
- [ ] Content quality validation passes
- [ ] No data corruption or loss occurs

### Should Pass (Quality Issues)
- [ ] Status tracking scenarios work correctly
- [ ] Performance targets met for all document sizes
- [ ] Integration testing shows no edge cases
- [ ] All UI indicators and messaging clear

### Nice to Have (Enhancement Opportunities)
- [ ] Performance exceeds targets significantly
- [ ] Error messages provide actionable guidance
- [ ] User experience intuitive without documentation

## Troubleshooting Guide

### Common Issues
1. **Extraction hangs**: Check file permissions, disk space, memory usage
2. **Content quality poor**: Verify source document quality, try different extraction method
3. **UI not updating**: Check status polling mechanism, verify database queries
4. **Performance slow**: Profile extraction libraries, check file I/O patterns
5. **Files not found**: Verify workspace boundaries, check path resolution

### Debugging Tools
- Backend logs with structured logging
- Extraction status database queries
- File system permission checks
- Memory usage monitoring during extraction
- TipTap content validation utilities

This quickstart guide provides comprehensive validation of all feature requirements and serves as the acceptance test suite for implementation completion.