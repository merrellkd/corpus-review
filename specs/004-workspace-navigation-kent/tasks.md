# Tasks: Project Workspace Navigation (MVP - Iteration 1)

**Input**: Design documents from `/specs/004-workspace-navigation-kent/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: TypeScript/React + Rust/Tauri, Zustand, SQLite
   → Structure: Web app (src/ frontend, src-tauri/src/ backend)
2. Load optional design documents ✓:
   → data-model.md: 3 entities (WorkspaceContext, FileEntry, DirectoryListing)
   → contracts/: 4 Tauri commands (workspace navigation operations)
   → quickstart.md: 9 test scenarios covering navigation and error handling
3. Generate tasks by category ✓:
   → Setup: No new dependencies needed, extends existing project
   → Tests: 4 contract tests, 9 integration tests
   → Core: 3 domain entities (Rust + TypeScript), 4 commands, 1 repository, UI components
   → Integration: Workspace store, navigation routing
   → Polish: Error handling, performance optimization
4. Apply task rules ✓:
   → Different files = [P] parallel, Same file = sequential
   → Tests before implementation (TDD approach)
5. Number tasks sequentially (T001-T039) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓:
   → All 4 contracts have tests, All 3 entities have models, All commands implemented
9. Return: SUCCESS (39 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths assume existing Tauri app structure from constitution

## Phase 3.1: Setup (No new dependencies required)
- [x] T001 Verify existing workspace navigation dependencies are available (Tauri file system APIs)
- [x] T002 [P] Add workspace error types to src-tauri/src/domain/errors/workspace_error.rs

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

### Contract Tests (4 commands - all [P])
- [x] T003 [P] Create contract test for open_workspace command in src-tauri/src/commands/tests/workspace_tests.rs
- [x] T004 [P] Create contract test for list_directory command in src-tauri/src/commands/tests/workspace_tests.rs
- [x] T005 [P] Create contract test for navigate_to_folder command in src-tauri/src/commands/tests/workspace_tests.rs
- [x] T006 [P] Create contract test for navigate_to_parent command in src-tauri/src/commands/tests/workspace_tests.rs

### Integration Test Scenarios (9 scenarios - all [P])
- [x] T007 [P] Create integration test for "Open Project Workspace (Happy Path)" in tests/integration/workspace_navigation_test.rs
- [x] T008 [P] Create integration test for "Basic Folder Navigation" in tests/integration/workspace_navigation_test.rs
- [x] T009 [P] Create integration test for "Empty Folder Handling" in tests/integration/workspace_navigation_test.rs
- [x] T010 [P] Create integration test for "Return to Project List" in tests/integration/workspace_navigation_test.rs
- [x] T011 [P] Create integration test for "Inaccessible Source Folder" in tests/integration/workspace_navigation_test.rs
- [x] T012 [P] Create integration test for "Permission Denied Handling" in tests/integration/workspace_navigation_test.rs
- [x] T013 [P] Create integration test for "Large Directory Handling" in tests/integration/workspace_navigation_test.rs
- [x] T014 [P] Create integration test for "Workspace Session Persistence" in tests/integration/workspace_navigation_test.rs
- [x] T015 [P] Create integration test for "Multiple Project Context" in tests/integration/workspace_navigation_test.rs

## Phase 3.3: Domain Layer (Pure Business Logic)

### Value Objects (all [P])
- [x] T016 [P] Create WorkspaceContext value object in src-tauri/src/domain/value_objects/workspace_context.rs
- [x] T017 [P] Create WorkspaceContext TypeScript interface in src/domain/value-objects/workspace-context.ts

### Entities (all [P])
- [x] T018 [P] Create FileEntry entity with FileEntryType enum in src-tauri/src/domain/entities/file_entry.rs
- [x] T019 [P] Create FileEntry TypeScript interface in src/domain/entities/file-entry.ts

### Aggregates (all [P])
- [x] T020 [P] Create DirectoryListing aggregate with navigation methods in src-tauri/src/domain/aggregates/directory_listing.rs
- [x] T021 [P] Create DirectoryListing TypeScript interface in src/domain/aggregates/directory-listing.ts

### Repository Interface ([P])
- [x] T022 [P] Create WorkspaceRepository trait in src-tauri/src/domain/repositories/workspace_repository.rs

## Phase 3.4: Application Layer

### DTOs (all [P])
- [x] T023 [P] Create WorkspaceDto in src-tauri/src/application/dtos/workspace_dto.rs
- [x] T024 [P] Create DirectoryListingDto in src-tauri/src/application/dtos/directory_listing_dto.rs
- [x] T025 [P] Create FileEntryDto in src-tauri/src/application/dtos/file_entry_dto.rs
- [x] T026 [P] Create TypeScript DTOs in frontend/src/domains/workspace/application/dtos/workspace-dtos.ts

### Application Service
- [x] T027 Create WorkspaceNavigationService in src-tauri/src/application/services/workspace_service.rs

## Phase 3.5: Infrastructure Layer

### Repository Implementation
- [x] T028 ~~Create WorkspaceRepositoryImpl~~ (Simplified to direct file system operations in service)

## Phase 3.6: Command Layer (Tauri Commands)

### Command Handlers (sequential - same file)
- [x] T029 Create open_workspace_navigation command handler in src-tauri/src/commands/workspace_commands.rs
- [x] T030 Add list_directory command handler to src-tauri/src/commands/workspace_commands.rs
- [x] T031 Add navigate_to_folder command handler to src-tauri/src/commands/workspace_commands.rs
- [x] T032 Add navigate_to_parent command handler to src-tauri/src/commands/workspace_commands.rs

### Command Registration
- [x] T033 Register workspace commands in src-tauri/src/main.rs

## Phase 3.7: Frontend Domain Models

### TypeScript Domain Models (all [P])
- [x] T034 [P] Create TypeScript Project interface extensions in frontend/src/domain/entities/project.ts (add openWorkspace method)

## Phase 3.8: UI Layer

### React Components (can be parallel as separate files)
- [x] T035 [P] Create WorkspacePage component in frontend/src/ui/pages/WorkspacePage.tsx
- [x] T036 [P] Create ProjectHeader component in frontend/src/ui/components/workspace/ProjectHeader.tsx
- [x] T037 [P] Create FileList component in frontend/src/ui/components/workspace/FileList.tsx
- [x] T038 [P] Create NavigationBreadcrumb component in frontend/src/ui/components/workspace/NavigationBreadcrumb.tsx

### State Management
- [x] T039 Create workspace store slice in frontend/src/stores/workspace-store.ts

## Dependencies & Execution Order

### Critical Path
```
T001-T002 (Setup) → T003-T015 (Tests) → T016-T022 (Domain) → T023-T027 (Application) → T028 (Infrastructure) → T029-T033 (Commands) → T034-T039 (Frontend)
```

### Parallel Execution Examples

**Phase 3.2 - All Contract Tests (run simultaneously):**
```bash
# Run all contract tests in parallel
Task agent "Create contract test for open_workspace command"
Task agent "Create contract test for list_directory command"
Task agent "Create contract test for navigate_to_folder command"
Task agent "Create contract test for navigate_to_parent command"
```

**Phase 3.2 - All Integration Tests (run simultaneously):**
```bash
# Run all integration tests in parallel
Task agent "Create integration test for Open Project Workspace scenario"
Task agent "Create integration test for Basic Folder Navigation scenario"
Task agent "Create integration test for Empty Folder Handling scenario"
# ... (continue for all 9 integration tests)
```

**Phase 3.3 - Domain Layer (run simultaneously):**
```bash
# Run all domain model creation in parallel
Task agent "Create WorkspaceContext value object (Rust)"
Task agent "Create WorkspaceContext TypeScript interface"
Task agent "Create FileEntry entity (Rust)"
Task agent "Create FileEntry TypeScript interface"
Task agent "Create DirectoryListing aggregate (Rust)"
Task agent "Create DirectoryListing TypeScript interface"
Task agent "Create WorkspaceRepository trait"
```

**Phase 3.4 - DTOs (run simultaneously):**
```bash
# Run all DTO creation in parallel
Task agent "Create WorkspaceDto"
Task agent "Create DirectoryListingDto"
Task agent "Create FileEntryDto"
Task agent "Create TypeScript workspace DTOs"
```

**Phase 3.8 - UI Components (run simultaneously):**
```bash
# Run all UI component creation in parallel
Task agent "Create WorkspacePage component"
Task agent "Create ProjectHeader component"
Task agent "Create FileList component"
Task agent "Create NavigationBreadcrumb component"
```

## Validation Checklist

Before marking feature complete, verify:
- [ ] All 4 contract tests pass
- [ ] All 9 integration test scenarios pass
- [ ] TypeScript compilation succeeds with strict mode
- [ ] All Tauri commands registered and functional
- [ ] Workspace navigation works end-to-end from project list
- [ ] Error handling works for inaccessible folders
- [ ] Performance meets requirements (<2s loading, <500ms navigation)
- [ ] Domain layer has zero infrastructure dependencies (constitutional requirement)
- [ ] File system operations properly sandboxed within source folder boundaries

## Notes

**Constitutional Compliance:**
- Domain layer entities (T016-T022) have zero dependencies on infrastructure
- Repository pattern isolates file system access (T022, T028)
- Prefixed UUIDs maintained through existing ProjectId system
- TypeScript strict mode enforced throughout

**Integration Points:**
- Extends existing project-list feature with workspace navigation
- Reuses existing ProjectId, database connections, error handling patterns
- "Back to Projects" navigation returns to existing project list view

**Performance Considerations:**
- Large directory handling implemented with lazy loading (T013, T028)
- File metadata efficiently retrieved via Tauri's native file system APIs
- Navigation state management optimized for responsive UI updates

**Security Boundaries:**
- All file system operations validated against workspace source folder (T028)
- Path traversal prevention implemented in repository layer
- Read-only access maintained throughout navigation operations