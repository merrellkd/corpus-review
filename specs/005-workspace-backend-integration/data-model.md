# Data Model: Workspace Backend Integration

## Domain Architecture

This integration maintains the existing Domain-Driven Design architecture while bridging the rich UI with real file system operations.

## Core Entities

### Project (Enhanced)
**Purpose**: Existing project entity with verified file system integration
**Location**: `src/domains/project/`

```typescript
interface Project {
  id: ProjectId           // Existing prefixed UUID
  name: ProjectName       // Existing validated name
  sourceFolder: FolderPath // ENHANCED: Must be real, accessible directory
  note?: ProjectNote      // Existing optional note
  createdAt: CreatedAt    // Existing timestamp

  // New method for workspace integration
  openWorkspace(): Promise<WorkspaceContext>
}
```

**Key Changes**:
- `sourceFolder` must be validated as existing, accessible directory
- New `openWorkspace()` method bridges to file system operations

### WorkspaceContext (New Integration Entity)
**Purpose**: Bridge between project data and real file system operations
**Location**: `src/domains/workspace/entities/workspace-context.ts`

```typescript
interface WorkspaceContext {
  projectId: string
  projectName: string
  sourceFolder: string
  currentPath: string
  directoryListing: DirectoryListing
  navigationHistory: NavigationEntry[]

  // Navigation methods using real file system
  navigateToFolder(folderName: string): Promise<WorkspaceContext>
  navigateToParent(): Promise<WorkspaceContext>
  navigateToPath(path: string): Promise<WorkspaceContext>
  refreshListing(): Promise<WorkspaceContext>
}
```

### FileSystemItem (Enhanced from 001)
**Purpose**: Represents real files and directories with actual metadata
**Location**: `src/domains/workspace/entities/file-system-item.ts`

```typescript
interface FileSystemItem {
  name: string
  path: string           // Actual file system path
  type: 'file' | 'directory'
  size?: number          // Real file size in bytes
  modifiedAt: Date       // Actual modification timestamp
  isAccessible: boolean  // Real accessibility check

  // Enhanced metadata from real file system
  extension?: string
  permissions: FilePermissions
}
```

**Key Enhancement**: All properties now reflect real file system data, not mock values.

## Value Objects

### DirectoryListing (Enhanced)
**Purpose**: Real directory contents with navigation capabilities
**Location**: `src/domains/workspace/value-objects/directory-listing.ts`

```typescript
interface DirectoryListing {
  entries: FileSystemItem[]    // Real files and folders
  currentPath: string          // Actual directory path
  canNavigateUp: boolean       // Based on source folder boundaries
  parentPath?: string          // Real parent directory
  totalItems: number           // Actual count

  // Navigation helpers
  getSubdirectories(): FileSystemItem[]
  getFiles(): FileSystemItem[]
  sortByType(): FileSystemItem[]
}
```

### NavigationEntry (New)
**Purpose**: Track navigation history for breadcrumbs and back/forward
**Location**: `src/domains/workspace/value-objects/navigation-entry.ts`

```typescript
interface NavigationEntry {
  path: string
  timestamp: Date
  displayName: string
}
```

## State Management Integration

### Enhanced WorkspaceStore
**Purpose**: Bridge rich UI state with real file system operations
**Location**: `src/stores/workspaceStore.ts`

```typescript
interface WorkspaceStore {
  // Existing UI state (preserved)
  currentProject: Project | null
  workspaceLayout: WorkspaceLayout | null
  isLoading: boolean
  error: string | null

  // Enhanced with real data
  fileExplorerItems: FileSystemItem[]     // Real files, not mock
  currentPath: string                     // Actual directory path
  navigationHistory: NavigationEntry[]    // Real navigation tracking

  // Enhanced actions using Tauri commands
  loadProject: (projectId: string) => Promise<void>        // Uses real backend
  navigateToFolder: (folderName: string) => Promise<void>  // Real navigation
  refreshFiles: () => Promise<void>                        // Real file refresh

  // Existing UI actions (preserved)
  updatePanelSizes: (panelType: string, width: number) => void
  togglePanelVisibility: (panelType: string) => void
}
```

**Key Integration Points**:
- `loadProject` now calls `open_workspace_navigation` Tauri command
- `navigateToFolder` uses `navigate_to_folder` Tauri command
- `fileExplorerItems` populated with real file system data
- All existing panel management preserved unchanged

## Integration Architecture

### Data Flow
```
Project Selection → WorkspaceContext → Tauri Commands → Real File System
     ↓                    ↓                ↓              ↓
UI Components ← Enhanced Store ← Backend Response ← Directory Listing
```

### Component Integration
- **FilesCategoriesPanel**: Consumes real `fileExplorerItems` from store
- **TopToolbar**: Unchanged, continues to manage panel visibility
- **ProjectWorkspace**: Enhanced to handle real loading states
- **DocumentWorkspace**: Preserved for future multi-document features

## Backend Command Integration

### Tauri Command Mapping
```typescript
// Store method → Tauri command
loadProject(projectId)           → open_workspace_navigation(projectId, projectName, sourceFolder)
navigateToFolder(folderName)     → navigate_to_folder(..., folderName)
navigateToParent()               → navigate_to_parent(...)
refreshFiles()                   → list_directory(...)
```

### Error Handling
- **File System Errors**: Wrapped in user-friendly messages
- **Permission Issues**: Graceful fallbacks with error displays
- **Network/DB Errors**: Existing project loading error handling enhanced

## Backwards Compatibility

### Preserved Interfaces
- All existing UI component props remain unchanged
- Panel state management interfaces preserved
- Workspace layout persistence format maintained
- Document Caddy interfaces kept for future use

### Enhanced Capabilities
- Mock data replaced with real file system data
- File navigation actually works with real directories
- Error states reflect actual file system issues
- Performance optimized for real file operations

---

*This data model preserves all existing rich UI investments while adding real file system integration through proven backend commands.*