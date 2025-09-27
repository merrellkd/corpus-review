/**
 * Simplified Workspace Types
 *
 * Unified interface for both backend DTOs and UI state
 */

/**
 * File system item (file or directory)
 */
export interface FileSystemItem {
  name: string;
  path: string;
  item_type: 'file' | 'directory';
  size: number | null;
  last_modified: string;
  formatted_size?: string;
}

/**
 * Directory listing with navigation metadata
 */
export interface DirectoryListing {
  entries: FileSystemItem[];
  isRoot: boolean;
  parentPath: string | null;
  canNavigateUp: boolean;
}

/**
 * Workspace state
 */
export interface WorkspaceDto {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
  directoryListing: DirectoryListing;
}

/**
 * Breadcrumb segment for navigation
 */
export interface BreadcrumbSegment {
  name: string;
  path: string;
}

/**
 * Utility functions for workspace operations
 */
export const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === 0) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getBreadcrumbSegments = (workspace: WorkspaceDto): BreadcrumbSegment[] => {
  const segments: BreadcrumbSegment[] = [];

  // Start with project root
  segments.push({
    name: workspace.projectName,
    path: workspace.sourceFolder,
  });

  // Add path segments if not at root
  if (workspace.currentPath !== workspace.sourceFolder) {
    const relativePath = workspace.currentPath.replace(workspace.sourceFolder, '');
    const pathParts = relativePath.split('/').filter(part => part.length > 0);

    let currentPath = workspace.sourceFolder;
    for (const part of pathParts) {
      currentPath = `${currentPath}/${part}`;
      segments.push({
        name: part,
        path: currentPath,
      });
    }
  }

  return segments;
};

// Export additional types for convenience
export type ViewMode = 'list' | 'grid';