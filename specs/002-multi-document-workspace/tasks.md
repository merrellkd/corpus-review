# Tasks: Multi-Document Workspace Layout Management

**Input**: Design documents from `/specs/002-multi-document-workspace/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: React + TypeScript frontend, Rust + Tauri backend
   → Structure: Web app with frontend/ and src-tauri/ directories
2. Load optional design documents:
   → data-model.md: 4 core entities (Workspace, DocumentCaddy, LayoutMode, Position)
   → contracts/: 2 files (workspace-commands.json, ui-events.json)
   → research.md: React Context + Zustand hybrid, CSS Grid + Flexbox layouts
3. Generate tasks by category:
   → Setup: Tauri project structure, dependencies, linting
   → Tests: contract tests, integration tests for layout modes
   → Core: domain models, layout engines, UI components
   → Integration: Tauri commands, state management, event handling
   → Polish: unit tests, performance optimization, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✓ All contracts have tests, ✓ All entities have models
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `frontend/src/` for React components and logic
- **Backend**: `src-tauri/src/` for Rust Tauri commands
- **Tests**: `frontend/tests/` for frontend tests, `src-tauri/tests/` for backend tests

## Phase 3.1: Setup
- [x] T001 Create Multi-Document Workspace domain structure in `frontend/src/domains/workspace/` and `src-tauri/src/domains/workspace/`
- [x] T002 Initialize workspace-specific dependencies in `frontend/package.json` (react-resizable-panels integration)
- [x] T003 [P] Configure workspace linting rules in `frontend/.eslintrc.js` for layout components

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P]
- [x] T004 [P] Contract test create_workspace command in `src-tauri/tests/contract/test_workspace_commands.rs`
- [x] T005 [P] Contract test add_document_to_workspace command in `src-tauri/tests/contract/test_document_commands.rs`
- [x] T006 [P] Contract test switch_layout_mode command in `src-tauri/tests/contract/test_layout_commands.rs`
- [x] T007 [P] Contract test move_document and resize_document commands in `src-tauri/tests/contract/test_document_manipulation.rs`
- [x] T008 [P] UI events contract test for layout_mode_changed in `frontend/tests/contract/test_layout_events.test.ts`
- [x] T009 [P] UI events contract test for document_caddy lifecycle in `frontend/tests/contract/test_document_events.test.ts`

### Integration Tests [P]
- [x] T010 [P] Layout mode switching integration test in `frontend/tests/integration/test_layout_switching.test.ts`
- [x] T011 [P] Document management workflow test in `frontend/tests/integration/test_document_workflow.test.ts`
- [x] T012 [P] Automatic freeform mode switching test in `frontend/tests/integration/test_auto_freeform.test.ts`
- [x] T013 [P] End-to-end researcher workflow test in `frontend/tests/integration/test_researcher_workflow.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Domain Models [P]
- [ ] T014 [P] WorkspaceId and DocumentCaddyId value objects in `frontend/src/domains/workspace/domain/value-objects/identifiers.ts`
- [ ] T015 [P] Position and Dimensions value objects in `frontend/src/domains/workspace/domain/value-objects/geometry.ts`
- [ ] T016 [P] LayoutMode value objects and strategy pattern in `frontend/src/domains/workspace/domain/value-objects/layout-mode.ts`
- [ ] T017 [P] DocumentCaddy entity in `frontend/src/domains/workspace/domain/entities/document-caddy.ts`
- [ ] T018 [P] Workspace aggregate root in `frontend/src/domains/workspace/domain/aggregates/workspace.ts`
- [ ] T019 [P] Domain events in `frontend/src/domains/workspace/domain/events/workspace-events.ts`

### Backend Domain Models [P]
- [ ] T020 [P] Workspace domain models in `src-tauri/src/domains/workspace/domain/workspace.rs`
- [ ] T021 [P] Document caddy domain models in `src-tauri/src/domains/workspace/domain/document_caddy.rs`
- [ ] T022 [P] Layout mode domain logic in `src-tauri/src/domains/workspace/domain/layout_mode.rs`

### Application Services
- [ ] T023 WorkspaceService in `frontend/src/domains/workspace/application/workspace-service.ts`
- [ ] T024 LayoutEngineService in `frontend/src/domains/workspace/application/layout-engine-service.ts`
- [ ] T025 DocumentCaddyService in `frontend/src/domains/workspace/application/document-caddy-service.ts`

### Infrastructure Layer
- [ ] T026 [P] Workspace repository implementation in `frontend/src/domains/workspace/infrastructure/workspace-repository.ts`
- [ ] T027 [P] State persistence service in `frontend/src/domains/workspace/infrastructure/state-persistence-service.ts`
- [ ] T028 [P] Tauri workspace commands implementation in `src-tauri/src/domains/workspace/infrastructure/commands.rs`
- [ ] T029 [P] SQLite workspace repository in `src-tauri/src/domains/workspace/infrastructure/workspace_repository.rs`

### UI Components
- [ ] T030 [P] WorkspaceCommandBar component in `frontend/src/domains/workspace/ui/components/WorkspaceCommandBar.tsx`
- [ ] T031 [P] DocumentCaddy component in `frontend/src/domains/workspace/ui/components/DocumentCaddy.tsx`
- [ ] T032 [P] LayoutModeButton component in `frontend/src/domains/workspace/ui/components/LayoutModeButton.tsx`
- [ ] T033 MultiDocumentWorkspace container component in `frontend/src/domains/workspace/ui/containers/MultiDocumentWorkspace.tsx`
- [ ] T034 Layout transition animations in `frontend/src/domains/workspace/ui/components/LayoutTransitions.tsx`

## Phase 3.4: Integration
- [ ] T035 Connect WorkspaceService to Tauri commands in `frontend/src/domains/workspace/application/tauri-workspace-adapter.ts`
- [ ] T036 Zustand store setup for workspace state in `frontend/src/domains/workspace/ui/stores/workspace-store.ts`
- [ ] T037 Event system integration for UI events in `frontend/src/domains/workspace/ui/hooks/useWorkspaceEvents.ts`
- [ ] T038 File Explorer integration for document opening in `frontend/src/shared/file-explorer/workspace-integration.ts`
- [ ] T039 Layout persistence and restoration in `frontend/src/domains/workspace/infrastructure/layout-persistence.ts`

## Phase 3.5: Polish
- [ ] T040 [P] Unit tests for layout algorithms in `frontend/tests/unit/test_layout_algorithms.test.ts`
- [ ] T041 [P] Unit tests for domain logic in `frontend/tests/unit/test_workspace_domain.test.ts`
- [ ] T042 [P] Performance tests for 50+ documents in `frontend/tests/performance/test_large_workspace.test.ts`
- [ ] T043 [P] Accessibility tests for keyboard navigation in `frontend/tests/accessibility/test_workspace_a11y.test.ts`
- [ ] T044 Layout transition performance optimization (<16ms target)
- [ ] T045 [P] Error handling and user feedback for failed operations
- [ ] T046 [P] Update component documentation in `frontend/src/domains/workspace/README.md`
- [ ] T047 Run quickstart validation scenarios from `specs/002-multi-document-workspace/quickstart.md`

## Dependencies
- Setup (T001-T003) before all other tasks
- Tests (T004-T013) before implementation (T014-T047)
- Domain models (T014-T022) before services (T023-T025)
- Services before infrastructure (T026-T029)
- Infrastructure before UI components (T030-T034)
- Core implementation before integration (T035-T039)
- Integration before polish (T040-T047)

## Parallel Example
```bash
# Launch contract tests together (T004-T009):
Task: "Contract test create_workspace command in src-tauri/tests/contract/test_workspace_commands.rs"
Task: "Contract test add_document_to_workspace command in src-tauri/tests/contract/test_document_commands.rs"
Task: "Contract test switch_layout_mode command in src-tauri/tests/contract/test_layout_commands.rs"
Task: "Contract test move_document and resize_document commands in src-tauri/tests/contract/test_document_manipulation.rs"
Task: "UI events contract test for layout_mode_changed in frontend/tests/contract/test_layout_events.test.ts"
Task: "UI events contract test for document_caddy lifecycle in frontend/tests/contract/test_document_events.test.ts"

# Launch domain models together (T014-T019):
Task: "WorkspaceId and DocumentCaddyId value objects in frontend/src/domains/workspace/domain/value-objects/identifiers.ts"
Task: "Position and Dimensions value objects in frontend/src/domains/workspace/domain/value-objects/geometry.ts"
Task: "LayoutMode value objects and strategy pattern in frontend/src/domains/workspace/domain/value-objects/layout-mode.ts"
Task: "DocumentCaddy entity in frontend/src/domains/workspace/domain/entities/document-caddy.ts"
Task: "Workspace aggregate root in frontend/src/domains/workspace/domain/aggregates/workspace.ts"
Task: "Domain events in frontend/src/domains/workspace/domain/events/workspace-events.ts"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify contract tests fail before implementing Tauri commands
- Verify UI tests fail before implementing React components
- Commit after each task
- Follow DDD architecture strictly - no cross-layer violations
- Maintain TypeScript strict mode compliance
- Use prefixed UUIDs (mws_, doc_) for all identifiers

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - workspace-commands.json → 7 Tauri command tests (T004-T007)
   - ui-events.json → 2 UI event tests (T008-T009)

2. **From Data Model**:
   - 4 core entities → 6 model creation tasks (T014-T019)
   - Backend models → 3 Rust domain tasks (T020-T022)

3. **From User Stories**:
   - Layout switching → integration test (T010)
   - Document management → workflow test (T011)
   - Auto-freeform switching → integration test (T012)
   - Researcher workflow → E2E test (T013)

4. **Ordering**:
   - Setup → Tests → Models → Services → Infrastructure → UI → Integration → Polish
   - Frontend and backend models can be parallel
   - UI components parallel when in different files

## Validation Checklist
*GATE: Checked by main() before returning*

- [✓] All contracts have corresponding tests (T004-T009)
- [✓] All entities have model tasks (T014-T022)
- [✓] All tests come before implementation (T004-T013 before T014+)
- [✓] Parallel tasks truly independent (different files/directories)
- [✓] Each task specifies exact file path
- [✓] No task modifies same file as another [P] task
- [✓] DDD architecture maintained across all tasks
- [✓] Tauri hybrid structure respected (frontend/backend separation)