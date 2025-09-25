# Quick Start: Workspace Backend Integration Testing

## Test Execution Guide

This guide provides testing scenarios to validate the integration of real file system backend with the rich workspace UI.

## Prerequisites

- Working project database with real source folders
- Tauri commands from 004-workspace-navigation-kent functional
- Rich UI components from 001-project-workspace available

## Contract Tests (Backend Validation)

### Test 1: Open Workspace Command
**Purpose**: Verify `open_workspace_navigation` works with real projects

```bash
# Test command directly
npm run tauri dev
# In browser console:
await window.__TAURI__.invoke('open_workspace_navigation', {
  projectId: 'proj_36061933-4239-4bfb-8f0d-dcdae89f863c',
  projectName: 'Test',
  sourceFolder: '/Users/kdm/projects/digital-ext/business-os'
});

# Expected result:
{
  projectId: 'proj_36061933-4239-4bfb-8f0d-dcdae89f863c',
  projectName: 'Test',
  sourceFolder: '/Users/kdm/projects/digital-ext/business-os',
  currentPath: '/Users/kdm/projects/digital-ext/business-os',
  directoryListing: {
    entries: [
      { name: '00_daily-journal', type: 'directory', ... },
      { name: 'CLAUDE.md', type: 'file', size: 12253, ... },
      // ... more real files
    ],
    canNavigateUp: false,
    isRoot: true
  }
}
```

**Pass Criteria**: Returns real directory structure with actual files and folders

### Test 2: Directory Navigation
**Purpose**: Verify folder navigation works with real directories

```bash
# Navigate into subdirectory
await window.__TAURI__.invoke('navigate_to_folder', {
  projectId: 'proj_36061933-4239-4bfb-8f0d-dcdae89f863c',
  projectName: 'Test',
  sourceFolder: '/Users/kdm/projects/digital-ext/business-os',
  currentPath: '/Users/kdm/projects/digital-ext/business-os',
  folderName: '01_projects'
});

# Expected result: New workspace with updated currentPath and directory listing
```

**Pass Criteria**: Navigation works, returns contents of actual subdirectory

## Integration Tests (Store Layer)

### Test 3: Workspace Store Real Data Loading
**Purpose**: Verify workspace store loads real project data

```typescript
// Test in browser console after opening workspace
const store = useWorkspaceStore.getState();
await store.loadProject('proj_36061933-4239-4bfb-8f0d-dcdae89f863c');

console.log('Current Project:', store.currentProject);
console.log('File Explorer Items:', store.fileExplorerItems);
console.log('Current Path:', store.currentPath);

// Expected results:
// - currentProject: Real project data from database
// - fileExplorerItems: Array of real files and folders
// - currentPath: Actual source folder path
// - No mock data present
```

**Pass Criteria**: Store contains real file system data, not mock data

### Test 4: Real File Navigation via Store
**Purpose**: Verify store navigation methods work with real backend

```typescript
// In browser console
const store = useWorkspaceStore.getState();

// Navigate to a real subdirectory
await store.navigateToFolder('01_projects');

console.log('New Path:', store.currentPath);
console.log('New Files:', store.fileExplorerItems);

// Navigate back to parent
await store.navigateToParent();

console.log('Back to parent:', store.currentPath);
```

**Pass Criteria**: Navigation updates store with real directory contents

## Component Integration Tests (UI Layer)

### Test 5: FilesCategoriesPanel Real Data Display
**Purpose**: Verify File Explorer shows real project files

**Steps**:
1. Open rich workspace for a project with known files
2. Check File Explorer panel displays real files
3. Verify file metadata (names, types, sizes) matches actual files

**Expected Results**:
- File Explorer section shows actual project files
- Folders and files are correctly identified and displayed
- No mock filenames like "mock-file.txt" visible

### Test 6: Real Folder Navigation in UI
**Purpose**: Verify double-click folder navigation works with real directories

**Steps**:
1. Open workspace for project with subdirectories
2. Double-click a folder in File Explorer
3. Verify navigation occurs and shows real subfolder contents
4. Use breadcrumb or back navigation to return

**Expected Results**:
- Double-click navigates to real subdirectory
- File Explorer updates with actual subfolder contents
- Navigation history tracks real paths

## End-to-End Workflow Tests

### Test 7: Complete Project-to-Workspace Flow
**Purpose**: Verify complete user workflow with real data

**Scenario**: "User browses real project files in rich workspace"

**Steps**:
1. Start from project list showing real projects
2. Click "Browse Files" on a project with known source folder structure
3. Verify rich workspace opens with correct project name in header
4. Check File Explorer panel shows actual files from source folder
5. Navigate into a subdirectory by double-clicking
6. Verify correct subdirectory contents display
7. Use "Return to Project List" to navigate back
8. Verify return to project list works

**Expected Results**:
- Rich workspace loads real project data
- All panel toggles (Files & Categories, Search) work
- File Explorer shows actual project structure
- Folder navigation works with real directories
- Back navigation preserves all functionality

### Test 8: Panel State with Real Data
**Purpose**: Verify panel management works with real file operations

**Steps**:
1. Open workspace and load real project files
2. Toggle Files & Categories panel off/on
3. Toggle Search panel off/on
4. Resize panels by dragging borders
5. Navigate to different folders
6. Verify panel states persist through navigation

**Expected Results**:
- Panel toggles work normally with real data loading
- Panel sizes persist during file navigation
- UI remains responsive during real file operations

## Error Handling Tests

### Test 9: Inaccessible Source Folder
**Purpose**: Verify graceful handling of file system errors

**Setup**: Create project with inaccessible or non-existent source folder

**Steps**:
1. Try to open workspace for project with bad source folder
2. Verify error handling displays user-friendly message
3. Verify UI doesn't crash or show technical error details

**Expected Results**:
- Clear error message about folder accessibility
- Option to return to project list
- No application crash or technical error display

### Test 10: Permission Denied Scenario
**Purpose**: Verify handling of permission restrictions

**Steps**:
1. Navigate to folder with restricted permissions (if available)
2. Verify appropriate error message displays
3. Verify ability to navigate back to accessible areas

**Expected Results**:
- Descriptive permission error message
- Graceful fallback to previous accessible location

## Performance Tests

### Test 11: Large Directory Handling
**Purpose**: Verify performance with directories containing many files

**Setup**: Test with project folder containing 100+ files

**Steps**:
1. Open workspace for project with large source folder
2. Measure loading time for initial file display
3. Navigate into subdirectories with many files
4. Verify UI responsiveness during loading

**Expected Results**:
- Initial load completes within 2 seconds
- Folder navigation completes within 500ms
- Loading indicators appear during operations
- UI remains responsive, no freezing

## Success Validation Checklist

Mark tests as passing when:

- [ ] **Contract Tests**: All Tauri commands return real file system data
- [ ] **Store Integration**: Workspace store contains real data, no mock data
- [ ] **Component Display**: File Explorer shows actual project files
- [ ] **Navigation**: Folder navigation works with real directories
- [ ] **Panel Management**: All existing UI functionality preserved
- [ ] **Error Handling**: Graceful handling of file system issues
- [ ] **Performance**: Acceptable load times and responsiveness
- [ ] **End-to-End**: Complete user workflows functional
- [ ] **State Persistence**: Panel states survive real data operations

## Test Data Requirements

### Real Projects Needed
- Project with accessible source folder containing files and subdirectories
- Project with inaccessible source folder (for error testing)
- Project with large directory (100+ files for performance testing)

### Example Test Project Structure
```
/Users/kdm/projects/digital-ext/business-os/
├── 00_daily-journal/           # Subdirectory for navigation testing
├── 01_projects/               # Another subdirectory
├── CLAUDE.md                  # Real file
├── README.md                  # Another real file
└── pyproject.toml            # Configuration file
```

---

*These tests validate that the rich workspace UI successfully integrates with real file system operations while maintaining all existing functionality.*