This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Reports Management System

This system manages how analysis reports and findings are stored and organized, providing flexibility between keeping source files untouched versus integrating reports within the source structure. This system coordinates with the Document Derivatives Management System to maintain clear separation between analysis outputs (reports) and document transformations (derivatives).

## Reports vs Derivatives Distinction

This system specifically handles **analysis reports and findings**, which are distinct from document derivatives:

- **Reports (this system)**: Analysis outputs, findings, conclusions, research summaries, final deliverables
- **Derivatives (separate system)**: Document versions, extractions, summaries of source documents, anonymized versions

## Architectural Decision: Reports Folder Strategy

Given the corpus analysis nature of this application, we will implement a hybrid approach coordinating with the derivatives system:

1. **Default Behavior**: Reports folder is optional but recommended, works alongside dedicated `/derivatives/` folder
2. **Immutable Source Mode**: When selected, source files remain untouched and all analysis outputs go to separate reports folder
3. **Integrated Mode**: When reports folder is not specified, reports are saved within the source folder structure

### Folder Architecture

```
/project-root/
  /source/ (immutable corpus - original files)
  /derivatives/ (document versions - managed by Document Derivatives System)
  /reports/ (analysis outputs - managed by this system)
    /findings/
    /analysis-summaries/
    /deliverables/
    /client-reports/
```

## Implementation Details

- If no reports folder is specified, create a `_corpus_analysis` subfolder within the source directory
- Report editing uses TipTap editor with ProseMirror backend
- Report files use `.det` extension for consistency with document format standards
- Coordinate with Document Derivatives System for referencing source documents and derivatives in reports

## User Interface Requirements

### Project Creation Form Integration

- Immutable Source toggle (checkbox, default: false)
- Reports Folder (optional, folder picker)

## Report Creation and Storage

### Report Types and Organization

- **Analysis Reports**: Research findings and conclusions
- **Client Deliverables**: Final reports for external delivery
- **Working Documents**: Intermediate analysis and notes
- **Summary Reports**: High-level overviews and executive summaries

### Storage Strategy

- **Immutable Source Mode**: All analysis reports go to separate reports folder, source files remain untouched
- **Integrated Mode**: Reports stored in `_corpus_analysis` subfolder within source directory when no reports folder specified
- **Report Referencing**: Reports can reference and link to documents in derivatives folder without duplicating content
- Original source files are never modified or deleted automatically

### Report-Derivative Integration

- Reports can embed references to derivative documents
- Cross-linking between analysis findings and source/derivative documents
- Maintain traceability from conclusions back to source materials

## Data Persistence

- Settings (immutable mode, etc.) stored in project database
- Report metadata and status tracked for each project
- Cross-references to derivative documents maintained in report metadata
- Coordinate with Document Derivatives System for unified search and discovery

## Integration with Document Derivatives System

- Reports can reference specific derivatives without duplicating content
- Unified search across reports and derivatives
- Traceability links from analysis conclusions to source materials
- Consistent file format (.det) for both reports and derivatives
