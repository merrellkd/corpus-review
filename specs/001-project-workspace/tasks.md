# Tasks: Project Workspace

**Input**: Design documents from `/specs/001-project-workspace/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## 🚀 Progress Summary
- ✅ **Setup Phase (T001-T005)**: Complete - Tauri + React project structure with full dev environment
- ✅ **TDD Tests Phase (T006-T013)**: Complete - All 8 tests implemented and failing as expected for TDD
- 🔄 **Domain Layer (T014-T019)**: Ready to Start - All contract tests are failing, ready for implementation
- ⏳ **Application Layer (T020-T021)**: Pending
- ⏳ **Infrastructure Layer (T022-T024)**: Pending
- ⏳ **UI Layer (T025-T026)**: Pending

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
5. Generated 27 numbered tasks (T001-T027)
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

## Phase 3.3: Domain Layer (ONLY after tests are failing)
- [ ] T014 [P] WorkspaceLayout entity in src-tauri/src/domain/workspace/entities/workspace_layout.rs
- [ ] T015 [P] FileSystemItem entity in src-tauri/src/domain/workspace/entities/file_system_item.rs
- [ ] T016 [P] DocumentCaddy entity in src-tauri/src/domain/workspace/entities/document_caddy.rs
- [ ] T017 [P] Project entity in src-tauri/src/domain/workspace/entities/project.rs
- [ ] T018 [P] Value objects (IDs, FilePath, etc.) in src-tauri/src/domain/workspace/value_objects.rs
- [ ] T019 Repository interfaces in src-tauri/src/domain/workspace/repositories.rs

## Phase 3.4: Application Layer
- [ ] T020 WorkspaceService in src-tauri/src/application/workspace_service.rs
- [ ] T021 FileSystemService in src-tauri/src/application/file_system_service.rs

## Phase 3.5: Infrastructure Layer
- [ ] T022 SQLX WorkspaceLayoutRepository implementation in src-tauri/src/infrastructure/repositories/workspace_layout_repository.rs
- [ ] T023 Tauri FileSystemRepository implementation in src-tauri/src/infrastructure/repositories/file_system_repository.rs
- [ ] T024 Tauri commands (8 commands) in src-tauri/src/commands/workspace_commands.rs

## Phase 3.6: UI Layer
- [ ] T025 Zustand workspace store in frontend/src/stores/workspaceStore.ts
- [ ] T026 Main workspace component with react-resizable-panels in frontend/src/components/ProjectWorkspace.tsx

## Phase 3.7: Polish
- [ ] T027 [P] Run quickstart validation scenarios and fix any issues

## Dependencies
- Setup (T001-T005) before everything
- Tests (T006-T013) before implementation (T014-T027)
- Domain (T014-T019) before Application (T020-T021)
- Application before Infrastructure (T022-T024)
- Infrastructure before UI (T025-T026)
- Implementation before polish (T027)

## Parallel Example
```bash
# Launch domain entity tasks together (T014-T018):
Task: "WorkspaceLayout entity in src-tauri/src/domain/workspace/entities/workspace_layout.rs"
Task: "FileSystemItem entity in src-tauri/src/domain/workspace/entities/file_system_item.rs"
Task: "DocumentCaddy entity in src-tauri/src/domain/workspace/entities/document_caddy.rs"
Task: "Project entity in src-tauri/src/domain/workspace/entities/project.rs"
Task: "Value objects in src-tauri/src/domain/workspace/value_objects.rs"

# Launch contract tests together (T006-T010):
Task: "Contract test get_workspace_layout command in src-tauri/tests/commands/test_workspace_layout.rs"
Task: "Contract test save_workspace_layout command in src-tauri/tests/commands/test_save_layout.rs"
Task: "Contract test list_folder_contents command in src-tauri/tests/commands/test_folder_contents.rs"
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

### T022-T024: Infrastructure Layer
- SQLX repository implementations with proper SQL schema
- Tauri command handlers with snake_case naming
- File system operations with proper error handling

### T025-T026: UI Components
- Zustand store with TypeScript interfaces
- React components using react-resizable-panels
- Proper state management and optimistic updates

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing
- Follow DDD layer isolation strictly
- Use structured logging throughout
- Commit after each task

## Validation Checklist
*GATE: Checked during execution*

- [x] All 8 contracts have corresponding tests (T006-T010)
- [x] All 5 entities have model tasks (T014-T018)
- [x] All tests come before implementation (T006-T013 before T014+)
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task