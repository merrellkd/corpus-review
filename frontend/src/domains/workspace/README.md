# Multi-Document Workspace Layout Management

A comprehensive domain-driven design implementation for managing multi-document workspaces with flexible layout modes in a React + TypeScript + Tauri application.

## Architecture Overview

This domain follows **Domain-Driven Design (DDD)** principles with a clean architecture structure:

```
workspace/
├── domain/              # Core business logic
│   ├── aggregates/      # Aggregate roots (Workspace)
│   ├── entities/        # Entities (DocumentCaddy)
│   ├── value-objects/   # Value objects (Position, Dimensions, LayoutMode)
│   ├── events/          # Domain events
│   └── errors/          # Domain-specific errors
├── application/         # Application services and adapters
├── infrastructure/     # External concerns (persistence, Tauri)
└── ui/                 # User interface layer
    ├── components/     # React components
    ├── containers/     # Container components
    ├── hooks/          # Custom React hooks
    └── stores/         # State management (Zustand)
```

## Integration Architecture

**Note**: The Multi-Document Workspace functionality is integrated into the existing `DocumentWorkspace` component (`/src/components/DocumentWorkspace.tsx`) rather than creating a separate container component. This integration approach:

- **Leverages existing patterns**: Reuses established component architecture
- **Reduces duplication**: Avoids creating redundant container components
- **Maintains separation**: Domain logic remains cleanly separated in the workspace domain
- **Simplifies maintenance**: Single component to maintain for workspace functionality

The `DocumentWorkspace` component imports and orchestrates all workspace domain functionality while maintaining clean architectural boundaries.

## Core Concepts

### Layout Modes

The workspace supports three distinct layout modes:

- **STACKED**: Only active document visible (modal-style)
- **GRID**: Documents arranged in responsive grid layout
- **FREEFORM**: Documents freely positioned and resizable by user

### Auto-Freeform Switching

When users perform drag/resize operations in structured layouts (STACKED/GRID), the system automatically switches to FREEFORM mode to preserve user intent.

## Domain Layer

### Aggregates

#### Workspace
The main aggregate root that manages:
- Document collection and lifecycle
- Layout mode state and transitions
- Active document management
- Workspace-level invariants

```typescript
class Workspace {
  addDocument(filePath: string, title: string, position: Position, dimensions: Dimensions): DocumentCaddy
  removeDocument(documentId: DocumentCaddyId): void
  switchLayoutMode(layoutMode: LayoutMode): void
  activateDocument(documentId: DocumentCaddyId): void
  moveDocument(documentId: DocumentCaddyId, position: Position): void
  resizeDocument(documentId: DocumentCaddyId, dimensions: Dimensions): void
}
```

### Entities

#### DocumentCaddy
Represents a document container with state management:
- File path and title
- Position and dimensions
- Visibility and active state
- Error state and loading states

```typescript
class DocumentCaddy {
  getId(): DocumentCaddyId
  getFilePath(): string
  getTitle(): string
  getPosition(): Position
  getDimensions(): Dimensions
  isActiveCaddy(): boolean
  isVisible(): boolean
  getState(): DocumentCaddyState
  getErrorMessage(): string | undefined
}
```

### Value Objects

#### Position
Immutable coordinate representation:
```typescript
class Position {
  static fromCoordinates(x: number, y: number): Position
  getX(): number
  getY(): number
  toPoint(): { x: number; y: number }
  constrainToBounds(bounds: Size): Position
}
```

#### Dimensions
Immutable size representation:
```typescript
class Dimensions {
  static fromValues(width: number, height: number): Dimensions
  getWidth(): number
  getHeight(): number
  toSize(): { width: number; height: number }
  constrainToMaximum(max: Dimensions): Dimensions
}
```

#### LayoutMode
Layout strategy with pattern implementation:
```typescript
class LayoutMode {
  static stacked(): LayoutMode
  static grid(): LayoutMode
  static freeform(): LayoutMode
  calculateLayout(documents: DocumentLayoutInfo[], workspaceSize: Dimensions): DocumentLayoutResult[]
  supportsResizing(): boolean
  supportsDragging(): boolean
}
```

### Error Handling

Comprehensive domain-specific error types with user-friendly messages:

```typescript
// Workspace errors
WorkspaceNotFoundError
WorkspaceNameAlreadyExistsError
InvalidWorkspaceNameError

// Document errors
DocumentNotFoundError
DocumentPathNotFoundError
DocumentAlreadyOpenError
InvalidDocumentPathError

// Layout errors
InvalidLayoutModeError
InvalidPositionError
InvalidDimensionsError

// System errors
PermissionDeniedError
FileAccessError
PersistenceError
```

## Application Layer

### Services

#### WorkspaceService
Primary application service coordinating domain operations:
```typescript
class WorkspaceService {
  createWorkspace(name: string, layoutMode?: LayoutModeType): Promise<Workspace>
  loadWorkspace(workspaceId: WorkspaceId): Promise<Workspace>
  saveWorkspace(workspace: Workspace): Promise<void>
}
```

#### LayoutEngineService
Handles layout calculations and transitions:
```typescript
class LayoutEngineService {
  calculateLayout(layoutMode: LayoutMode, documents: DocumentCaddy[], workspaceSize: Dimensions): DocumentLayoutResult[]
  animateTransition(fromLayout: DocumentLayoutResult[], toLayout: DocumentLayoutResult[]): Promise<void>
}
```

#### DocumentCaddyService
Manages document-specific operations:
```typescript
class DocumentCaddyService {
  validateDocumentPath(filePath: string): Promise<boolean>
  extractDocumentMetadata(filePath: string): Promise<DocumentMetadata>
  handleDocumentError(error: unknown, documentId: DocumentCaddyId): void
}
```

### Adapters

#### TauriWorkspaceAdapter
Bridges application services with Tauri backend:
- Environment detection (Tauri vs mock)
- Error handling and transformation
- Command delegation to Rust backend

## Infrastructure Layer

### Persistence

#### LayoutPersistenceService
Handles workspace state persistence:
- Serialization/deserialization
- Auto-save functionality
- Backup and restoration
- Import/export capabilities

```typescript
class LayoutPersistenceService {
  saveLayout(workspace: Workspace): Promise<boolean>
  loadLayout(workspaceId: string): Promise<Workspace | null>
  startAutoSave(workspace: Workspace): void
  createBackup(workspace: Workspace): Promise<string | null>
}
```

## UI Layer

### Components

#### DocumentCaddy (`DocumentCaddy.tsx`)
Individual document container component:
- **Props**: Position, dimensions, state, callbacks
- **Features**: Drag/resize support, error display, title editing
- **States**: Loading, ready, error, minimized
- **Interactions**: Click to activate, drag to move, resize handles

```typescript
interface DocumentCaddyProps {
  id: string
  title: string
  filePath: string
  position: { x: number; y: number }
  dimensions: { width: number; height: number }
  isActive: boolean
  isDraggable: boolean
  isResizable: boolean
  onActivate: (id: string) => void
  onMove: (id: string, position: Position) => void
  onResize: (id: string, dimensions: Dimensions) => void
}
```

#### WorkspaceCommandBar (`WorkspaceCommandBar.tsx`)
Top-level workspace controls:
- **Features**: Layout mode switching, document management, workspace settings
- **Layout Buttons**: Stacked, Grid, Freeform mode toggles
- **Actions**: Add document, remove all, save workspace

#### LayoutModeButton (`LayoutModeButton.tsx`)
Individual layout mode toggle:
- **Props**: Layout mode, active state, click handler
- **Styles**: Icon + label, active/inactive states
- **Accessibility**: ARIA labels, keyboard navigation

#### ErrorFeedback (`ErrorFeedback.tsx`)
Error display and recovery system:
- **Components**: Main feedback, toast notifications, inline errors
- **Features**: Retry mechanisms, user-friendly messages, auto-dismiss
- **Variants**: Error severity levels (info, warning, error)

```typescript
interface ErrorFeedbackProps {
  error: unknown
  operation?: string
  onRetry?: () => void
  onDismiss?: () => void
  showDetails?: boolean
}
```

#### WorkspaceErrorBoundary (`WorkspaceErrorBoundary.tsx`)
React error boundary for graceful error handling:
- **Features**: Component crash recovery, retry mechanisms, error logging
- **Fallbacks**: Custom error UI, reload options, technical details
- **Analytics**: Error reporting and monitoring integration

#### LayoutTransitions (`LayoutTransitions.tsx`)
Animation system for layout mode changes:
- **Animations**: Smooth transitions between layouts
- **Performance**: CSS transforms, GPU acceleration
- **Timing**: Configurable duration and easing

### Hooks

#### useWorkspaceErrors (`useWorkspaceErrors.ts`)
Error handling hook for components:
```typescript
const {
  hasError,
  errorState,
  getErrorMessage,
  canRetry,
  handleRetry,
  handleDismiss
} = useWorkspaceErrors()
```

#### useWorkspaceEvents (`useWorkspaceEvents.ts`)
Event system integration:
```typescript
const {
  subscribeToLayoutChanges,
  subscribeToDocumentEvents,
  emitWorkspaceEvent
} = useWorkspaceEvents()
```

#### useWorkspaceStore (`useWorkspaceStore.ts`)
Zustand store access:
```typescript
const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace)
const createWorkspace = useWorkspaceStore(state => state.createWorkspace)
```

### Stores

#### WorkspaceStore (`workspace-store.ts`)
Central state management using Zustand:

**State Structure:**
```typescript
interface WorkspaceAppState {
  currentWorkspace?: WorkspaceUIState
  errorState: ErrorState | null
  commandBarState: { isLoading: boolean; disabled: boolean }
  transitionState: { isTransitioning: boolean; animations: DocumentLayoutResult[] }
  operations: { creating: boolean; loading: boolean; saving: boolean; ... }
}
```

**Key Actions:**
- `createWorkspace(name, layoutMode, dimensions)`: Create new workspace
- `loadWorkspace(workspaceId)`: Load existing workspace
- `addDocument(filePath, position, dimensions)`: Add document to workspace
- `switchLayoutMode(mode, triggeredBy)`: Change layout mode
- `moveDocument(documentId, position)`: Move document
- `resizeDocument(documentId, dimensions)`: Resize document
- `setError(error, operation, context)`: Handle errors
- `retryLastOperation()`: Retry failed operations

## Usage Examples

### Basic Workspace Setup

```typescript
import { useWorkspaceStore } from './ui/hooks/useWorkspaceStore'
import { LayoutModeType } from './domain/value-objects/layout-mode'
import { DocumentWorkspace } from '../../../components/DocumentWorkspace'

function MyWorkspaceApp() {
  const createWorkspace = useWorkspaceStore(state => state.createWorkspace)
  const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace)

  const handleCreateWorkspace = async () => {
    await createWorkspace('Research Workspace', LayoutModeType.GRID)
  }

  return (
    <div>
      {currentWorkspace ? (
        <DocumentWorkspace />
      ) : (
        <button onClick={handleCreateWorkspace}>
          Create Workspace
        </button>
      )}
    </div>
  )
}
```

### Adding Documents

```typescript
import { Position, Dimensions } from './domain/value-objects/geometry'

function AddDocumentButton() {
  const addDocument = useWorkspaceStore(state => state.addDocument)

  const handleAddDocument = async () => {
    const position = Position.fromCoordinates(100, 100)
    const dimensions = Dimensions.fromValues(400, 500)

    await addDocument('/path/to/document.pdf', position, dimensions)
  }

  return <button onClick={handleAddDocument}>Add Document</button>
}
```

### Error Handling

```typescript
import { useWorkspaceErrors } from './ui/hooks/useWorkspaceErrors'
import { ErrorFeedback } from './ui/components/ErrorFeedback'
import { DocumentWorkspace } from '../../../components/DocumentWorkspace'

function WorkspaceWithErrorHandling() {
  const { hasError, errorState, handleRetry, handleDismiss } = useWorkspaceErrors()

  return (
    <div>
      <DocumentWorkspace />
      {hasError && (
        <ErrorFeedback
          error={errorState?.error}
          operation={errorState?.operation}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}
```

### Layout Mode Switching

```typescript
import { LayoutModeType } from './domain/value-objects/layout-mode'

function LayoutControls() {
  const switchLayoutMode = useWorkspaceStore(state => state.switchLayoutMode)
  const currentLayoutMode = useWorkspaceStore(state => state.currentWorkspace?.layoutMode)

  return (
    <div>
      {Object.values(LayoutModeType).map(mode => (
        <LayoutModeButton
          key={mode}
          mode={mode}
          isActive={currentLayoutMode === mode}
          onClick={() => switchLayoutMode(mode, 'user')}
        />
      ))}
    </div>
  )
}
```

## Testing Strategy

### Unit Tests
- Domain logic: Value objects, entities, aggregates
- Layout algorithms: Each layout strategy
- Error handling: All error types and scenarios

### Integration Tests
- Layout mode switching workflows
- Document management operations
- Auto-freeform mode transitions
- Error recovery mechanisms

### Performance Tests
- Large document sets (50+ documents)
- Layout transition performance (<16ms target)
- Memory usage optimization

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- High contrast support

## Performance Considerations

### Layout Calculations
- **Memoization**: Layout results cached by layout mode and document set
- **Virtualization**: Large document sets use virtual scrolling
- **GPU Acceleration**: CSS transforms for smooth animations

### State Management
- **Selective Updates**: Components subscribe to specific state slices
- **Batched Operations**: Multiple document operations batched together
- **Debounced Saves**: Auto-save with debouncing to prevent excessive I/O

### Memory Management
- **Document Cleanup**: Inactive documents release resources
- **Event Cleanup**: Automatic unsubscription on component unmount
- **Image Optimization**: Document previews use lazy loading

## Browser Compatibility

- **Chrome**: 90+ (Tauri requirement)
- **Edge**: 90+ (Tauri requirement)
- **Safari**: 14+ (WebKit features)
- **Firefox**: Not supported (Tauri limitation)

## Development Guidelines

### Adding New Components

1. **Location**: Place in appropriate UI subdirectory
2. **Props Interface**: Define typed props with JSDoc
3. **Error Handling**: Use `useWorkspaceErrors` hook
4. **State**: Connect via `useWorkspaceStore` selectors
5. **Testing**: Include unit and integration tests

### Extending Layout Modes

1. **Strategy Class**: Implement `LayoutStrategy` interface
2. **Registration**: Add to `LayoutMode.strategies` map
3. **UI Support**: Update layout mode buttons
4. **Tests**: Add algorithm and integration tests

### Error Handling

1. **Domain Errors**: Extend `WorkspaceDomainError` base class
2. **User Messages**: Provide clear, actionable messages
3. **Recovery**: Implement retry logic for recoverable errors
4. **Logging**: Include context for debugging

## Troubleshooting

### Common Issues

**Layout not updating after mode switch:**
- Check if layout transition is in progress
- Verify workspace store subscription
- Ensure component re-renders on state change

**Document drag/resize not working:**
- Confirm `isDraggable`/`isResizable` props are true
- Check for CSS pointer-events conflicts
- Verify event handlers are properly bound

**Error boundary triggering frequently:**
- Review component prop validation
- Check for undefined state access
- Verify async operation error handling

**Performance issues with many documents:**
- Enable virtualization for large sets
- Check for unnecessary re-renders
- Profile layout calculation performance

### Debug Tools

**Zustand DevTools:**
```typescript
// Enable in development
const store = create<WorkspaceStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // store implementation
      }))
    )
  )
)
```

**Layout Debug Overlay:**
```typescript
// Add to component for layout debugging
const debugLayout = process.env.NODE_ENV === 'development'
```

**Error Monitoring:**
```typescript
// Custom error tracking
window.addEventListener('workspace-error', (event) => {
  console.error('Workspace Error:', event.detail)
  // Send to monitoring service
})
```

## Future Enhancements

### Planned Features
- **Tabbed Documents**: Tab-based document organization
- **Split Panes**: Document splitting and comparison
- **Workspace Templates**: Predefined workspace layouts
- **Collaborative Editing**: Multi-user workspace sharing

### Technical Improvements
- **WebGL Rendering**: Hardware-accelerated layout rendering
- **Web Workers**: Background layout calculations
- **PWA Support**: Offline workspace functionality
- **Plugin System**: Extensible document type support

---

## Contributing

When contributing to this domain:

1. **Follow DDD Principles**: Maintain clear boundaries between layers
2. **Test-Driven Development**: Write tests before implementation
3. **Type Safety**: Use strict TypeScript throughout
4. **Performance**: Consider large workspace scenarios
5. **Accessibility**: Ensure keyboard and screen reader support
6. **Documentation**: Update this README for significant changes

For detailed implementation guidance, see the individual component files and domain specifications in `/specs/002-multi-document-workspace/`.