This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Project List Management (MVP - Iteration 1)

This is the foundational MVP for project management, focusing on essential CRUD operations to get users started with basic project organization. Advanced features like search, status indicators, and file counts are deferred to later iterations.

## MVP Scope

This iteration delivers the absolute minimum viable functionality for project management:

- Create new projects with required information
- View list of existing projects
- Open projects (navigate to workspace)
- Delete projects with basic confirmation
- Simple SQLite persistence

**Explicitly NOT in this iteration:**

- Search/filter functionality
- Sort options
- Status indicators
- File type counts
- Advanced deletion options
- Project archiving
- Grid/list view toggle

## User Scenarios & Testing

### Primary User Story

As a corpus analyst, I need to create and manage basic project information so I can organize my work around specific document collections and access my project workspace.

### Acceptance Scenarios

1. **Given** I want to start Corpus Review, **When** I create a new project with name and source folder, **Then** the system stores the project and shows it in my project list
2. **Given** I have created projects, **When** I view the project list, **Then** I see all my projects with their names and basic information
3. **Given** I want to work on a project, **When** I click "Open Project", **Then** the system navigates me to the project workspace
4. **Given** I no longer need a project, **When** I delete it with confirmation, **Then** the system removes it from the list

### Edge Cases

- What happens when user specifies a source folder that doesn't exist?
- How does system handle duplicate project names?
- What occurs when source folder becomes inaccessible after project creation?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to create new projects with name (required) and source folder path (required)
- **FR-002**: System MUST validate that source folder exists and is accessible during project creation
- **FR-003**: System MUST display a simple list of all created projects showing project name and source folder
- **FR-004**: System MUST provide "Open Project" action that navigates to project workspace
- **FR-005**: System MUST provide "Delete Project" action with basic confirmation dialog
- **FR-006**: System MUST store project data in SQLite database for persistence across sessions
- **FR-007**: System MUST prevent creation of projects with empty names
- **FR-008**: System MUST show error messages when project creation fails due to invalid folder paths
- **FR-009**: System MUST provide folder picker interface for source folder selection
- **FR-010**: System MUST display creation date for each project in the list

### Key Entities

- **Project**: Represents a Corpus Review workspace containing name, source folder path, and creation timestamp
- **Project List**: Collection of projects displayed to user with basic project information

## User Interface Requirements

### Project Creation Form (Simplified)

- Project Name (required, text input)
- Source Folder (required, folder picker with validation)
- Create button and Cancel button
- Basic validation error display

### Project List View (Basic)

- Simple table/list showing:
  - Project Name
  - Source Folder Path
  - Created Date
  - Actions: "Open" and "Delete" buttons

### Delete Confirmation Dialog (Simple)

- "Are you sure you want to delete [Project Name]?"
- "Delete" and "Cancel" buttons
- Warning that project will be removed from list (database only)

## Data Persistence

### SQLite Schema (MVP)

```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  source_folder TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Data Validation

- Project name: non-empty string, max 255 characters
- Source folder: valid filesystem path, must exist and be accessible
- Creation timestamp: automatically set on creation

## Technical Constraints

### MVP Limitations

- No search functionality - users scroll through full list
- No sorting options - projects shown in creation order (newest first)
- Basic SQLite operations only - no complex queries
- Simple confirmation dialog - no advanced deletion options
- No project editing after creation
- No project status tracking

### Integration Placeholders

- Project workspace navigation hook (for next iteration)
- Database schema designed to support future enhancements
- UI structure that can accommodate search/filter additions

## Success Criteria

### User Experience

- User can create first project within 30 seconds
- Project list loads instantly (under 100ms for up to 50 projects)
- Clear error messages guide user when project creation fails
- "Open Project" action provides obvious path to workspace

### Technical Performance

- Project creation completes within 2 seconds
- Project list displays within 500ms
- Database operations handle up to 100 projects efficiently
- Folder picker responds within 1 second

This MVP establishes the foundation for project management while keeping scope minimal for fast delivery and early user feedback.
