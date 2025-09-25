# Tauri Commands: Workspace Navigation

**Feature**: Project Workspace Navigation (MVP - Iteration 1)
**Date**: 2025-09-25

## Command Specifications

### open_workspace
Opens a project workspace and loads initial directory listing.

**Signature**:
```rust
#[tauri::command]
async fn open_workspace(
    project_id: String,
    state: State<'_, AppState>
) -> Result<WorkspaceDto, AppError>
```

**Request**:
- `project_id` (String): Prefixed UUID of project to open

**Response** (Success):
```json
{
  "projectId": "proj_12345678-1234-1234-1234-123456789abc",
  "projectName": "My Research Project",
  "sourceFolder": "/Users/user/Documents/research",
  "currentPath": "/Users/user/Documents/research",
  "directoryListing": {
    "entries": [
      {
        "name": "subfolder",
        "path": "/Users/user/Documents/research/subfolder",
        "entryType": "directory",
        "size": null,
        "modified": "2025-09-25T10:30:00Z"
      },
      {
        "name": "document.pdf",
        "path": "/Users/user/Documents/research/document.pdf",
        "entryType": "file",
        "size": 1234567,
        "modified": "2025-09-24T15:45:30Z"
      }
    ],
    "isRoot": true,
    "parentPath": null,
    "canNavigateUp": false
  }
}
```

**Error Responses**:
- `NotFound`: Project with given ID not found
- `FileSystemError`: Source folder inaccessible, moved, or deleted
- `ValidationError`: Invalid project ID format

### list_directory
Lists contents of a specific directory within the workspace.

**Signature**:
```rust
#[tauri::command]
async fn list_directory(
    workspace_project_id: String,
    directory_path: String,
    state: State<'_, AppState>
) -> Result<DirectoryListingDto, AppError>
```

**Request**:
- `workspace_project_id` (String): Project ID for workspace context
- `directory_path` (String): Path to directory to list (must be within source folder)

**Response** (Success):
```json
{
  "entries": [
    {
      "name": "nested_folder",
      "path": "/Users/user/Documents/research/subfolder/nested_folder",
      "entryType": "directory",
      "size": null,
      "modified": "2025-09-20T12:00:00Z"
    },
    {
      "name": "data.csv",
      "path": "/Users/user/Documents/research/subfolder/data.csv",
      "entryType": "file",
      "size": 45678,
      "modified": "2025-09-23T09:15:45Z"
    }
  ],
  "isRoot": false,
  "parentPath": "/Users/user/Documents/research",
  "canNavigateUp": true
}
```

**Error Responses**:
- `ValidationError`: Path outside workspace source folder boundary
- `FileSystemError`: Directory not found or access denied
- `NotFound`: Workspace project not found

### navigate_to_folder
Navigates to a specific folder within the workspace and returns its contents.

**Signature**:
```rust
#[tauri::command]
async fn navigate_to_folder(
    workspace_project_id: String,
    folder_name: String,
    current_path: String,
    state: State<'_, AppState>
) -> Result<WorkspaceDto, AppError>
```

**Request**:
- `workspace_project_id` (String): Project ID for workspace context
- `folder_name` (String): Name of folder to navigate to
- `current_path` (String): Current directory path

**Response** (Success):
```json
{
  "projectId": "proj_12345678-1234-1234-1234-123456789abc",
  "projectName": "My Research Project",
  "sourceFolder": "/Users/user/Documents/research",
  "currentPath": "/Users/user/Documents/research/subfolder",
  "directoryListing": {
    "entries": [
      {
        "name": "nested_data",
        "path": "/Users/user/Documents/research/subfolder/nested_data",
        "entryType": "directory",
        "size": null,
        "modified": "2025-09-22T14:20:10Z"
      }
    ],
    "isRoot": false,
    "parentPath": "/Users/user/Documents/research",
    "canNavigateUp": true
  }
}
```

**Error Responses**:
- `ValidationError`: Folder name contains invalid characters or path traversal
- `FileSystemError`: Folder not found or access denied
- `ValidationError`: Navigation would exceed workspace boundary

### navigate_to_parent
Navigates up one level in the directory hierarchy.

**Signature**:
```rust
#[tauri::command]
async fn navigate_to_parent(
    workspace_project_id: String,
    current_path: String,
    state: State<'_, AppState>
) -> Result<WorkspaceDto, AppError>
```

**Request**:
- `workspace_project_id` (String): Project ID for workspace context
- `current_path` (String): Current directory path

**Response** (Success):
Same format as `navigate_to_folder` but with parent directory contents.

**Error Responses**:
- `ValidationError`: Already at workspace root, cannot navigate up
- `FileSystemError`: Parent directory access denied
- `NotFound`: Workspace project not found

## Error Response Format
All commands return errors in the standard AppError format:

```json
{
  "ValidationError": {
    "field": "project_id",
    "message": "Invalid project ID format"
  }
}
```

```json
{
  "FileSystemError": {
    "message": "The source folder for this project could not be found. It may have been moved or deleted."
  }
}
```

```json
{
  "NotFound": {
    "resource": "Project",
    "id": "proj_invalid-id"
  }
}
```

## Performance Considerations

### Large Directory Handling
For directories with >100 files:
- Return first 100 entries with `hasMore: true` flag
- Implement pagination in future iteration if needed
- Display loading state in UI during directory reading

### File System Access Patterns
- Use async file system operations to avoid blocking
- Cache workspace context during session (in memory only)
- Validate paths on every operation for security

## Security Constraints

### Path Traversal Prevention
- All paths validated against workspace source folder boundary
- Reject paths containing `..`, absolute paths outside workspace
- Canonicalize paths before any file system operations

### File System Permissions
- Read-only access to workspace source folders
- No file modification, creation, or deletion operations
- Respect system file permissions and handle access denied gracefully

## Integration Notes

### Existing Command Integration
- Reuses existing `AppState` and error handling patterns
- Compatible with current database connection and project repository
- Follows established Tauri command naming convention (snake_case)

### Future Extension Points
- Commands designed for future file content analysis features
- File metadata structure supports additional properties
- Navigation state can be extended for advanced workspace features