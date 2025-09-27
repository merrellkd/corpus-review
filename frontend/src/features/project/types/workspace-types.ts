/**
 * Simplified Workspace Types - Flattened from DDD patterns
 *
 * Removed complex value objects and domain abstractions
 * Simple, flat interfaces for workspace-related data
 */

// ProjectWorkspace component props interface
export interface WorkspaceProps {
  projectId: string;
  onBackToProjects?: () => void;
}

// Workspace layout configuration - flattened from domain/value-objects
export interface WorkspaceLayout {
  explorer_width: number;
  workspace_width: number;
}

// Extended workspace layout with additional UI state
export interface WorkspaceLayoutState extends WorkspaceLayout {
  id: string;
  project_id: string;
  file_explorer_visible: boolean;
  category_explorer_visible: boolean;
  search_panel_visible: boolean;
  document_workspace_visible: boolean;
  last_modified: string;
}