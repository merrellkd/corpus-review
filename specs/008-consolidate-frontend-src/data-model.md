# Data Model: Project Workspace Component Consolidation

## Component Entities

### ProjectWorkspace Component
**Purpose**: React component managing project workspace UI layout and interaction
**Location**: `frontend/src/features/project/components/ProjectWorkspace.tsx`
**Properties**:
- `projectId: string` - Identifier for the current project
- `onBackToProjects?: () => void` - Optional callback for navigation

**Dependencies**:
- Workspace store (from shared stores)
- UI panel state (from shared stores)
- Feature-specific components (TopToolbar, FilesCategoriesPanel, SearchPanel, DocumentWorkspace)

### Simplified Types Structure
**Purpose**: Flattened type definitions removing DDD complexity
**Location**: `frontend/src/features/project/types/`

#### Project Types (`project-types.ts`)
```typescript
// Flattened from domain/aggregates/project.ts
export interface Project {
  id: string;
  name: string;
  source_folder: string;
  source_folder_name: string;
  note: string;
  note_preview: string;
  note_line_count: number;
  created_at: string;
  is_accessible: boolean;
}

// Simplified metadata interface
export interface ProjectMetadata {
  id: string;
  name: string;
  sourceFolderPath: string;
  notePreview?: string;
  createdAt: string;
}
```

#### Workspace Types (`workspace-types.ts`)
```typescript
// Flattened from domain/value-objects/
export interface WorkspaceProps {
  projectId: string;
  onBackToProjects?: () => void;
}

export interface WorkspaceLayout {
  explorer_width: number;
  workspace_width: number;
}
```

### Feature Index Structure
**Purpose**: Clean exports for feature consumption
**Location**: `frontend/src/features/project/index.ts`

```typescript
// Re-export main component
export { ProjectWorkspace } from './components/ProjectWorkspace';

// Re-export types
export type { Project, ProjectMetadata } from './types/project-types';
export type { WorkspaceProps, WorkspaceLayout } from './types/workspace-types';
```

### Temporary Compatibility Layer
**Purpose**: Backward compatibility during transition
**Location**: `frontend/src/components/ProjectWorkspace.tsx`

```typescript
// Temporary re-export with deprecation warning
export { ProjectWorkspace } from '../features/project';
// Note: Consider adding deprecation warning in development mode
```

## Relationships

- **ProjectWorkspace** imports types from `./types/`
- **Feature index** exports component and types
- **Compatibility layer** re-exports from feature
- **External components** can import from either location during transition

## State Transitions

1. **Before**: Component in global location with complex DDD types
2. **During**: Component in feature location + compatibility re-export
3. **After**: Component only in feature location, compatibility layer removed

## Validation Rules

- Component props interface must remain unchanged
- All existing functionality must be preserved
- Import compatibility must be maintained during transition
- Types must compile in strict TypeScript mode