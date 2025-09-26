import React from 'react';
import { WorkspaceDto, ViewMode } from '../../../domains/workspace/application/dtos/workspace-dtos';

/**
 * Props for the ProjectHeader component
 */
export interface ProjectHeaderProps {
  /** Current workspace data */
  workspace: WorkspaceDto;

  /** Callback for returning to project list */
  onBackToProjects: () => void;

  /** Current view mode */
  viewMode: ViewMode;

  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;

  /** Number of selected files */
  selectedCount: number;
}

/**
 * Header component for the workspace page
 *
 * Shows project information, navigation controls, and view options.
 * Provides a consistent header across all workspace views.
 */
export const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  workspace,
  onBackToProjects,
  viewMode,
  onViewModeChange,
  selectedCount,
}) => {
  const handleBackClick = () => {
    onBackToProjects();
  };

  const handleViewModeClick = (mode: ViewMode) => {
    if (mode !== viewMode) {
      onViewModeChange(mode);
    }
  };

  return (
    <header className="project-header">
      <div className="project-header__container">
        {/* Left section - Back button and project info */}
        <div className="project-header__left">
          <button
            className="project-header__back-button"
            onClick={handleBackClick}
            title="Return to project list"
            aria-label="Return to project list"
          >
            ← Back to Projects
          </button>

          <div className="project-header__project-info">
            <h1 className="project-header__project-name" title={workspace.projectName}>
              {workspace.projectName}
            </h1>
            <div className="project-header__source-folder" title={workspace.sourceFolder}>
              <span className="project-header__label">Source:</span>
              <span className="project-header__path">{workspace.sourceFolder}</span>
            </div>
          </div>
        </div>

        {/* Right section - View controls and selection info */}
        <div className="project-header__right">
          {/* Selection info */}
          {selectedCount > 0 && (
            <div className="project-header__selection-info">
              <span className="project-header__selection-count">
                {selectedCount} selected
              </span>
            </div>
          )}

          {/* View mode toggle */}
          <div className="project-header__view-controls">
            <span className="project-header__view-label">View:</span>
            <div className="project-header__view-buttons">
              <button
                className={`project-header__view-button ${viewMode === 'list' ? 'project-header__view-button--active' : ''}`}
                onClick={() => handleViewModeClick('list')}
                title="List view"
                aria-label="Switch to list view"
              >
                ☰ List
              </button>
              <button
                className={`project-header__view-button ${viewMode === 'grid' ? 'project-header__view-button--active' : ''}`}
                onClick={() => handleViewModeClick('grid')}
                title="Grid view"
                aria-label="Switch to grid view"
              >
                ⊞ Grid
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProjectHeader;