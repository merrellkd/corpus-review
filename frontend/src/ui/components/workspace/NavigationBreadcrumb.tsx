import React from 'react';
import { WorkspaceDto, WorkspaceDtoUtils } from '../../../domains/workspace/application/dtos/workspace-dtos';

/**
 * Props for the NavigationBreadcrumb component
 */
export interface NavigationBreadcrumbProps {
  /** Current workspace data */
  workspace: WorkspaceDto;

  /** Callback when a breadcrumb segment is clicked */
  onNavigate: (path: string) => void;

  /** Callback for navigating to parent directory */
  onNavigateUp?: () => void;
}

/**
 * Breadcrumb navigation component for workspace paths
 *
 * Shows the current path as clickable segments and provides
 * navigation controls for moving through the directory hierarchy.
 */
export const NavigationBreadcrumb: React.FC<NavigationBreadcrumbProps> = ({
  workspace,
  onNavigate,
  onNavigateUp,
}) => {
  // Early return if workspace or directoryListing is not available
  if (!workspace || !workspace.directoryListing) {
    return (
      <nav className="navigation-breadcrumb" aria-label="File path navigation">
        <div className="navigation-breadcrumb__container">
          <div className="navigation-breadcrumb__loading">Loading navigation...</div>
        </div>
      </nav>
    );
  }

  // Get breadcrumb segments from the workspace
  const segments = WorkspaceDtoUtils.getBreadcrumbSegments(workspace);
  const canNavigateUp = workspace.directoryListing.canNavigateUp;

  const handleSegmentClick = (path: string) => {
    // Don't navigate if we're already at this path
    if (path !== workspace.currentPath) {
      onNavigate(path);
    }
  };

  const handleUpClick = () => {
    if (canNavigateUp && onNavigateUp) {
      onNavigateUp();
    }
  };

  return (
    <nav className="navigation-breadcrumb" aria-label="File path navigation">
      <div className="navigation-breadcrumb__container">
        {/* Up button */}
        {canNavigateUp && (
          <button
            className="navigation-breadcrumb__up-button"
            onClick={handleUpClick}
            title="Go to parent directory"
            aria-label="Navigate to parent directory"
          >
            ↑ Up
          </button>
        )}

        {/* Breadcrumb segments */}
        <div className="navigation-breadcrumb__path">
          {segments.map((segment, index) => {
            const isLast = index === segments.length - 1;
            const isClickable = !isLast && segment.path !== workspace.currentPath;

            return (
              <React.Fragment key={segment.path}>
                {index > 0 && (
                  <span className="navigation-breadcrumb__separator" aria-hidden="true">
                    /
                  </span>
                )}

                {isClickable ? (
                  <button
                    className="navigation-breadcrumb__segment navigation-breadcrumb__segment--clickable"
                    onClick={() => handleSegmentClick(segment.path)}
                    title={`Navigate to ${segment.name}`}
                  >
                    {segment.name}
                  </button>
                ) : (
                  <span
                    className={`navigation-breadcrumb__segment ${isLast ? 'navigation-breadcrumb__segment--current' : ''}`}
                    title={segment.path}
                  >
                    {segment.name}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Path info */}
        <div className="navigation-breadcrumb__info">
          <span className="navigation-breadcrumb__path-display" title={workspace.currentPath}>
            {workspace.currentPath}
          </span>
          <span className="navigation-breadcrumb__item-count">
            {workspace.directoryListing.entries.length} items
          </span>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBreadcrumb;