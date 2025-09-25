# Extraction UI Components

This directory contains UI components for the File Metadata Extraction feature, integrating document extraction functionality with the workspace file browser.

## Components

### ExtractionStatusIndicator

Visual status display component for document extraction operations.

**Features:**
- Status icons and text for all extraction states (None, Pending, Processing, Completed, Error)
- Progress indicators with percentage display during processing
- Error tooltips with actionable messages
- Compact mode for file list integration
- Real-time status updates through polling
- Accessibility support with ARIA labels and keyboard navigation

**Usage:**
```tsx
import { ExtractionStatusIndicator } from './ExtractionStatusIndicator';

<ExtractionStatusIndicator
  status={extractionStatus}
  progressPercentage={75}
  errorMessage="File too large"
  compact={true}
  showTooltip={true}
  onClick={() => handleStatusClick()}
/>
```

**Props:**
- `status`: Current extraction status
- `progressPercentage`: 0-100 progress for processing state
- `errorMessage`: Error details for failed extractions
- `showProgress`: Show/hide progress percentage text
- `showTooltip`: Enable detailed tooltip information
- `compact`: Compact mode for file list integration
- `onClick`: Click handler for interactive indicators

## Enhanced Components

### FileList (Enhanced)

The existing FileList component has been enhanced with extraction functionality.

**New Features:**
- Extract buttons for supported file types (PDF, DOCX, Markdown)
- Extraction status indicators integrated into both list and grid views
- Visual indicators for extractable files (enhanced icons, border styling)
- File type filtering and validation
- Integration with extraction store for state management
- Double-click handling for file opening

**New Props:**
- `projectId`: Required for extraction operations
- `onFileOpen`: Callback for file viewing/editing

**Usage:**
```tsx
import { FileList } from './FileList';

<FileList
  directoryListing={directoryListing}
  selectedFiles={selectedFiles}
  viewMode={viewMode}
  projectId={currentProject.id}
  onFolderDoubleClick={handleFolderNavigate}
  onFileSelect={handleFileSelect}
  onFileOpen={handleFileOpen}
/>
```

## State Management

### ExtractionStore

Zustand store managing extraction state and operations.

**Key Features:**
- Document scanning and caching
- Extraction lifecycle management (start, monitor, cancel)
- Status polling for real-time updates
- Error handling and recovery
- Document preview and editing support
- Type-safe operations with comprehensive validation

**Store Methods:**
- `scanDocuments(projectId)`: Scan project for extractable documents
- `startExtraction(documentId, forceReextract)`: Begin extraction process
- `getExtractionStatus(extractionId)`: Check extraction progress
- `cancelExtraction(extractionId)`: Cancel in-progress extraction
- `openDocument(documentId)`: Load extracted document for editing
- `saveDocument(extractedDocumentId, content)`: Save document changes

**Utility Methods:**
- `getDocumentById(documentId)`: Retrieve document by ID
- `getExtractionByDocumentId(documentId)`: Find extraction for document
- `isDocumentExtractable(documentId)`: Check if document can be extracted
- `getDocumentExtractionStatus(documentId)`: Get current extraction status

## Integration Points

### Tauri Commands

The components integrate with these Tauri backend commands:

- `scan_project_documents`: Discover extractable documents
- `start_document_extraction`: Begin extraction process
- `get_extraction_status`: Monitor extraction progress
- `cancel_extraction`: Stop in-progress extraction
- `get_extracted_document`: Load extracted content for editing
- `save_extracted_document`: Save edited content
- `get_original_document_preview`: View original document

### File Type Support

**Supported Formats:**
- PDF files (.pdf) - Text extraction or OCR
- DOCX files (.docx, .doc) - Structure extraction
- Markdown files (.md, .markdown) - Direct conversion

**File Size Limits:**
- Maximum 10MB per document
- Visual warnings for oversized files
- Graceful handling of size validation errors

## Styling

### CSS Classes

**ExtractionStatusIndicator:**
- `.extraction-status-indicator` - Main container
- `.extraction-status-indicator--compact` - Compact mode
- `.extraction-status-indicator--clickable` - Interactive state
- `.extraction-status--{status}` - Status-specific styling
- `.extraction-status-indicator__progress` - Progress display
- `.extraction-status-indicator__error` - Error details

**FileList Extensions:**
- `.file-entry--extractable` - Extractable file indicator
- `.file-entry__extraction-controls` - Extraction button container
- `.file-entry__extract-button` - Extract action button
- `.file-list__header-cell--extraction` - Extraction status column

### Responsive Design

Components adapt to different screen sizes:
- Mobile: Reduced padding and font sizes
- Compact layouts for small screens
- Touch-friendly button sizing
- Accessible color contrast in all modes

## Error Handling

### User-Friendly Messages

- File size validation with specific limits
- Unsupported file type explanations
- Network connectivity issues
- Extraction timeout scenarios
- Permission and access problems

### Recovery Actions

- Retry buttons for failed extractions
- Clear error states and messaging
- Graceful degradation when services unavailable
- Auto-retry with exponential backoff for network issues

## Accessibility

### ARIA Support

- Semantic role attributes
- Screen reader friendly status announcements
- Keyboard navigation support
- Focus management for interactive elements
- Color contrast compliance

### Keyboard Controls

- Tab navigation through extraction controls
- Enter/Space activation for buttons
- Escape to cancel operations
- Arrow key navigation in lists

## Testing Considerations

### Unit Tests

Test components with various extraction states:
- None/null status rendering
- Progress indication during processing
- Error state display and recovery
- Button state management
- Store integration

### Integration Tests

- File scanning workflow
- Extraction process end-to-end
- Error handling scenarios
- Store state updates
- UI responsiveness

### Accessibility Tests

- Screen reader compatibility
- Keyboard-only navigation
- Color contrast validation
- Focus indicator visibility

## Development Notes

### Performance

- Polling intervals optimized for responsiveness (2s)
- Efficient re-renders with React.memo where needed
- Store selector patterns to minimize subscriptions
- Lazy loading of extraction status details

### Security

- Input validation for all extraction operations
- File size limits enforced client-side and backend
- Secure file path handling
- XSS protection in status messages

### Future Enhancements

- Batch extraction operations
- Advanced filtering and search
- Extraction history and analytics
- Custom extraction settings
- Export and sharing capabilities