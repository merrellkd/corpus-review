# Implementation Plan: Workspace Backend Integration

## Overview

This plan integrates the rich multi-panel workspace UI (from 001-project-workspace) with the real file system backend (from 004-workspace-navigation-kent), creating the best of both systems.

## Technical Architecture

### Integration Strategy
- **Preserve Rich UI**: Keep all existing components and panel functionality
- **Replace Mock Data**: Swap mock data with real Tauri file system calls
- **Reuse Working Backend**: Leverage proven commands from 004-workspace-navigation-kent
- **Maintain Architecture**: Follow existing DDD patterns and store structure

### Tech Stack (Unchanged)
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Tauri (Rust) - existing commands
- **Database**: SQLite - existing projects table
- **State Management**: Zustand - enhanced with real data
- **UI Framework**: React Resizable Panels - preserved

## Implementation Approach

### Phase 1: Backend Validation (Contract Testing)
**Goal**: Ensure existing Tauri commands work with real project data

```typescript
// Verify these existing commands work
await invoke('open_workspace_navigation', { projectId, projectName, sourceFolder });
await invoke('list_directory', { projectId, projectName, sourceFolder, currentPath });
await invoke('navigate_to_folder', { projectId, projectName, sourceFolder, currentPath, folderName });
await invoke('navigate_to_parent', { projectId, projectName, sourceFolder, currentPath });
```

**Success Criteria**: All commands return expected data structures

### Phase 2: Store Integration (Core Changes)
**Goal**: Replace mock data in workspace store with real backend calls

**Current Mock Implementation**:
```typescript
// FROM: src/stores/workspaceStore.ts
const isDevelopment = true // Simplified for now

loadProject: async (_projectId: string) => {
  if (isDevelopment) {
    // Mock data implementation
    set({ currentProject: mockProject, fileExplorerItems: mockFiles });
  }
}
```

**New Real Implementation**:
```typescript
// TO: Enhanced with real backend
const isDevelopment = false // Enable real backend

loadProject: async (projectId: string) => {
  set({ isLoading: true });
  try {
    // Get project from database
    const project = await invoke('get_project', { projectId });

    // Load real workspace
    const workspace = await invoke('open_workspace_navigation', {
      projectId: project.id,
      projectName: project.name,
      sourceFolder: project.source_folder
    });

    set({
      currentProject: project,
      fileExplorerItems: workspace.directoryListing.entries,
      currentPath: workspace.currentPath,
      isLoading: false
    });
  } catch (error) {
    set({ error: error.message, isLoading: false });
  }
}
```

### Phase 3: Component Enhancement
**Goal**: Connect UI components to real file system data

**FilesCategoriesPanel Integration**:
```typescript
// Enhanced to handle real file operations
export const FilesCategoriesPanel: React.FC = () => {
  const { fileExplorerItems, navigateToFolder, isLoading } = useWorkspaceStore();

  const handleFolderDoubleClick = async (folderName: string) => {
    await navigateToFolder(folderName); // Now calls real backend
  };

  return (
    <div>
      {isLoading && <div>Loading files...</div>}
      {fileExplorerItems.map(item => (
        <FileItem
          key={item.path}
          item={item}
          onDoubleClick={item.type === 'directory' ? () => handleFolderDoubleClick(item.name) : undefined}
        />
      ))}
    </div>
  );
};
```

### Phase 4: Error Handling & UX
**Goal**: Graceful handling of real file system issues

**Error Scenarios**:
- Project source folder doesn't exist or is inaccessible
- Permission denied on directory navigation
- Network/database connection issues
- Large directories with performance concerns

**Implementation**:
```typescript
// Enhanced error handling
const handleFileSystemError = (error: any): string => {
  if (error.message?.includes('permission')) {
    return 'Permission denied. Check folder access rights.';
  }
  if (error.message?.includes('not found')) {
    return 'Folder not found. The project source may have been moved.';
  }
  return `File system error: ${error.message}`;
};
```

## File Structure Changes

### Modified Files
```
src/stores/workspaceStore.ts           # Core integration - mock to real data
src/components/FilesCategoriesPanel.tsx # Connect to real file operations
src/components/ProjectWorkspace.tsx     # Enhanced loading states
src/adapters/workspace-dto-adapter.ts   # New - bridge DTO formats
```

### New Files (Minimal)
```
tests/integration/workspace_integration_test.rs  # Real backend testing
tests/stores/workspace-store-integration.test.ts # Store integration tests
src/types/workspace-integration.ts               # Integration type definitions
```

### Preserved Files (Unchanged)
```
src/components/TopToolbar.tsx          # Panel toggles work as-is
src/components/SearchPanel.tsx         # Preserved for future features
src/components/DocumentWorkspace.tsx   # Maintained for multi-document
src/stores/unifiedPanelState.ts       # Panel state management unchanged
```

## Data Flow Architecture

### Current Flow (Mock Data)
```
User Action → UI Component → Workspace Store → Mock Data → UI Update
```

### New Flow (Real Backend)
```
User Action → UI Component → Workspace Store → Tauri Command → File System → Real Data → UI Update
```

### Integration Points
1. **Project Selection**: App.tsx → ProjectWorkspace (unchanged)
2. **Workspace Loading**: ProjectWorkspace → workspaceStore.loadProject() (enhanced)
3. **File Display**: workspaceStore → FilesCategoriesPanel (real data)
4. **Navigation**: User clicks → store.navigateToFolder() → Tauri command → real navigation

## Testing Strategy

### Contract Tests (Phase 1)
Verify backend commands work as expected:
```rust
#[test]
async fn test_open_workspace_with_real_project() {
    let workspace = open_workspace_navigation(
        "proj_12345".to_string(),
        "Test Project".to_string(),
        "/Users/test/real-folder".to_string()
    ).await.unwrap();

    assert!(!workspace.directory_listing.entries.is_empty());
    assert_eq!(workspace.current_path, "/Users/test/real-folder");
}
```

### Integration Tests (Phase 2)
Verify store integration:
```typescript
test('workspace store loads real project files', async () => {
  const store = useWorkspaceStore.getState();
  await store.loadProject('proj_12345');

  expect(store.currentProject).toBeDefined();
  expect(store.fileExplorerItems.length).toBeGreaterThan(0);
  expect(store.fileExplorerItems[0].type).toBe('file' | 'directory');
});
```

### E2E Tests (Phase 3)
Verify complete user workflows:
```typescript
test('user can browse real project files in rich workspace', async () => {
  // Navigate from project list to workspace
  await user.click(screen.getByText('Browse Files'));

  // Verify rich workspace opens
  expect(screen.getByTestId('workspace-container')).toBeInTheDocument();

  // Verify real files are displayed
  expect(screen.getByText('src')).toBeInTheDocument(); // Real folder
  expect(screen.getByText('package.json')).toBeInTheDocument(); // Real file
});
```

## Risk Mitigation

### Technical Risks
1. **Type Compatibility**: DTO formats between backend systems may differ
   - **Mitigation**: Create adapter layer to bridge type differences
2. **Performance**: Real file operations slower than mock data
   - **Mitigation**: Add caching, loading states, optimize large directories
3. **Error Handling**: More error scenarios with real file system
   - **Mitigation**: Comprehensive error handling with user-friendly messages

### User Experience Risks
1. **UI Regression**: Changes might break existing panel functionality
   - **Mitigation**: Preserve all existing UI components, test extensively
2. **Performance Perception**: Loading states needed for real file operations
   - **Mitigation**: Add proper loading indicators, optimize responsiveness

## Success Metrics

### Technical Success
- [ ] All existing UI components work unchanged
- [ ] Real file system integration functional
- [ ] Performance within acceptable bounds (<2s load, <500ms nav)
- [ ] All tests pass with real backend
- [ ] TypeScript compilation clean

### User Experience Success
- [ ] Users see their actual project files in rich workspace
- [ ] All panel features (toggle, resize, persist) work as before
- [ ] File navigation is intuitive and responsive
- [ ] Error states are clear and actionable
- [ ] No functionality regression from current rich workspace

---

*This plan systematically integrates real file system capabilities into the rich workspace UI while preserving all existing functionality and maintaining architectural integrity.*