# Claude Code Context: Corpus Review - Project List Management

## Current Feature: Project List Management (MVP)

**Branch**: `003-project-list-see`
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
   aggregates/  # Project aggregate
   entities/    # Project entity
   value_objects/  # ProjectId, ProjectName, etc.
   repositories/   # ProjectRepository trait
 application/     # Services orchestrating domain
 infrastructure/ # Repository implementations, SQLite
 commands/       # Tauri command handlers

src/
 domain/         # TypeScript domain models
 application/    # Application services
 infrastructure/ # Tauri API adapters
 ui/            # React components
 stores/        # Zustand stores
```

## Key Domain Concepts

### Project Entity

- **ProjectId**: Prefixed UUID (`proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **ProjectName**: 1-255 characters, trimmed, required
- **FolderPath**: Must exist on filesystem, validated directory
- **ProjectNote**: Optional, max 1000 characters, trimmed, for project descriptions
- **CreatedAt**: UTC timestamp

### Business Rules (Domain Layer)

1. Project names must be unique and non-empty
2. Source folders must exist and be accessible
3. Project notes are optional but limited to 1000 characters when provided
4. All projects can be deleted (MVP - no constraints)
5. Projects displayed in creation order (newest first)

## Implementation Contracts

### Tauri Commands (Snake Case)

- `create_project(name: String, source_folder: String, note: Option<String>) -> Result<ProjectDto, AppError>`
- `list_projects() -> Result<Vec<ProjectDto>, AppError>`
- `delete_project(project_id: String) -> Result<(), AppError>`
- `open_project(project_id: String) -> Result<ProjectDto, AppError>`

### Error Handling

```rust
pub enum AppError {
    ValidationError { field: String, message: String },
    FileSystemError { message: String },
    DatabaseError { message: String },
    NotFound { resource: String, id: String },
}

// New validation cases include:
// - "Project note too long (max 1000 characters)" for note field
```

## Database Schema

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL,  -- ProjectId
  name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
  source_folder TEXT NOT NULL,
  note TEXT CHECK(length(note) <= 1000), -- Optional project description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## UI Components Needed

1. **ProjectListPage**: Main page showing projects table with note column
2. **CreateProjectForm**: Form with name input + folder picker + optional note textarea
3. **ProjectRow**: Individual project display with name, folder, note, and Open/Delete actions
4. **DeleteConfirmDialog**: Confirmation modal for deletion
5. **FolderPicker**: Native dialog integration component

## State Management Pattern

```typescript
interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<void>; // Now includes optional note
  deleteProject: (id: string) => Promise<void>;
  clearError: () => void;
}

interface CreateProjectData {
  name: string;
  sourceFolder: string;
  note?: string; // Optional field
}
```

## File Locations

- **Spec**: `specs/003-project-list-see/spec.md`
- **Design**: `specs/003-project-list-see/data-model.md`
- **Contracts**: `specs/003-project-list-see/contracts/`
- **Tests**: `specs/003-project-list-see/quickstart.md`

## Implementation Priority

1. Domain entities and value objects (Rust + TypeScript)
2. Repository interface and SQLite implementation
3. Tauri commands with error handling
4. UI components and Zustand store
5. Form validation and folder picker integration
6. Testing and validation

## Constitutional Compliance Checklist

-  Domain layer has zero infrastructure dependencies
-  Prefixed UUIDs for all domain identifiers
-  TypeScript strict mode compilation required
-  Repository pattern isolates database access
-  Error handling follows structured pattern

## Recent Changes

- Created feature specification with 13 functional requirements (added note field - FR-013)
- Updated domain model to include optional ProjectNote value object (max 1000 chars)
- Enhanced API contracts to include note field in create_project command and all DTOs
- Updated database schema to include note column with length constraint
- Extended quickstart test scenarios to cover note field validation and display
- Added note field validation error handling (NoteTooLong error type)

**Last Updated**: 2025-09-24
