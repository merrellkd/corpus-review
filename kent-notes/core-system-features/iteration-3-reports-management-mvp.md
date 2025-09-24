This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Reports Management System (MVP - Iteration 3)

This iteration introduces the analysis and reporting layer, enabling users to create findings, conclusions, and deliverables that reference their processed documents and derivatives. It establishes clear separation between document processing (derivatives) and analysis outputs (reports).

## MVP Scope

This iteration delivers essential reporting functionality:

- Basic reports folder structure separate from derivatives
- Create analysis reports, findings, and client deliverables
- Reference and link to documents and derivatives within reports
- Simple report organization and management
- Report creation workflow integrated with workspace

**Explicitly NOT in this iteration:**

- Advanced report templates or automation
- Collaborative reporting or review workflows
- Complex report versioning or approval processes
- Advanced analytics or reporting dashboards
- Automated report generation from derivatives
- Integration with external reporting tools

## User Scenarios & Testing

### Primary User Story

As a corpus analyst, I need to create and organize analysis reports that reference my processed documents and derivatives so I can document my findings, create deliverables for clients, and maintain clear separation between source processing and analysis outputs.

### Acceptance Scenarios

1. **Given** I have processed documents and derivatives, **When** I create an analysis report, **Then** I can reference and link to specific documents and derivatives within the report
2. **Given** I want to organize my analysis work, **When** I create different report types, **Then** the system organizes them in appropriate folders (findings, deliverables, working notes)
3. **Given** I'm working on client deliverables, **When** I create a client report, **Then** I can reference multiple document families and derivatives while maintaining professional organization
4. **Given** I have multiple reports, **When** I manage my reports folder, **Then** I can see, organize, and access all my analysis outputs separately from source documents

### Edge Cases

- What happens when referenced documents or derivatives are moved or deleted?
- How does system handle very large reports with many document references?
- What occurs when reports folder becomes inaccessible or corrupted?

## Requirements

### Functional Requirements

- **FR-001**: System MUST create dedicated `/reports/` folder structure separate from source and derivatives
- **FR-002**: System MUST provide report creation workflow with multiple report types (Analysis, Findings, Deliverables, Working Notes)
- **FR-003**: System MUST enable embedding references to documents and derivatives within reports
- **FR-004**: System MUST organize reports in logical subfolders by type and purpose
- **FR-005**: System MUST create reports in .det format for consistency with TipTap editor
- **FR-006**: System MUST track report metadata including creation date, type, and referenced documents
- **FR-007**: System MUST provide report management interface within workspace
- **FR-008**: System MUST validate and maintain links to referenced documents
- **FR-009**: System MUST enable report editing and updating with maintained references
- **FR-010**: System MUST handle report organization for different project types and workflows

### Key Entities

- **Analysis Report**: Detailed findings and analysis conclusions referencing source materials
- **Client Deliverable**: Final reports prepared for external stakeholders
- **Working Document**: Intermediate notes and draft analysis
- **Document Reference**: Link from report to specific document or derivative with context

## Reports Folder Structure

### Basic Organization

```
/project-root/
  /source/                     (original immutable files)
  /derivatives/                (document families and versions)
  /reports/                    (analysis outputs and findings)
    /findings/                 (analysis conclusions and discoveries)
      case-analysis.det
      evidence-summary.det
    /deliverables/             (client-ready reports)
      final-report.det
      executive-summary.det
    /working-notes/            (draft analysis and notes)
      preliminary-notes.det
      methodology-notes.det
    /templates/                (report templates for consistency)
      standard-analysis-template.det
```

### Report Types and Organization

- **Findings**: Analysis conclusions, evidence summaries, pattern discoveries
- **Deliverables**: Final reports, executive summaries, client presentations
- **Working Notes**: Draft analysis, methodology notes, preliminary findings
- **Templates**: Standardized report formats for consistency

## Report Creation Workflow

### Report Creation Interface

```
┌─────────────────────────────────────────────────────────┐
│ Create New Report                                       │
├─────────────────────────────────────────────────────────┤
│ Report Name: [_________________________]               │
│                                                         │
│ Report Type: [▼ Analysis Report    ]                   │
│              • Analysis Report                          │
│              • Client Deliverable                       │
│              • Working Notes                            │
│              • Custom                                   │
│                                                         │
│ Description: [___________________________]             │
│              [___________________________]             │
│              [___________________________]             │
│                                                         │
│ Template:    [▼ None               ]                   │
│              • None (Blank Report)                      │
│              • Standard Analysis                        │
│              • Executive Summary                        │
│                                                         │
│              [Create Report] [Cancel]                   │
└─────────────────────────────────────────────────────────┘
```

### Document Reference Integration

- **Reference Browser**: Interface to browse and select documents/derivatives to reference
- **Link Insertion**: Insert clickable links to specific documents within report content
- **Context Metadata**: Include relevant context (page numbers, sections, derivative types)
- **Reference Validation**: Ensure referenced documents exist and are accessible

## Report-Document Integration

### Document Reference Format

```json
{
  "type": "document_reference",
  "referenceId": "ref_001",
  "sourceType": "derivative", // 'original', 'extracted', 'derivative'
  "documentFamily": "doc_1",
  "filename": "summary-cost-analysis.det",
  "displayText": "Cost Analysis Summary",
  "context": {
    "section": "Financial Impact",
    "pageRange": "3-7",
    "relevance": "Primary cost data source"
  },
  "link": "/derivatives/doc_1/summary-cost-analysis.det"
}
```

### Reference Management

- **Link Validation**: Verify referenced documents exist during report save/load
- **Broken Link Handling**: Highlight and manage references to moved/deleted documents
- **Batch Updates**: Update multiple references when document locations change
- **Reference Index**: Maintain searchable index of all document references across reports

## Report Management Interface

### Reports Browser Integration

```
📁 /reports/
  📂 findings/
    📄 case-analysis.det (3 refs) - Modified: 2024-09-24
    📄 evidence-summary.det (7 refs) - Modified: 2024-09-23
  📂 deliverables/
    📄 final-report.det (12 refs) - Modified: 2024-09-24
    📄 executive-summary.det (5 refs) - Modified: 2024-09-22
  📂 working-notes/
    📄 preliminary-notes.det (2 refs) - Modified: 2024-09-21
```

### Report Actions

- **Create Report**: New report creation with type selection and template options
- **Edit Report**: Open in TipTap editor with document reference capabilities
- **Manage References**: View and update all document references within report
- **Export Options**: Basic export capabilities for client delivery
- **Report Info**: Metadata display including creation date, references count, last modified

## Data Persistence

### Database Schema for Reports

```sql
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'analysis', 'deliverable', 'working', 'custom'
  file_path TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE report_document_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id INTEGER NOT NULL,
  reference_id TEXT NOT NULL, -- unique within report
  source_type TEXT NOT NULL, -- 'original', 'extracted', 'derivative'
  document_family TEXT,
  file_path TEXT NOT NULL,
  display_text TEXT,
  context_info TEXT, -- JSON with section, page, relevance
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

-- Indexes for performance
CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_references_report ON report_document_references(report_id);
CREATE INDEX idx_references_file ON report_document_references(file_path);
```

### Report File Format

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Analysis Report Title" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Based on the analysis of " },
        {
          "type": "document_reference",
          "attrs": {
            "referenceId": "ref_001",
            "displayText": "Cost Analysis Summary",
            "filePath": "/derivatives/doc_1/summary-cost-analysis.det"
          }
        },
        { "type": "text", "text": ", we can conclude..." }
      ]
    }
  ],
  "reportMetadata": {
    "reportType": "analysis",
    "projectId": 1,
    "createdAt": "2024-09-24T10:30:00Z",
    "references": ["ref_001", "ref_002"]
  }
}
```

## Integration with Existing Systems

### Workspace Integration

- **Reports Tab**: New section in workspace for report management
- **Cross-Navigation**: Easy navigation between reports, derivatives, and source documents
- **Unified Search**: Search across reports, derivatives, and source documents
- **Reference Validation**: Real-time validation of document references

### Document Derivatives Coordination

- **Reference Browsing**: Browse document families when creating references
- **Link Maintenance**: Update references when derivatives are created/modified
- **Processing Status**: Show which documents are available for referencing based on processing status
- **Family Context**: Understand document relationships when creating references

## Technical Implementation

### TipTap Editor Enhancement

- **Custom Reference Node**: Document reference as custom TipTap node type
- **Reference Toolbar**: Easy insertion of document references during editing
- **Link Preview**: Hover preview of referenced documents
- **Validation UI**: Visual indication of valid/broken references

### File System Operations

- **Atomic Operations**: Ensure report creation includes both file and database updates
- **Reference Tracking**: Maintain consistency between file references and database records
- **Cleanup Procedures**: Handle orphaned references when documents are deleted
- **Backup Coordination**: Include reports in project backup and migration operations

## Error Handling

### Reference Management Errors

- **Broken References**: "Referenced document no longer available. Update reference?"
- **Missing Documents**: "Document family not found. Document may have been moved."
- **Access Errors**: "Cannot access referenced document. Check permissions."
- **Validation Failures**: "Some document references could not be validated."

### Report Creation Errors

- **File Creation**: "Could not create report file. Check folder permissions."
- **Database Update**: "Report created but metadata could not be saved."
- **Template Loading**: "Report template could not be loaded. Using blank template."

## Performance Requirements

### Report Operations

- **Report Creation**: Complete within 3 seconds including template loading
- **Reference Insertion**: Insert document reference within 1 second
- **Report Loading**: Open reports with references within 2 seconds
- **Reference Validation**: Validate all references in report within 5 seconds

### Database Performance

- **Reference Queries**: Find all references to document within 200ms
- **Report Listing**: Load reports browser within 500ms for 50+ reports
- **Search Operations**: Search across reports content within 1 second

## Success Criteria

### User Experience

- **Intuitive Workflow**: Clear path from document analysis to report creation
- **Reliable References**: Document references work consistently and provide clear navigation
- **Organized Structure**: Logical organization of different report types
- **Professional Output**: Reports suitable for client delivery and internal analysis

### Technical Performance

- **Reference Integrity**: 99%+ reliability for document reference links
- **Performance Targets**: All operations complete within specified time limits
- **Data Consistency**: Perfect synchronization between files and database metadata
- **Error Recovery**: Graceful handling of missing documents and system issues

### Integration Quality

- **Seamless Workflow**: Smooth transition between document processing and report creation
- **Unified Experience**: Consistent interface design across reports and derivatives management
- **Search Integration**: Reports content discoverable through unified search
- **Cross-System Navigation**: Easy movement between reports, derivatives, and originals

This reports management system establishes the analysis and delivery layer of the Corpus Review workflow, enabling users to create professional documentation of their findings while maintaining clear traceability back to source materials and processed derivatives.
