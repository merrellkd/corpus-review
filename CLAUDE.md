# Claude Code Context: Corpus Review - Project List Management + Workspace Navigation

## Current Feature: Project Workspace Navigation (MVP)

**Branch**: `004-workspace-navigation-kent`
**Status**: Design phase complete, ready for implementation

## Tech Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Tauri (Rust)
- **Database**: SQLite with SQLX
- **State Management**: Zustand
- **Validation**: Zod + react-hook-form

## Architecture: Domain-Driven Design (Strict)

**Constitutional Requirement**: All features MUST follow DDD layers with zero violations.

### Layer Structure

```
src-tauri/src/
 domain/          # Pure business logic, zero dependencies
   aggregates/  # DirectoryListing aggregate
   entities/    # FileEntry entity
   value_objects/  # WorkspaceContext, file paths
   repositories/   # WorkspaceRepository trait
 application/     # Services orchestrating domain
 infrastructure/ # Repository implementations, file system access
 commands/       # Tauri command handlers

src/
 domain/         # TypeScript domain models
 application/    # Application services
 infrastructure/ # Tauri API adapters
 ui/            # React components (WorkspacePage, FileList)
 stores/        # Zustand workspace store slice
```

## Key Domain Concepts

### Workspace Entities

- **WorkspaceContext**: Value object containing project context and navigation state
- **FileEntry**: Entity representing file/folder with metadata (name, path, size, modified)
- **DirectoryListing**: Aggregate root managing file collections with navigation operations

### Business Rules (Domain Layer)

1. Navigation must stay within project source folder boundaries
2. Empty directories must be handled gracefully
3. File metadata includes name, type, size, and modification date
4. Navigation state persists during workspace session
5. Source folder accessibility validated before workspace loading

## Implementation Contracts

### Tauri Commands (Snake Case)

- `open_workspace(project_id: String) -> Result<WorkspaceDto, AppError>`
- `list_directory(workspace_project_id: String, directory_path: String) -> Result<DirectoryListingDto, AppError>`
- `navigate_to_folder(workspace_project_id: String, folder_name: String, current_path: String) -> Result<WorkspaceDto, AppError>`
- `navigate_to_parent(workspace_project_id: String, current_path: String) -> Result<WorkspaceDto, AppError>`

### Error Handling

```rust
pub enum WorkspaceError {
    SourceFolderNotFound(String),
    SourceFolderAccessDenied(String),
    InvalidPath(String),
    NavigationBoundaryViolation(String),
    DirectoryListingFailed(String),
}
```

## UI Components Needed

1. **WorkspacePage**: Main workspace container with project context
2. **ProjectHeader**: Project name and source folder display
3. **FileList**: File/folder listing with metadata and navigation
4. **NavigationBreadcrumb**: Current path indicator
5. **BackToProjectsButton**: Return navigation to project list

## State Management Pattern

```typescript
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

- **Spec**: `specs/004-workspace-navigation-kent/spec.md`
- **Design**: `specs/004-workspace-navigation-kent/data-model.md`
- **Contracts**: `specs/004-workspace-navigation-kent/contracts/`
- **Tests**: `specs/004-workspace-navigation-kent/quickstart.md`

## Integration with Project List

- Extends existing project list with "Open Project" action
- Receives ProjectId from project selection
- Uses existing project data (name, source folder) from SQLite
- Maintains project context throughout workspace session
- "Back to Projects" returns to project list view

## Performance Requirements

- <2s workspace loading for <100 files
- <500ms folder navigation between directories
- <1s file listing refresh
- Graceful handling of 1000+ files with loading states

## Constitutional Compliance Checklist

-  Domain layer has zero infrastructure dependencies
-  WorkspaceRepository pattern isolates file system access
-  Prefixed UUIDs for workspace identifiers (reuses ProjectId)
-  TypeScript strict mode compilation required
-  Error handling follows structured AppError pattern

## Recent Changes
- 006-refactor-existing-front: Added TypeScript/React with Vite build system + React, Zustand, Tauri (for backend integration), Zod (validation)

- Created workspace navigation feature specification
- Generated data model with WorkspaceContext, FileEntry, and DirectoryListing entities

**Last Updated**: 2025-09-25
