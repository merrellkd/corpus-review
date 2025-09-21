# Quickstart: Project Workspace

**Feature**: Project Workspace (Updated for Mutually Exclusive Panel Architecture)
**Date**: 2025-09-20
**Purpose**: Validate implementation against user scenarios with new panel design

## Prerequisites
- Project created with Source and Reports folder paths configured
- Tauri application running with filesystem permissions
- React frontend connected to Tauri backend

## Test Scenarios

### Scenario 1: Initial Workspace Load
**Given**: User opens a project with configured Source/Reports folders
**When**: Project Workspace interface loads
**Then**:
- [ ] Files & Categories panel is visible by default
- [ ] File Explorer section shows files from Source folder
- [ ] File Explorer section shows files from Reports folder
- [ ] Category Explorer section is visible but empty
- [ ] Search panel is hidden by default
- [ ] Multi-Document Workspace area is visible and empty
- [ ] Top toolbar shows "Files & Categories" and "Search" toggle buttons

**Validation Steps**:
1. Open project "Test Project"
2. Navigate to Project Workspace
3. Verify Files & Categories panel is active on left
4. Verify File Explorer section shows test files from both folders
5. Verify Category Explorer section displays empty state message
6. Verify Search panel is not visible
7. Verify MDW area shows "No documents open" state
8. Verify top toolbar has both toggle buttons

### Scenario 2: Mutually Exclusive Panel Switching
**Given**: Workspace is loaded with Files & Categories panel visible
**When**: User toggles between panels
**Then**:
- [ ] "Search" toggle switches to Search panel, hides Files & Categories panel
- [ ] "Files & Categories" toggle switches back to Files & Categories panel, hides Search panel
- [ ] Toggling same active panel hides it, shows full-width MDW
- [ ] Only one panel can be visible at a time (mutually exclusive)
- [ ] Panel states persist when workspace reloaded

**Validation Steps**:
1. Start with Files & Categories panel visible
2. Click "Search" toggle - verify Search panel shows, Files & Categories panel hides
3. Click "Files & Categories" toggle - verify Files & Categories panel shows, Search panel hides
4. Click "Files & Categories" toggle again - verify panel hides, MDW spans full width
5. Reload workspace - verify panel state restored
6. Toggle panels to verify mutually exclusive behavior

### Scenario 3: Independent Section Visibility within Files & Categories Panel
**Given**: Files & Categories panel is active
**When**: User toggles individual sections within the panel
**Then**:
- [ ] File Explorer section can be hidden while Category Explorer section remains visible
- [ ] Category Explorer section can be hidden while File Explorer section remains visible
- [ ] When both sections are hidden, entire Files & Categories panel automatically disappears
- [ ] When any section is shown, Files & Categories panel becomes visible
- [ ] Section visibility states persist when workspace reloaded

**Validation Steps**:
1. Start with Files & Categories panel visible (both sections shown)
2. Hide File Explorer section - verify Category Explorer section remains visible
3. Hide Category Explorer section - verify File Explorer section remains visible
4. Hide both sections - verify entire Files & Categories panel disappears, MDW goes full width
5. Show File Explorer section - verify Files & Categories panel reappears
6. Reload workspace - verify section states restored

### Scenario 4: Drag-and-Drop File Categorization
**Given**: Files & Categories panel is active with both File Explorer and Category Explorer sections visible
**When**: User drags files from File Explorer to Category Explorer
**Then**:
- [ ] File items are draggable from File Explorer section
- [ ] Category areas are valid drop targets in Category Explorer section
- [ ] Visual feedback shows drag state and valid drop zones
- [ ] File assignment to category is recorded and persisted
- [ ] File metadata updates to reflect category assignment

**Validation Steps**:
1. Ensure both File Explorer and Category Explorer sections are visible
2. Drag a file from File Explorer section
3. Verify drag visual feedback and cursor changes
4. Drop file onto category in Category Explorer section
5. Verify file assignment is recorded
6. Reload workspace - verify file-category assignment persists
7. Test with multiple files to verify bulk categorization

### Scenario 5: Panel Resizing
**Given**: Multiple panels are visible
**When**: User drags panel borders
**Then**:
- [ ] Panels resize smoothly in real-time
- [ ] Minimum panel widths enforced (100px explorers, 200px MDW)
- [ ] Layout proportions maintained during resize
- [ ] Panel sizes persist when workspace reloaded
- [ ] Window resize maintains panel proportions

**Validation Steps**:
1. Drag border between File Explorer and MDW - verify smooth resize
2. Attempt to resize below minimum - verify constraint enforcement
3. Resize window - verify proportions maintained
4. Reload workspace - verify panel sizes restored
5. Test resize with different panel combinations visible

### Scenario 4: File System Integration
**Given**: Project folders contain test files
**When**: User interacts with File Explorer
**Then**:
- [ ] Files from Source folder displayed with correct metadata
- [ ] Files from Reports folder displayed with correct metadata
- [ ] Empty folders show appropriate message
- [ ] Inaccessible folders show error message
- [ ] File list updates when folder contents change

**Validation Steps**:
1. Verify test files appear in File Explorer with names, sizes, dates
2. Test with empty Source folder - verify "No files" message
3. Test with inaccessible folder - verify error message
4. Add file to Source folder externally - verify File Explorer updates
5. Remove file from Reports folder - verify File Explorer updates

### Scenario 5: Document Caddy Management
**Given**: Files are available in File Explorer
**When**: User opens multiple documents
**Then**:
- [ ] Each document opens in separate Document Caddy
- [ ] Document Caddies are resizable within MDW area
- [ ] Only one Document Caddy active at a time
- [ ] Document Caddy positions and sizes persist
- [ ] Multiple documents can be open simultaneously

**Validation Steps**:
1. Double-click file in File Explorer - verify Document Caddy created
2. Open second file - verify second Document Caddy created
3. Resize first caddy - verify smooth resize operation
4. Click between caddies - verify active state changes
5. Reload workspace - verify open documents and sizes restored

### Scenario 6: Error Handling
**Given**: Various error conditions exist
**When**: Workspace encounters errors
**Then**:
- [ ] Inaccessible Source folder shows clear error message
- [ ] Inaccessible Reports folder shows clear error message
- [ ] Layout persistence failures gracefully handled
- [ ] Invalid project configuration shows helpful error
- [ ] Network/filesystem errors don't crash interface

**Validation Steps**:
1. Configure project with invalid Source folder path
2. Remove access permissions to Reports folder
3. Verify clear error messages displayed in File Explorer
4. Attempt operations with broken filesystem access
5. Verify interface remains stable and responsive

## Success Criteria
- All scenarios pass validation steps
- No console errors during normal operation
- Smooth 60fps interactions during panel resize
- Panel state persistence works reliably
- Error states provide clear user feedback
- Layout remains responsive across window sizes

## Performance Benchmarks
- Workspace load time: < 1 second for projects with 100+ files
- Panel resize response: < 100ms visual feedback
- File Explorer refresh: < 500ms for folder with 50+ files
- Layout persistence: < 100ms save/restore operations
- Memory usage: < 100MB additional RAM for workspace interface

## Implementation Validation
Run this quickstart after implementation to verify all functional requirements met and user scenarios work as designed.