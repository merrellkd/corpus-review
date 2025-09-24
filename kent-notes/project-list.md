This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Project List

This will temporarily be the starting screen while several application features are in development. This is so that we can get the source folder and reports folder specified for development at the project level.

## Core Project Management

- Create new projects
  - Project Name (required)
  - Source folder (required). This should bring up a system folder picker.
  - Reports folder (optional). This should bring up a system folder picker
  - Project Description (optional, textarea)

## User Interface Requirements

### Project Creation Form

- Project Name (required, text input)
- Source Folder (required, folder picker with validation)
- Reports Folder (optional, folder picker)
- Project Description (optional, textarea)

### Project List View

- Grid/list view of existing projects
- Search/filter functionality
- Sort by: name, creation date, last modified
- Project status indicators (active, archived, etc.)

### Project Actions

- Open Project (primary action)
- Edit Project Settings
- Archive Project
- Delete Project (with confirmation dialog)

## Data Persistence

- Projects stored in SQLite database
- Project metadata includes:
  - ID, name, description
  - Source and reports folder paths
  - Creation and modification timestamps
  - Settings (immutable mode, etc.)

## Delete Project Dialog

When deleting a project, present options:

1. **Remove from list only** - Keep all files, remove from database
2. **Archive project** - Move to cold storage, compress data
3. **Full deletion** - Remove database entry and all generated files

Show storage impact:

- Database records: ~X KB
- Generated reports: ~X MB
- Cached extractions: ~X MB
- Total: ~X MB

**Note**: Original source files are never deleted automatically.