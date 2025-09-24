This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Project List Management (Enhanced - Iteration 2)

This iteration builds on the basic project CRUD from Iteration 1 to add essential productivity features: search/filter, status indicators, and file counts. These enhancements make the project list functional for users managing multiple Corpus Review projects.

## Enhanced Scope

Building on Iteration 1 MVP, this iteration adds:

- Search/filter projects by name and source folder path
- Project status indicators (active, processing, completed)
- File type counts and processing progress indicators
- Basic sorting options (name, creation date, last modified)
- Enhanced project information display

**Explicitly NOT in this iteration:**

- Advanced metadata search across document content
- Complex project templates or duplication
- Project archiving and advanced deletion options
- Batch operations on multiple projects
- Project collaboration or sharing features
- Grid/list view toggle (keeping simple list view)

## User Scenarios & Testing

### Primary User Story

As a corpus analyst managing multiple projects, I need to quickly find and assess my projects so I can efficiently locate the right project and understand its processing status before opening it.

### Acceptance Scenarios

1. **Given** I have many projects, **When** I search by project name, **Then** the list filters to show only matching projects
2. **Given** I want to find projects in a specific location, **When** I search by folder path, **Then** I can locate projects by their source folder
3. **Given** I have projects in various stages, **When** I view the project list, **Then** I can see processing status and file counts for each project
4. **Given** I want to organize my work, **When** I sort projects by last modified, **Then** I can see which projects I worked on recently

### Edge Cases

- What happens when search returns no results?
- How does system handle projects with inaccessible source folders when calculating status?
- What occurs when file counts are very large (1000+ files)?

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide real-time search/filter functionality for project names
- **FR-002**: System MUST support search within source folder paths
- **FR-003**: System MUST display project status indicators (Active, Processing, Completed, Error)
- **FR-004**: System MUST show file type counts (Documents, Audio, Video, Other) for each project
- **FR-005**: System MUST show processing progress (X of Y files processed)
- **FR-006**: System MUST support sorting by name, creation date, and last modified date
- **FR-007**: System MUST update file counts and status automatically when projects are modified
- **FR-008**: System MUST show last activity timestamp for each project
- **FR-009**: System MUST handle search queries with partial matching (case-insensitive)
- **FR-010**: System MUST maintain responsive performance with search/filter on 100+ projects

### Key Entities

- **Project Status**: Current state of project (Active, Processing, Completed, Error)
- **File Type Summary**: Count of different file types within project source folder
- **Processing Progress**: Status of document extraction and derivative creation
- **Activity Timestamp**: Last time project was accessed or modified

## Enhanced Project List Interface

### Project List Item Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 🟢 Project Name                           Created: 2024-09-20   │
│ /path/to/source/folder                    Modified: 2024-09-24  │
│                                                                 │
│ 📄 12 docs │ 🎵 5 audio │ 🎥 2 video │ 📁 3 other             │
│ Processing: 15/22 files processed  [████████░░] 68%            │
└─────────────────────────────────────────────────────────────────┘
```

### Search and Filter Controls

- **Search Box**: Real-time search with placeholder "Search projects..."
- **Clear Search**: X button to clear current search/filter
- **Search Scope**: Search project names and source folder paths
- **Results Count**: "Showing X of Y projects" when filtered

### Sorting Controls

- **Sort Dropdown**: Options for Name (A-Z), Name (Z-A), Newest First, Oldest First, Recently Modified
- **Default Sort**: Recently Modified (most recently accessed projects first)
- **Sort Persistence**: Remember user's preferred sort order

## Status Indicators and File Counts

### Project Status Types

- **🟢 Active**: Project has been accessed recently, ready for work
- **🟡 Processing**: Files are currently being extracted or processed
- **🔵 Completed**: All files processed, no recent activity
- **🔴 Error**: Issues with source folder access or processing failures

### File Type Counting

- **📄 Documents**: PDF, DOCX, RTF, MD files (extraction-supported formats)
- **🎵 Audio**: MP3, WAV, FLAC, AAC, OGG, M4A files
- **🎥 Video**: MP4, AVI, MOV, MKV, WEBM, WMV files
- **📁 Other**: All other file types in source folder

### Processing Progress

- **Extraction Progress**: "X/Y files processed" with progress bar
- **Status Breakdown**: Show counts of pending, processing, completed, error files
- **Quick Status**: Visual progress bar showing overall completion percentage

## Data Requirements

### Database Schema Enhancements

```sql
-- Add to projects table
ALTER TABLE projects ADD COLUMN last_accessed DATETIME;
ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE projects ADD COLUMN document_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN audio_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN video_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN other_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN processed_count INTEGER DEFAULT 0;

-- Add project activity tracking
CREATE TABLE project_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL, -- 'opened', 'file_processed', 'derivative_created'
  activity_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### Automated Data Updates

- **File Counts**: Recalculated when source folder is scanned or modified
- **Processing Progress**: Updated as files are extracted or derivatives created
- **Last Accessed**: Updated when project is opened or worked on
- **Status Calculation**: Determined based on recent activity and processing state

## Search and Filter Implementation

### Search Functionality

- **Real-time Search**: Filter results as user types (debounced to avoid excessive queries)
- **Multi-field Search**: Search across project name and source folder path
- **Case-insensitive**: Match regardless of case
- **Partial Matching**: Find projects with partial name or path matches

### Search Performance

- **Database Indexing**: Index project names and source folder paths
- **Query Optimization**: Efficient SQL queries with appropriate WHERE clauses
- **Result Limiting**: Show top 100 results for performance with large project sets
- **Search Debouncing**: 300ms delay to avoid excessive database queries

## Technical Implementation

### Status Calculation Logic

```javascript
function calculateProjectStatus(project) {
  if (hasRecentActivity(project, 7)) return "active";
  if (hasProcessingFiles(project)) return "processing";
  if (hasProcessingErrors(project)) return "error";
  if (allFilesProcessed(project)) return "completed";
  return "active";
}
```

### File Counting Process

- **Background Scanning**: Count files during idle time, not on every page load
- **Caching**: Cache file counts and update when source folder changes detected
- **Incremental Updates**: Update counts when individual files are processed
- **Error Handling**: Graceful handling when source folders are inaccessible

## Performance Requirements

### Response Times

- Search results appear within 200ms for keystroke
- File counts load within 1 second for project list
- Sorting completes within 500ms for 100+ projects
- Status indicators update within 2 seconds after project activity

### Scalability

- Handle 200+ projects without performance degradation
- Efficient database queries with proper indexing
- Minimal memory usage for file counting operations
- Responsive UI during background file scanning

## Error Handling

### Source Folder Issues

- **Folder Not Found**: Show "⚠️" indicator with tooltip "Source folder not found"
- **Access Denied**: Show "🔒" indicator with tooltip "Access denied"
- **Network Issues**: Show "📡" indicator with tooltip "Network folder unavailable"

### Search and Filter Errors

- **No Results**: "No projects match your search. Try different keywords."
- **Search Errors**: "Search temporarily unavailable. Please try again."
- **Loading States**: Show skeleton loading for file counts during calculation

## Integration Points

### With Iteration 1 Systems

- **Basic Project Management**: Enhanced display of existing project CRUD operations
- **Workspace Navigation**: Status indicators help users choose which projects to open
- **Database Integration**: Extended schema builds on existing projects table

### With Iteration 2 Systems

- **Document Derivatives**: Processing progress reflects derivative creation status
- **File Metadata**: File counts and status based on extraction and processing activities

### Future Integration Preparation

- **Advanced Search**: Database structure supports content-based search expansion
- **Project Analytics**: Activity tracking foundation for usage analytics
- **Batch Operations**: Selection and status tracking ready for bulk operations

## Success Criteria

### User Experience

- Fast, responsive search that helps users quickly find projects
- Clear visual indicators of project status and progress
- Intuitive sorting options that support different work patterns
- Informative project summaries that help with project selection

### Technical Performance

- Sub-second search responses maintain fluid user experience
- Accurate file counts and status indicators update reliably
- Efficient database queries support growing project collections
- Graceful error handling maintains usability when issues occur

### Data Accuracy

- File counts accurately reflect source folder contents
- Processing status correctly represents current extraction state
- Activity timestamps properly track user interactions
- Search results consistently match user expectations

This enhanced project list transforms the basic CRUD interface into a productivity tool that helps users efficiently manage and navigate multiple Corpus Review projects while providing essential status information for informed decision-making.
