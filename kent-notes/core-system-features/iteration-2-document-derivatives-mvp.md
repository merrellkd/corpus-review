This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Document Derivatives Management (MVP - Iteration 2)

This iteration builds on the basic .det extraction from Iteration 1 to implement the core derivative workflow: original → extracted → basic derivatives. It introduces the derivatives folder structure and essential derivative creation capabilities.

## MVP Scope

This iteration delivers the foundational derivative management system:

- Migrate .det files from source folder to dedicated `/derivatives/` structure
- Basic document family organization (one folder per original document)
- Create simple derivatives: summaries and anonymized versions
- Basic parent-child relationship tracking
- Simple derivative creation workflow in workspace

**Explicitly NOT in this iteration:**

- Advanced derivative types (cost tables, explanatory documents)
- Complex processing chains (derivative of derivative)
- Advanced metadata tracking and search
- Sophisticated document family visualization
- Batch derivative creation
- Quality assessment and correction workflows

## User Scenarios & Testing

### Primary User Story

As a corpus analyst, I need to create organized derivatives of my documents (summaries, anonymized versions) so I can work with different versions while keeping them logically grouped and maintaining traceability to the original.

### Acceptance Scenarios

1. **Given** I have extracted.det files, **When** the system migrates to derivatives structure, **Then** each original document gets its own family folder with the extracted version
2. **Given** I have an extracted document, **When** I create a summary derivative, **Then** the system creates a new .det file in the same document family with appropriate naming
3. **Given** I want to anonymize a document, **When** I create an anonymized derivative, **Then** the system creates a copy I can edit to remove sensitive information
4. **Given** I have document families, **When** I browse the workspace, **Then** I can see the organized family structure and navigate between related documents

### Edge Cases

- What happens when original file is renamed or moved after derivatives are created?
- How does system handle derivatives when parent extracted.det file is regenerated?
- What occurs when user tries to create duplicate derivative types in same family?

## Requirements

### Functional Requirements

- **FR-001**: System MUST migrate existing .det files from source folder to `/derivatives/{document-id}/extracted.det` structure
- **FR-002**: System MUST create document family folders using unique document identifiers
- **FR-003**: System MUST provide "Create Summary" action from extracted.det files
- **FR-004**: System MUST provide "Create Anonymized Version" action from extracted.det files
- **FR-005**: System MUST create new derivative .det files with appropriate naming (summary-general.det, anonymized.det)
- **FR-006**: System MUST copy content from parent document to new derivative for editing
- **FR-007**: System MUST track basic parent-child relationships between documents
- **FR-008**: System MUST display document families in workspace with clear family grouping
- **FR-009**: System MUST create basic \_metadata.json files for each document family
- **FR-010**: System MUST handle navigation between family members in workspace

### Key Entities

- **Document Family**: Collection of related documents (original, extracted, derivatives) grouped in single folder
- **Document Identifier**: Unique ID for each original document used for folder naming
- **Derivative Type**: Category of derivative (summary, anonymized) with specific naming conventions
- **Family Metadata**: Basic information about document relationships stored in \_metadata.json

## Derivatives Folder Structure

### Migration from Iteration 1

```
Before (Iteration 1):
/source/
  document1.pdf
  document1.det  ← migrate this
  document2.docx
  document2.det  ← migrate this

After (Iteration 2):
/source/
  document1.pdf
  document2.docx
/derivatives/
  /doc_1/
    extracted.det
    _metadata.json
  /doc_2/
    extracted.det
    _metadata.json
```

### Document Family Structure (MVP)

```
/derivatives/
  /doc_{unique_id}/
    extracted.det           (base extraction from original)
    summary-general.det     (general summary derivative)
    anonymized.det          (anonymized derivative)
    _metadata.json             (family relationships and metadata)
```

### Naming Conventions

- **Document Family Folder**: `doc_{unique_id}` (e.g., doc_1, doc_2, doc_abc123)
- **Base Extraction**: `extracted.det`
- **Summary Derivative**: `summary-general.det` (expandable to summary-{topic}.det later)
- **Anonymized Derivative**: `anonymized.det`

## Basic Metadata Tracking

### \_metadata.json Structure (MVP)

```json
{
  "originalFile": {
    "path": "/source/document1.pdf",
    "name": "document1.pdf"
  },
  "extracted": {
    "filename": "extracted.det",
    "created": "2024-09-24T10:30:00Z",
    "status": "completed"
  },
  "derivatives": [
    {
      "filename": "summary-general.det",
      "type": "summary",
      "parentFile": "extracted.det",
      "created": "2024-09-24T11:00:00Z"
    },
    {
      "filename": "anonymized.det",
      "type": "anonymized",
      "parentFile": "extracted.det",
      "created": "2024-09-24T11:30:00Z"
    }
  ]
}
```

## User Interface Requirements

### Workspace Document Browser (Enhanced)

#### Family-Based View

```
📁 /derivatives/
  📂 doc_1/ (document1.pdf family)
    📄 extracted.det
    📝 summary-general.det
    🔒 anonymized.det
  📂 doc_2/ (document2.docx family)
    📄 extracted.det
```

#### Derivative Creation Actions

- **From extracted.det**: "Create Summary" and "Create Anonymized Version" buttons/menu
- **Visual Family Grouping**: Clear indication of document relationships
- **Navigation**: Easy movement between family members

### Derivative Creation Workflow

1. **Selection**: User selects extracted.det file in workspace
2. **Action Menu**: "Create Summary" or "Create Anonymized Version" options
3. **Creation**: System creates new .det file with copied content
4. **Opening**: Automatically open new derivative in TipTap editor for editing
5. **Metadata Update**: \_metadata.json updated with new derivative info

## Data Persistence

### Database Schema Addition

```sql
CREATE TABLE document_families (
  id TEXT PRIMARY KEY,  -- doc_1, doc_2, etc.
  project_id INTEGER NOT NULL,
  original_file_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE document_derivatives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  derivative_type TEXT NOT NULL, -- 'extracted', 'summary', 'anonymized'
  parent_filename TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES document_families(id)
);
```

### Migration Process

- **Family ID Generation**: Create unique IDs for existing extracted.det files
- **File Movement**: Move .det files from source to derivatives folder structure
- **Metadata Initialization**: Create \_metadata.json files for migrated documents
- **Database Update**: Populate new tables with migrated document information

## Technical Constraints

### MVP Limitations

- Only two derivative types: summary and anonymized
- Single-level derivatives only (no derivative of derivative)
- Basic metadata tracking (no complex processing chains)
- Simple parent-child relationships (no complex family trees)
- Manual derivative creation only (no automated processing)

### Performance Requirements

- Family folder creation within 2 seconds
- Derivative creation (copy + metadata update) within 3 seconds
- Workspace family view loads within 1 second for 20+ families
- Migration completes within 10 seconds for 50+ documents

### File System Operations

- Reliable file movement during migration
- Atomic operations for derivative creation (file + metadata update)
- Handle concurrent access to family folders and metadata files
- Clean error handling during file operations

## Error Handling

### Migration Errors

- **File Move Failures**: "Could not migrate document to derivatives folder. Check file permissions."
- **Metadata Creation Failures**: "Document family metadata could not be created."
- **ID Conflicts**: "Document family ID already exists. Using alternative ID."

### Derivative Creation Errors

- **File Creation Failures**: "Could not create derivative document. Check folder permissions."
- **Content Copy Failures**: "Could not copy content from parent document."
- **Metadata Update Failures**: "Derivative created but metadata could not be updated."

## Integration Points

### With Iteration 1 Systems

- **Project Workspace**: Enhanced file browser showing family structure
- **File Extraction**: Extracted.det files now go to derivatives folder
- **Navigation**: Document family navigation integrated with workspace

### Future Integration Preparation

- **Advanced Derivatives**: Structure supports additional derivative types
- **Processing Chains**: Metadata structure expandable for complex chains
- **Search Integration**: Family structure ready for unified search indexing

## Success Criteria

### User Experience

- Smooth migration from Iteration 1 without data loss
- Intuitive derivative creation workflow from workspace
- Clear visual organization of document families
- Easy navigation between related documents

### Technical Performance

- Reliable migration of existing projects to new structure
- Fast derivative creation with immediate workspace updates
- Efficient family-based workspace browsing
- Consistent metadata tracking across operations

### Content Organization

- Logical grouping of related documents in families
- Clear naming conventions for derivatives
- Traceable relationships between originals and derivatives
- Foundation for more sophisticated derivative workflows

This iteration establishes the core document derivatives workflow, enabling users to create organized document families with basic derivative types while maintaining clear relationships and preparing for more advanced features in later iterations.
