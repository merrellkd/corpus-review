import React from 'react';
import { DirectoryListingDto, FileEntryDto, WorkspaceDtoUtils, ViewMode } from '../../../domains/workspace/application/dtos/workspace-dtos';
import { ExtractionDtoUtils } from '../../../domains/workspace/application/dtos/extraction-dtos';
import { ExtractionStatusIndicator } from '../../../domains/workspace/ui/components/ExtractionStatusIndicator';
import { useExtractionStore, useExtractionActions, useExtractionSelectors } from '../../../domains/extraction/stores/extraction-store';

/**
 * Props for the FileList component
 */
export interface FileListProps {
  /** The directory listing data */
  directoryListing: DirectoryListingDto;

  /** Set of selected file/folder names */
  selectedFiles: Set<string>;

  /** View mode for displaying files */
  viewMode: ViewMode;

  /** Current project ID for extraction operations */
  projectId: string;

  /** Callback when a folder is double-clicked */
  onFolderDoubleClick: (folderName: string) => void;

  /** Callback when a file selection changes */
  onFileSelect: (fileName: string, selected: boolean) => void;

  /** Callback when a file is opened for viewing/editing */
  onFileOpen?: (fileName: string, filePath: string) => void;
}

/**
 * Component for displaying file and directory listings
 *
 * Provides both list and grid views for file system entries,
 * with support for selection, sorting, and navigation interactions.
 */
export const FileList: React.FC<FileListProps> = ({
  directoryListing,
  selectedFiles,
  viewMode,
  projectId,
  onFolderDoubleClick,
  onFileSelect,
  onFileOpen,
}) => {
  // Extraction store
  const {
    documents,
    isLoading,
    error
  } = useExtractionStore();

  const { scanDocuments, startExtraction } = useExtractionActions();
  const { getDocumentById, getExtractionForDocument } = useExtractionSelectors();

  // Scan documents when component mounts or projectId changes
  React.useEffect(() => {
    if (projectId) {
      scanDocuments(projectId);
    }
  }, [projectId, scanDocuments]);
  // Early return if directoryListing is not available
  if (!directoryListing || !directoryListing.entries) {
    return (
      <div className="file-list file-list--loading">
        <div className="file-list__loading-message">
          Loading files...
        </div>
      </div>
    );
  }

  // Sort entries for consistent display
  const sortedEntries = WorkspaceDtoUtils.sortEntriesForListing(directoryListing.entries);

  const handleEntryClick = (entry: FileEntryDto, event: React.MouseEvent) => {
    if (event.detail === 2) {
      // Double click
      if (WorkspaceDtoUtils.isDirectory(entry)) {
        onFolderDoubleClick(entry.name);
      } else {
        // Double-click on file to open
        handleFileDoubleClick(entry);
      }
    } else {
      // Single click - toggle selection
      const isSelected = selectedFiles.has(entry.name);
      onFileSelect(entry.name, !isSelected);
    }
  };

  const handleCheckboxChange = (entry: FileEntryDto, checked: boolean) => {
    onFileSelect(entry.name, checked);
  };

  const getFileIcon = (entry: FileEntryDto): string => {
    if (WorkspaceDtoUtils.isDirectory(entry)) {
      return '📁';
    }

    const extension = WorkspaceDtoUtils.getExtension(entry);
    const isExtractable = isFileExtractable(entry);

    switch (extension) {
      case 'txt':
      case 'md':
      case 'markdown':
      case 'readme':
        return isExtractable ? '📝' : '📄'; // Enhanced icon for extractable markdown
      case 'pdf':
        return isExtractable ? '📚' : '📕'; // Enhanced icon for extractable PDF
      case 'docx':
      case 'doc':
        return isExtractable ? '📃' : '📄'; // Enhanced icon for extractable DOCX
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return '📜';
      case 'json':
      case 'yaml':
      case 'yml':
        return '⚙️';
      case 'html':
      case 'css':
        return '🌐';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return '🖼️';
      case 'zip':
      case 'tar':
      case 'gz':
        return '📦';
      default:
        return '📄';
    }
  };

  const formatModifiedTime = (modified: string): string => {
    try {
      const date = new Date(modified);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown';
    }
  };

  // Extraction helper functions
  const isFileExtractable = (entry: FileEntryDto): boolean => {
    if (WorkspaceDtoUtils.isDirectory(entry)) return false;

    const extension = WorkspaceDtoUtils.getExtension(entry);
    return ExtractionDtoUtils.isExtractableExtension(extension) &&
           (entry.size ? ExtractionDtoUtils.isFileSizeWithinLimits(entry.size) : true);
  };

  const getDocumentForFile = (entry: FileEntryDto) => {
    return Array.from(documents.values()).find(doc =>
      doc.filePath === entry.path || doc.fileName === entry.name
    );
  };

  const getExtractionStatusForFile = (entry: FileEntryDto) => {
    const document = getDocumentForFile(entry);
    return document ? getExtractionForDocument(document.documentId) : null;
  };

  const handleExtractClick = async (entry: FileEntryDto, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const document = getDocumentForFile(entry);
    if (document) {
      await startExtraction(document.documentId);
    }
  };

  const handleFileDoubleClick = (entry: FileEntryDto) => {
    if (onFileOpen) {
      onFileOpen(entry.name, entry.path);
    }
  };

  const renderExtractionControls = (entry: FileEntryDto) => {
    if (!isFileExtractable(entry)) return null;

    const document = getDocumentForFile(entry);
    const extractionStatusInfo = getExtractionStatusForFile(entry);
    const extractionStatus = extractionStatusInfo?.status || null;

    return (
      <div className="file-entry__extraction-controls">
        <ExtractionStatusIndicator
          status={extractionStatus}
          compact={true}
          showTooltip={true}
          onClick={() => {
            if (document && ExtractionDtoUtils.canStartExtraction(extractionStatus)) {
              startExtraction(document.documentId);
            }
          }}
        />

        {ExtractionDtoUtils.canStartExtraction(extractionStatus) && (
          <button
            className="file-entry__extract-button"
            onClick={(e) => handleExtractClick(entry, e)}
            disabled={isLoading}
            title={`Extract ${entry.name}`}
            aria-label={`Extract document ${entry.name}`}
          >
            {ExtractionDtoUtils.getExtractionButtonText(extractionStatus)}
          </button>
        )}
      </div>
    );
  };

  const renderListView = () => (
    <div className="file-list file-list--list">
      <div className="file-list__header">
        <div className="file-list__header-cell file-list__header-cell--name">Name</div>
        <div className="file-list__header-cell file-list__header-cell--size">Size</div>
        <div className="file-list__header-cell file-list__header-cell--modified">Modified</div>
        <div className="file-list__header-cell file-list__header-cell--type">Type</div>
        <div className="file-list__header-cell file-list__header-cell--extraction">Status</div>
        <div className="file-list__header-cell file-list__header-cell--select"></div>
      </div>

      <div className="file-list__body">
        {sortedEntries.map((entry) => {
          const isSelected = selectedFiles.has(entry.name);
          const isDirectory = WorkspaceDtoUtils.isDirectory(entry);

          return (
            <div
              key={entry.path}
              className={`file-entry file-entry--list ${isSelected ? 'file-entry--selected' : ''} ${isDirectory ? 'file-entry--directory' : 'file-entry--file'} ${isFileExtractable(entry) ? 'file-entry--extractable' : ''}`}
              onClick={(e) => handleEntryClick(entry, e)}
              title={isDirectory ? `Double-click to open ${entry.name}` :
                     isFileExtractable(entry) ? `${entry.name} - Extractable document` : entry.name}
            >
              <div className="file-entry__cell file-entry__cell--name">
                <span className="file-entry__icon">{getFileIcon(entry)}</span>
                <span className="file-entry__name">{entry.name}</span>
              </div>

              <div className="file-entry__cell file-entry__cell--size">
                {WorkspaceDtoUtils.getSizeDisplay(entry)}
              </div>

              <div className="file-entry__cell file-entry__cell--modified">
                {formatModifiedTime(entry.modified)}
              </div>

              <div className="file-entry__cell file-entry__cell--type">
                {isDirectory ? 'Folder' : (WorkspaceDtoUtils.getExtension(entry) || 'File').toUpperCase()}
              </div>

              <div className="file-entry__cell file-entry__cell--extraction">
                {renderExtractionControls(entry)}
              </div>

              <div className="file-entry__cell file-entry__cell--select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleCheckboxChange(entry, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="file-list file-list--grid">
      <div className="file-grid">
        {sortedEntries.map((entry) => {
          const isSelected = selectedFiles.has(entry.name);
          const isDirectory = WorkspaceDtoUtils.isDirectory(entry);

          return (
            <div
              key={entry.path}
              className={`file-entry file-entry--grid ${isSelected ? 'file-entry--selected' : ''} ${isDirectory ? 'file-entry--directory' : 'file-entry--file'} ${isFileExtractable(entry) ? 'file-entry--extractable' : ''}`}
              onClick={(e) => handleEntryClick(entry, e)}
              title={isDirectory ? `Double-click to open ${entry.name}` :
                     isFileExtractable(entry) ? `${entry.name} - Extractable document` : entry.name}
            >
              <div className="file-entry__checkbox">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => handleCheckboxChange(entry, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <div className="file-entry__icon-large">
                {getFileIcon(entry)}
              </div>

              <div className="file-entry__name">{entry.name}</div>

              <div className="file-entry__meta">
                <div className="file-entry__size">
                  {WorkspaceDtoUtils.getSizeDisplay(entry)}
                </div>
                <div className="file-entry__modified">
                  {formatModifiedTime(entry.modified)}
                </div>
              </div>

              {renderExtractionControls(entry)}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={`file-list-container file-list-container--${viewMode}`}>
      {viewMode === 'list' ? renderListView() : renderGridView()}
    </div>
  );
};

export default FileList;