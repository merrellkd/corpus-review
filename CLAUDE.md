# Claude Code Context: Corpus Review - File Metadata Extraction + Workspace Navigation + Project List

## Current Feature: File Metadata Extraction (MVP)

Branch: 006-file-metadata-extraction
Status: Implementation planning complete, ready for task generation

## Previous Features

- Project List Management (003-project-list-see) - COMPLETED
- Workspace Navigation (004-workspace-navigation-kent) - COMPLETED

## Tech Stack

Language/Version: Rust (Tauri backend), TypeScript/React (frontend)
Primary Dependencies: Tauri 2.x, TipTap/ProseMirror, PDF parsing libs, DOCX processing, Markdown parser
Storage: SQLite (SQLX) for extraction tracking, file system for .det files alongside originals
Project Type: web (Tauri frontend + Rust backend)
State Management: Zustand
Validation: Zod + react-hook-form

## Architecture: Domain-Driven Design (Strict)

Constitutional Requirement: All features MUST follow DDD layers with zero violations.

### Layer Structure

```
src-tauri/src/
 domain/          # Pure business logic, zero dependencies
   aggregates/    # DocumentExtractionAggregate, DirectoryListing
   entities/      # OriginalDocument, ExtractedDocument, FileExtraction, FileEntry
   value_objects/ # DocumentId, ExtractionId, WorkspaceContext, FilePath
   repositories/  # DocumentRepository, ExtractionRepository traits
 application/     # Services orchestrating domain
 infrastructure/  # Repository implementations, file parsers, file system access
 commands/        # Tauri command handlers

src/
 domain/         # TypeScript domain models
 application/    # Application services
 infrastructure/ # Tauri API adapters
 ui/            # React components (WorkspacePage, FileList, DocumentCaddy)
 stores/        # Zustand workspace and extraction store slices
```

## Key Domain Concepts

### File Metadata Extraction Entities (Current Focus)

- OriginalDocument: Entity representing source PDF/DOCX/Markdown files with prefixed DocumentId (doc\_\*)
- ExtractedDocument: Entity representing processed .det files with TipTap/ProseMirror JSON content
- FileExtraction: Entity tracking extraction process state with prefixed ExtractionId (ext\_\*)
- DocumentExtractionAggregate: Root aggregate managing the full extraction workflow

### Workspace Entities (Existing)

- WorkspaceContext: Value object containing project context and navigation state
- FileEntry: Entity representing file/folder with metadata (name, path, size, modified)
- DirectoryListing: Aggregate root managing file collections with navigation operations

### Business Rules (Domain Layer)

File Metadata Extraction Rules (Current):

1. Only PDF, DOCX, and Markdown files can be extracted
2. File size must be <= 10MB for processing
3. .det files stored alongside originals with same name + .det extension
4. Only one extraction per document at a time allowed
5. Extraction status follows: Pending -> Processing -> Completed/Error
6. TipTap/ProseMirror JSON is the standardized editable format
7. Original files remain read-only, .det files are editable
8. Embedded images in Markdown are ignored with user warning

Workspace Navigation Rules (Existing):

1. Navigation must stay within project source folder boundaries
2. Empty directories must be handled gracefully
3. File metadata includes name, type, size, and modification date
4. Navigation state persists during workspace session
5. Source folder accessibility validated before workspace loading

## Implementation Contracts

### Tauri Commands (Snake Case)

File Metadata Extraction Commands (Current):

- `scan_project_documents(project_id: String) -> Result<Vec<OriginalDocumentDto>, AppError>`
- `start_document_extraction(document_id: String, force_reextract: bool) -> Result<ExtractionStatusDto, AppError>`
- `get_extraction_status(extraction_id: String) -> Result<ExtractionStatusDto, AppError>`
- `get_extracted_document(document_id: String) -> Result<ExtractedDocumentDto, AppError>`
- `save_extracted_document(extracted_document_id: String, tiptap_content: Object) -> Result<SaveResultDto, AppError>`

Workspace Navigation Commands (Existing):

- `open_workspace(project_id: String) -> Result<WorkspaceDto, AppError>`
- `list_directory(workspace_project_id: String, directory_path: String) -> Result<DirectoryListingDto, AppError>`
- `navigate_to_folder(workspace_project_id: String, folder_name: String, current_path: String) -> Result<WorkspaceDto, AppError>`
- `navigate_to_parent(workspace_project_id: String, current_path: String) -> Result<WorkspaceDto, AppError>`

### Error Handling

```rust
// File Metadata Extraction Errors
pub enum ExtractionError {
    UnsupportedFileType(String),
    FileTooLarge(String),
    ExtractionInProgress(String),
    ExtractionFailed(String),
    InvalidContent(String),
}

// Workspace Navigation Errors (Existing)
pub enum WorkspaceError {
    SourceFolderNotFound(String),
    SourceFolderAccessDenied(String),
    InvalidPath(String),
    NavigationBoundaryViolation(String),
    DirectoryListingFailed(String),
}
```

## UI Components Needed

File Metadata Extraction Components (Current):

1. DocumentCaddy: Dual-mode document viewer/editor (read-only originals, editable .det files)
2. ExtractionStatusIndicator: Visual status display in file browser
3. ExtractButton: Trigger extraction for supported files
4. ExtractionProgressDialog: Show extraction progress and errors

Workspace Components (Existing):

1. WorkspacePage: Main workspace container with project context
2. ProjectHeader: Project name and source folder display
3. FileList: File/folder listing with metadata and navigation
4. NavigationBreadcrumb: Current path indicator
5. BackToProjectsButton: Return navigation to project list

## State Management Pattern

```typescript
// File Metadata Extraction Store (Current)
interface ExtractionStore {
  documents: OriginalDocument[];
  extractions: Map<string, FileExtraction>;
  currentDocument: ExtractedDocument | null;
  isLoading: boolean;
  error: string | null;

  scanDocuments: (projectId: string) => Promise<void>;
  startExtraction: (documentId: string) => Promise<void>;
  getExtractionStatus: (extractionId: string) => Promise<void>;
  openDocument: (documentId: string) => Promise<void>;
  saveDocument: (extractedDocumentId: string, content: object) => Promise<void>;
}

// Workspace Store (Existing)
interface WorkspaceStore {
  currentWorkspace: WorkspaceContext | null;
  directoryListing: DirectoryListing | null;
  isLoading: boolean;
  error: string | null;

  openWorkspace: (projectId: string) => Promise<void>;
  navigateToFolder: (folderName: string) => Promise<void>;
  navigateToParent: () => Promise<void>;
  returnToProjects: () => void;
  clearError: () => void;
}
```

## File Locations

Current Feature (File Metadata Extraction):

- Spec: `specs/006-file-metadata-extraction/spec.md`
- Design: `specs/006-file-metadata-extraction/data-model.md`
- Contracts: `specs/006-file-metadata-extraction/contracts/tauri-commands.yaml`
- Tests: `specs/006-file-metadata-extraction/quickstart.md`
- Planning: `specs/006-file-metadata-extraction/plan.md`
- Research: `specs/006-file-metadata-extraction/research.md`

Previous Features:

- Workspace Navigation: `specs/004-workspace-navigation-kent/`
- Project List: `specs/003-project-list-see/`

## DocumentCaddy Integration Strategy

The DocumentCaddy component (`frontend/src/domains/workspace/ui/components/DocumentCaddy.tsx`) must support dual-mode operation:

### Original File Viewing (Read-Only)

- PDF files: PDF viewer or HTML-extracted content
- DOCX files: HTML preview of document content
- Markdown files: HTML rendering of markdown
- Clear visual indicators for read-only mode
- No editing capabilities enabled

### .det File Editing (TipTap Editor)

- Load TipTap/ProseMirror JSON content
- Full editing capabilities with formatting tools
- Real-time or explicit save operations
- Support for annotations and document analysis

### Mode Detection

- File extension determines viewer mode (.pdf/.docx/.md = read-only, .det = editable)
- Toggle between viewing original and editing extracted version
- Consistent navigation and context preservation

## Performance Requirements

File Metadata Extraction:

- Extraction: <30s for 100-page docs, <2s status updates, <1s UI refresh
- File size limit: 10MB maximum for processing
- Memory usage: Graceful handling without system impact

Workspace Navigation (Existing):

- <2s workspace loading for <100 files
- <500ms folder navigation between directories
- <1s file listing refresh
- Graceful handling of 1000+ files with loading states

## Constitutional Compliance Checklist

- Domain layer has zero infrastructure dependencies
- Prefixed UUIDs: DocumentId (doc*\*), ExtractionId (ext*\_), ExtractedDocumentId (det\_\_)
- Repository pattern isolates file system and database access
- TypeScript strict mode compilation required
- Error handling follows structured AppError pattern
- WorkspaceRepository pattern isolates file system access

## Recent Changes

- 006-file-metadata-extraction: Complete implementation planning for PDF/DOCX/Markdown extraction to .det format
- Added DocumentCaddy dual-mode integration (read-only originals, editable .det files)
- Designed TipTap/ProseMirror JSON standardization with comprehensive domain model
- Created workspace navigation feature specification and implementation
- Generated data model with WorkspaceContext, FileEntry, and DirectoryListing entities
