/**
 * Workspace Store Types
 *
 * Type definitions for the unified workspace store
 */

import { WorkspaceDto, DirectoryListing } from '../../domains/workspace/application/dtos/workspace-dtos';
import { WorkspaceAdapter, FileSystemItem, WorkspaceLayout } from '../../adapters/workspace-dto-adapter';
import { DocumentCaddyState } from '../../domains/workspace/domain/entities/document-caddy';

// Re-export adapter types
export type { FileSystemItem, WorkspaceLayout };

// Project interface (matches backend ProjectDto)
export interface Project {
  id: string;
  name: string;
  source_folder: string;
  source_folder_name?: string;
  note?: string;
  note_preview?: string;
  note_line_count?: number;
  created_at: string;
  is_accessible: boolean;
}

// Document Caddy type
export interface DocumentCaddy {
  id: string;
  title: string;
  filePath: string;
  content?: string;
  isActive: boolean;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  isVisible?: boolean;
  state?: DocumentCaddyState;
  errorMessage?: string;
  isDraggable?: boolean;
  isResizable?: boolean;
}

// Document UI State for compatibility with useWorkspaceEvents
export interface DocumentUIState {
  id: string;
  filePath: string;
  isActive: boolean;
  position: {
    x: number;
    y: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  state: 'loading' | 'ready' | 'error';
  errorMessage?: string;
}

// Workspace state interface
export interface WorkspaceState {
  // Current workspace context
  currentProject: Project | null;
  currentPath: string;
  directoryListing: FileSystemItem[];
  workspaceLayout: WorkspaceLayout | null;

  // File navigation
  pathHistory: string[];
  currentHistoryIndex: number;
  breadcrumbs: string[];

  // Document management
  openDocuments: DocumentCaddy[];
  activeDocumentId: string | null;

  // Loading states
  isLoading: boolean;
  isLoadingDirectory: boolean;
  isLoadingDocument: boolean;

  // Error states
  error: string | null;
  directoryError: string | null;
  documentError: string | null;

  // UI state
  showHiddenFiles: boolean;
  sortBy: 'name' | 'size' | 'modified';
  sortOrder: 'asc' | 'desc';
  viewMode: 'list' | 'grid';
  selectedFiles: Set<string>;
}

// Workspace actions interface
export interface WorkspaceActions {
  // Workspace management
  loadWorkspace: (projectId: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
  clearWorkspace: () => void;

  // Directory navigation
  loadDirectory: (path?: string) => Promise<void>;
  navigateToFolder: (folderName: string) => Promise<void>;
  navigateToParent: () => Promise<void>;
  navigateToPath: (path: string) => Promise<void>;

  // History navigation
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;

  // File operations
  selectFile: (filePath: string) => void;
  selectMultipleFiles: (filePaths: string[]) => void;
  toggleFileSelection: (filePath: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Document management
  openDocument: (filePath: string) => Promise<void>;
  closeDocument: (documentId: string) => void;
  setActiveDocument: (documentId: string) => void;
  updateDocumentPosition: (documentId: string, x: number, y: number) => void;
  updateDocumentSize: (documentId: string, width: number, height: number) => void;

  // View preferences
  toggleHiddenFiles: () => void;
  setSortBy: (field: 'name' | 'size' | 'modified') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setViewMode: (mode: 'list' | 'grid') => void;

  // Layout management
  updateLayout: (layout: Partial<WorkspaceLayout>) => void;
  resetLayout: () => void;

  // Error handling
  clearError: () => void;
  clearDirectoryError: () => void;
  clearDocumentError: () => void;

  // Utility methods
  refreshDirectory: () => Promise<void>;
  getFileByPath: (path: string) => FileSystemItem | undefined;
  isDirectory: (path: string) => boolean;
  isFile: (path: string) => boolean;

  // Compatibility methods (for backward compatibility with old store APIs)
  openWorkspace: (projectId: string, projectName: string, sourceFolder: string) => Promise<void>;
  fileExplorerItems: FileSystemItem[];
  refreshFiles: () => Promise<void>;
  createDocumentCaddy: (filePath: string) => Promise<void>;
  searchResults: any[];
  searchFiles: (query: string) => Promise<void>;
  currentWorkspace: any;
  operations: { loading: boolean };
  errorState: any;
  retryLastOperation: () => void;
  isErrorRecoverable: (error: string) => boolean;
  setError: (error: string | null) => void;
}

// Combined store interface
export interface WorkspaceStore extends WorkspaceState, WorkspaceActions {}

// Configuration defaults
export const DEFAULT_WORKSPACE_CONFIG = {
  defaultSortBy: 'name' as const,
  defaultSortOrder: 'asc' as const,
  defaultViewMode: 'list' as const,
  showHiddenFiles: false,
  maxOpenDocuments: 10,
  autoSaveInterval: 30000, // 30 seconds
};

// Error handling
export class WorkspaceStoreError extends Error {
  constructor(message: string, public context?: string) {
    super(message);
    this.name = 'WorkspaceStoreError';
  }
}