# Component Interface Contract: ProjectWorkspace

## Component Signature

```typescript
interface ProjectWorkspaceProps {
  projectId: string;
  onBackToProjects?: () => void;
}

declare const ProjectWorkspace: React.FC<ProjectWorkspaceProps>;
```

## Import Contracts

### New Import Path (Target)
```typescript
import { ProjectWorkspace } from '@/features/project';
// or relative: import { ProjectWorkspace } from '../features/project';
```

### Legacy Import Path (Backward Compatible)
```typescript
import { ProjectWorkspace } from '@/components/ProjectWorkspace';
// or relative: import { ProjectWorkspace } from '../components/ProjectWorkspace';
```

## Behavioral Contract

### Required Behaviors
1. **Project Loading**: Must load project data when `projectId` changes
2. **Layout Management**: Must manage resizable panel layout
3. **Navigation**: Must call `onBackToProjects` when back button clicked
4. **State Management**: Must integrate with existing workspace store
5. **Error Handling**: Must display error states when project fails to load

### UI Contract
1. **Loading State**: Must show loading spinner during project initialization
2. **Error State**: Must show error message on load failure
3. **Header**: Must display project name and back navigation
4. **Panels**: Must support resizable panel layout with proper handles
5. **Responsive**: Must adapt to container size changes

### Store Integration Contract
```typescript
// Must use existing workspace store
const {
  currentProject,
  workspaceLayout,
  isLoading,
  error,
  loadWorkspace,
  updateLayout,
} = useWorkspaceStore();
```

## Type Exports Contract

### Required Type Exports
```typescript
export type { ProjectWorkspaceProps } from './types/workspace-types';
export type { Project } from './types/project-types';
```

## Test Contract

### Component Testing Requirements
1. **Props Validation**: Must render with required `projectId`
2. **Navigation**: Must call `onBackToProjects` when back button clicked
3. **Loading States**: Must show loading indicator during data fetch
4. **Error States**: Must display error message on failure
5. **Panel Resize**: Must update layout state on panel resize

### Import Testing Requirements
1. **New Path**: Must import successfully from feature folder
2. **Legacy Path**: Must import successfully from compatibility layer
3. **Type Imports**: Must import types from feature exports