# Data Model: Frontend Architecture Refactoring

## Feature Entities

### Feature Directory
**Purpose**: Self-contained vertical slice containing all related functionality for a specific domain
**Attributes**:
- name: Feature identifier (project-management, workspace-navigation, document-workspace)
- components: React components specific to this feature
- hooks: Custom React hooks for feature logic
- services: Business logic and API integration
- types: TypeScript type definitions
- store: Feature-specific Zustand store (optional)

**Validation Rules**:
- Feature name must match directory name exactly
- All feature code must be contained within feature directory boundaries
- No cross-feature imports except from shared/ directory
- Feature stores cannot duplicate global store responsibilities

### Shared Resource
**Purpose**: Truly reusable code used across multiple features
**Attributes**:
- type: component | hook | service | type | utility
- usageCount: Number of features that use this resource
- hasBusinessLogic: Boolean indicating feature-specific business logic

**Validation Rules**:
- Must be used by 3+ features to qualify as shared
- Cannot contain feature-specific business logic
- Must have clear, documented interface

### Global Store
**Purpose**: Application-wide state that spans multiple features
**Attributes**:
- scope: UI layout state or cross-feature application concerns only
- stateType: ui-layout | cross-feature-data
- persistence: Whether state persists across sessions

**Validation Rules**:
- Cannot duplicate state managed by feature stores
- Must have clear justification for global scope
- Limited to UI concerns and truly cross-cutting data

## State Transitions

### Migration Process Flow
```
Current Mixed Structure → Feature Analysis → Feature Extraction → Validation → Complete
```

**States**:
1. **Current Mixed Structure**: Existing DDD/component hybrid organization
2. **Feature Analysis**: Identify components, services, types belonging to each feature
3. **Feature Extraction**: Move files into appropriate feature directories
4. **Validation**: Test functionality after each feature migration
5. **Complete**: All code organized according to constitutional requirements

### Feature Migration States
```
Identified → Moved → Imports Updated → Tests Migrated → Validated
```

## Relationships

### Feature Dependencies
- Features MAY depend on shared/ resources
- Features MUST NOT depend on other features directly
- Features MAY access global stores for UI state only

### Test Organization
- Unit tests belong to the feature they test
- Integration tests remain centralized (test cross-feature interactions)
- Contract tests remain centralized (test external API contracts)

### Store Relationships
- Feature stores handle feature-specific state only
- Global stores handle UI layout and cross-feature concerns
- No overlapping state management between stores

## Migration Mapping

### Current → Target Structure

**Project Domain** → **features/project-management/**
- domains/project/ → services/ and types/
- ui/components/create-project-form.tsx → components/
- stores/project-store.ts → store.ts

**Workspace Domain** → **features/workspace-navigation/**
- domains/workspace/ → services/ and types/
- ui/components/workspace/ → components/
- stores/workspace-store.ts → store.ts

**Document Components** → **features/document-workspace/**
- components/DocumentWorkspace.tsx → components/
- components/FileExplorer.tsx → components/
- Related stores → store.ts

**Shared Components** → **shared/**
- Components used by 3+ features only
- Generic utilities and helpers

**Global State** → **stores/**
- UI layout state (panelStateMachine.ts, unifiedPanelState.ts)
- Cross-feature application state only

## Validation Schema

Each feature directory must contain:
- `components/` directory with at least one .tsx file
- `services/` directory with business logic
- `types/` directory with TypeScript definitions
- `hooks/` directory with custom React hooks
- Optional `store.ts` for feature-specific state

Each feature must pass:
- TypeScript compilation with strict mode
- Feature self-containment check (no external feature imports)
- Functionality validation through manual testing