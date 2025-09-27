# Data Model: Unify Store Pattern

## Store Architecture Model

### Store Categories

#### Feature-Specific Stores
**Definition**: Stores that serve a single feature's state management needs

```typescript
interface FeatureStore<T> {
  // Feature-specific state
  state: T;
  // Feature-specific actions
  actions: Record<string, Function>;
  // Feature-specific selectors
  selectors?: Record<string, Function>;
}
```

**Examples**:
- **Project Store**: Located at `/stores/project/project-store.ts`
  - State: project list, current project, CRUD operations
  - Scope: project-management feature only

#### Cross-Feature Stores
**Definition**: Stores that serve multiple features or global application concerns

```typescript
interface GlobalStore<T> {
  // Cross-feature state
  state: T;
  // Global actions affecting multiple features
  actions: Record<string, Function>;
  // Cross-feature selectors
  selectors?: Record<string, Function>;
}
```

**Examples**:
- **UI Store**: Located at `/stores/ui/ui-store.ts`
  - State: panel layouts, navigation state, global UI concerns
  - Scope: Multiple features (project-management, document-workspace, workspace-navigation)

- **Workspace Store**: Located at `/stores/workspace/workspace-store.ts`
  - State: file navigation, directory listings, workspace context
  - Scope: Multiple features (document-workspace, workspace-navigation)

### Store Organization Structure

```
frontend/src/stores/
├── project/
│   ├── project-store.ts           # Main project state management
│   ├── project-store-types.ts     # Project store type definitions
│   └── index.ts                   # Re-exports for clean imports
├── workspace/
│   ├── workspace-store.ts          # File navigation and workspace context
│   ├── workspace-store-types.ts   # Workspace store type definitions
│   └── index.ts                   # Re-exports for clean imports
├── ui/
│   ├── panel-store.ts             # Panel state management (consolidated)
│   ├── ui-store-types.ts          # UI store type definitions
│   └── index.ts                   # Re-exports for clean imports
├── shared/
│   ├── file-categorization-store.ts  # File organization features
│   └── index.ts                   # Re-exports for clean imports
└── index.ts                       # Global store exports
```

### Store Relationships

#### Dependencies
- **Project Store** → Independent (no dependencies on other stores)
- **Workspace Store** → Independent (no dependencies on other stores)
- **UI Store** → May subscribe to Project/Workspace stores for layout decisions
- **File Categorization Store** → May reference Workspace store for file context

#### Communication Patterns
```typescript
// Cross-store communication via selectors
const useProjectWorkspaceState = () => {
  const currentProject = useProjectStore(state => state.currentProject);
  const workspaceContext = useWorkspaceStore(state => state.workspaceContext);

  return { currentProject, workspaceContext };
};
```

## Migration Model

### Store Classification Rules

```typescript
interface StoreMigrationRule {
  sourceLocation: string;
  targetLocation: string;
  category: 'feature-specific' | 'cross-feature' | 'duplicate';
  action: 'move' | 'consolidate' | 'eliminate';
}

const migrationRules: StoreMigrationRule[] = [
  {
    sourceLocation: 'features/project-management/store.ts',
    targetLocation: 'stores/project/project-store.ts',
    category: 'feature-specific',
    action: 'move'
  },
  {
    sourceLocation: 'stores/workspaceStore.ts',
    targetLocation: 'stores/workspace/workspace-store.ts',
    category: 'cross-feature',
    action: 'move'
  },
  {
    sourceLocation: 'domains/workspace/ui/stores/workspace-store.ts',
    targetLocation: 'stores/workspace/workspace-store.ts',
    category: 'duplicate',
    action: 'consolidate'
  },
  {
    sourceLocation: 'stores/panelStateMachine.ts',
    targetLocation: 'stores/ui/panel-store.ts',
    category: 'cross-feature',
    action: 'consolidate'
  },
  {
    sourceLocation: 'stores/unifiedPanelState.ts',
    targetLocation: 'stores/ui/panel-store.ts',
    category: 'duplicate',
    action: 'eliminate'
  }
];
```

### Import Path Transformations

```typescript
interface ImportTransformation {
  from: string;
  to: string;
  affectedFiles: string[];
}

const importTransformations: ImportTransformation[] = [
  {
    from: "features/project-management/store",
    to: "stores/project",
    affectedFiles: ["App.tsx", "features/project-management/components/*"]
  },
  {
    from: "stores/workspaceStore",
    to: "stores/workspace",
    affectedFiles: ["components/*", "features/document-workspace/*"]
  },
  {
    from: "domains/workspace/ui/stores/workspace-store",
    to: "stores/workspace",
    affectedFiles: ["features/document-workspace/*", "shared/*"]
  }
];
```

## Validation Rules

### Store Naming Conventions
- File names: `{feature}-store.ts` (kebab-case)
- Export names: `use{Feature}Store` (PascalCase)
- Type names: `{Feature}Store`, `{Feature}State`, `{Feature}Actions`

### Store Interface Compliance
```typescript
interface StoreCompliance {
  hasTypedState: boolean;
  hasTypedActions: boolean;
  hasExportedSelectors: boolean;
  followsNamingConvention: boolean;
  hasCleanImports: boolean;
}
```

### Cross-Store Dependencies
- No circular dependencies between stores
- Cross-store access only via selectors, not direct state access
- Global stores may reference feature stores, but not vice versa