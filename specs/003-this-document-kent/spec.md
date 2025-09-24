# Feature Specification: Core Project Management

**Feature Branch**: `003-this-document-kent`
**Created**: 2025-09-24
**Status**: Draft
**Input**: User description: "This document @kent-notes/project-list-description.md started out as just documenting the attributes of the Project List feature, but may have veered into territory that really should be in a different feature. How do you recommend we split it up?"

## Execution Flow (main)

```
1. Parse user description from Input
   � If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   � Identify: actors, actions, data, constraints
3. For each unclear aspect:
   � Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   � If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   � Each requirement must be testable
   � Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   � If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   � If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## � Quick Guidelines

-  Focus on WHAT users need and WHY
- L Avoid HOW to implement (no tech stack, APIs, code structure)
- =e Written for business stakeholders, not developers

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

As a corpus analyst, I need to create and manage research projects so I can organize my analysis work around specific document collections, keeping source materials and analysis outputs properly organized.

### Acceptance Scenarios

1. **Given** I'm starting a new Corpus Review, **When** I create a project with name and source folder, **Then** the system stores my project and allows me to access it later
2. **Given** I have multiple projects, **When** I view the project list, **Then** I can see all projects with their key information and search/filter them
3. **Given** I have an existing project, **When** I need to modify project settings, **Then** I can edit the project name, description, and folder paths
4. **Given** I want to remove a project, **When** I delete it, **Then** the system offers options to preserve or remove generated files while never deleting original source files

### Edge Cases

- What happens when specified source folder no longer exists or is inaccessible?
- How does system handle duplicate project names?
- What occurs when user tries to create project with invalid folder permissions?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow users to create new projects with required name and source folder path
- **FR-002**: System MUST validate source folder exists and is accessible during project creation
- **FR-003**: System MUST store project metadata persistently across application sessions
- **FR-004**: System MUST display list of all created projects with search and filter capabilities
- **FR-005**: System MUST allow users to edit existing project settings (name, description, folders)
- **FR-006**: System MUST provide project deletion with multiple options for handling generated files
- **FR-007**: System MUST never automatically delete original source files under any circumstances
- **FR-008**: System MUST sort projects by name, creation date, or last modified date
- **FR-009**: System MUST show project status indicators [NEEDS CLARIFICATION: what statuses are needed - active, archived, processing?]
- **FR-010**: System MUST provide folder picker interface for source and reports folder selection
- **FR-011**: System MUST track creation and modification timestamps for each project
- **FR-012**: System MUST prevent creation of projects with empty or invalid names

### Key Entities _(include if feature involves data)_

- **Project**: Represents a Corpus Review workspace containing name, description, source folder path, optional reports folder path, creation/modification timestamps, and project settings
- **Project Settings**: Configuration options including immutable source mode toggle and other project-specific preferences

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
