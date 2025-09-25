# Data Model: File Metadata Extraction

**Feature**: File Metadata Extraction
**Date**: 2025-09-25
**Purpose**: Define domain entities, value objects, and relationships

## Domain Entities

### OriginalDocument
**Purpose**: Represents source documents (PDF, DOCX, MD) in project workspace

**Attributes**:
- `document_id: DocumentId` - Prefixed UUID identifier (doc_*)
- `project_id: ProjectId` - Foreign key to project
- `file_path: FilePath` - Absolute path to original file
- `file_name: FileName` - Display name extracted from path
- `file_size_bytes: u64` - File size in bytes
- `file_type: DocumentType` - PDF | DOCX | Markdown
- `created_at: DateTime<Utc>` - File system creation time
- `modified_at: DateTime<Utc>` - File system modification time
- `checksum: String` - File content hash for change detection

**Business Rules**:
- File path must exist and be readable
- File size must be ≤ 10MB for processing
- File type determined by extension validation
- Checksum updated when file modification detected

**State Transitions**: Immutable (represents external file system state)

### ExtractedDocument
**Purpose**: Represents processed .det files with TipTap/ProseMirror content

**Attributes**:
- `extracted_document_id: ExtractedDocumentId` - Prefixed UUID (det_*)
- `original_document_id: DocumentId` - Links to source document
- `extracted_file_path: FilePath` - Path to .det file
- `tiptap_content: ProseMirrorJson` - Structured document content
- `extraction_method: ExtractionMethod` - Processing type used
- `extracted_at: DateTime<Utc>` - When extraction completed
- `content_preview: String` - First 200 chars for display
- `word_count: u32` - Extracted text word count
- `character_count: u32` - Total character count

**Business Rules**:
- Must have valid ProseMirror JSON structure
- Content preview auto-generated from TipTap content
- Word/character counts calculated during extraction
- File path follows pattern: {original_path}.det

**State Transitions**:
- Created → Updated (when re-extracted)
- Updated → Deleted (manual cleanup)

### FileExtraction
**Purpose**: Tracks extraction process state and metadata

**Attributes**:
- `extraction_id: ExtractionId` - Prefixed UUID (ext_*)
- `project_id: ProjectId` - Project context
- `original_document_id: DocumentId` - Source document
- `extracted_document_id: Option<ExtractedDocumentId>` - Result (if successful)
- `status: ExtractionStatus` - Current processing state
- `extraction_method: ExtractionMethod` - PDF | DOCX | Markdown processing
- `started_at: DateTime<Utc>` - When extraction began
- `completed_at: Option<DateTime<Utc>>` - When finished (success/error)
- `error_message: Option<String>` - Failure details
- `processing_duration: Option<Duration>` - Time taken
- `retry_count: u8` - Number of retry attempts

**Business Rules**:
- Only one active extraction per document at a time
- Status transitions must follow valid state machine
- Error messages must be user-actionable
- Retry count limited to 3 attempts max

**State Transitions**:
```
Pending → Processing → Completed
    ↓        ↓           ↑
    └→  Error ←←←←←←←←←←←←┘
           ↓ (retry)
        Pending
```

## Value Objects

### DocumentId
**Format**: `doc_{uuid}` (e.g., doc_12345678-1234-1234-1234-123456789012)
**Purpose**: Type-safe document identification
**Validation**: Must start with "doc_", followed by valid UUID v4

### ExtractionId
**Format**: `ext_{uuid}` (e.g., ext_12345678-1234-1234-1234-123456789012)
**Purpose**: Type-safe extraction process identification
**Validation**: Must start with "ext_", followed by valid UUID v4

### ExtractedDocumentId
**Format**: `det_{uuid}` (e.g., det_12345678-1234-1234-1234-123456789012)
**Purpose**: Type-safe extracted document identification
**Validation**: Must start with "det_", followed by valid UUID v4

### FilePath
**Purpose**: Type-safe file system path representation
**Validation**:
- Must be absolute path
- File must exist and be readable
- Path must be within project workspace boundaries

### FileName
**Purpose**: Display-friendly file name
**Validation**:
- Extracted from FilePath
- No path separators allowed
- Must include valid file extension

### DocumentType
**Purpose**: Supported file format classification
**Values**:
- `PDF` - Adobe PDF format
- `DOCX` - Microsoft Word OpenXML
- `Markdown` - CommonMark/GitHub Markdown

### ExtractionMethod
**Purpose**: Processing approach used for document
**Values**:
- `PdfTextExtraction` - Standard PDF text extraction
- `PdfOcrExtraction` - OCR-based PDF processing
- `DocxStructureExtraction` - DOCX XML parsing
- `MarkdownConversion` - Markdown to ProseMirror conversion

### ExtractionStatus
**Purpose**: Processing state tracking
**Values**:
- `Pending` - Queued for processing
- `Processing` - Currently extracting
- `Completed` - Successfully finished
- `Error` - Failed with error message

### ProseMirrorJson
**Purpose**: TipTap/ProseMirror document structure
**Structure**:
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{"type": "text", "text": "Title"}]
    },
    {
      "type": "paragraph",
      "content": [{"type": "text", "text": "Content..."}]
    }
  ]
}
```

## Aggregates

### DocumentExtractionAggregate
**Root Entity**: OriginalDocument
**Contains**:
- OriginalDocument (root)
- FileExtraction (process tracking)
- ExtractedDocument (result, if successful)

**Invariants**:
- One original document can have multiple extraction attempts
- Only one extraction can be "Processing" at a time per document
- Extracted document only exists if extraction "Completed" successfully
- All entities share same project_id for consistency

**Operations**:
- `start_extraction()` - Begin processing
- `complete_extraction(content)` - Mark success with content
- `fail_extraction(error)` - Mark failure with message
- `retry_extraction()` - Restart failed extraction

## Repository Interfaces

### DocumentRepository
```rust
trait DocumentRepository {
    async fn find_by_id(&self, id: DocumentId) -> Result<Option<OriginalDocument>>;
    async fn find_by_project(&self, project_id: ProjectId) -> Result<Vec<OriginalDocument>>;
    async fn find_by_path(&self, path: FilePath) -> Result<Option<OriginalDocument>>;
    async fn save(&self, document: OriginalDocument) -> Result<()>;
    async fn delete(&self, id: DocumentId) -> Result<()>;
}
```

### ExtractionRepository
```rust
trait ExtractionRepository {
    async fn find_by_id(&self, id: ExtractionId) -> Result<Option<FileExtraction>>;
    async fn find_by_document(&self, doc_id: DocumentId) -> Result<Vec<FileExtraction>>;
    async fn find_by_status(&self, status: ExtractionStatus) -> Result<Vec<FileExtraction>>;
    async fn save(&self, extraction: FileExtraction) -> Result<()>;
    async fn update_status(&self, id: ExtractionId, status: ExtractionStatus) -> Result<()>;
}
```

### ExtractedDocumentRepository
```rust
trait ExtractedDocumentRepository {
    async fn find_by_id(&self, id: ExtractedDocumentId) -> Result<Option<ExtractedDocument>>;
    async fn find_by_original(&self, original_id: DocumentId) -> Result<Option<ExtractedDocument>>;
    async fn save(&self, document: ExtractedDocument) -> Result<()>;
    async fn update_content(&self, id: ExtractedDocumentId, content: ProseMirrorJson) -> Result<()>;
    async fn delete(&self, id: ExtractedDocumentId) -> Result<()>;
}
```

## Database Schema

### Tables

```sql
-- Extends existing projects table
CREATE TABLE IF NOT EXISTS original_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_uuid TEXT UNIQUE NOT NULL, -- DocumentId
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_type TEXT NOT NULL, -- PDF, DOCX, Markdown
    created_at DATETIME NOT NULL,
    modified_at DATETIME NOT NULL,
    checksum TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    UNIQUE(project_id, file_path)
);

CREATE TABLE IF NOT EXISTS file_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_uuid TEXT UNIQUE NOT NULL, -- ExtractionId
    project_id INTEGER NOT NULL,
    original_document_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- Pending, Processing, Completed, Error
    extraction_method TEXT, -- PdfTextExtraction, DocxStructureExtraction, etc.
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    error_message TEXT,
    processing_duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (original_document_id) REFERENCES original_documents(id)
);

CREATE TABLE IF NOT EXISTS extracted_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracted_document_uuid TEXT UNIQUE NOT NULL, -- ExtractedDocumentId
    original_document_id INTEGER NOT NULL,
    extracted_file_path TEXT NOT NULL,
    tiptap_content TEXT NOT NULL, -- JSON blob
    extraction_method TEXT NOT NULL,
    extracted_at DATETIME NOT NULL,
    content_preview TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    FOREIGN KEY (original_document_id) REFERENCES original_documents(id),
    UNIQUE(original_document_id) -- One extracted version per original
);
```

### Indexes
```sql
CREATE INDEX idx_original_documents_project ON original_documents(project_id);
CREATE INDEX idx_original_documents_type ON original_documents(file_type);
CREATE INDEX idx_file_extractions_status ON file_extractions(status);
CREATE INDEX idx_file_extractions_project ON file_extractions(project_id);
CREATE INDEX idx_extracted_documents_original ON extracted_documents(original_document_id);
```

## Event Definitions

### Domain Events

```rust
pub enum ExtractionEvent {
    ExtractionStarted {
        extraction_id: ExtractionId,
        document_id: DocumentId,
        method: ExtractionMethod,
    },
    ExtractionCompleted {
        extraction_id: ExtractionId,
        extracted_document_id: ExtractedDocumentId,
        duration: Duration,
    },
    ExtractionFailed {
        extraction_id: ExtractionId,
        error_message: String,
        retry_count: u8,
    },
    DocumentUpdated {
        document_id: DocumentId,
        new_checksum: String,
    },
}
```

## Validation Rules

### File Validation
- File size ≤ 10MB
- File exists and readable
- Extension matches content type
- Path within project boundaries

### Content Validation
- ProseMirror JSON schema compliance
- Non-empty content (at least 1 character)
- Valid node structure and nesting
- All required attributes present

### State Validation
- Valid status transitions only
- No concurrent extractions per document
- Retry count within limits
- Error messages are user-actionable

This data model provides strong typing, clear relationships, and supports all functional requirements while following DDD principles and constitutional constraints.