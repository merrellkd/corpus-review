# Tasks: Unify Store Pattern

**Input**: Design documents from `/specs/007-unify-store-pattern/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)

```
1. Load plan.md from feature directory
   → Extract: TypeScript, React, Zustand, Vite build system
   → Project Type: web - frontend TypeScript with Rust backend
2. Load design documents:
   → data-model.md: Store architecture with migration rules
   → contracts/: 3 schema files for validation
   → quickstart.md: Test scenarios for migration validation
3. Generate tasks by category:
   → Setup: store structure, dependencies, linting
   → Tests: contract validation, migration tests
   → Core: store migration, import path updates
   → Integration: TypeScript compilation, functionality tests
   → Polish: performance validation, cleanup
4. Apply task rules:
   → Different files/stores = mark [P] for parallel
   → Atomic migration = sequential for import updates
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/`, focus on stores/ directory migration
- Paths assume frontend TypeScript structure per plan.md

## Phase 3.1: Setup

- [ ] T001 Create unified store directory structure at frontend/src/stores/
- [ ] T002 [P] Setup TypeScript validation for store interfaces
- [ ] T003 [P] Configure linting rules for kebab-case store naming

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] T004 [P] Contract test for store structure validation using contracts/store-structure.schema.json
- [ ] T005 [P] Contract test for store interface compliance using contracts/store-interface.schema.json
- [ ] T006 [P] Contract test for migration validation using contracts/migration-validation.schema.json
- [ ] T007 [P] Integration test for project store functionality preservation
- [ ] T008 [P] Integration test for workspace store functionality preservation
- [ ] T009 [P] Integration test for UI panel store functionality preservation
- [ ] T010 [P] Integration test for file categorization store functionality preservation

## Phase 3.3: Core Implementation (ONLY after tests are failing)

- [ ] T011 [P] Create project store at frontend/src/stores/project/project-store.ts
- [ ] T012 [P] Create project store types at frontend/src/stores/project/project-store-types.ts
- [ ] T013 [P] Create project store index at frontend/src/stores/project/index.ts
- [ ] T014 [P] Create workspace store at frontend/src/stores/workspace/workspace-store.ts
- [ ] T015 [P] Create workspace store types at frontend/src/stores/workspace/workspace-store-types.ts
- [ ] T016 [P] Create workspace store index at frontend/src/stores/workspace/index.ts
- [ ] T017 [P] Create consolidated panel store at frontend/src/stores/ui/panel-store.ts
- [ ] T018 [P] Create UI store types at frontend/src/stores/ui/ui-store-types.ts
- [ ] T019 [P] Create UI store index at frontend/src/stores/ui/index.ts
- [ ] T020 [P] Create file categorization store at frontend/src/stores/shared/file-categorization-store.ts
- [ ] T021 [P] Create shared store index at frontend/src/stores/shared/index.ts
- [ ] T022 Create global stores index at frontend/src/stores/index.ts
- [ ] T023 Update all import paths from features/project-management/store to stores/project
- [ ] T024 Update all import paths from stores/workspaceStore to stores/workspace
- [ ] T025 Update all import paths from stores/workspace-store to stores/workspace
- [ ] T026 Update all import paths from domains/workspace/ui/stores/workspace-store to stores/workspace
- [ ] T027 Update all import paths from stores/panelStateMachine to stores/ui
- [ ] T028 Update all import paths from stores/unifiedPanelState to stores/ui
- [ ] T029 Update all import paths from stores/fileCategorization to stores/shared
- [ ] T030 Remove duplicate workspace store at stores/workspace-store.ts
- [ ] T031 Remove duplicate workspace store at domains/workspace/ui/stores/workspace-store.ts
- [ ] T032 Remove duplicate panel store at stores/unifiedPanelState.ts
- [ ] T033 Remove original project store at features/project-management/store.ts

## Phase 3.4: Integration

- [ ] T034 Verify TypeScript compilation passes with new store structure
- [ ] T035 Verify all store APIs preserved (no breaking changes)
- [ ] T036 Verify kebab-case naming convention compliance
- [ ] T037 Test store functionality in development environment
- [ ] T038 Validate cross-store communication patterns

## Phase 3.5: Polish

- [ ] T039 [P] Run quickstart.md test scenarios for migration validation
- [ ] T040 [P] Performance validation: store access times unchanged
- [ ] T041 [P] Bundle size analysis: ensure no increase from migration
- [ ] T042 [P] Update any store-related documentation
- [ ] T043 Remove any obsolete store configuration files
- [ ] T044 Validate atomic migration completeness
- [ ] Add documentation per requirements

## Dependencies

- Setup (T001-T003) before tests and implementation
- Tests (T004-T010) before core implementation (T011-T033)
- Store creation (T011-T022) before import updates (T023-T029)
- Import updates (T023-T029) before file removal (T030-T033)
- Core complete before integration (T034-T038)
- Everything before polish (T039-T044)

## Parallel Example

```
# Launch store creation together:
Task: "Create project store at frontend/src/stores/project/project-store.ts"
Task: "Create workspace store at frontend/src/stores/workspace/workspace-store.ts"
Task: "Create consolidated panel store at frontend/src/stores/ui/panel-store.ts"
Task: "Create file categorization store at frontend/src/stores/shared/file-categorization-store.ts"
```

## Notes

- [P] tasks = different files/stores, no dependencies
- Import updates must be atomic (T023-T029 in sequence)
- Verify tests fail before implementing stores
- Preserve all existing store functionality
- Follow kebab-case naming convention

## Task Generation Rules

_Applied during main() execution_

1. **From Contracts**:

   - store-structure.schema.json → structure validation test
   - store-interface.schema.json → interface compliance test
   - migration-validation.schema.json → migration success test

2. **From Data Model**:

   - FeatureStore entities → individual store creation tasks [P]
   - Migration rules → import update and file removal tasks

3. **From Quickstart Scenarios**:

   - Each test scenario → validation task [P]
   - Performance tests → bundle and runtime validation

4. **Ordering**:
   - Setup → Tests → Store Creation → Import Updates → File Cleanup → Integration → Polish
   - Store creation can be parallel, import updates must be sequential

## Validation Checklist

_GATE: Checked by main() before returning_

- [x] All contracts have corresponding tests (T004-T006)
- [x] All store entities have creation tasks (T011-T021)
- [x] All tests come before implementation (T004-T010 before T011+)
- [x] Parallel tasks truly independent (different store files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Migration atomicity preserved (import updates sequential)
- [x] Store functionality preservation verified (T007-T010, T034-T038)
