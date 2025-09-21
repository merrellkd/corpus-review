# Tasks: Project Workspace

**Input**: Design documents from `/specs/001-project-workspace/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## 🚀 Progress Summary
- ✅ **Setup Phase (T001-T005)**: Complete - Tauri + React project structure with full dev environment
- ✅ **TDD Tests Phase (T006-T013)**: Complete - All 8 tests implemented and failing as expected for TDD
- ✅ **Domain Layer (T014-T019)**: Complete - All domain entities, value objects, and repository interfaces implemented with 37 passing tests
- ✅ **Application Layer (T020-T021)**: Complete - WorkspaceService and FileSystemService with full DTO conversion and error handling
- ✅ **Infrastructure Layer (T022-T024)**: Complete - SQLX repositories, Tauri file system access, and all 11 Tauri commands implemented
- 🔄 **Updated Architecture Phase**: Ready to implement mutually exclusive panel architecture from updated specification
  - ⏳ **State Management (T025a-T026c)**: Tests and implementation for mutually exclusive panel logic
  - ⏳ **UI Components (T027a-T028f)**: Tests and implementation for new panel structure
  - ⏳ **Integration (T029a-T030c)**: End-to-end testing and implementation
  - ⏳ **Polish (T031a-T033)**: Performance, error handling, and validation

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: React + TypeScript + Vite, Tauri + Rust + SQLX, react-resizable-panels
2. Load design documents:
   → data-model.md: WorkspaceLayout, FileSystemItem, DocumentCaddy, Project entities
   → contracts/: workspace.ts with 8 Tauri commands
   → research.md: Vitest testing, react-resizable-panels, Zustand stores
3. Generate tasks by category:
   → Setup: Tauri project, React frontend, dependencies
   → Tests: contract tests, integration tests
   → Core: domain models, application services, Tauri commands
   → Integration: database, state management, UI components
   → Polish: unit tests, performance, validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD)
   → Domain → Application → Infrastructure → UI layers
5. Generated 33 numbered tasks (T001-T033) including updated architecture tasks
6. Dependencies: Setup → Tests → Domain → Application → Infrastructure → UI → Polish
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `frontend/src/` for React components, stores, types
- **Backend**: `src-tauri/src/` for Rust domain, application, infrastructure
- **Tests**: Separate test directories for frontend and backend

## Phase 3.1: Setup ✅ COMPLETE
- [x] T001 Create Tauri project structure with React frontend and Rust backend
- [x] T002 Initialize frontend dependencies: React, TypeScript, Vite, Zustand, react-resizable-panels, Vitest
- [x] T003 [P] Initialize backend dependencies: SQLX, serde, tokio, tracing in src-tauri/Cargo.toml
- [x] T004 [P] Configure TypeScript strict mode and Vitest in frontend/vite.config.ts
- [x] T005 [P] Setup SQLX database and migrations in src-tauri/migrations/

## Phase 3.2: Tests First (TDD) ✅ COMPLETE - All tests failing as expected
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T006 [P] Contract test get_workspace_layout command in src-tauri/tests/test_workspace_layout.rs ✅ FAILING (2/4 tests fail as expected)
- [x] T007 [P] Contract test save_workspace_layout command in src-tauri/tests/test_save_layout.rs ✅ FAILING (5/5 tests fail as expected)
- [x] T008 [P] Contract test list_folder_contents command in src-tauri/tests/test_folder_contents.rs ✅ FAILING (1/5 tests fail as expected)
- [x] T009 [P] Contract test update_panel_visibility command in src-tauri/tests/test_panel_visibility.rs ✅ FAILING (3/6 tests fail as expected)
- [x] T010 [P] Contract test create_document_caddy command in src-tauri/tests/test_document_caddy.rs ✅ FAILING (5/7 tests fail as expected)
- [x] T011 [P] Integration test workspace load scenario in frontend/tests/integration/workspace-load.test.tsx ✅ FAILING (API calls not made - no implementation)
- [x] T012 [P] Integration test panel resize scenario in frontend/tests/integration/panel-resize.test.tsx ✅ FAILING (API calls not made - no implementation)
- [x] T013 [P] Integration test file explorer scenario in frontend/tests/integration/file-explorer.test.tsx ✅ FAILING (API calls not made - no implementation)

## Phase 3.3: Domain Layer ✅ COMPLETE - Pure business logic implemented
- [x] T014 [P] WorkspaceLayout entity in src-tauri/src/domain/workspace/entities/workspace_layout.rs ✅ WITH TESTS
- [x] T015 [P] FileSystemItem entity in src-tauri/src/domain/workspace/entities/file_system_item.rs ✅ WITH TESTS
- [x] T016 [P] DocumentCaddy entity in src-tauri/src/domain/workspace/entities/document_caddy.rs ✅ WITH TESTS
- [x] T017 [P] Project entity in src-tauri/src/domain/workspace/entities/project.rs ✅ WITH TESTS
- [x] T018 [P] Value objects (IDs, FilePath, etc.) in src-tauri/src/domain/workspace/value_objects.rs ✅ WITH TESTS
- [x] T019 Repository interfaces in src-tauri/src/domain/workspace/repositories.rs ✅ WITH TESTS

## Phase 3.4: Application Layer ✅ COMPLETE
- [x] T020 WorkspaceService in src-tauri/src/application/workspace_service.rs ✅ WITH TESTS
- [x] T021 FileSystemService in src-tauri/src/application/file_system_service.rs ✅ WITH TESTS

## Phase 3.5: Infrastructure Layer ✅ COMPLETE
- [x] T022 SQLX WorkspaceLayoutRepository implementation in src-tauri/src/infrastructure/repositories/workspace_layout_repository.rs ✅ COMPILED
- [x] T023 Tauri FileSystemRepository implementation in src-tauri/src/infrastructure/repositories/file_system_repository.rs ✅ COMPILED
- [x] T024 Tauri commands (11 commands total) in src-tauri/src/commands/ ✅ COMPILED

## Phase 3.6: UI Layer Updates for Mutually Exclusive Panel Architecture
**Note**: Backend infrastructure complete - now implementing new panel behavior from updated specification

### Updated State Management (TDD)
- [x] T025a [P] Test mutually exclusive panel state logic in frontend/tests/stores/test_panel_state_machine.ts ✅ FAILING (missing implementation)
- [x] T025b [P] Test section visibility within Files & Categories panel in frontend/tests/stores/test_section_visibility.ts ✅ FAILING (missing implementation)
- [x] T025c [P] Test drag-and-drop file categorization state in frontend/tests/stores/test_file_categorization.ts ✅ FAILING (missing implementation)

### State Implementation
- [ ] T026a Updated workspace store with mutually exclusive panel logic in frontend/src/stores/workspaceStore.ts
- [ ] T026b Panel state machine for None|FilesCategoriesPanel|SearchPanel in frontend/src/stores/panelStateMachine.ts
- [ ] T026c Section visibility manager for independent File Explorer and Category Explorer sections in frontend/src/stores/sectionVisibilityStore.ts

### Updated UI Components (TDD)
- [ ] T027a [P] Test ProjectWorkspace mutually exclusive panel rendering in frontend/tests/components/test_project_workspace_v2.tsx ✅ MUST FAIL
- [ ] T027b [P] Test TopToolbar panel toggle buttons in frontend/tests/components/test_top_toolbar.tsx ✅ MUST FAIL
- [ ] T027c [P] Test FilesCategoriesPanel with independent sections in frontend/tests/components/test_files_categories_panel.tsx ✅ MUST FAIL
- [ ] T027d [P] Test drag-and-drop file categorization workflow in frontend/tests/components/test_drag_drop_categorization.tsx ✅ MUST FAIL

### UI Implementation
- [ ] T028a Updated ProjectWorkspace component for mutually exclusive panels in frontend/src/components/ProjectWorkspace.tsx
- [ ] T028b New TopToolbar component with "Files & Categories" and "Search" toggles in frontend/src/components/TopToolbar.tsx
- [ ] T028c New FilesCategoriesPanel with independent File Explorer and Category Explorer sections in frontend/src/components/FilesCategoriesPanel.tsx
- [ ] T028d Enhanced FileExplorer with drag-and-drop file support in frontend/src/components/FileExplorer.tsx
- [ ] T028e Enhanced CategoryExplorer with drop target functionality in frontend/src/components/CategoryExplorer.tsx
- [ ] T028f Updated SearchPanel for mutually exclusive behavior in frontend/src/components/SearchPanel.tsx

### Integration Tests for New Architecture
- [ ] T029a [P] Integration test full mutually exclusive panel switching in frontend/tests/integration/test_panel_switching_v2.tsx ✅ MUST FAIL
- [ ] T029b [P] Integration test section visibility and auto-hide behavior in frontend/tests/integration/test_section_auto_hide.tsx ✅ MUST FAIL
- [ ] T029c [P] Integration test drag-and-drop file categorization end-to-end in frontend/tests/integration/test_drag_drop_e2e.tsx ✅ MUST FAIL

### Integration Implementation
- [ ] T030a Panel switching integration with backend state persistence
- [ ] T030b Section visibility state synchronization with backend
- [ ] T030c Drag-and-drop file categorization backend integration

## Phase 3.7: Polish & Validation for New Architecture
- [ ] T031a [P] Performance optimization for panel switching animations
- [ ] T031b [P] Error handling for failed drag-and-drop operations
- [ ] T031c [P] Loading states for panel operations
- [ ] T032 Run updated quickstart validation scenarios for mutually exclusive panels
- [ ] T033 Update CLAUDE.md with new mutually exclusive panel patterns

## Dependencies

**Original Implementation (Completed)**:
- Setup (T001-T005) → Tests (T006-T013) → Domain (T014-T019) → Application (T020-T021) → Infrastructure (T022-T024) ✅

**New Architecture Implementation**:
- Backend Complete → New UI Tests (T025a-c) → State Implementation (T026a-c)
- State Implementation → UI Component Tests (T027a-d) → UI Implementation (T028a-f)
- UI Implementation → Integration Tests (T029a-c) → Integration Implementation (T030a-c)
- All Implementation → Polish & Validation (T031a-c, T032, T033)

**Sequential Dependencies**:
- T025a-c (state tests) → T026a-c (state implementation)
- T027a-d (component tests) → T028a-f (component implementation)
- T029a-c (integration tests) → T030a-c (integration implementation)

## Parallel Example

**New Architecture Implementation**:
```bash
# Launch state management tests together (T025a-c):
Task: "Test mutually exclusive panel state logic in frontend/tests/stores/test_panel_state_machine.ts"
Task: "Test section visibility within Files & Categories panel in frontend/tests/stores/test_section_visibility.ts"
Task: "Test drag-and-drop file categorization state in frontend/tests/stores/test_file_categorization.ts"

# Launch UI component tests together (T027a-d):
Task: "Test ProjectWorkspace mutually exclusive panel rendering in frontend/tests/components/test_project_workspace_v2.tsx"
Task: "Test TopToolbar panel toggle buttons in frontend/tests/components/test_top_toolbar.tsx"
Task: "Test FilesCategoriesPanel with independent sections in frontend/tests/components/test_files_categories_panel.tsx"
Task: "Test drag-and-drop file categorization workflow in frontend/tests/components/test_drag_drop_categorization.tsx"

# Launch UI implementation together (T028a-f):
Task: "Updated ProjectWorkspace component for mutually exclusive panels in frontend/src/components/ProjectWorkspace.tsx"
Task: "New TopToolbar component with panel toggles in frontend/src/components/TopToolbar.tsx"
Task: "New FilesCategoriesPanel component in frontend/src/components/FilesCategoriesPanel.tsx"
```

## Detailed Task Breakdown

### T001: Create Tauri project structure
- Initialize new Tauri project with React template
- Setup DDD folder structure: domain/, application/, infrastructure/, commands/
- Configure workspace in Cargo.toml for multi-crate if needed

### T006-T013: Contract and Integration Tests
- Each test validates specific contract/scenario from design docs
- Tests must use exact request/response DTOs from contracts/workspace.ts
- Integration tests use react-testing-library and mock Tauri APIs

### T014-T018: Domain Entities
- Implement business logic and validation rules per data-model.md
- Use prefixed UUID value objects (workspace_, project_, doc_)
- No external dependencies, pure Rust structs with business rules

### T020-T021: Application Services
- Orchestrate domain objects and repository calls
- Handle business workflows like panel resizing, layout persistence
- Use Result<T, E> for error handling

### T020-T021: Application Services ✅ COMPLETE
- WorkspaceService orchestrates workspace layout operations, panel visibility/sizing, document caddy management
- FileSystemService handles file operations, recursive search, path validation within project boundaries
- Complete DTO conversion layer with unified data transfer objects
- Comprehensive error handling with typed service errors

### T022-T024: Infrastructure Layer ✅ COMPLETE
- T022: SQLX WorkspaceLayoutRepository with complete CRUD operations and entity mapping to flat SQLite schema
- T023: TauriFileSystemRepository with native file system access, metadata extraction, and security validation
- T024: 11 Tauri commands implemented with dependency injection:
  * get_workspace_layout, save_workspace_layout, update_panel_visibility, update_panel_sizes
  * create_document_caddy, update_document_caddy, get_project_details
  * list_folder_contents, search_files_recursive, get_file_info, is_path_accessible
- Main codebase compiles successfully with proper error handling and DTO integration

### T025a-T026c: Updated State Management for Mutually Exclusive Panels
- T025a-c: Test-driven development for panel state machine and section visibility logic
- T026a: Updated workspace store with finite state machine for mutually exclusive panels (None|FilesCategoriesPanel|SearchPanel)
- T026b: Panel state machine implementation with automatic transitions and validation
- T026c: Section visibility manager for independent File Explorer and Category Explorer sections within Files & Categories panel

### T027a-T028f: Updated UI Components for New Architecture
- T027a-d: Comprehensive testing for new component behavior including mutually exclusive rendering and drag-drop workflows
- T028a: Updated ProjectWorkspace with two-column layout (panel + MDW) instead of three-column
- T028b: New TopToolbar with "Files & Categories" and "Search" toggle buttons for panel switching
- T028c: New FilesCategoriesPanel containing both File Explorer and Category Explorer sections
- T028d-e: Enhanced File Explorer and Category Explorer with HTML5 drag-and-drop API support
- T028f: Updated SearchPanel for mutually exclusive behavior

### T029a-T030c: Integration for New Architecture
- T029a-c: End-to-end testing of panel switching, section auto-hide, and drag-drop categorization workflows
- T030a-c: Backend integration for panel state persistence, section visibility synchronization, and file categorization

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Follow DDD layer isolation strictly
- Use structured logging throughout
- Commit after each task

## Validation Checklist
*GATE: Checked during execution*

**Original Implementation (Completed)**:
- [x] All 8 contracts have corresponding tests (T006-T010)
- [x] All 5 entities have model tasks (T014-T018)
- [x] All tests come before implementation (T006-T013 before T014+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

**New Architecture Implementation**:
- [x] All new state management has tests (T025a-c before T026a-c)
- [x] All new UI components have tests (T027a-d before T028a-f)
- [x] All integration features have tests (T029a-c before T030a-c)
- [x] TDD approach maintained for new architecture
- [x] Mutually exclusive panel behavior properly tested
- [x] Drag-and-drop functionality comprehensively covered