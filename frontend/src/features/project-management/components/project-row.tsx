/**
 * ProjectRow Component
 *
 * Displays a single project row in the project list with actions,
 * selection, accessibility indicators, and context menu support.
 */

import React from 'react';
import type { ProjectListItem } from '../store';

// ====================
// Types
// ====================

export interface ProjectRowProps {
  /** The project to display */
  project: ProjectListItem;

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
  onClick?: (project: ProjectListItem) => void;
  onSelect?: (projectId: string, selected: boolean) => void;
  onEdit?: (project: ProjectListItem) => void;
  onDelete?: (project: ProjectListItem) => void;
  onOpenFolder?: (project: ProjectListItem) => void;
  onOpenWorkspace?: (project: ProjectListItem) => void;
  onDoubleClick?: (project: ProjectListItem) => void;
}

// ====================
// Helper Functions
// ====================

const formatCreatedAt = (isoDate: string): { display: string; relative: string } => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return { display: 'Unknown', relative: 'Unknown' };
  }

  const display = date.toLocaleDateString();
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { display, relative: 'Today' };
  }
  if (diffDays === 1) {
    return { display, relative: '1 day ago' };
  }
  if (diffDays < 7) {
    return { display, relative: `${diffDays} days ago` };
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return { display, relative: `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago` };
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return { display, relative: `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago` };
  }
  const diffYears = Math.floor(diffDays / 365);
  return { display, relative: `${diffYears} year${diffYears === 1 ? '' : 's'} ago` };
};

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
    onSelect?.(project.id, e.target.checked);
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

  const folderName = project.sourceFolderName || 'Unknown Folder';
  const notePreview = project.notePreview || project.note || null;
  const { display: createdAtDisplay, relative: relativeTime } = formatCreatedAt(project.createdAt);

  const isAccessible = project.isAccessible;
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
            aria-label={`Select project ${project.name}`}
          />
        </div>
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="text-lg font-medium text-gray-900 truncate" title={project.name}>
              {project.name}
            </div>
            <div className="flex items-center text-xs text-gray-500" title={accessibilityTitle}>
              <span className={`mr-1 ${isAccessible ? 'text-green-500' : 'text-yellow-500'}`}>
                {accessibilityIcon}
              </span>
              <span>{folderName}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-gray-500">
            <span title={project.sourceFolder}>{project.sourceFolder}</span>
            <span title={createdAtDisplay}>{relativeTime}</span>
          </div>
        </div>

        {notePreview && (
          <div className="mt-2 text-sm text-gray-600 line-clamp-2" title={notePreview}>
            {notePreview}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex-shrink-0 ml-4 flex items-center space-x-2">
          <button
            onClick={handleOpenWorkspaceClick}
            className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
          >
            Open
          </button>
          <button
            onClick={handleOpenFolderClick}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Folder
          </button>
          <button
            onClick={handleEditClick}
            className="px-2 py-1 text-xs bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectRow;
