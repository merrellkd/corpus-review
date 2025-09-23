# Data Model: Multi-Document Workspace Layout Management

**Feature**: 002-multi-document-workspace
**Date**: 2025-09-22
**Status**: Draft

## Domain Entities

### WorkspaceId (Value Object)
```typescript
class WorkspaceId {
  constructor(private readonly value: string) {
    // Format: mws_[uuid]
    if (!value.startsWith('mws_')) throw new Error('Invalid workspace ID format');
  }
}
```

### DocumentCaddyId (Value Object)
```typescript
class DocumentCaddyId {
  constructor(private readonly value: string) {
    // Format: doc_[uuid]
    if (!value.startsWith('doc_')) throw new Error('Invalid document caddy ID format');
  }
}
```

### LayoutModeType (Value Object)
```typescript
enum LayoutModeType {
  STACKED = 'stacked',
  GRID = 'grid',
  FREEFORM = 'freeform'
}
```

### Position (Value Object)
```typescript
class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (x < 0 || y < 0) throw new Error('Position coordinates must be non-negative');
  }
}
```

### Dimensions (Value Object)
```typescript
class Dimensions {
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    if (width <= 0 || height <= 0) throw new Error('Dimensions must be positive');
  }
}
```

### DocumentCaddy (Entity)
```typescript
class DocumentCaddy {
  constructor(
    public readonly id: DocumentCaddyId,
    public readonly documentPath: string,
    public readonly title: string,
    private position: Position,
    private dimensions: Dimensions,
    private isActive: boolean = false,
    private isVisible: boolean = true,
    private zIndex: number = 0
  ) {}

  // Business Logic
  public activate(): void
  public deactivate(): void
  public moveTo(position: Position): void
  public resize(dimensions: Dimensions): void
  public bringToFront(maxZIndex: number): void
  public hide(): void
  public show(): void

  // Validation Rules
  private validatePosition(position: Position, layoutMode: LayoutModeType): boolean
  private validateDimensions(dimensions: Dimensions, containerSize: Dimensions): boolean
}
```

### LayoutMode (Value Object with Strategy)
```typescript
abstract class LayoutMode {
  abstract readonly type: LayoutModeType;
  abstract arrangeDocuments(documents: DocumentCaddy[], containerSize: Dimensions): DocumentCaddy[];
  abstract validateDocumentPosition(document: DocumentCaddy, containerSize: Dimensions): boolean;
}

class StackedLayoutMode extends LayoutMode {
  readonly type = LayoutModeType.STACKED;
  // Arranges documents in a stack with tabs
}

class GridLayoutMode extends LayoutMode {
  readonly type = LayoutModeType.GRID;
  // Arranges documents in an even grid
}

class FreeformLayoutMode extends LayoutMode {
  readonly type = LayoutModeType.FREEFORM;
  // Preserves user-defined positions
}
```

### WorkspaceState (Value Object)
```typescript
class WorkspaceState {
  constructor(
    public readonly activeLayoutMode: LayoutMode,
    public readonly containerDimensions: Dimensions,
    public readonly activeDocumentId: DocumentCaddyId | null,
    public readonly lastModified: Date
  ) {}
}
```

### Workspace (Aggregate Root)
```typescript
class Workspace {
  constructor(
    public readonly id: WorkspaceId,
    private documents: Map<DocumentCaddyId, DocumentCaddy>,
    private state: WorkspaceState,
    private layoutHistory: LayoutModeType[] = []
  ) {}

  // Primary Commands
  public addDocument(documentPath: string, title: string): DocumentCaddyId
  public removeDocument(documentId: DocumentCaddyId): void
  public switchLayoutMode(layoutMode: LayoutModeType): void
  public activateDocument(documentId: DocumentCaddyId): void
  public moveDocument(documentId: DocumentCaddyId, position: Position): void
  public resizeDocument(documentId: DocumentCaddyId, dimensions: Dimensions): void
  public closeAllDocuments(): void

  // Queries
  public getActiveDocument(): DocumentCaddy | null
  public getAllDocuments(): DocumentCaddy[]
  public getDocumentById(id: DocumentCaddyId): DocumentCaddy | null
  public getCurrentLayoutMode(): LayoutModeType
  public isDocumentOpen(documentPath: string): boolean

  // Business Rules
  private enforceLayoutConstraints(): void
  private autoSwitchToFreeform(): void // When user manipulates in non-freeform mode
  private updateDocumentPositions(): void
  private validateWorkspaceState(): boolean

  // Domain Events
  public getUncommittedEvents(): DomainEvent[]
  public markEventsAsCommitted(): void
}
```

## Domain Events

### WorkspaceCreated
```typescript
class WorkspaceCreated extends DomainEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly createdAt: Date
  ) {}
}
```

### DocumentAddedToWorkspace
```typescript
class DocumentAddedToWorkspace extends DomainEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly documentId: DocumentCaddyId,
    public readonly documentPath: string,
    public readonly addedAt: Date
  ) {}
}
```

### LayoutModeChanged
```typescript
class LayoutModeChanged extends DomainEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly previousMode: LayoutModeType,
    public readonly newMode: LayoutModeType,
    public readonly triggeredBy: 'user' | 'system',
    public readonly changedAt: Date
  ) {}
}
```

### DocumentActivated
```typescript
class DocumentActivated extends DomainEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly documentId: DocumentCaddyId,
    public readonly activatedAt: Date
  ) {}
}
```

### DocumentPositionChanged
```typescript
class DocumentPositionChanged extends DomainEvent {
  constructor(
    public readonly workspaceId: WorkspaceId,
    public readonly documentId: DocumentCaddyId,
    public readonly oldPosition: Position,
    public readonly newPosition: Position,
    public readonly changedAt: Date
  ) {}
}
```

## Repository Interfaces

### IWorkspaceRepository
```typescript
interface IWorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  getById(id: WorkspaceId): Promise<Workspace | null>;
  getByName(name: string): Promise<Workspace | null>;
  delete(id: WorkspaceId): Promise<void>;
  list(): Promise<Workspace[]>;
}
```

### IWorkspaceStateRepository
```typescript
interface IWorkspaceStateRepository {
  saveState(workspaceId: WorkspaceId, state: WorkspaceState): Promise<void>;
  getState(workspaceId: WorkspaceId): Promise<WorkspaceState | null>;
  clearState(workspaceId: WorkspaceId): Promise<void>;
}
```

## State Transitions

### Layout Mode Transitions
```
STACKED → GRID: Rearrange documents in grid pattern
STACKED → FREEFORM: Preserve current active document position
GRID → STACKED: Activate first document, stack others
GRID → FREEFORM: Preserve grid positions as initial freeform positions
FREEFORM → STACKED: Activate most recently active document
FREEFORM → GRID: Calculate optimal grid arrangement

AUTO-TRANSITION TO FREEFORM:
- User drags document in STACKED mode → FREEFORM
- User resizes document in GRID mode → FREEFORM
```

### Document Lifecycle
```
CLOSED → OPEN: Add to workspace, position according to layout mode
OPEN → ACTIVE: Bring to front, highlight, focus
ACTIVE → INACTIVE: Remove highlight, maintain position
INACTIVE → CLOSED: Remove from workspace, cleanup resources
```

## Validation Rules

### Business Invariants
1. **One Active Document**: Maximum one document can be active at a time
2. **Valid Positions**: All documents must be within workspace boundaries
3. **Minimum Size**: Documents must maintain minimum readable dimensions
4. **Layout Consistency**: Document arrangements must follow active layout mode rules
5. **Unique Paths**: No duplicate document paths in same workspace
6. **Z-Index Order**: Active document must have highest z-index

### Layout Mode Constraints
- **Stacked**: Only active document visible, others stacked behind
- **Grid**: Documents arranged in calculated grid, equal cell sizes
- **Freeform**: User positions preserved, no automatic arrangement

---

**Status**: Design complete, ready for contract generation.