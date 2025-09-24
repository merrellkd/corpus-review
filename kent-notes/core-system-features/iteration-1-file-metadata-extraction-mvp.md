This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: File Metadata Extraction (Documents Only - MVP - Iteration 1)

This MVP focuses on the core document extraction workflow for PDF and DOCX files, creating basic .det files that can be viewed and edited. Audio/video processing, advanced metadata, and relationship tracking are deferred to later iterations.

## MVP Scope

This iteration delivers essential document processing functionality:

- Basic text extraction from PDF and DOCX files
- Create .det files in TipTap/ProseMirror JSON format
- Simple storage in source folder (no derivatives folder yet)
- Basic extraction status tracking
- Simple error handling for extraction failures

**Explicitly NOT in this iteration:**

- Audio/video file processing
- Advanced metadata extraction (ID3 tags, technical specs)
- Document family/relationship tracking
- Derivatives folder management
- Complex metadata search
- RTF, Excel, or other document formats
- Processing chain history

## User Scenarios & Testing

### Primary User Story

As a corpus analyst, I need to convert my PDF and DOCX documents into editable .det format so I can begin annotation and analysis work using the TipTap editor.

### Acceptance Scenarios

1. **Given** I have PDF files in my project, **When** I trigger extraction, **Then** the system creates .det files with extracted text content
2. **Given** I have DOCX files in my project, **When** I trigger extraction, **Then** the system creates .det files preserving basic formatting
3. **Given** extraction completes successfully, **When** I view the workspace, **Then** I can see both original and .det files with clear indicators
4. **Given** extraction fails for a file, **When** I check the status, **Then** I see a clear error message explaining what went wrong

### Edge Cases

- What happens when PDF is password-protected or encrypted?
- How does system handle corrupted or malformed DOCX files?
- What occurs when extraction produces poor quality text (heavy OCR errors)?

## Requirements

### Functional Requirements

- **FR-001**: System MUST extract text content from PDF files and create .det files
- **FR-002**: System MUST extract text content from DOCX files preserving basic formatting
- **FR-003**: System MUST create .det files in TipTap/ProseMirror JSON format
- **FR-004**: System MUST store .det files in same directory as original files with .det extension
- **FR-005**: System MUST track extraction status for each file (not started, processing, completed, error)
- **FR-006**: System MUST provide clear error messages when extraction fails
- **FR-007**: System MUST show extraction status indicators in workspace file browser
- **FR-008**: System MUST allow manual trigger of extraction for individual files
- **FR-009**: System MUST handle basic document structure (paragraphs, headings, lists) in extraction
- **FR-010**: System MUST validate extracted content is not empty or corrupted

### Key Entities

- **Original Document**: Source PDF or DOCX file in project folder
- **Extracted Document**: Generated .det file containing TipTap/ProseMirror JSON
- **Extraction Status**: Processing state for each document (pending, processing, completed, error)

## Document Processing

### Supported File Types (MVP)

- **PDF Files (.pdf)**
  - Text extraction using standard PDF text extraction libraries
  - Basic structure preservation (paragraphs)
  - Handle both text-based and image-based PDFs (simple OCR)
- **Microsoft Word (.docx)**
  - Text and formatting extraction from DOCX structure
  - Preserve headings, paragraphs, lists
  - Convert basic formatting to TipTap-compatible structure

### .det File Format (Basic)

```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Extracted document content..."
        }
      ]
    }
  ],
  "metadata": {
    "originalFile": "document.pdf",
    "extractedAt": "2024-09-24T10:30:00Z",
    "extractionMethod": "pdf-text-extraction",
    "status": "completed"
  }
}
```

### Extraction Process (Simplified)

1. **Detection**: Identify PDF/DOCX files in project source folder
2. **Processing**: Extract text content using appropriate library
3. **Conversion**: Convert to TipTap/ProseMirror JSON format
4. **Storage**: Save as .det file alongside original
5. **Status Update**: Mark extraction as completed or log errors

## User Interface Integration

### Workspace File Browser Enhancement

- **File Status Indicators**:
  - 📄 `document.pdf` (original)
  - ✅ `document.det` (extracted successfully)
  - ⚠️ `failed-doc.pdf` (extraction error)
  - ⏳ `processing-doc.pdf` (extraction in progress)

### Extraction Actions

- **"Extract" button** for individual PDF/DOCX files without .det counterpart
- **"Re-extract" option** for files with failed extraction
- **Basic progress indication** during extraction process

### Error Display

- Simple error messages in workspace for failed extractions
- File-level error indicators in file browser
- Basic extraction log/history per file

## Data Persistence

### Database Schema Addition (MVP)

```sql
CREATE TABLE file_extractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  original_file_path TEXT NOT NULL,
  corpus_file_path TEXT,
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'error'
  extracted_at DATETIME,
  error_message TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### File System Storage (Simple)

- .det files stored alongside originals in source folder
- Naming convention: `original-filename.det`
- No separate derivatives folder in this iteration

## Technical Constraints

### MVP Limitations

- Only PDF and DOCX support (no RTF, Excel, etc.)
- Basic text extraction only (no advanced formatting preservation)
- Simple storage alongside originals (no derivatives management)
- No batch processing (extract files individually)
- No extraction quality assessment or correction workflow
- No metadata beyond basic extraction info

### Performance Requirements

- Extraction completes within 30 seconds for typical documents (< 100 pages)
- Status updates appear within 2 seconds of operation start
- File browser updates within 1 second after extraction completion
- Handle documents up to 10MB without memory issues

### Library Dependencies

- **PDF Extraction**: PDF parsing library (e.g., pdf-lib, pdfjs-dist)
- **DOCX Extraction**: DOCX processing library (e.g., docx, mammoth)
- **TipTap**: For .det format specification and validation

## Error Handling

### Common Extraction Errors

- **Corrupted File**: "This file appears to be corrupted and cannot be processed."
- **Password Protected**: "This PDF is password protected. Please provide an unlocked version."
- **Empty Content**: "No text content could be extracted from this file."
- **Unsupported Format**: "This file format is not supported for extraction."

### Error Recovery

- Clear error messages with suggested actions
- Option to retry extraction after addressing issues
- Manual extraction trigger for problematic files
- Basic extraction log for troubleshooting

## Integration Points

### Current Integration

- **Project Workspace**: Display extraction status in file browser
- **Project Database**: Store extraction metadata and status

### Future Integration Placeholders

- **Derivatives Management**: File structure ready for derivatives folder migration
- **Advanced Metadata**: Database schema extensible for additional metadata
- **Batch Processing**: Individual extraction workflow scales to batch operations

## Success Criteria

### User Experience

- Clear visual feedback during extraction process
- Obvious distinction between original and extracted files
- Simple way to trigger extraction for new documents
- Clear error messages guide user when extraction fails

### Technical Performance

- Reliable extraction for common PDF and DOCX files
- Fast status updates and progress indication
- Minimal memory usage during extraction
- Clean error handling without system crashes

### Content Quality

- Extracted text maintains readability and basic structure
- TipTap editor can successfully open and edit .det files
- Minimal loss of essential document structure during extraction
- Empty or corrupted extractions are properly flagged

This MVP establishes the foundation for document processing while keeping scope focused on essential PDF/DOCX extraction and .det file creation, enabling users to begin working with their documents immediately.
