# Data Model: Project Workspace

**Feature**: Project Workspace
**Date**: 2025-09-19
**Status**: Phase 1 Complete

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
**Purpose**: Tracks which panels are currently visible

**Attributes**:
- `fileExplorerVisible: boolean`
- `categoryExplorerVisible: boolean`
- `searchPanelVisible: boolean`
- `documentWorkspaceVisible: boolean` (always true)

**Business Rules**:
- Document workspace cannot be hidden
- When all explorer panels hidden, MDW expands to full width
- Panel visibility persisted per project

### PanelDimensionState
**Purpose**: Stores panel size preferences in percentages

**Attributes**:
- `explorerWidth: number` (percentage of total width)
- `workspaceWidth: number` (calculated from explorer width)
- `panelHeights: Map<PanelType, number>`

**Business Rules**:
- Widths stored as percentages for responsive behavior
- Heights stored per panel type for flexible layouts
- Minimum/maximum constraints enforced during resize

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

## State Transitions

### Panel Visibility Changes
```
Hidden Panel → Toggle Action → Visible Panel → Layout Recalculation → Persist State
Visible Panel → Toggle Action → Hidden Panel → MDW Expansion → Persist State
```

### Document Opening
```
File Selection → Create DocumentCaddy → Add to MDW → Set Active → Render Content
```

### Layout Resizing
```
Drag Handle → Real-time Resize → Constraint Validation → State Update → Persist Dimensions
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