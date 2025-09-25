# File Metadata Extraction - Frontend Integration

This module provides dual-mode document viewing and editing capabilities for the Corpus Review application.

## Features

### Dual-Mode Document Support
- **View Mode**: Read-only viewing of original documents (PDF, DOCX, Markdown)
- **Edit Mode**: Full editing of extracted content using TipTap/ProseMirror

### Components
- **DocumentCaddy**: Enhanced with dual-mode support
- **TipTapEditor**: Rich text editor for .det files
- **DocumentViewer**: Read-only viewer for original files
- **ExtractionStatusIndicator**: Visual status indicators
- **ModeToggle**: Switch between view/edit modes

### State Management
- **ExtractionStore**: Zustand store for extraction state
- **Real-time progress tracking** for extraction operations
- **Auto-save functionality** for edited content

## Usage

### Basic DocumentCaddy Enhancement

The existing DocumentCaddy component now supports dual-mode operation when provided with document data:

```typescript
import { DocumentCaddy } from '../domains/workspace/ui/components/DocumentCaddy';
import { OriginalDocument, useExtractionStore } from '../domains/extraction';

function MyComponent() {
  const { documents } = useExtractionStore();
  const document = documents[0]; // Your document

  return (
    <DocumentCaddy
      // ... existing props
      document={document}
      mode="view" // or "edit"
      onModeToggle={(mode) => console.log('Mode changed:', mode)}
      onSave={async (content) => {
        // Handle saving
        await saveDocument(document.extractedDocumentId, content);
      }}
    />
  );
}
```

### Standalone Components

#### TipTap Editor
```typescript
import { TipTapEditor } from '../domains/extraction';

<TipTapEditor
  content={tiptapContent}
  onChange={(content) => setContent(content)}
  onSave={() => handleSave()}
  editable={true}
  showWordCount={true}
  autoSave={true}
  autoSaveDelay={3000}
/>
```

#### Document Viewer
```typescript
import { DocumentViewer } from '../domains/extraction';

<DocumentViewer
  preview={documentPreview}
  onError={(error) => console.error(error)}
/>
```

#### Extraction Controls
```typescript
import { ExtractButton, ExtractionStatusIndicator } from '../domains/extraction';

<ExtractButton
  onExtract={() => startExtraction(documentId)}
  isExtracting={isProcessing}
/>

<ExtractionStatusIndicator
  status={ExtractionStatus.Processing}
  progress={progressInfo}
  showLabel={true}
/>
```

### Store Integration

#### Initialize the store in your app
```typescript
import { useExtractionStore } from '../domains/extraction';

function App() {
  const { scanDocuments } = useExtractionStore();

  useEffect(() => {
    // Scan documents when project loads
    scanDocuments(projectId);
  }, [projectId]);
}
```

#### Use extraction actions
```typescript
import { useExtractionActions } from '../domains/extraction';

function DocumentList() {
  const { startExtraction, openDocument, openPreview } = useExtractionActions();

  const handleExtract = (docId) => {
    startExtraction(docId);
  };

  const handleOpenForEditing = (docId) => {
    openDocument(docId); // Opens extracted version
  };

  const handleOpenForViewing = (docId) => {
    openPreview(docId); // Opens original preview
  };
}
```

## Architecture

### Mode Detection
- File extension determines default mode (.pdf/.docx/.md = view, .det = edit)
- Toggle between viewing original and editing extracted version
- Automatic mode switching based on content availability

### Error Handling
- Structured error handling with `useExtractionError` hook
- User-friendly error messages
- Graceful fallbacks for unsupported operations

### Performance
- **Auto-save**: Configurable auto-save for edit mode (default: 3 seconds)
- **Progress tracking**: Real-time extraction progress updates
- **Memory management**: Efficient content loading and unloading

## Integration with Existing Workspace

The enhanced DocumentCaddy maintains backward compatibility with existing workspace functionality while adding new extraction capabilities:

1. **Existing props** continue to work as before
2. **New optional props** enable extraction features
3. **Graceful fallbacks** when extraction data is not available
4. **Mode detection** automatically determines capabilities

## API Requirements

Ensure the following Tauri commands are implemented:
- `scan_project_documents`
- `start_document_extraction`
- `get_extraction_status`
- `get_extracted_document`
- `save_extracted_document`
- `get_original_document_preview`

See the contracts file for detailed API specifications.

## Error Codes

The system handles these extraction-specific error codes:
- `DOCUMENT_NOT_FOUND`
- `EXTRACTION_IN_PROGRESS`
- `UNSUPPORTED_FILE_TYPE`
- `FILE_TOO_LARGE`
- `EXTRACTION_NOT_COMPLETED`
- `INVALID_CONTENT`

## Future Enhancements

- **Collaborative editing**: Real-time collaboration on extracted content
- **Version history**: Track changes to extracted documents
- **Advanced formatting**: Additional TipTap extensions
- **Export options**: Export edited content to various formats
- **Search integration**: Full-text search across extracted content