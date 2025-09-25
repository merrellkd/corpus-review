# Tasks: Workspace Backend Integration

**Input**: Integration of real file system backend with rich workspace UI
**Prerequisites**: spec.md ✓, data-model.md ✓, working Tauri commands from 004-workspace-navigation-kent

## Execution Flow (main)

```
1. Load design documents ✓
   → Rich UI components from 001-project-workspace preserved
   → Working backend commands from 004-workspace-navigation-kent reused
2. Generate integration tasks by layer:
   → Store Layer: Replace mock data with real Tauri calls
   → Component Layer: Connect UI to real file data
   → Testing Layer: Migrate tests to real file system
3. Apply systematic execution:
   → Test-driven approach with contract validation
   → Preserve all existing UI functionality
   → Integrate real backend incrementally
4. Validate end-to-end integration:
   → Real project files display in rich UI
   → All panel functionality preserved
   → File navigation works with actual directories
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths assume existing project structure from constitution

## Phase 1: Backend Integration Testing (TDD Approach)

### Contract Validation (Ensure backend compatibility)
- [x] T001 [P] Verify `open_workspace_navigation` Tauri command works with real projects
- [x] T002 [P] Verify `list_directory` command returns expected DirectoryListing structure
- [x] T003 [P] Verify `navigate_to_folder` command handles real directory navigation
- [x] T004 [P] Verify `navigate_to_parent` command respects source folder boundaries

### Integration Test Setup
- [x] T005 [P] Create integration test for rich workspace with real backend in `tests/integration/workspace_integration_test.rs`
- [x] T006 [P] Create test for FileExplorer component with real file data in `tests/components/file-explorer-real-data.test.ts`
- [x] T007 [P] Create test for workspace store with Tauri command integration in `tests/stores/workspace-store-integration.test.ts`

## Phase 2: Store Layer Integration

### WorkspaceStore Enhancement
- [x] T008 Remove mock data flag from `src/stores/workspaceStore.ts` (set `isDevelopment = false`)
- [x] T009 Replace mock `loadProject` implementation with real Tauri call to `open_workspace_navigation`
- [x] T010 Add real `navigateToFolder` method using `navigate_to_folder` Tauri command
- [x] T011 Add real `navigateToParent` method using `navigate_to_parent` Tauri command
- [x] T012 Add real `refreshFiles` method using `list_directory` Tauri command

### Error Handling Enhancement
- [x] T013 [P] Add file system error handling to workspace store in `src/stores/workspaceStore.ts`
- [x] T014 [P] Create user-friendly error messages for common file system issues
- [x] T015 [P] Add loading states for real file system operations

## Phase 3: Component Integration

### FilesCategoriesPanel Enhancement
- [x] T016 Update FilesCategoriesPanel to use real `fileExplorerItems` from store in `src/components/FilesCategoriesPanel.tsx`
- [x] T017 Add real file navigation handlers (double-click to navigate folders)
- [x] T018 Add file system error display in File Explorer section
- [x] T019 Add loading states for directory navigation

### UI Component Updates
- [x] T020 [P] Update ProjectWorkspace loading states for real backend calls in `src/components/ProjectWorkspace.tsx`
- [x] T021 [P] Preserve all existing panel toggle functionality in TopToolbar
- [x] T022 [P] Ensure Document Workspace area remains available for future features

## Phase 4: Data Type Integration

### Type Compatibility
- [x] T023 [P] Create adapter between Tauri DTOs and UI store types in `src/adapters/workspace-dto-adapter.ts`
- [x] T024 [P] Update FileSystemItem interface to match real file system data structure
- [x] T025 [P] Ensure WorkspaceLayout persistence compatibility with real data

### Navigation Integration
- [ ] T026 [P] Create navigation history management for real directory browsing
- [ ] T027 [P] Add breadcrumb support for real file paths
- [ ] T028 [P] Implement back/forward navigation with real directories

## Phase 5: Performance & Polish

### Performance Optimization
- [ ] T029 [P] Add file loading performance monitoring and optimization
- [ ] T030 [P] Implement directory caching for frequently accessed folders
- [ ] T031 [P] Add lazy loading for large directory listings

### User Experience Enhancement
- [ ] T032 [P] Add file type icons based on real file extensions
- [ ] T033 [P] Add file size and modification date display from real file metadata
- [ ] T034 [P] Improve error messages for inaccessible directories

## Phase 6: Test Migration & Validation

### Existing Test Updates
- [ ] T035 Update all existing workspace store tests to work with real backend
- [ ] T036 Update FilesCategoriesPanel tests to use real file data
- [ ] T037 Update ProjectWorkspace integration tests for real file system

### End-to-End Validation
- [ ] T038 [P] Create E2E test: Project list → Rich workspace → Real file browsing
- [ ] T039 [P] Create E2E test: Panel state persistence with real file navigation
- [ ] T040 [P] Create E2E test: Error handling for inaccessible project folders

## Dependencies & Execution Order

### Critical Path
```
T001-T004 (Contract Tests) → T005-T007 (Integration Setup) → T008-T012 (Store Integration) → T016-T019 (Component Updates) → T035-T040 (Test Migration)
```

### Parallel Execution Opportunities

**Phase 1 - All contract tests (run simultaneously):**
```bash
# Verify all backend commands work
Task agent "Verify open_workspace_navigation command"
Task agent "Verify list_directory command"
Task agent "Verify navigate_to_folder command"
Task agent "Verify navigate_to_parent command"
```

**Phase 2 - Store enhancement (sequential for same file):**
```bash
# Must be done in order since they modify same file
T008 → T009 → T010 → T011 → T012 (workspaceStore.ts changes)
```

**Phase 3 - Component updates (run simultaneously):**
```bash
# Different components, can be parallel
Task agent "Update FilesCategoriesPanel for real data"
Task agent "Update ProjectWorkspace loading states"
Task agent "Preserve TopToolbar panel functionality"
```

**Phase 4 - Type integration (run simultaneously):**
```bash
# Different files, can be parallel
Task agent "Create workspace DTO adapter"
Task agent "Update FileSystemItem interface"
Task agent "Ensure WorkspaceLayout compatibility"
```

## Validation Checklist

Before marking feature complete, verify:

- [ ] Real project files display in rich workspace File Explorer
- [ ] All panel toggles (Files & Categories, Search) work as before
- [ ] Panel resizing and state persistence still functional
- [ ] File navigation works with real directories and respects boundaries
- [ ] Error handling graceful for inaccessible folders
- [ ] Performance acceptable (<2s load, <500ms navigation)
- [ ] All existing UI layouts and features preserved
- [ ] Back navigation to project list works correctly
- [ ] TypeScript compilation passes with strict mode
- [ ] All integration tests pass with real file system

## Success Metrics

### User Experience
- **File Loading**: <2 seconds for typical project directories
- **Navigation**: <500ms between folder transitions
- **Error Recovery**: Clear messages, graceful fallbacks
- **UI Preservation**: 100% of existing panel functionality maintained

### Technical Integration
- **Backend Reuse**: 100% of working Tauri commands from 004-workspace-navigation-kent
- **UI Preservation**: 100% of rich components from 001-project-workspace
- **Test Coverage**: All critical workflows covered by integration tests
- **Performance**: No regression in panel operations or UI responsiveness

---

*This systematic approach ensures the rich UI gets real file system capabilities while preserving all existing functionality and maintaining architectural consistency.*