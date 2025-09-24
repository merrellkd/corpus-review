# Quickstart: Project List Management

## User Acceptance Test Scenarios

This quickstart validates that all functional requirements are implemented correctly through the primary user scenarios.

### Prerequisites
- Corpus Review application installed and running
- Test folders available on filesystem:
  - `/tmp/test-project-1/` (with some documents)
  - `/tmp/test-project-2/` (empty folder)
  - `/tmp/nonexistent/` (does not exist)

---

## Scenario 1: Create New Project (Happy Path)

**Goal**: Verify users can create projects with valid inputs

**Steps**:
1. **Launch Application**
   - ✅ Application starts and shows project list page
   - ✅ "Create New Project" button is visible and enabled

2. **Open Project Creation Form**
   - Click "Create New Project" button
   - ✅ Project creation form opens
   - ✅ Form shows "Name" text input, "Source Folder" picker, and optional "Note" textarea

3. **Fill Valid Project Information**
   - Enter name: "Test Project Alpha"
   - Click folder picker button
   - ✅ Native folder selection dialog opens
   - Select `/tmp/test-project-1/`
   - ✅ Selected folder path displays in form
   - Enter note: "Research project for document analysis"
   - ✅ Note field accepts input up to 1000 characters

4. **Submit Project Creation**
   - Click "Create Project" button
   - ✅ Form shows loading state
   - ✅ Project creation succeeds
   - ✅ Form closes and returns to project list

5. **Verify Project in List**
   - ✅ "Test Project Alpha" appears in project list
   - ✅ Shows correct source folder path `/tmp/test-project-1/`
   - ✅ Shows creation date (today's date)
   - ✅ Shows note: "Research project for document analysis"
   - ✅ "Open" and "Delete" buttons are available

**Acceptance Criteria**: FR-001, FR-002, FR-003, FR-009, FR-013 ✅

---

## Scenario 2: Create Project Without Note

**Goal**: Verify projects can be created without optional note field

**Steps**:
1. **Create Project Without Note**
   - Click "Create New Project" button
   - Enter name: "Test Project Beta"
   - Select folder: `/tmp/test-project-2/`
   - Leave note field empty
   - Click "Create Project" button

2. **Verify Project Creation**
   - ✅ Project creation succeeds
   - ✅ "Test Project Beta" appears in project list
   - ✅ Shows correct folder path and creation date
   - ✅ Note field is empty/not displayed (optional)

**Acceptance Criteria**: FR-001, FR-013 ✅

---

## Scenario 3: View Project List with Multiple Projects

**Goal**: Verify project list displays multiple projects correctly with and without notes

**Steps**:
1. **Verify Both Projects in List**
   - ✅ Both "Test Project Alpha" and "Test Project Beta" appear in list
   - ✅ "Test Project Beta" (newer) appears first
   - ✅ "Test Project Alpha" (older) appears second
   - ✅ Both show correct folder paths and creation dates

2. **Verify Note Display**
   - ✅ "Test Project Alpha" shows note: "Research project for document analysis"
   - ✅ "Test Project Beta" shows no note or empty note field

3. **Verify Project List Performance**
   - ✅ Project list loads in under 500ms
   - ✅ No noticeable delay when switching back to list

**Acceptance Criteria**: FR-003, FR-010, FR-012 ✅

---

## Scenario 4: Open Project (Navigate to Workspace)

**Goal**: Verify users can open projects to access workspace

**Steps**:
1. **Click Open Project Button**
   - Click "Open" button next to "Test Project Alpha"
   - ✅ Application initiates project opening

2. **Verify Navigation Behavior**
   - ✅ MVP: Returns project information successfully
   - ✅ Future: Will navigate to project workspace
   - ✅ No error messages displayed

**Acceptance Criteria**: FR-004 ✅

---

## Scenario 5: Delete Project with Confirmation

**Goal**: Verify users can safely delete projects

**Steps**:
1. **Initiate Project Deletion**
   - Click "Delete" button next to "Test Project Beta"
   - ✅ Confirmation dialog appears

2. **Verify Confirmation Dialog**
   - ✅ Dialog shows: "Are you sure you want to delete 'Test Project Beta'?"
   - ✅ "Delete" and "Cancel" buttons are present

3. **Cancel Deletion**
   - Click "Cancel" button
   - ✅ Dialog closes
   - ✅ Project remains in list unchanged

4. **Confirm Deletion**
   - Click "Delete" button again to reopen dialog
   - Click "Delete" button in dialog
   - ✅ Dialog closes
   - ✅ "Test Project Beta" is removed from list
   - ✅ "Test Project Alpha" remains in list

**Acceptance Criteria**: FR-005 ✅

---

## Scenario 6: Validation and Error Handling

**Goal**: Verify proper validation and error messages

### 6A: Empty Project Name Validation
1. **Test Empty Name**
   - Open project creation form
   - Leave name field empty
   - Select valid folder
   - Click "Create Project"
   - ✅ Error message: "Project name is required"
   - ✅ Form remains open for correction

### 6B: Project Name Too Long
1. **Test Long Name**
   - Enter name with 300 characters
   - Select valid folder
   - Click "Create Project"
   - ✅ Error message: "Project name too long (max 255 characters)"

### 6C: Invalid Folder Path
1. **Test Nonexistent Folder**
   - Enter name: "Invalid Folder Test"
   - Manually enter folder path: `/tmp/nonexistent/`
   - Click "Create Project"
   - ✅ Error message: "Source folder not found: /tmp/nonexistent/"

### 6D: Duplicate Project Name
1. **Test Duplicate Name**
   - Enter name: "Test Project Alpha" (existing project)
   - Select valid folder
   - Click "Create Project"
   - ✅ Error message: "A project with name 'Test Project Alpha' already exists"

### 6E: Note Too Long Validation
1. **Test Long Note**
   - Enter valid name: "Note Length Test"
   - Select valid folder
   - Enter note with 1500 characters (exceeds 1000 limit)
   - Click "Create Project"
   - ✅ Error message: "Project note too long (max 1000 characters)"
   - ✅ Form remains open for correction

**Acceptance Criteria**: FR-007, FR-008, FR-011, FR-013 ✅

---

## Scenario 7: Data Persistence

**Goal**: Verify projects persist across application sessions

**Steps**:
1. **Close Application**
   - Ensure at least one project exists ("Test Project Alpha")
   - Close Corpus Review application completely

2. **Restart Application**
   - Launch Corpus Review application again
   - ✅ Application starts successfully

3. **Verify Project Persistence**
   - ✅ "Test Project Alpha" still appears in project list
   - ✅ All project details are preserved (name, folder, note, date)
   - ✅ Note field content is preserved: "Research project for document analysis"
   - ✅ Project is still functional (can open/delete)

**Acceptance Criteria**: FR-006 ✅

---

## Performance Validation

### Load Time Benchmarks
- **Project List Load**: < 100ms for up to 50 projects ✅
- **Project Creation**: < 2s complete flow ✅
- **Project Deletion**: < 1s complete flow ✅
- **Folder Picker**: < 1s to open native dialog ✅

### Scalability Test
1. **Create Multiple Projects**
   - Create 10 test projects with unique names
   - ✅ All operations remain responsive
   - ✅ List scrolls smoothly if needed
   - ✅ No performance degradation

**Acceptance Criteria**: FR-012 ✅

---

## Error Recovery Testing

### Database Connection Issues
1. **Simulate Database Error**
   - (Implementation detail: temporarily lock database file)
   - Attempt to create project
   - ✅ Clear error message displayed
   - ✅ Application remains stable

### File System Access Issues
1. **Folder Permission Changes**
   - Create project with valid folder
   - Remove read permissions from source folder
   - Try to open project
   - ✅ Appropriate error message displayed
   - ✅ Project remains in list for fixing

---

## Cleanup
After completing all scenarios:
1. Delete all test projects created during testing
2. Remove test folders: `/tmp/test-project-1/`, `/tmp/test-project-2/`
3. Verify application returns to clean state

---

## Success Criteria Summary

All scenarios must pass for feature acceptance:

- ✅ **User Experience**: Users can create first project within 30 seconds
- ✅ **Performance**: Project list loads instantly (< 100ms for up to 50 projects)
- ✅ **Error Handling**: Clear error messages guide user when operations fail
- ✅ **Navigation**: "Open Project" provides path to workspace (MVP: returns project info)
- ✅ **Persistence**: Project data survives application restarts
- ✅ **Validation**: All business rules enforced with helpful error messages

**Status**: Ready for implementation and testing ✅