# Research: File Metadata Extraction

**Feature**: File Metadata Extraction
**Date**: 2025-09-25
**Purpose**: Resolve technical clarifications and research implementation approaches

## Technical Clarifications Resolved

### Performance Targets Research

**Decision**: 30-second extraction limit for 100-page documents is reasonable
**Rationale**:
- PDF text extraction typically processes at 1-3 pages/second
- DOCX processing is faster due to structured XML format
- Markdown processing is near-instantaneous
- 30 seconds provides buffer for complex layouts and OCR processing

**Alternatives Considered**:
- 10-second limit: Too aggressive for complex PDFs requiring OCR
- 60-second limit: Too slow for user experience expectations

### Document Size Limits

**Decision**: 10MB hard limit with graceful degradation for larger files
**Rationale**:
- Covers 95% of typical business documents
- Prevents memory exhaustion in Tauri environment
- Allows clear user guidance for oversized files

**Alternatives Considered**:
- No limit: Risk of system crashes with very large files
- Streaming processing: Too complex for MVP scope

## Library Research

### PDF Processing

**Decision**: Use `pdf-extract` or `pdf2text` Rust crate
**Rationale**:
- Native Rust implementation for Tauri integration
- Handles both text-based and OCR-based extraction
- Good performance characteristics

**Alternatives Considered**:
- JavaScript PDF.js via Tauri: Cross-boundary complexity
- External tools: Deployment complexity

### DOCX Processing

**Decision**: Use `docx-rs` crate for structured document parsing
**Rationale**:
- Native Rust Office Open XML support
- Preserves document structure (headings, lists, formatting)
- Actively maintained with good community support

**Alternatives Considered**:
- Pandoc integration: External dependency complexity
- Manual ZIP/XML parsing: Too low-level for MVP

### Markdown Processing

**Decision**: Use `pulldown-cmark` for markdown parsing
**Rationale**:
- CommonMark compliant with GitHub extensions
- Fast streaming parser suitable for large documents
- Well-integrated with Rust ecosystem

**Alternatives Considered**:
- `markdown-rs`: Less mature ecosystem
- JavaScript markdown-it: Cross-boundary overhead

### TipTap/ProseMirror Integration

**Decision**: Generate ProseMirror JSON directly from Rust, consume in TipTap editor
**Rationale**:
- Single source of truth for document structure
- Consistent formatting across all document types
- Efficient serialization over Tauri bridge

**Implementation Pattern**:
```rust
// Rust side - generate ProseMirror JSON
struct ProseMirrorNode {
    type: String,
    attrs: Option<serde_json::Value>,
    content: Option<Vec<ProseMirrorNode>>,
    text: Option<String>,
    marks: Option<Vec<ProseMirrorMark>>,
}
```

## Architecture Decisions

### Extraction Status Tracking

**Decision**: Use SQLite table with foreign key to projects table
**Rationale**:
- Persistent status across application restarts
- Query capabilities for batch operations (future)
- Transactional consistency with project data

**Schema**:
```sql
CREATE TABLE file_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_uuid TEXT UNIQUE NOT NULL, -- ext_*
    project_id INTEGER NOT NULL,
    original_file_path TEXT NOT NULL,
    extracted_file_path TEXT,
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'error'
    extraction_method TEXT, -- 'pdf-text', 'docx-structure', 'markdown-convert'
    extracted_at DATETIME,
    error_message TEXT,
    file_size_bytes INTEGER,
    page_count INTEGER,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### DocumentCaddy Integration Strategy

**Decision**: File-type-based rendering with unified interface
**Rationale**:
- Clean separation between viewing and editing modes
- Extensible for future document types
- Consistent user experience across file types

**Implementation**:
- Original files: Format-specific viewers (PDF.js, HTML preview, markdown renderer)
- .det files: Unified TipTap editor with ProseMirror JSON
- Mode detection via file extension analysis

### Error Handling Strategy

**Decision**: Graceful degradation with user-actionable messages
**Rationale**:
- Users expect some extractions to fail (encrypted PDFs, etc.)
- Clear guidance reduces support burden
- Partial success better than complete failure

**Error Categories**:
1. **Recoverable**: Password-protected files, missing dependencies
2. **User Error**: Unsupported formats, corrupted files
3. **System Error**: Disk space, memory limits, parsing failures

## Performance Optimization Research

### Parallel Processing

**Decision**: Process one file at a time for MVP, prepare for batch processing
**Rationale**:
- Simpler error handling and status tracking
- Avoids resource contention on user's machine
- Clear upgrade path to parallel processing

### Memory Management

**Decision**: Stream-based processing where possible, temp file cleanup
**Rationale**:
- Large documents can exceed available RAM
- Clean separation between input parsing and output generation
- Predictable memory usage patterns

### Caching Strategy

**Decision**: No caching for MVP, but structure supports future enhancement
**Rationale**:
- File modification detection adds complexity
- Storage overhead may be significant
- Manual re-extraction provides user control

## Integration Points Research

### Workspace File Browser

**Decision**: Extend existing workspace navigation with extraction status indicators
**Rationale**:
- Consistent with existing file management UI
- Reuses established patterns for file operations
- Natural discovery of extraction capabilities

### Status Indicators Design

**Decision**: Icon-based status with tooltip details
**Rationale**:
- Visual scanning of large file lists
- Detailed information on demand
- Consistent with existing UI patterns

## Constraints Validation

### Offline Operation

**Confirmed**: All processing local, no network dependencies
- PDF/DOCX/Markdown parsing: Local libraries only
- TipTap: Bundled with frontend, no CDN dependencies
- Status tracking: Local SQLite database

### File System Integration

**Confirmed**: .det files stored alongside originals
- No separate derivatives folder for MVP
- Preserves user's existing organization
- Simple file management and backup

### Security Considerations

**Confirmed**: No sensitive data exposure
- Document content stays local
- No cloud processing or transmission
- User controls all extraction timing and data

## Implementation Readiness

All major technical decisions resolved:
- ✅ Library selections made with rationale
- ✅ Architecture patterns established
- ✅ Database schema designed
- ✅ Error handling strategy defined
- ✅ Performance constraints validated
- ✅ Integration points mapped

**Ready for Phase 1**: Design and contracts generation