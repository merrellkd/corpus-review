# Research: Project List Management (MVP)

## SQLite Schema Design for Projects Table

**Decision**: Single `projects` table with auto-incrementing ID and prefixed UUID
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL, -- proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
  source_folder TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_projects_uuid ON projects(uuid);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
```

**Rationale**:
- Auto-incrementing ID for database efficiency
- Prefixed UUID for type-safe domain identifiers
- Built-in constraints for validation
- Index on creation date for default sorting

**Alternatives considered**:
- Pure UUID primary key (less efficient for SQLite)
- Composite keys (unnecessary complexity for MVP)

## Tauri Command Patterns for CRUD Operations

**Decision**: Snake_case commands with DTOs and Result<T, AppError> pattern
```rust
#[tauri::command]
async fn create_project(
    name: String,
    source_folder: String,
    state: tauri::State<'_, AppState>
) -> Result<ProjectDto, AppError>

#[tauri::command]
async fn list_projects(
    state: tauri::State<'_, AppState>
) -> Result<Vec<ProjectDto>, AppError>

#[tauri::command]
async fn delete_project(
    project_id: String,
    state: tauri::State<'_, AppState>
) -> Result<(), AppError>

#[tauri::command]
async fn open_project(
    project_id: String,
    state: tauri::State<'_, AppState>
) -> Result<ProjectDto, AppError>
```

**Rationale**:
- Consistent error handling with Result type
- DTOs for serialization boundary
- State injection for repository access
- Snake_case follows Rust conventions

**Alternatives considered**:
- Direct database access in commands (violates DDD)
- Synchronous commands (blocks UI thread)

## React Folder Picker Component Implementation

**Decision**: Native Tauri dialog API with validation
```typescript
import { open } from '@tauri-apps/api/dialog';

const selectFolder = async (): Promise<string | null> => {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select Project Source Folder'
  });

  return typeof selected === 'string' ? selected : null;
};
```

**Rationale**:
- Native OS dialog integration
- Consistent user experience across platforms
- Built-in folder validation
- No additional dependencies required

**Alternatives considered**:
- HTML5 file input (limited folder support)
- Custom file explorer component (unnecessary complexity)

## Zustand Store Patterns for Project Management

**Decision**: Single project store with async actions and optimistic updates
```typescript
interface ProjectStore {
  projects: Project[];
  isLoading: boolean;
  error: string | null;

  loadProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  clearError: () => void;
}
```

**Rationale**:
- Simple state structure for MVP
- Optimistic updates for better UX
- Error state management included
- Actions return promises for UI feedback

**Alternatives considered**:
- Multiple stores per domain (over-engineering for MVP)
- Redux Toolkit (additional complexity)

## Form Validation Patterns for Project Creation

**Decision**: Zod schema validation with react-hook-form
```typescript
const createProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(255, 'Project name too long'),
  source_folder: z.string()
    .min(1, 'Source folder is required')
});
```

**Rationale**:
- Type-safe validation schemas
- Reusable validation logic
- Good integration with react-hook-form
- Runtime type checking

**Alternatives considered**:
- Custom validation functions (more code to maintain)
- Yup (less TypeScript integration)

## Error Handling Patterns Across Tauri/React Boundary

**Decision**: Structured error types with user-friendly messages
```rust
#[derive(Debug, Serialize)]
pub enum AppError {
    ValidationError { field: String, message: String },
    FileSystemError { message: String },
    DatabaseError { message: String },
    NotFound { resource: String, id: String },
}
```

```typescript
interface ApiError {
  type: 'ValidationError' | 'FileSystemError' | 'DatabaseError' | 'NotFound';
  message: string;
  field?: string;
  resource?: string;
  id?: string;
}
```

**Rationale**:
- Structured error information for UI
- Type-safe error handling in TypeScript
- User-friendly error messages
- Consistent error format across commands

**Alternatives considered**:
- String error messages only (less structured)
- HTTP status codes (doesn't apply to Tauri commands)

## Technology Stack Integration

**Decision**: Tauri + React + TypeScript + SQLite + SQLX + Zustand
- **Tauri**: Cross-platform desktop with Rust backend
- **React**: Component-based UI framework
- **TypeScript**: Type safety across frontend
- **SQLite**: Embedded database for persistence
- **SQLX**: Compile-time verified SQL queries
- **Zustand**: Lightweight state management

**Rationale**:
- Consistent with existing project architecture
- Type safety across full stack
- Minimal dependencies for MVP
- Good performance characteristics

**Alternatives considered**:
- Electron (larger bundle size, security concerns)
- Tauri + Svelte (less ecosystem support)
- Native desktop apps (platform-specific development)