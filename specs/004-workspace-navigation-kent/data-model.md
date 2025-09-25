# Data Model: Project Workspace Navigation

**Feature**: Project Workspace Navigation (MVP - Iteration 1)
**Date**: 2025-09-25

## Domain Entities

### WorkspaceContext (Value Object)
Represents the context and state of an active project workspace.

**Rust Domain (src-tauri/src/domain/value_objects/)**
```rust
pub struct WorkspaceContext {
    project_id: ProjectId,
    project_name: String,
    source_folder: PathBuf,
    current_path: PathBuf,
}
```

**TypeScript Domain (src/domain/value-objects/)**
```typescript
interface WorkspaceContext {
  projectId: ProjectId;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
}
```

**Validation Rules**:
- `project_id` must be valid prefixed UUID (existing validation)
- `source_folder` must exist and be accessible
- `current_path` must be within source_folder boundary
- `project_name` follows existing Project entity validation (1-255 chars)

### FileEntry (Entity)
Represents a file or folder within the workspace with metadata.

**Rust Domain (src-tauri/src/domain/entities/)**
```rust
pub struct FileEntry {
    name: String,
    path: PathBuf,
    entry_type: FileEntryType,
    size: Option<u64>,
    modified: SystemTime,
}

pub enum FileEntryType {
    File,
    Directory,
}
```

**TypeScript Domain (src/domain/entities/)**
```typescript
interface FileEntry {
  name: string;
  path: string;
  entryType: 'file' | 'directory';
  size?: number;
  modified: Date;
}
```

**Validation Rules**:
- `name` must not be empty
- `path` must be within workspace source folder
- `size` only present for files (None/undefined for directories)
- `modified` must be valid timestamp

### DirectoryListing (Aggregate Root)
Manages collection of file entries with navigation operations.

**Rust Domain (src-tauri/src/domain/aggregates/)**
```rust
pub struct DirectoryListing {
    workspace_context: WorkspaceContext,
    entries: Vec<FileEntry>,
    is_root: bool,
    parent_path: Option<PathBuf>,
}

impl DirectoryListing {
    pub fn new(context: WorkspaceContext, entries: Vec<FileEntry>) -> Self;
    pub fn navigate_to_folder(&self, folder_name: &str) -> Result<PathBuf, DomainError>;
    pub fn navigate_to_parent(&self) -> Result<Option<PathBuf>, DomainError>;
    pub fn can_navigate_up(&self) -> bool;
}
```

**TypeScript Domain (src/domain/aggregates/)**
```typescript
interface DirectoryListing {
  workspaceContext: WorkspaceContext;
  entries: FileEntry[];
  isRoot: boolean;
  parentPath?: string;
}
```

**Business Rules**:
- Cannot navigate above source folder root
- Entries must be sorted (directories first, then files, alphabetically)
- Empty directories are valid and must be handled gracefully
- Navigation operations must validate path boundaries

## State Transitions

### Workspace Lifecycle
```
Project List → Open Project → Workspace Loading → Workspace Active
                    ↓                ↓              ↓
                 Validate      Load Directory   Navigate Folders
                    ↓                ↓              ↓
              Error Handling    File Listing   Update Context
```

### Navigation States
```
Root Directory ← → Subdirectory ← → Deeper Subdirectory
     ↑                  ↑                   ↑
Back to Projects    Navigate Up         Navigate Up
```

## Data Transfer Objects (DTOs)

### WorkspaceDto
API contract for workspace data exchange.

**Rust (src-tauri/src/application/dtos/)**
```rust
#[derive(Serialize, Deserialize)]
pub struct WorkspaceDto {
    pub project_id: String,
    pub project_name: String,
    pub source_folder: String,
    pub current_path: String,
    pub directory_listing: DirectoryListingDto,
}
```

**TypeScript (src/application/dtos/)**
```typescript
interface WorkspaceDto {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
  directoryListing: DirectoryListingDto;
}
```

### DirectoryListingDto
```rust
#[derive(Serialize, Deserialize)]
pub struct DirectoryListingDto {
    pub entries: Vec<FileEntryDto>,
    pub is_root: bool,
    pub parent_path: Option<String>,
    pub can_navigate_up: bool,
}
```

### FileEntryDto
```rust
#[derive(Serialize, Deserialize)]
pub struct FileEntryDto {
    pub name: String,
    pub path: String,
    pub entry_type: String, // "file" | "directory"
    pub size: Option<u64>,
    pub modified: String, // ISO timestamp
}
```

## Error Handling

### Domain Errors
**Rust (src-tauri/src/domain/errors/)**
```rust
pub enum WorkspaceError {
    SourceFolderNotFound(String),
    SourceFolderAccessDenied(String),
    InvalidPath(String),
    NavigationBoundaryViolation(String),
    DirectoryListingFailed(String),
}
```

**Error Mapping to AppError**:
- `SourceFolderNotFound` → `FileSystemError` with user-friendly message
- `SourceFolderAccessDenied` → `FileSystemError` with permission guidance
- `InvalidPath` → `ValidationError` with path correction suggestion
- `NavigationBoundaryViolation` → `ValidationError` with boundary explanation
- `DirectoryListingFailed` → `FileSystemError` with retry option

## Repository Interfaces

### WorkspaceRepository
**Rust Domain (src-tauri/src/domain/repositories/)**
```rust
#[async_trait]
pub trait WorkspaceRepository {
    async fn load_workspace(&self, project_id: ProjectId) -> Result<WorkspaceContext, WorkspaceError>;
    async fn list_directory(&self, path: &Path) -> Result<DirectoryListing, WorkspaceError>;
    async fn validate_path_access(&self, path: &Path) -> Result<bool, WorkspaceError>;
}
```

### Implementation Strategy
- Infrastructure layer implements repository using Tauri's file system APIs
- File metadata retrieved via `std::fs::metadata` and `std::fs::read_dir`
- Path validation ensures all operations stay within project source folder
- Error handling maps system errors to domain errors

## Database Schema
No database schema changes required - workspace navigation uses existing project data and reads file system directly.

## Integration Points

### Project List Integration
- Receives `ProjectId` from project list selection
- Uses existing project data (name, source folder) from SQLite
- Maintains project context throughout workspace session

### Future File Processing Integration
- File metadata structure ready for content analysis extensions
- Path handling compatible with document processing workflows
- Entity design supports additional file properties in future iterations

## Validation Summary

**Constitutional Compliance**:
- ✅ Domain entities with zero infrastructure dependencies
- ✅ Repository pattern isolates file system access
- ✅ Prefixed identifiers (reusing ProjectId)
- ✅ TypeScript strict mode compatibility

**Functional Requirements Mapping**:
- FR-001-004: WorkspaceContext and navigation operations
- FR-005-006: Error handling with WorkspaceError types
- FR-007: FileEntry with metadata support
- FR-008: DirectoryListing handles empty folders
- FR-009-010: Navigation operations and context preservation

**Performance Design**:
- Lazy loading through repository interface
- Minimal data transfer via focused DTOs
- Efficient path operations using PathBuf/string paths