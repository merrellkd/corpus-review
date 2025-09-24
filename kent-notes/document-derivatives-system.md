This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Document Derivatives Management System

This system manages the complete document lifecycle from immutable source files through extracted versions to various derivative documents, supporting Corpus Review workflows where documents undergo multiple transformations while preserving relationships and traceability.

## Document Lifecycle Overview

The system handles three distinct stages of document evolution:

1. **Original (Immutable)**: Source documents in their native format (PDF, DOCX, etc.)
2. **Extracted (.det)**: Editable TipTap/ProseMirror JSON format for annotation and correction
3. **Derivatives**: Specialized versions (summaries, anonymized, cost tables, explanatory documents)

## File System Architecture

### Dedicated Derivatives Folder Structure

```
/project-root/
  /source/ (immutable corpus)
  /reports/ (analysis reports and findings)
  /derivatives/ (document versions and transformations)
    /{document-identifier}/
      /extracted.det (base extraction)
      /summary-[topic].det (topic-specific summaries)
      /anonymized.det (anonymized version)
      /cost-table.det (cost analysis tables)
      /explanatory-notes.det (explanatory documents)
      /_metadata.json (relationships, timestamps, processing chain)
```

### Document Family Organization

Each original document gets its own subfolder in `/derivatives/` using a unique document identifier, grouping all related versions together for:

- Easy discovery and navigation
- Relationship tracking
- Version management
- Derivative chain visualization

## Derivative Document Types

### Core Derivatives

- **Extracted Version**: Base `.det` file created from original, editable for correction of extraction errors
- **Summaries**: Topic-specific summaries with naming pattern `summary-[topic].det`
- **Anonymized Version**: Privacy-protected version with sensitive information removed
- **Cost Tables**: Financial analysis and cost breakdowns
- **Explanatory Documents**: Contextual notes and explanations

### Derivative Naming Conventions

- Base extraction: `extracted.det`
- Summaries: `summary-[topic-description].det`
- Anonymized: `anonymized.det`
- Cost analysis: `cost-table.det`
- Explanatory: `explanatory-[purpose].det`
- Custom derivatives: `[type]-[description].det`

## Metadata and Relationship Tracking

### Document Family Metadata (\_metadata.json)

Each document family maintains a metadata file tracking:

```json
{
  "originalFile": {
    "path": "/source/path/to/original.pdf",
    "hash": "sha256-hash",
    "size": 1234567,
    "lastModified": "2025-09-24T10:30:00Z"
  },
  "extracted": {
    "created": "2025-09-24T11:00:00Z",
    "method": "pdf-extraction-v1.2",
    "status": "completed",
    "editedBy": "user",
    "lastEdited": "2025-09-24T11:15:00Z"
  },
  "derivatives": [
    {
      "filename": "summary-cost-analysis.det",
      "type": "summary",
      "topic": "cost-analysis",
      "parentFile": "extracted.det",
      "created": "2025-09-24T12:00:00Z",
      "status": "completed"
    },
    {
      "filename": "anonymized.det",
      "type": "anonymized",
      "parentFile": "extracted.det",
      "created": "2025-09-24T12:30:00Z",
      "status": "completed"
    }
  ],
  "processingChain": [
    "original.pdf → extracted.det",
    "extracted.det → summary-cost-analysis.det",
    "extracted.det → anonymized.det"
  ]
}
```

## Integration with TipTap/ProseMirror

### .det File Format

All derivatives use the standardized `.det` format containing:

- TipTap/ProseMirror JSON document structure
- Metadata headers (document type, parent relationships, creation info)
- Annotation and markup data
- Processing history and edit tracking

### Editing Capabilities

- **Extraction Correction**: Edit extracted.det to fix OCR or parsing errors
- **Content Editing**: All derivatives are fully editable in TipTap editor
- **Annotation Support**: Rich annotations, highlights, and markup
- **Version History**: Track changes and edits across derivative versions

## User Interface Requirements

### Document Family View

- Visual representation of document families with original + all derivatives
- Tree/hierarchical view showing parent-child relationships
- Processing status indicators for each derivative
- Quick actions for creating new derivatives

### Derivative Creation Workflow

- "Create Derivative" action from any document
- Template selection (summary, anonymized, cost-table, custom)
- Parent document selection for derivative chains
- Automatic metadata initialization

### Search and Discovery

- Search across all derivatives within document families
- Filter by derivative type (summary, anonymized, etc.)
- Parent-child relationship navigation
- Full-text search within .det content

## Integration Points

### With Reports Management System

- Derivatives folder coordinates with reports folder structure
- Immutable source mode applies to original files only
- Generated reports may reference derivatives
- Shared folder picker and validation logic

### With File Metadata Extraction System

- Original file metadata feeds into derivative tracking
- Extraction process creates base .det file
- Processing status updates derivative metadata
- Search indexing includes derivative content and relationships

### With Multi-Document Workspace

- Open multiple derivatives simultaneously
- Side-by-side comparison of versions (original, extracted, derivatives)
- Context-aware navigation between related documents
- Synchronized scrolling and cross-referencing

## Processing and Storage Strategy

### Extraction Process

1. Original file processed using appropriate extraction method
2. Base `extracted.det` created in document family folder
3. Metadata initialized with processing information
4. Status tracking throughout extraction pipeline

### Derivative Creation Process

1. User selects parent document and derivative type
2. Template applied (if applicable) for derivative structure
3. New `.det` file created in document family folder
4. Metadata updated with parent-child relationship
5. Processing chain recorded for traceability

### Storage Optimization

- File system storage preferred over database for document content
- Metadata stored in both file system (\_metadata.json) and database for search performance
- Efficient handling of large document families
- Cleanup procedures for orphaned derivatives
