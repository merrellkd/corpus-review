/**
 * ProjectRow Component
 *
 * Displays a single project row in the project list with actions,
 * selection, accessibility indicators, and context menu support.
 */

import React from 'react';
import { Project } from '../../domains/project';

// ====================
// Types
// ====================

export interface ProjectRowProps {
  /** The project to display */
  project: Project;

  /** Whether the project row is selected */
  isSelected?: boolean;

  /** Whether the row is in a loading state */
  isLoading?: boolean;

  /** Whether to show selection checkbox */
  showSelection?: boolean;

  /** Whether to show actions (edit/delete buttons) */
  showActions?: boolean;

  /** Custom className for styling */
  className?: string;

  // Event handlers
  onClick?: (project: Project) => void;
  onSelect?: (projectId: string, selected: boolean) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onOpenFolder?: (project: Project) => void;
  onOpenWorkspace?: (project: Project) => void;
  onDoubleClick?: (project: Project) => void;
}

// ====================
// Component
// ====================

export const ProjectRow: React.FC<ProjectRowProps> = ({
  project,
  isSelected = false,
  isLoading = false,
  showSelection = false,
  showActions = true,
  className = '',
  onClick,
  onSelect,
  onEdit,
  onDelete,
  onOpenFolder,
  onOpenWorkspace,
  onDoubleClick,
}) => {
  // ====================
  // Event Handlers
  // ====================

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger row click if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
      return;
    }

    onClick?.(project);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onDoubleClick?.(project);
  };

  const handleSelectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(project.id.value, e.target.checked);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(project);
  };

  const handleOpenFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenFolder?.(project);
  };

  const handleOpenWorkspaceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenWorkspace?.(project);
  };

  // ====================
  // Computed Properties
  // ====================

  const folderName = project.sourceFolder.folderName() || 'Unknown Folder';
  const notePreview = project.note?.preview(100) || null;
  const createdAtDisplay = project.createdAt.formatDate();
  const relativeTime = project.createdAt.getRelativeTime();

  // Accessibility status
  const isAccessible = true; // In frontend, we assume accessible unless told otherwise
  const accessibilityIcon = isAccessible ? '✓' : '⚠️';
  const accessibilityTitle = isAccessible ? 'Folder is accessible' : 'Folder is not accessible';

  // ====================
  // CSS Classes
  // ====================

  const rowClasses = [
    'project-row',
    'flex items-center p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors',
    isSelected ? 'bg-blue-50 border-blue-200' : '',
    isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer',
    !isAccessible ? 'opacity-75' : '',
    className,
  ].filter(Boolean).join(' ');

  // ====================
  // Render
  // ====================

  return (
    <div
      className={rowClasses}
      onClick={handleRowClick}
      onDoubleClick={handleDoubleClick}
      role="row"
      tabIndex={0}
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(project);
        }
      }}
    >
      {/* Selection Checkbox */}
      {showSelection && (
        <div className="flex-shrink-0 mr-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            aria-label={`Select ${project.name.value}`}
          />
        </div>
      )}

      {/* Accessibility Indicator */}
      <div
        className="flex-shrink-0 mr-3 text-lg"
        title={accessibilityTitle}
        aria-label={accessibilityTitle}
      >
        {accessibilityIcon}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Project Name and Folder */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {project.name.value}
            </h3>
            <p className="text-sm text-gray-500 truncate" title={project.sourceFolder.value}>
              📁 {project.sourceFolder.value}
            </p>
          </div>

          {/* Creation Date */}
          <div className="flex-shrink-0 ml-4 text-xs text-gray-400">
            <div title={createdAtDisplay}>
              {relativeTime}
            </div>
          </div>
        </div>

        {/* Note Preview */}
        {notePreview && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 line-clamp-2" title={project.note?.value}>
              {notePreview}
            </p>
          </div>
        )}

        {/* Project Metadata */}
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
          <span>ID: {project.id.display()}</span>
          {project.note && (
            <span>{project.note.lineCount} lines</span>
          )}
          <span>Created {createdAtDisplay}</span>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
          {/* Browse Files Button */}
          <button
            onClick={handleOpenWorkspaceClick}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors rounded-md font-medium"
            title="Browse project files"
            aria-label={`Browse ${project.name.value} files`}
          >
            Browse Files
          </button>

          {/* Open Folder Button */}
          <button
            onClick={handleOpenFolderClick}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded"
            title="Open folder in file explorer"
            aria-label={`Open ${project.name.value} folder`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>

          {/* Edit Button */}
          <button
            onClick={handleEditClick}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded"
            title="Edit project"
            aria-label={`Edit ${project.name.value}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDeleteClick}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded"
            title="Delete project"
            aria-label={`Delete ${project.name.value}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

// ====================
// Variants and Extensions
// ====================

/**
 * Compact version of ProjectRow for dense lists
 */
export const ProjectRowCompact: React.FC<ProjectRowProps> = (props) => {
  return (
    <ProjectRow
      {...props}
      className={`${props.className} py-2 text-sm`}
    />
  );
};

/**
 * ProjectRow with context menu support
 */
export interface ProjectRowWithMenuProps extends ProjectRowProps {
  menuItems?: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    danger?: boolean;
  }>;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const ProjectRowWithMenu: React.FC<ProjectRowWithMenuProps> = ({
  menuItems,
  onContextMenu,
  ...props
}) => {
  const handleContextMenu = (e: React.MouseEvent) => {
    if (menuItems && menuItems.length > 0) {
      e.preventDefault();
      onContextMenu?.(e);
    }
  };

  return (
    <div onContextMenu={handleContextMenu}>
      <ProjectRow {...props} />
    </div>
  );
};

// ====================
// Default Export
// ====================

export default ProjectRow;