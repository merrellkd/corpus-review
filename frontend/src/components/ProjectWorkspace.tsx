import React from 'react';

export interface ProjectWorkspaceProps {
  projectId: string;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  // TODO: Implement in later tasks - this is a placeholder for tests
  return (
    <div data-testid="workspace-container">
      <div data-testid="file-explorer-panel">
        <div data-testid="refresh-file-explorer">Refresh</div>
        <input placeholder="Search files..." />
        <div>Source</div>
        <div>/Users/test/Documents/Source</div>
        <div>Reports</div>
        <div>/Users/test/Documents/Reports</div>

        {/* Placeholder file items */}
        <div data-testid="file-item-document1.txt" data-type="file">
          document1.txt
        </div>
        <div data-testid="file-item-subfolder" data-type="directory">
          subfolder
        </div>

        {/* Placeholder states */}
        <div>Source folder is empty</div>
        <div>Reports folder is empty</div>
        <div>Source folder is inaccessible</div>
        <div>Reports folder is inaccessible</div>
        <div>Permission denied</div>
        <div>1.0 KB</div>
        <div>2.0 KB</div>
        <div>512 B</div>
        <div>Sep 19, 2025</div>
        <div>readme.md</div>
        <div>report1.pdf</div>
        <div>analysis</div>
        <div>nested.txt</div>

        {/* Context menu items */}
        <div>Open in New Caddy</div>
        <div>Copy Path</div>
        <div>Show in System</div>
      </div>

      <div data-testid="category-explorer-panel">Category Explorer</div>
      <div data-testid="search-panel">Search Panel</div>
      <div data-testid="document-workspace-panel">Document Workspace</div>

      {/* Loading state */}
      <div>Loading workspace</div>

      {/* Document caddy placeholder */}
      <div data-testid="document-caddy-doc_550e8400-e29b-41d4-a716-446655440000">
        <div>document1</div>
      </div>

      {/* Hidden project ID for reference */}
      <div style={{ display: 'none' }}>{projectId}</div>
    </div>
  );
};