# Data Model: Project Workspace

**Feature**: Project Workspace (Updated for Mutually Exclusive Panel Architecture)
**Date**: 2025-09-20
**Status**: Phase 1 Complete - Updated for new specification

## Domain Entities

### WorkspaceLayout
**Purpose**: Manages the layout state and preferences for the workspace interface

**Attributes**:
- `id: WorkspaceLayoutId` (workspace_uuid format)
- `projectId: ProjectId`
- `panelStates: PanelVisibilityState`
- `panelSizes: PanelDimensionState`
- `lastModified: DateTime`

**Business Rules**:
- Panel sizes must maintain minimum widths (100px for explorers, 200px for MDW)
- At least one panel must remain visible at all times
- Panel size changes trigger persistence immediately
- Layout restoration occurs on workspace initialization

### PanelState (Updated - Unified State Machine)
**Purpose**: Unified state machine for panel and section management

**Attributes**:
- `currentState: PanelStateType` (none | files-only | categories-only | files-and-categories | search)
- `lastValidFilesCategories: LastValidState`
- `timestamp: DateTime`

**Business Rules**:
- Single source of truth for all panel/section state
- Eliminates coordination issues between panel and section layers
- Auto-close/restore behavior prevents dead states
- State transitions are atomic and consistent
- All state changes trigger immediate persistence

### LastValidState
**Purpose**: Remembers user's preferred Files & Categories configuration

**Attributes**:
- `fileExplorerVisible: boolean`
- `categoryExplorerVisible: boolean`

**Business Rules**:
- Default values: `{ fileExplorerVisible: true, categoryExplorerVisible: false }`
- Updated whenever Files & Categories panel is closed/switched
- Used to restore panel when Files & Categories button toggled on
- Persisted across sessions for user experience continuity

### PanelVisibilityState (Legacy - Deprecated)
**Purpose**: ~~Tracks mutually exclusive panel visibility and section states~~ *Replaced by unified PanelState*

**Migration Path**:
- Existing `activePanel` + `fileExplorerSectionVisible` + `categoryExplorerSectionVisible` → `currentState`
- Section visibility becomes implicit in state (files-only, categories-only, files-and-categories)
- Remove dual-layer state coordination logic

### PanelDimensionState
**Purpose**: Stores panel size preferences in percentages

**Attributes**:
- `filesCategoriesPanelWidth: number` (percentage of total width)
- `searchPanelWidth: number` (percentage of total width)
- `workspaceWidth: number` (calculated based on active panel)
- `fileExplorerSectionHeight: number` (within Files & Categories panel)
- `categoryExplorerSectionHeight: number` (within Files & Categories panel)

**Business Rules**:
- Widths stored as percentages for responsive behavior
- Section heights stored for Files & Categories panel layout
- Minimum/maximum constraints enforced during resize
- Different width preferences for each panel type

### FileSystemItem
**Purpose**: Represents files and folders in the file explorer

**Attributes**:
- `path: FilePath` (absolute system path)
- `name: string`
- `type: FileSystemItemType` (File | Directory)
- `parentPath: FilePath | null`
- `lastModified: DateTime`
- `size: number | null` (bytes, null for directories)
- `isAccessible: boolean`

**Business Rules**:
- Path must be within project's Source or Reports directories
- Inaccessible items show error state in explorer
- Directory items can contain child items
- File type determines icon and available actions

### DocumentCaddy
**Purpose**: Container for individual documents in the workspace

**Attributes**:
- `id: DocumentCaddyId` (doc_uuid format)
- `filePath: FilePath`
- `title: string`
- `isActive: boolean`
- `position: CaddyPosition`
- `dimensions: CaddyDimensions`
- `scrollPosition: number`

**Business Rules**:
- Only one caddy can be active at a time
- Position determines layout within MDW area
- Dimensions managed by react-resizable-panels
- Scroll position persisted for user experience

### Project
**Purpose**: Root entity containing workspace configuration

**Attributes**:
- `id: ProjectId` (project_uuid format)
- `name: string`
- `sourceFolderPath: FilePath`
- `reportsFolderPath: FilePath`
- `workspaceLayout: WorkspaceLayout`

**Business Rules**:
- Source and Reports folders must exist and be accessible
- Folder paths must be absolute and within user's accessible filesystem
- Project name must be unique within application

## Value Objects

### PanelStateType (Updated)
- Enumeration: none | files-only | categories-only | files-and-categories | search
- Unified state representing both panel and section visibility
- Drives layout calculations and UI state
- Eliminates need for separate section state tracking

### ActivePanelType (Legacy - Deprecated)
- ~~Enumeration: None | FilesCategoriesPanel | SearchPanel~~
- *Replaced by PanelStateType for unified state management*

### FilePath
- Absolute filesystem path string
- Validation ensures path exists and is accessible
- Normalized to prevent path traversal issues

### WorkspaceLayoutId, ProjectId, DocumentCaddyId
- Prefixed UUID format (workspace_, project_, doc_)
- Self-identifying for debugging and logging
- Immutable once created

### CaddyPosition, CaddyDimensions
- Layout coordinates and sizing for document containers
- Managed by react-resizable-panels state
- Serializable for persistence

### SectionVisibilityRules
- Business logic for Files & Categories panel section management
- Validates section combinations and automatic panel hiding
- Ensures drag-and-drop availability when both sections visible

## State Transitions (Updated - Unified State Machine)

### Primary State Transitions
```
none → Files & Categories Toggle → Restore to lastValidState → Layout Update → Persist
none → Search Toggle → search → Layout Update → Persist
search → Files & Categories Toggle → Restore to lastValidState → Layout Update → Persist
files-only|categories-only|files-and-categories → Search Toggle → Save lastValidState → search → Persist
any-files-state → Files & Categories Toggle → Save lastValidState → none → Persist
```

### Section State Transitions (Internal to Files & Categories)
```
files-only → Category Explorer Toggle → files-and-categories → Enable Drag-Drop → Persist
categories-only → File Explorer Toggle → files-and-categories → Enable Drag-Drop → Persist
files-and-categories → File Explorer Toggle → categories-only → Disable Drag-Drop → Persist
files-and-categories → Category Explorer Toggle → files-only → Disable Drag-Drop → Persist
files-only → File Explorer Toggle → Auto-close → none → Save lastValidState → Persist
categories-only → Category Explorer Toggle → Auto-close → none → Save lastValidState → Persist
```

### Auto-Close Prevention Logic
```
Current: files-only|categories-only → Last Section Toggle OFF → Check Auto-Close → Save State → none
Current: files-and-categories → One Section Toggle OFF → Continue → files-only|categories-only
```

### Document Opening
```
File Selection → Create DocumentCaddy → Add to MDW → Set Active → Render Content
```

### Layout Resizing
```
Drag Handle → Real-time Resize → Constraint Validation → State Update → Persist Dimensions
```

### Drag-and-Drop File Categorization
```
File Item Drag Start → Category Section Drop Target → File Path Transfer → Category Assignment → Update File State
```

## Repository Interfaces

### WorkspaceLayoutRepository
- `save(layout: WorkspaceLayout): Promise<void>`
- `findByProjectId(projectId: ProjectId): Promise<WorkspaceLayout | null>`
- `delete(layoutId: WorkspaceLayoutId): Promise<void>`

### FileSystemRepository
- `listItems(folderPath: FilePath): Promise<FileSystemItem[]>`
- `getItemMetadata(path: FilePath): Promise<FileSystemItem>`
- `watchFolder(path: FilePath): Observable<FileSystemEvent>`

### ProjectRepository
- `findById(id: ProjectId): Promise<Project | null>`
- `save(project: Project): Promise<void>`
- `list(): Promise<Project[]>`