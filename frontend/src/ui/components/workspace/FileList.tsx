import React from 'react';
import { DirectoryListingDto, FileEntryDto, WorkspaceDtoUtils, ViewMode } from '../../../domains/workspace/application/dtos/workspace-dtos';

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

  /** Callback when a folder is double-clicked */
  onFolderDoubleClick: (folderName: string) => void;

  /** Callback when a file selection changes */
  onFileSelect: (fileName: string, selected: boolean) => void;
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
  onFolderDoubleClick,
  onFileSelect,
}) => {
  // Sort entries for consistent display
  const sortedEntries = WorkspaceDtoUtils.sortEntriesForListing(directoryListing.entries);

  const handleEntryClick = (entry: FileEntryDto, event: React.MouseEvent) => {
    if (event.detail === 2) {
      // Double click
      if (WorkspaceDtoUtils.isDirectory(entry)) {
        onFolderDoubleClick(entry.name);
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
    switch (extension) {
      case 'txt':
      case 'md':
      case 'readme':
        return '📄';
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
      case 'pdf':
        return '📕';
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

  const renderListView = () => (
    <div className="file-list file-list--list">
      <div className="file-list__header">
        <div className="file-list__header-cell file-list__header-cell--name">Name</div>
        <div className="file-list__header-cell file-list__header-cell--size">Size</div>
        <div className="file-list__header-cell file-list__header-cell--modified">Modified</div>
        <div className="file-list__header-cell file-list__header-cell--type">Type</div>
        <div className="file-list__header-cell file-list__header-cell--select"></div>
      </div>

      <div className="file-list__body">
        {sortedEntries.map((entry) => {
          const isSelected = selectedFiles.has(entry.name);
          const isDirectory = WorkspaceDtoUtils.isDirectory(entry);

          return (
            <div
              key={entry.path}
              className={`file-entry file-entry--list ${isSelected ? 'file-entry--selected' : ''} ${isDirectory ? 'file-entry--directory' : 'file-entry--file'}`}
              onClick={(e) => handleEntryClick(entry, e)}
              title={isDirectory ? `Double-click to open ${entry.name}` : entry.name}
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
              className={`file-entry file-entry--grid ${isSelected ? 'file-entry--selected' : ''} ${isDirectory ? 'file-entry--directory' : 'file-entry--file'}`}
              onClick={(e) => handleEntryClick(entry, e)}
              title={isDirectory ? `Double-click to open ${entry.name}` : entry.name}
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