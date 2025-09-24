This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Unified Search & Discovery Integration (Iteration 3)

This iteration implements the sophisticated integration architecture that ties together all systems (Project Management, Document Derivatives, File Metadata, and Reports) into a unified search and discovery experience, completing the comprehensive Corpus Review platform.

## Integration Scope

This iteration delivers the unifying layer that connects all systems:

- Unified search across all content types (originals, derivatives, reports, metadata)
- Cross-system navigation and relationship discovery
- Comprehensive indexing of all documents, derivatives, and reports
- Advanced filtering and discovery tools
- Integrated user experience across all components

**Explicitly NOT in this iteration:**

- AI-powered semantic search or recommendations
- External system integrations (SharePoint, Google Drive, etc.)
- Advanced analytics or usage reporting
- Collaborative features or multi-user coordination
- Real-time synchronization across multiple devices
- Advanced export/import capabilities for external tools

## User Scenarios & Testing

### Primary User Story

As a corpus analyst working with complex multi-format projects, I need unified search and discovery capabilities so I can quickly find relevant information across all my documents, derivatives, and reports regardless of where it's stored, and understand the relationships between related items.

### Acceptance Scenarios

1. **Given** I have processed documents, derivatives, and reports, **When** I search for a term, **Then** I get unified results showing matches across all content types with clear source identification
2. **Given** I find a relevant document in search results, **When** I explore its context, **Then** I can see all related derivatives, reports, and family relationships
3. **Given** I'm researching a specific topic, **When** I use advanced filters, **Then** I can narrow results by file type, derivative type, creation date, processing status, and content source
4. **Given** I discover relevant content, **When** I navigate to related items, **Then** the system maintains search context and enables easy exploration of related materials

### Edge Cases

- What happens when search indices become out of sync with file system changes?
- How does system handle search across projects with thousands of documents and derivatives?
- What occurs when referenced documents are moved between families or deleted?

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide unified search interface that searches across all content types simultaneously
- **FR-002**: System MUST index content from original documents, extracted text, derivatives, and reports
- **FR-003**: System MUST provide advanced filtering by file type, derivative type, processing status, and creation date
- **FR-004**: System MUST show search results with clear source identification and relationship context
- **FR-005**: System MUST enable navigation from search results to full document context and related items
- **FR-006**: System MUST maintain search performance with large corpora (1000+ documents, 5000+ derivatives)
- **FR-007**: System MUST provide relationship-aware search that can find connected items
- **FR-008**: System MUST support metadata-based search across audio/video properties and document attributes
- **FR-009**: System MUST maintain search index consistency with real-time updates as content changes
- **FR-010**: System MUST provide search result organization and sorting options

### Key Entities

- **Unified Search Index**: Comprehensive search database covering all content types
- **Search Result**: Search hit with source identification, relevance, and relationship context
- **Content Relationship Graph**: Network of connections between documents, derivatives, and reports
- **Search Context**: Maintained state during exploration and navigation

## Unified Search Architecture

### Search Index Structure

```sql
CREATE TABLE unified_search_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,

  -- Content identification
  content_type TEXT NOT NULL, -- 'original', 'extracted', 'derivative', 'report'
  content_subtype TEXT, -- 'summary', 'anonymized', 'cost-table', 'analysis', etc.
  source_path TEXT NOT NULL,
  family_id TEXT, -- document family if applicable

  -- Content data
  title TEXT,
  content_text TEXT, -- full-text content for search
  content_excerpt TEXT, -- preview excerpt

  -- Metadata
  file_size INTEGER,
  created_at DATETIME,
  modified_at DATETIME,
  created_by TEXT,

  -- Document-specific metadata
  page_count INTEGER,
  extraction_quality REAL,

  -- Media-specific metadata
  duration REAL, -- audio/video duration in seconds
  audio_artist TEXT,
  audio_album TEXT,
  video_resolution TEXT,

  -- Processing metadata
  processing_status TEXT,
  parent_document TEXT,
  child_documents TEXT, -- JSON array of child document paths

  -- Search optimization
  search_vector TEXT, -- full-text search vector
  last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Search performance indexes
CREATE INDEX idx_search_project ON unified_search_index(project_id);
CREATE INDEX idx_search_type ON unified_search_index(content_type, content_subtype);
CREATE INDEX idx_search_family ON unified_search_index(family_id);
CREATE INDEX idx_search_content ON unified_search_index(content_text);
CREATE INDEX idx_search_metadata ON unified_search_index(created_at, processing_status);
```

### Search Interface Design

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Search: [cost analysis methodology          ] [Search] [×]   │
├─────────────────────────────────────────────────────────────────┤
│ Filters: [All Types ▼] [All Status ▼] [Date Range ▼] [Clear]  │
│                                                                 │
│ Showing 23 results across documents, derivatives, and reports   │
├─────────────────────────────────────────────────────────────────┤
│ 📄 Cost Analysis Methodology (Original Document)               │
│     document1.pdf • 2.1MB • 15 pages • Modified: Sep 24      │
│     Family: 5 derivatives including cost tables and summaries  │
│     Preview: "The methodology for cost analysis involves..."    │
│     [Open] [View Family] [Create Report Reference]            │
├─────────────────────────────────────────────────────────────────┤
│ 💰 Cost Table - Litigation Damages (Derivative)               │
│     doc_1/cost-table-litigation.det • From: document1.pdf   │
│     Analysis showing $234,000 in estimated damages...          │
│     [Open] [View Family] [Reference in Report]                 │
├─────────────────────────────────────────────────────────────────┤
│ 📊 Analysis Report - Cost Findings (Report)                    │
│     reports/findings/cost-analysis-report.det               │
│     References 3 documents • Modified: Sep 24                  │
│     Comprehensive analysis of cost methodologies across...      │
│     [Open] [View References] [Export]                          │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-System Integration Implementation

### Search Result Context Integration

```javascript
// Search result with rich context
{
  "id": "search_001",
  "contentType": "derivative",
  "contentSubtype": "cost-table",
  "title": "Cost Table - Litigation Damages",
  "sourcePath": "/derivatives/doc_1/cost-table-litigation.det",
  "familyId": "doc_1",
  "relevanceScore": 0.87,

  "familyContext": {
    "originalDocument": {
      "name": "document1.pdf",
      "path": "/source/document1.pdf"
    },
    "siblingDerivatives": [
      "summary-general.det",
      "anonymized.det",
      "explanatory-methodology.det"
    ],
    "referencingReports": [
      "/reports/findings/cost-analysis-report.det",
      "/reports/deliverables/final-report.det"
    ]
  },

  "navigationActions": [
    {"type": "open", "label": "Open Document"},
    {"type": "viewFamily", "label": "View Document Family"},
    {"type": "createReference", "label": "Reference in Report"},
    {"type": "showRelated", "label": "Show Related Items"}
  ]
}
```

### Relationship-Aware Navigation

- **Document Family Explorer**: Show complete family tree from any search result
- **Cross-Reference Discovery**: Find all reports that reference a specific document
- **Related Content Suggestions**: Suggest related documents based on content similarity and family relationships
- **Processing Chain Visualization**: Show how current item fits in processing workflow

## Advanced Search Capabilities

### Multi-Criteria Search Filters

```
Content Type Filters:
☑ Original Documents    ☑ Extracted Documents
☑ Summary Derivatives   ☑ Anonymized Versions
☑ Cost Tables          ☑ Explanatory Documents
☑ Analysis Reports     ☑ Client Deliverables
☐ Working Notes        ☐ Custom Types

Processing Status:
☑ Completed    ☐ In Progress    ☐ Needs Review    ☐ Error

Date Range:
○ All Time     ○ Last Week     ○ Last Month     ○ Custom Range
  From: [____] To: [____]

File Properties:
□ Has Audio/Video    □ Large Files (>10MB)    □ Recently Modified
□ High Quality       □ Multiple Derivatives   □ Referenced in Reports
```

### Metadata-Based Search

- **Audio Search**: Find by duration, artist, album, genre, bitrate
- **Video Search**: Filter by resolution, duration, codec, aspect ratio
- **Document Search**: Search by page count, file size, extraction quality
- **Derivative Search**: Filter by parent document, creation method, template used
- **Report Search**: Find by referenced documents, report type, creation date

## Real-Time Index Management

### Index Update Triggers

```javascript
// Automatic index updates
const indexUpdateEvents = {
  "document.extracted": updateSearchIndex,
  "derivative.created": updateSearchIndex,
  "derivative.modified": updateSearchIndex,
  "report.created": updateSearchIndex,
  "report.modified": updateSearchIndex,
  "file.deleted": removeFromIndex,
  "family.restructured": reindexFamily,
};

// Index update process
async function updateSearchIndex(event) {
  const content = await extractContentForSearch(event.filePath);
  const metadata = await gatherMetadata(event.filePath);
  const relationships = await buildRelationshipGraph(event.filePath);

  await searchIndex.upsert({
    ...content,
    ...metadata,
    ...relationships,
    lastIndexed: new Date(),
  });
}
```

### Index Consistency Management

- **Incremental Updates**: Update index entries as content changes without full rebuild
- **Consistency Checks**: Periodic validation that index matches file system state
- **Recovery Procedures**: Rebuild index sections when inconsistencies detected
- **Performance Optimization**: Background index maintenance during idle periods

## Search Performance Optimization

### Query Optimization

```sql
-- Optimized search query with proper indexing
SELECT
  content_type, content_subtype, title, source_path, family_id,
  content_excerpt, created_at, modified_at, processing_status,
  -- Relevance scoring
  (CASE
    WHEN title LIKE '%{searchTerm}%' THEN 10
    WHEN content_excerpt LIKE '%{searchTerm}%' THEN 5
    ELSE 1
  END) as relevance_score
FROM unified_search_index
WHERE project_id = ?
  AND (title LIKE '%{searchTerm}%'
       OR content_text LIKE '%{searchTerm}%'
       OR audio_artist LIKE '%{searchTerm}%'
       OR video_resolution LIKE '%{searchTerm}%')
  AND content_type IN ({selectedTypes})
  AND processing_status IN ({selectedStatuses})
  AND created_at BETWEEN ? AND ?
ORDER BY relevance_score DESC, modified_at DESC
LIMIT 50;
```

### Performance Targets

- **Search Response**: Results appear within 300ms for typical queries
- **Index Updates**: Content changes reflected in search within 5 seconds
- **Large Result Sets**: Handle 500+ results with pagination and sorting
- **Complex Queries**: Multi-criteria filters complete within 1 second

## User Experience Integration

### Contextual Search Actions

```
From any search result, users can:
1. Open document/derivative/report in appropriate editor
2. View complete document family tree
3. Create new report reference to this item
4. Find all reports that reference this item
5. Show related items based on content or family relationships
6. Add to comparison set for analysis
7. Export or share item with context
```

### Search Context Preservation

- **Search History**: Maintain recent search queries and allow quick re-execution
- **Navigation Context**: Remember search when navigating to documents and provide "back to search" option
- **Result Bookmarking**: Allow users to bookmark specific search results or queries
- **Search Sessions**: Maintain search context across workspace tabs and activities

## Integration Testing and Validation

### Cross-System Search Validation

```javascript
// Integration test scenarios
const testScenarios = [
  {
    name: "end-to-end-content-discovery",
    steps: [
      "Create project with mixed media files",
      "Process documents and create derivatives",
      "Create analysis reports referencing derivatives",
      "Search for terms across all content types",
      "Verify results include original, derivative, and report matches",
      "Navigate through relationships and verify accuracy",
    ],
  },
  {
    name: "real-time-index-consistency",
    steps: [
      "Monitor search index during content modifications",
      "Create, modify, delete documents and derivatives",
      "Verify search results immediately reflect changes",
      "Check relationship graph updates correctly",
    ],
  },
];
```

### Performance and Scalability Testing

- **Large Corpus Tests**: Validate performance with 1000+ documents, 5000+ derivatives
- **Concurrent User Tests**: Ensure search performance with multiple simultaneous users
- **Index Rebuild Tests**: Verify system can rebuild search index without downtime
- **Memory Usage Tests**: Confirm search operations don't cause memory leaks

## Success Criteria

### Search Effectiveness

- **Content Discovery**: Users can find relevant information across all content types within 3 search attempts
- **Result Relevance**: Top 5 search results contain at least 3 highly relevant items for typical queries
- **Relationship Navigation**: Users can discover connected content through relationship exploration
- **Metadata Search**: Users can effectively filter and find content using audio/video/document metadata

### Technical Performance

- **Response Times**: All search operations complete within specified performance targets
- **Index Accuracy**: Search index maintains 99.5%+ consistency with actual content
- **Scalability**: System performs well with growing corpus size without degradation
- **Real-time Updates**: Content changes reflected in search results within 5 seconds

### User Experience Quality

- **Unified Interface**: Consistent search experience across all content types and sources
- **Context Preservation**: Smooth navigation between search and content exploration
- **Advanced Features**: Power users can effectively use advanced filtering and metadata search
- **Integration Smoothness**: Search feels like natural part of overall Corpus Review workflow

This unified search and discovery integration completes the comprehensive Corpus Review platform by providing sophisticated tools for finding, exploring, and understanding relationships across all processed content, derivatives, and analysis reports.
