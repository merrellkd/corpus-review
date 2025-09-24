# Tauri Command Contracts

## create_project

**Purpose**: Create a new project with validation

**Command**:
```rust
#[tauri::command]
async fn create_project(
    name: String,
    source_folder: String,
    note: Option<String>,
    state: tauri::State<'_, AppState>
) -> Result<ProjectDto, AppError>
```

**Request Schema**:
```json
{
  "name": "string (required, 1-255 chars)",
  "source_folder": "string (required, valid directory path)",
  "note": "string (optional, max 1000 chars)"
}
```

**Success Response**:
```json
{
  "id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "My Project",
  "source_folder": "/path/to/source",
  "note": "Optional project description",
  "created_at": "2025-09-24T10:30:00Z"
}
```

**Error Responses**:
```json
// Validation Error
{
  "type": "ValidationError",
  "field": "name",
  "message": "Project name is required"
}

// File System Error
{
  "type": "FileSystemError",
  "message": "Source folder not found: /invalid/path"
}

// Duplicate Name Error
{
  "type": "ValidationError",
  "field": "name",
  "message": "A project with name 'My Project' already exists"
}

// Note Too Long Error
{
  "type": "ValidationError",
  "field": "note",
  "message": "Project note too long (max 1000 characters)"
}
```

**TypeScript Usage**:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke<ProjectDto>('create_project', {
  name: 'My Project',
  source_folder: '/path/to/source',
  note: 'Optional project description'
});
```

---

## list_projects

**Purpose**: Retrieve all projects ordered by creation date (newest first)

**Command**:
```rust
#[tauri::command]
async fn list_projects(
    state: tauri::State<'_, AppState>
) -> Result<Vec<ProjectDto>, AppError>
```

**Request**: No parameters

**Success Response**:
```json
[
  {
    "id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "name": "Project A",
    "source_folder": "/path/to/source/a",
    "note": "Research project for Q4 analysis",
    "created_at": "2025-09-24T10:30:00Z"
  },
  {
    "id": "proj_yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "name": "Project B",
    "source_folder": "/path/to/source/b",
    "note": null,
    "created_at": "2025-09-23T15:20:00Z"
  }
]
```

**Error Responses**:
```json
// Database Error
{
  "type": "DatabaseError",
  "message": "Failed to load projects from database"
}
```

**TypeScript Usage**:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const projects = await invoke<ProjectDto[]>('list_projects');
```

---

## delete_project

**Purpose**: Delete a project by ID

**Command**:
```rust
#[tauri::command]
async fn delete_project(
    project_id: String,
    state: tauri::State<'_, AppState>
) -> Result<(), AppError>
```

**Request Schema**:
```json
{
  "project_id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Success Response**: Empty (HTTP 204 equivalent)

**Error Responses**:
```json
// Not Found Error
{
  "type": "NotFound",
  "resource": "project",
  "id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "message": "Project not found"
}

// Database Error
{
  "type": "DatabaseError",
  "message": "Failed to delete project from database"
}
```

**TypeScript Usage**:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

await invoke<void>('delete_project', {
  project_id: 'proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
});
```

---

## open_project

**Purpose**: Open/navigate to a project workspace (MVP: returns project info)

**Command**:
```rust
#[tauri::command]
async fn open_project(
    project_id: String,
    state: tauri::State<'_, AppState>
) -> Result<ProjectDto, AppError>
```

**Request Schema**:
```json
{
  "project_id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Success Response**:
```json
{
  "id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "My Project",
  "source_folder": "/path/to/source",
  "note": "Optional project description",
  "created_at": "2025-09-24T10:30:00Z"
}
```

**Error Responses**:
```json
// Not Found Error
{
  "type": "NotFound",
  "resource": "project",
  "id": "proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "message": "Project not found"
}

// File System Error (if source folder no longer exists)
{
  "type": "FileSystemError",
  "message": "Project source folder no longer accessible: /path/to/source"
}
```

**TypeScript Usage**:
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const project = await invoke<ProjectDto>('open_project', {
  project_id: 'proj_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
});

// MVP: Just returns project info
// Future: Will navigate to project workspace
```

---

## Error Types Reference

### AppError Enum
```rust
#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum AppError {
    ValidationError { field: String, message: String },
    FileSystemError { message: String },
    DatabaseError { message: String },
    NotFound { resource: String, id: String, message: String },
}
```

### TypeScript Error Interface
```typescript
export interface AppError {
  type: 'ValidationError' | 'FileSystemError' | 'DatabaseError' | 'NotFound';
  message: string;
  field?: string;
  resource?: string;
  id?: string;
}
```

### Error Handling Pattern
```typescript
try {
  const result = await invoke<ProjectDto>('create_project', data);
  return result;
} catch (error) {
  const appError = error as AppError;

  switch (appError.type) {
    case 'ValidationError':
      // Show field-specific error
      setFieldError(appError.field, appError.message);
      break;

    case 'FileSystemError':
      // Show folder selection error
      setGeneralError('Please select a valid folder');
      break;

    case 'DatabaseError':
      // Show general error
      setGeneralError('Unable to save project. Please try again.');
      break;

    default:
      setGeneralError('An unexpected error occurred');
  }
}
```