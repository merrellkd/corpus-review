# Tasks: Frontend Architecture Refactoring

**Input**: Design documents from `/specs/006-refactor-existing-front/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `frontend/src/` structure following constitutional feature-based organization
- Current mixed structure → Constitutional feature-based vertical slices

## Phase 3.1: Setup and Structure Creation

- [ ] T001 Create constitutional feature directory structure in frontend/src/features/
- [ ] T002 [P] Create frontend/src/features/project-management/ subdirectories (components/, hooks/, services/, types/)
- [ ] T003 [P] Create frontend/src/features/workspace-navigation/ subdirectories (components/, hooks/, services/, types/)
- [ ] T004 [P] Create frontend/src/features/document-workspace/ subdirectories (components/, hooks/, services/, types/)
- [ ] T005 [P] Create frontend/src/shared/ subdirectories (components/, hooks/, services/, types/, utils/)

## Phase 3.2: Validation Tests ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST pass before moving any files**

- [ ] T006 [P] Contract test for feature-structure.schema.json validation in frontend/tests/contract/test_feature_structure.test.ts
- [ ] T007 [P] Contract test for migration-validation.schema.json in frontend/tests/contract/test_migration_validation.test.ts
- [ ] T008 [P] Integration test for Project Management workflow in frontend/tests/integration/test_project_management_refactor.test.ts
- [ ] T009 [P] Integration test for Workspace Navigation workflow in frontend/tests/integration/test_workspace_navigation_refactor.test.ts
- [ ] T010 [P] Integration test for Document Workspace workflow in frontend/tests/integration/test_document_workspace_refactor.test.ts
- [ ] T011A [P] Automated regression test suite baseline capture before any file movements in frontend/tests/regression/test_functionality_baseline.test.ts

## Phase 3.3: Project Management Feature Migration (Lowest Risk)

- [ ] T012 [P] Move domains/project/domain/value-objects/\* to frontend/src/features/project-management/types/value-objects/
- [ ] T013 [P] Move domains/project/domain/aggregates/\* to frontend/src/features/project-management/types/aggregates/
- [ ] T014 [P] Move domains/project/domain/errors/\* to frontend/src/features/project-management/types/errors/
- [ ] T015 [P] Move domains/project/infrastructure/\* to frontend/src/features/project-management/services/
- [ ] T016 [P] Move domains/project/application/\* to frontend/src/features/project-management/services/
- [ ] T017 [P] Move ui/components/create-project-form.tsx to frontend/src/features/project-management/components/
- [ ] T018 [P] Move ui/components/project-row.tsx to frontend/src/features/project-management/components/
- [ ] T019 [P] Move ui/pages/project-list-page.tsx to frontend/src/features/project-management/components/ProjectListPage.tsx
- [ ] T020 Update imports in project management files to use new feature-based paths
- [ ] T021 [P] Move stores/project-store.ts to frontend/src/features/project-management/store.ts
- [ ] T022 [P] Update stores/types/project-store-types.ts imports to project-management feature
- [ ] T023 Manual validation test for project management feature functionality
- [ ] T024 Move relevant unit tests to frontend/src/features/project-management/tests/

## Phase 3.4: Document Workspace Feature Migration (Medium Risk)

- [ ] T025 [P] Move components/DocumentWorkspace.tsx to frontend/src/features/document-workspace/components/
- [ ] T026 [P] Move components/FileExplorer.tsx to frontend/src/features/document-workspace/components/
- [ ] T027 [P] Move components/FilesCategoriesPanel.tsx to frontend/src/features/document-workspace/components/
- [ ] T028 [P] Move components/SearchPanel.tsx to frontend/src/features/document-workspace/components/
- [ ] T029 [P] Move domains/workspace/application/document-caddy-service.ts to frontend/src/features/document-workspace/services/
- [ ] T030 [P] Move domains/workspace/application/layout-engine-service.ts to frontend/src/features/document-workspace/services/
- [ ] T031 [P] Move domains/workspace/domain/entities/document-caddy.ts to frontend/src/features/document-workspace/types/
- [ ] T032 [P] Move domains/workspace/ui/components/\* to frontend/src/features/document-workspace/components/
- [ ] T033 [P] Move domains/workspace/ui/hooks/\* to frontend/src/features/document-workspace/hooks/
- [ ] T034 Update imports in document workspace files to use new feature-based paths
- [ ] T035 Create frontend/src/features/document-workspace/store.ts for document-specific state
- [ ] T036 Manual validation test for document workspace feature functionality
- [ ] T037 Move relevant unit tests to frontend/src/features/document-workspace/tests/

## Phase 3.5: Workspace Navigation Feature Migration (Highest Risk)

- [ ] T038 [P] Move domains/workspace/domain/aggregates/workspace.ts to frontend/src/features/workspace-navigation/types/
- [ ] T039 [P] Move domains/workspace/domain/entities/file-entry.ts to frontend/src/features/workspace-navigation/types/
- [ ] T040 [P] Move domains/workspace/domain/value-objects/\* to frontend/src/features/workspace-navigation/types/value-objects/
- [ ] T041 [P] Move domains/workspace/domain/errors/\* to frontend/src/features/workspace-navigation/types/errors/
- [ ] T042 [P] Move domains/workspace/domain/events/\* to frontend/src/features/workspace-navigation/types/events/
- [ ] T043 [P] Move domains/workspace/application/workspace-service.ts to frontend/src/features/workspace-navigation/services/
- [ ] T044 [P] Move domains/workspace/application/tauri-workspace-adapter.ts to frontend/src/features/workspace-navigation/services/
- [ ] T045 [P] Move domains/workspace/application/mock-workspace-adapter.ts to frontend/src/features/workspace-navigation/services/
- [ ] T046 [P] Move domains/workspace/infrastructure/\* to frontend/src/features/workspace-navigation/services/
- [ ] T047 [P] Move ui/components/workspace/\* to frontend/src/features/workspace-navigation/components/
- [ ] T048 [P] Move ui/pages/WorkspacePage.tsx to frontend/src/features/workspace-navigation/components/
- [ ] T049 Update imports in workspace navigation files to use new feature-based paths
- [ ] T050 Consolidate workspace stores: merge stores/workspace-store.ts and stores/workspaceStore.ts into frontend/src/features/workspace-navigation/store.ts
- [ ] T051 Manual validation test for workspace navigation feature functionality
- [ ] T052 Move relevant unit tests to frontend/src/features/workspace-navigation/tests/

## Phase 3.6: Shared Component Analysis and Movement

- [ ] T053 Analyze remaining components/ for 3+ feature usage and no business logic
- [ ] T054 [P] Move qualifying components to frontend/src/shared/components/
      [ ] T055A Analyze adapters/workspace-dto-adapter.ts usage across features to determine if 3+ feature rule applies
      [ ] T055B [P] Move adapters/workspace-dto-adapter.ts to frontend/src/shared/services/ (only if T055A confirms 3+ feature usage)
- [ ] T056 [P] Move shared utilities to frontend/src/shared/utils/
- [ ] T057 Update imports for shared components across all features

## Phase 3.7: Global Store Consolidation

- [ ] T058 Analyze stores/ directory for UI layout and cross-feature concerns
- [ ] T059 Consolidate stores/panelStateMachine.ts and stores/unifiedPanelState.ts into frontend/src/stores/ui-store.ts
- [ ] T060 Remove duplicate state management from stores/fileCategorization.ts if overlapping with features
- [ ] T061 Update all feature imports to use consolidated global stores
- [ ] T062 Manual validation test for global state management functionality

## Phase 3.8: Import Cleanup and Final Validation

- [ ] T063 [P] Update App.tsx imports to use new feature-based paths
- [ ] T064 [P] Update main.tsx imports if needed
- [ ] T065 [P] Run TypeScript compilation check for all frontend code
- [ ] T066 [P] Run ESLint to check for import violations and cross-feature dependencies
- [ ] T067 Verify no cross-feature imports exist (except shared/ and stores/)
- [ ] T068 Manual validation test: Complete project management workflow
- [ ] T069 Manual validation test: Complete workspace navigation workflow
- [ ] T070 Manual validation test: Complete document workspace workflow
- [ ] T071 Manual validation test: Cross-feature integration workflow
- [ ] T071A Comprehensive import statement verification: ensure all FR-010 import updates are complete and consistent

## Phase 3.9: Test Migration and Cleanup

- [ ] T072 [P] Update frontend/tests/integration/ imports to use new feature paths
- [ ] T073 [P] Update frontend/tests/contract/ imports to use new feature paths
- [ ] T074 [P] Remove old domains/ directory after verifying all files moved
- [ ] T075 [P] Remove old components/ directory after verifying all files moved
- [ ] T076 [P] Remove old ui/ directory after verifying all files moved
- [ ] T077 [P] Update package.json test scripts if needed for new structure

## Phase 3.10: Polish and Final Validation

- [ ] T078 [P] Run full test suite: npm run test
- [ ] T079 [P] Run development build: npm run dev
- [ ] T080 [P] Run production build: npm run build
- [ ] T081 [P] Performance validation: verify load times match baseline
- [ ] T082 [P] Memory usage validation: check for leaks or regressions
- [ ] T083 Execute complete quickstart.md validation scenarios
- [ ] T084 Verify constitutional compliance: feature self-containment check
- [ ] T085 Clean up any temporary files or unused imports

## Dependencies

- Structure creation (T001-T005) before all file movements
- Validation tests (T006-T011) before any implementation
- Project management migration (T012-T024) before document workspace
- Document workspace migration (T025-T037) before workspace navigation
- Workspace navigation migration (T038-T052) before shared component analysis
- All feature migrations before global store consolidation (T058-T062)
- All file movements before import cleanup (T063-T067)
- Import cleanup before test migration (T072-T077)
- Everything before final polish (T078-T085)

## Parallel Execution Examples

```
# Phase 3.1 - Structure Creation:
Task: "Create frontend/src/features/project-management/ subdirectories"
Task: "Create frontend/src/features/workspace-navigation/ subdirectories"
Task: "Create frontend/src/features/document-workspace/ subdirectories"
Task: "Create frontend/src/shared/ subdirectories"

# Phase 3.2 - Validation Tests:
Task: "Contract test for feature-structure.schema.json validation"
Task: "Contract test for migration-validation.schema.json"
Task: "Integration test for Project Management workflow"
Task: "Integration test for Workspace Navigation workflow"

# Phase 3.3 - Project Management Files:
Task: "Move domains/project/domain/value-objects/* to project-management/types/"
Task: "Move domains/project/domain/aggregates/* to project-management/types/"
Task: "Move domains/project/infrastructure/* to project-management/services/"
```

## Notes

- [P] tasks = different files/directories, no dependencies
- Manual validation after each feature migration is critical
- Commit after completing each phase
- TypeScript compilation must pass after each major phase
- Preserve all existing functionality - zero behavioral changes allowed

## Risk Mitigation

- Start with smallest feature (project-management) to validate approach
- Incremental validation prevents accumulation of breaking changes
- Feature-by-feature approach allows rollback if issues detected
- Import updates immediately follow file movements to catch issues early
