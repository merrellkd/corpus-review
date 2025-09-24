This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: System Integration Architecture

This document defines how the Project List, Document Derivatives Management System, File Metadata Extraction System, and Reports Management System work together to provide unified search, discovery, and file organization capabilities for Corpus Review workflows.

## System Architecture Overview

### Core Systems Integration

```
┌─────────────────────┐    ┌──────────────────────────┐    ┌─────────────────────────┐
│   Project List      │    │  Document Derivatives    │    │  File Metadata         │
│   Management        │◄──►│  Management System       │◄──►│  Extraction System     │
└─────────────────────┘    └──────────────────────────┘    └─────────────────────────┘
           │                              │                              │
           │               ┌──────────────▼──────────────┐               │
           └──────────────►│    Reports Management       │◄──────────────┘
                           │         System              │
                           └─────────────────────────────┘
                                          │
                           ┌──────────────▼──────────────┐
                           │   Unified Search &          │
                           │   Discovery Engine          │
                           └─────────────────────────────┘
```

### Folder Structure Integration

```
/project-root/
  /source/                    (managed by Project List + File Metadata Extraction)
    original-doc1.pdf
    original-doc2.docx
    audio-file1.mp3
    video-file1.mp4

  /derivatives/               (managed by Document Derivatives System)
    /doc1-family/
      extracted.det
      summary-cost-analysis.det
      anonymized.det
      _metadata.json
    /doc2-family/
      extracted.det
      summary-findings.det
      _metadata.json

  /reports/                   (managed by Reports Management System)
    /analysis/
      case-findings.det
      final-report.det
    /deliverables/
      client-summary.det
```

## Unified Search and Discovery

### Multi-System Search Integration

The search system indexes content from all four systems:

- **Original Files**: Content and metadata from source documents (File Metadata Extraction System)
- **Derivatives**: Full-text search across all .det files (Document Derivatives System)
- **Reports**: Analysis findings and conclusions (Reports Management System)
- **Project Metadata**: Project names, descriptions, folder paths (Project List Management)

### Search Scope and Capabilities

- **Cross-Document Search**: Find information across originals, derivatives, and reports
- **Relationship-Aware**: Search includes parent-child document relationships
- **Metadata Filtering**: Filter by file type, processing status, creation date, document family
- **Content Types**: Full-text, audio/video metadata, document properties, annotations

### Search Result Organization

Search results are organized by:

1. **Document Families**: Group results by original document and its derivatives
2. **Content Type**: Separate results for originals, extractions, summaries, reports
3. **Relevance**: Rank by search term relevance and document relationships
4. **Recency**: Include creation and modification timestamps

## File Organization Patterns

### Document Lifecycle Organization

1. **Intake**: Original files added to `/source/` folder (Project List Management)
2. **Processing**: Metadata extracted and cached (File Metadata Extraction System)
3. **Extraction**: `.det` files created in `/derivatives/` (Document Derivatives System)
4. **Analysis**: Derivative documents created as needed (Document Derivatives System)
5. **Reporting**: Final reports generated in `/reports/` (Reports Management System)

### Immutable Source Mode Coordination

When Immutable Source Mode is enabled across all systems:

- **Source files**: Never modified, only read for extraction
- **Derivatives**: All document transformations stored in `/derivatives/`
- **Reports**: All analysis outputs stored in `/reports/`
- **Metadata**: Database and file system metadata coordinated but source untouched

### File Status Tracking

Unified status tracking across all systems:

- **Original**: Available, processing, processed, error
- **Extracted**: Not started, in progress, completed, needs correction
- **Derivatives**: None, partial, complete, updated
- **Reports**: Draft, in progress, final, archived

## Cross-System Data Flow

### Project Creation Flow

1. **Project List**: User creates project, specifies source and reports folders
2. **File Metadata Extraction**: Scans source folder, extracts metadata from all files
3. **Document Derivatives**: Initializes derivative folder structure for supported documents
4. **Reports Management**: Sets up reports folder and coordinates with derivatives

### Document Processing Flow

1. **File Metadata Extraction**: Detects new files in source folder
2. **Document Derivatives**: Creates document family folder and extracted.det
3. **File Metadata Extraction**: Updates metadata with extraction status and relationships
4. **Search Integration**: Indexes new content for search and discovery

### Derivative Creation Flow

1. **Document Derivatives**: User creates new derivative from extracted or other derivative
2. **File Metadata Extraction**: Updates relationship metadata and processing chain
3. **Search Integration**: Indexes new derivative content
4. **Reports Management**: Can reference derivatives in analysis reports

## User Experience Integration

### Navigation Patterns

- **Project-Centric**: Start from project list, navigate to workspace with unified file browser
- **Document-Centric**: Browse by document families, see all related versions
- **Task-Centric**: Work with derivatives and reports while maintaining context to originals

### Cross-System Actions

- **Open Family**: From any document, view entire document family tree
- **Create Derivative**: From extracted or derivative document, create new transformation
- **Reference in Report**: From any derivative, add reference to analysis report
- **Search Context**: From search results, navigate to source context and relationships

### Status and Progress Indicators

- **Project Level**: Overall processing status, file counts, completion percentage
- **Document Family Level**: Extraction status, derivative counts, recent activity
- **Individual File Level**: Processing status, quality indicators, edit history

## Data Persistence Strategy

### Database Coordination

- **Project List**: Project metadata, folder paths, settings
- **File Metadata Extraction**: File metadata, processing status, relationship mappings
- **Document Derivatives**: Derivative metadata, processing chains, family relationships
- **Reports Management**: Report metadata, cross-references, publication status

### File System Coordination

- **Document Derivatives**: `_metadata.json` files in each document family folder
- **Reports Management**: Report files with embedded metadata
- **File Metadata Extraction**: Cached metadata and extraction results
- **Project List**: Project configuration and folder structure

### Synchronization Requirements

- **Database-FileSystem Sync**: Keep metadata consistent between storage methods
- **Cross-System Updates**: Propagate changes across related systems
- **Integrity Maintenance**: Ensure referential integrity between originals and derivatives
- **Conflict Resolution**: Handle concurrent access and modification conflicts

## Performance and Scalability

### Search Performance

- **Incremental Indexing**: Update search index as documents are processed
- **Selective Re-indexing**: Only re-index changed documents and relationships
- **Metadata Caching**: Cache frequently accessed metadata for fast retrieval
- **Relationship Caching**: Pre-compute and cache document family relationships

### Storage Efficiency

- **Metadata Deduplication**: Avoid storing duplicate metadata across systems
- **Derivative Organization**: Efficient folder structure for large document families
- **Search Index Optimization**: Efficient indexing strategy for large corpora
- **Cleanup Procedures**: Remove orphaned derivatives and stale metadata

## Integration Testing Strategy

### Cross-System Scenarios

1. **End-to-End Document Processing**: Original → Extracted → Derivatives → Reports
2. **Search Across All Systems**: Verify unified search results include all content types
3. **Relationship Integrity**: Ensure parent-child relationships maintained across operations
4. **Immutable Source Mode**: Verify source files never modified across all systems

### Data Consistency Tests

- **Database-FileSystem Sync**: Verify metadata consistency after operations
- **Cross-Reference Integrity**: Ensure reports correctly reference derivatives
- **Processing Chain Accuracy**: Verify complete processing history tracking
- **Status Propagation**: Ensure status updates propagate across systems

This integration architecture ensures all four systems work cohesively to provide a comprehensive Corpus Review platform while maintaining clear separation of concerns and efficient data flow.
