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

### PanelVisibilityState
**Purpose**: Tracks mutually exclusive panel visibility and section states

**Attributes**:
- `activePanel: ActivePanelType` (None | FilesCategoriesPanel | SearchPanel)
- `fileExplorerSectionVisible: boolean` (within Files & Categories panel)
- `categoryExplorerSectionVisible: boolean` (within Files & Categories panel)
- `documentWorkspaceVisible: boolean` (always true)

**Business Rules**:
- Only one main panel can be active at a time (mutually exclusive)
- Files & Categories panel automatically hides when both sections are hidden
- Search panel operates independently of section visibility
- Document workspace cannot be hidden
- When no panels active, MDW expands to full width
- Panel and section visibility persisted per project

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

### ActivePanelType
- Enumeration: None | FilesCategoriesPanel | SearchPanel
- Represents the current active panel in mutually exclusive system
- Drives layout calculations and UI state

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

## State Transitions

### Mutually Exclusive Panel Switching
```
None → Files & Categories Toggle → FilesCategoriesPanel Active → Layout Recalculation → Persist State
None → Search Toggle → SearchPanel Active → Layout Recalculation → Persist State
FilesCategoriesPanel → Search Toggle → SearchPanel Active → Panel Switch → Persist State
SearchPanel → Files & Categories Toggle → FilesCategoriesPanel Active → Panel Switch → Persist State
Any Panel → Same Panel Toggle → None → MDW Full Width → Persist State
```

### Files & Categories Section Management
```
Files & Categories Panel Active → Section Toggle → Section Show/Hide → Auto Panel Hide Check → Persist State
Both Sections Hidden → Auto Hide Panel → None Active → MDW Full Width → Persist State
Both Sections Visible → Enable Drag-Drop → File Categorization Available
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