# Tasks: Project Workspace Component Consolidation

**Input**: Design documents from `/specs/008-consolidate-frontend-src/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript, React 18, Vite, Zustand, Tauri
   → Structure: Frontend feature-based organization
2. Load design documents:
   → data-model.md: ProjectWorkspace component, simplified types
   → contracts/: Component interface contract
   → quickstart.md: Validation scenarios
3. Generate tasks by category:
   → Setup: Validate current structure, prepare directories
   → Tests: Component interface tests, import compatibility tests
   → Core: Component relocation, type simplification, feature index
   → Integration: Backward compatibility layer, import validation
   → Polish: Cleanup, documentation, validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Component and types can be parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Dependencies: Setup → Tests → Core → Integration → Polish
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend structure**: `frontend/src/features/project/`
- **Global components**: `frontend/src/components/`
- **Types**: Feature-specific type definitions

## Phase 3.1: Setup & Analysis
- [ ] T001 Analyze current ProjectWorkspace component structure at `frontend/src/components/ProjectWorkspace.tsx`
- [ ] T002 Validate existing project feature directory structure at `frontend/src/features/project/`
- [ ] T003 [P] Identify all import statements referencing ProjectWorkspace across codebase
- [ ] T004 [P] Verify current TypeScript compilation passes with `npm run typecheck`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T005 [P] Component interface contract test in `frontend/src/features/project/__tests__/ProjectWorkspace.interface.test.tsx`
- [ ] T006 [P] Feature import compatibility test in `frontend/src/features/project/__tests__/import-compatibility.test.ts`
- [ ] T007 [P] Backward compatibility import test in `frontend/src/components/__tests__/ProjectWorkspace.compatibility.test.ts`
- [ ] T008 [P] Props interface validation test in `frontend/src/features/project/__tests__/props-validation.test.tsx`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T009 [P] Create simplified project types in `frontend/src/features/project/types/project-types.ts`
- [ ] T010 [P] Create simplified workspace types in `frontend/src/features/project/types/workspace-types.ts`
- [ ] T011 Create feature components directory at `frontend/src/features/project/components/`
- [ ] T012 Move and simplify ProjectWorkspace component to `frontend/src/features/project/components/ProjectWorkspace.tsx`
- [ ] T013 Remove DDD patterns and flatten imports in ProjectWorkspace component
- [ ] T014 Create feature index file at `frontend/src/features/project/index.ts` with clean exports
- [ ] T015 Update ProjectWorkspace component to use simplified types from local types directory

## Phase 3.4: Integration & Compatibility
- [ ] T016 Create temporary re-export compatibility layer at `frontend/src/components/ProjectWorkspace.tsx`
- [ ] T017 Validate backward compatibility by testing imports from both paths
- [ ] T018 Update any internal feature imports to use relative paths from new location
- [ ] T019 Verify TypeScript compilation passes after all changes with `npm run typecheck`

## Phase 3.5: Polish & Validation
- [ ] T020 [P] Run quickstart validation scenarios from `quickstart.md`
- [ ] T021 [P] Verify component renders identically in new location
- [ ] T022 [P] Validate all existing functionality preserved (props, store integration, UI behavior)
- [ ] T023 [P] Test import paths from external components work correctly
- [ ] T024 [P] Verify no bundle size increase from reorganization
- [ ] T025 Document migration path in feature README (if needed for future reference)

## Dependencies
- Setup (T001-T004) before tests (T005-T008)
- Tests (T005-T008) before implementation (T009-T015)
- T009-T010 (types) before T012 (component that uses types)
- T012-T014 (component changes) before T015 (component type updates)
- T015 before T016 (compatibility layer needs working component)
- Implementation (T009-T015) before integration (T016-T019)
- Integration before polish (T020-T025)

## Parallel Example
```
# Launch T009-T010 together (different type files):
Task: "Create simplified project types in frontend/src/features/project/types/project-types.ts"
Task: "Create simplified workspace types in frontend/src/features/project/types/workspace-types.ts"

# Launch T005-T008 together (different test files):
Task: "Component interface contract test in frontend/src/features/project/__tests__/ProjectWorkspace.interface.test.tsx"
Task: "Feature import compatibility test in frontend/src/features/project/__tests__/import-compatibility.test.ts"
Task: "Backward compatibility import test in frontend/src/components/__tests__/ProjectWorkspace.compatibility.test.ts"
Task: "Props interface validation test in frontend/src/features/project/__tests__/props-validation.test.tsx"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify tests fail before implementing components
- Maintain exact component functionality during move
- TypeScript strict mode must pass throughout
- Backward compatibility maintained via re-export layer

## Task Generation Rules
*Applied during main() execution*

1. **From Component Interface Contract**:
   - Interface contract → component interface test [P]
   - Import paths → import compatibility tests [P]

2. **From Data Model**:
   - ProjectWorkspace component → component relocation task
   - Simplified types → type creation tasks [P]
   - Feature index → clean exports task

3. **From Quickstart Scenarios**:
   - Validation steps → polish validation tasks [P]
   - Functional testing → component behavior verification

4. **Ordering**:
   - Setup → Tests → Types → Component → Compatibility → Polish
   - Types before component implementation
   - Component before compatibility layer

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All component interfaces have corresponding tests
- [x] All type entities have creation tasks
- [x] All tests come before implementation
- [x] Parallel tasks truly independent (different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Backward compatibility maintained throughout transition