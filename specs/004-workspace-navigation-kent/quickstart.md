# Quickstart: Project Workspace Navigation

**Feature**: Project Workspace Navigation (MVP - Iteration 1)
**Date**: 2025-09-25

## Test Environment Setup

### Prerequisites
1. Have at least one project created in project list with valid source folder
2. Test source folder should contain:
   - At least 2-3 files (different types: .pdf, .docx, .txt)
   - At least 1 subdirectory with some files
   - At least 1 empty subdirectory
3. Have one test project with inaccessible source folder (moved/deleted)

### Test Data Creation Script
```bash
# Create test project structure
mkdir -p ~/test-corpus-projects/sample-project/{documents,data,empty-folder}
cd ~/test-corpus-projects/sample-project

# Create test files
echo "Sample document content" > documents/sample.txt
touch documents/research-notes.pdf
touch documents/interview-transcript.docx
echo "data,value\n1,test" > data/sample-data.csv
touch data/analysis.xlsx

# Create nested structure
mkdir -p documents/archived
touch documents/archived/old-notes.txt
```

## Core User Journey Tests

### Test 1: Open Project Workspace (Happy Path)
**Acceptance Scenario**: Given I have projects in my project list, When I click "Open Project", Then the system navigates me to a project workspace showing my project files

**Steps**:
1. Start application and navigate to project list
2. Locate test project with valid source folder
3. Click "Open Project" button/action
4. Wait for workspace to load

**Expected Results**:
- ✅ Navigation occurs from project list to workspace view
- ✅ Project name displayed in workspace header
- ✅ Source folder path visible and correct
- ✅ File listing shows expected files and folders
- ✅ Files display with name, type icon, size, and modified date
- ✅ Directories display with folder icon and modified date
- ✅ Loading completes within 2 seconds (for <100 files)

**Validation Commands** (for manual verification):
```bash
# Verify file count matches expectation
ls -la ~/test-corpus-projects/sample-project
# Should match workspace file listing count and names
```

### Test 2: Basic Folder Navigation
**Acceptance Scenario**: Given I open a project, When the workspace loads, Then I can see the project name, source folder, and a basic file listing

**Steps**:
1. From successful Test 1 workspace
2. Click on "documents" folder in file listing
3. Verify navigation to documents subfolder
4. Click "Up" or "Back" navigation control
5. Verify return to root level

**Expected Results**:
- ✅ Folder navigation opens subfolder contents
- ✅ Current path updates to show subfolder location
- ✅ "Up" navigation control becomes available (not at root)
- ✅ Subfolder contents display correctly with metadata
- ✅ Navigation back to parent works correctly
- ✅ Navigation operations complete within 500ms

### Test 3: Empty Folder Handling
**Acceptance Scenario**: System MUST handle empty source folders gracefully

**Steps**:
1. Navigate to "empty-folder" directory in test workspace
2. Verify empty folder display

**Expected Results**:
- ✅ Empty folder opens without errors
- ✅ Friendly message indicates folder is empty
- ✅ Navigation controls still functional
- ✅ Can navigate back to parent folder

### Test 4: Return to Project List
**Acceptance Scenario**: Given I am in a project workspace, When I want to return to project selection, Then I can navigate back to the project list

**Steps**:
1. From any workspace view
2. Click "Back to Projects" navigation element
3. Verify return to project list

**Expected Results**:
- ✅ Navigation returns to project list view
- ✅ Project list shows all available projects
- ✅ Previously opened workspace session is cleared
- ✅ Can open different project or same project again

## Error Handling Tests

### Test 5: Inaccessible Source Folder
**Acceptance Scenario**: Given a project's source folder is inaccessible, When I try to open it, Then the system shows a clear error message

**Steps**:
1. Create project with valid source folder
2. Move or delete the source folder externally
3. Attempt to open workspace for this project
4. Verify error handling

**Expected Results**:
- ✅ Clear error message displays: "The source folder for this project could not be found. It may have been moved or deleted."
- ✅ Error does not crash the application
- ✅ User can return to project list
- ✅ Other projects remain accessible

### Test 6: Permission Denied Handling
**Acceptance Scenario**: What occurs when user lacks read permissions for source folder?

**Setup** (macOS/Linux):
```bash
# Create restricted folder for testing
mkdir ~/restricted-test-project
chmod 000 ~/restricted-test-project
```

**Steps**:
1. Create project pointing to restricted folder
2. Attempt to open workspace
3. Verify error handling

**Expected Results**:
- ✅ Clear error message: "You don't have permission to access this project's source folder."
- ✅ Graceful error handling without application crash
- ✅ Option to return to project list

**Cleanup**:
```bash
chmod 755 ~/restricted-test-project
rmdir ~/restricted-test-project
```

## Performance Tests

### Test 7: Large Directory Handling
**Acceptance Scenario**: How does system handle projects with very large numbers of files (1000+ files)?

**Setup**:
```bash
# Create large directory for testing
mkdir -p ~/large-test-project
cd ~/large-test-project
for i in {1..1500}; do
  touch "file_$i.txt"
done
```

**Steps**:
1. Create project with large directory
2. Open workspace
3. Monitor performance and behavior

**Expected Results**:
- ✅ Loading state displays during directory reading
- ✅ Workspace loads within reasonable time (<10 seconds)
- ✅ File listing displays (may be paginated or show first N files)
- ✅ Navigation remains responsive
- ✅ No application freeze or crash

## Integration Tests

### Test 8: Workspace Session Persistence
**Steps**:
1. Open project workspace
2. Navigate to subfolder
3. Return to project list
4. Re-open same project workspace

**Expected Results**:
- ✅ Workspace opens at root level (not previous subfolder)
- ✅ No session state pollution between openings
- ✅ Fresh workspace context each time

### Test 9: Multiple Project Context
**Steps**:
1. Open first project workspace
2. Return to project list
3. Open different project workspace
4. Verify context switching

**Expected Results**:
- ✅ Each workspace shows correct project context
- ✅ File listings are specific to each project
- ✅ No cross-contamination of workspace data

## Acceptance Criteria Validation

### Functional Requirements Coverage
- **FR-001**: ✅ "Open Project" action navigates to workspace
- **FR-002**: ✅ Workspace displays project name and source path
- **FR-003**: ✅ File browser shows source folder contents
- **FR-004**: ✅ "Back to Projects" navigation works
- **FR-005**: ✅ Source folder accessibility validation
- **FR-006**: ✅ Clear error messages for inaccessible folders
- **FR-007**: ✅ File metadata display (name, type, size, date)
- **FR-008**: ✅ Empty folder handling
- **FR-009**: ✅ Folder navigation within source structure
- **FR-010**: ✅ Project context maintained throughout session

### Performance Requirements
- ✅ <2s workspace loading for <100 files
- ✅ <500ms folder navigation
- ✅ <1s file listing refresh
- ✅ Graceful handling of 1000+ files with loading state

## Test Execution Checklist

Before feature completion, verify:
- [ ] All core user journey tests pass
- [ ] All error handling scenarios work correctly
- [ ] Performance meets specified constraints
- [ ] No TypeScript compilation errors
- [ ] No console errors during normal operation
- [ ] Tauri commands respond correctly to all test scenarios
- [ ] UI remains responsive during all operations

## Manual Test Script

```bash
# Run this script to validate implementation
echo "=== Workspace Navigation Manual Test ==="
echo "1. Create test project with structure"
echo "2. Run application: npm run tauri:dev"
echo "3. Execute Test 1-9 scenarios above"
echo "4. Verify all acceptance criteria"
echo "5. Check console for errors"
echo "=== Test Complete ==="
```

This quickstart provides comprehensive validation scenarios covering all functional requirements, error conditions, and performance constraints specified in the feature requirements.