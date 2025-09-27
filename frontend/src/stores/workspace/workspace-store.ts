/**
 * Workspace Zustand Store - Unified Location
 *
 * Central state management for workspace navigation and file operations.
 * Consolidates functionality from multiple workspace stores into a single,
 * unified interface.
 *
 * Migrated from: stores/workspace.ts, stores/workspace.ts,
 *                domains/workspace/ui/stores/workspace.ts
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { invoke } from '@tauri-apps/api/core';

import { WorkspaceDto, DirectoryListingDto } from '../../domains/workspace/application/dtos/workspace-dtos';
import { WorkspaceAdapter } from '../../adapters/workspace-dto-adapter';

import type {
  WorkspaceStore,
  WorkspaceState,
  WorkspaceActions,
  Project,
  DocumentCaddy,
  FileSystemItem,
  WorkspaceLayout,
} from './workspace-store-types';

import {
  DEFAULT_WORKSPACE_CONFIG,
  WorkspaceStoreError,
} from './workspace-store-types';

// ====================
// Mock Data (for development)
// ====================

const mockProject: Project = {
  id: 'project_550e8400-e29b-41d4-a716-446655440000',
  name: 'Sample Research Project',
  source_folder: '/Users/demo/Documents/Research/Source',
  source_folder_name: 'Source',
  note: 'This is a sample research project for testing purposes.',
  note_preview: 'This is a sample research project...',
  note_line_count: 1,
  created_at: '2024-01-15T10:30:00Z',
  is_accessible: true
};

const mockLayout: WorkspaceLayout = {
  id: 'layout_550e8400-e29b-41d4-a716-446655440001',
  project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
  file_explorer_visible: true,
  category_explorer_visible: false,
  search_panel_visible: true,
  document_workspace_visible: true,
  explorer_width: 25,
  workspace_width: 75,
  last_modified: '2024-01-15T10:30:00Z'
};

// ====================
// Initial State
// ====================

const initialState: WorkspaceState = {
  // Current workspace context
  currentProject: null,
  currentPath: '',
  directoryListing: [],
  workspaceLayout: null,

  // File navigation
  pathHistory: [],
  currentHistoryIndex: -1,
  breadcrumbs: [],

  // Document management
  openDocuments: [],
  activeDocumentId: null,

  // Loading states
  isLoading: false,
  isLoadingDirectory: false,
  isLoadingDocument: false,

  // Error states
  error: null,
  directoryError: null,
  documentError: null,

  // UI state
  showHiddenFiles: DEFAULT_WORKSPACE_CONFIG.showHiddenFiles,
  sortBy: DEFAULT_WORKSPACE_CONFIG.defaultSortBy,
  sortOrder: DEFAULT_WORKSPACE_CONFIG.defaultSortOrder,
  viewMode: DEFAULT_WORKSPACE_CONFIG.defaultViewMode,
  selectedFiles: new Set(),
};

// ====================
// Store Implementation
// ====================

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      immer<WorkspaceStore>((set, get) => ({
        ...initialState,

        // ====================
        // Workspace Management
        // ====================

        loadWorkspace: async (projectId: string) => {
          set((state) => {
            state.isLoading = true;
            state.error = null;
          });

          try {
            // Load workspace from backend
            const workspaceDto: WorkspaceDto = await invoke('open_workspace', {
              projectId: projectId
            });

            const workspace = WorkspaceAdapter.fromDto(workspaceDto);

            set((state) => {
              state.currentProject = workspace.project;
              state.currentPath = workspace.project.source_folder;
              state.workspaceLayout = workspace.layout || mockLayout;
              state.isLoading = false;
            });

            // Load initial directory
            await get().loadDirectory(workspace.project.source_folder);

          } catch (error) {
            console.error('Failed to load workspace:', error);

            // Fallback to mock data for development
            set((state) => {
              state.currentProject = mockProject;
              state.currentPath = mockProject.source_folder;
              state.workspaceLayout = mockLayout;
              state.directoryListing = [];
              state.isLoading = false;
              state.error = error instanceof Error ? error.message : 'Failed to load workspace';
            });
          }
        },

        setCurrentProject: (project: Project | null) => {
          set((state) => {
            state.currentProject = project;
            if (project) {
              state.currentPath = project.source_folder;
            } else {
              state.currentPath = '';
              state.directoryListing = [];
            }
          });
        },

        clearWorkspace: () => {
          set((state) => {
            state.currentProject = null;
            state.currentPath = '';
            state.directoryListing = [];
            state.workspaceLayout = null;
            state.pathHistory = [];
            state.currentHistoryIndex = -1;
            state.breadcrumbs = [];
            state.openDocuments = [];
            state.activeDocumentId = null;
            state.selectedFiles.clear();
            state.error = null;
            state.directoryError = null;
            state.documentError = null;
          });
        },

        // ====================
        // Directory Navigation
        // ====================

        loadDirectory: async (path?: string) => {
          const targetPath = path || get().currentPath;
          if (!targetPath) return;

          set((state) => {
            state.isLoadingDirectory = true;
            state.directoryError = null;
          });

          try {
            const currentProject = get().currentProject;
            if (!currentProject) {
              throw new WorkspaceStoreError('No project loaded', 'loadDirectory');
            }

            // Load directory from backend
            const directoryDto: DirectoryListingDto = await invoke('list_directory', {
              workspaceProjectId: currentProject.id,
              directoryPath: targetPath
            });

            const directoryListing = WorkspaceAdapter.fromDirectoryDto(directoryDto);

            set((state) => {
              state.currentPath = targetPath;
              state.directoryListing = directoryListing.files;
              state.breadcrumbs = targetPath.split('/').filter(Boolean);
              state.isLoadingDirectory = false;
            });

            // Update history
            const currentIndex = get().currentHistoryIndex;
            const history = get().pathHistory;

            // If we're not at the end of history, truncate it
            if (currentIndex < history.length - 1) {
              set((state) => {
                state.pathHistory = state.pathHistory.slice(0, currentIndex + 1);
              });
            }

            // Add new path to history
            set((state) => {
              state.pathHistory.push(targetPath);
              state.currentHistoryIndex = state.pathHistory.length - 1;
            });

          } catch (error) {
            console.error('Failed to load directory:', error);
            set((state) => {
              state.directoryError = error instanceof Error ? error.message : 'Failed to load directory';
              state.isLoadingDirectory = false;
            });
          }
        },

        navigateToFolder: async (folderName: string) => {
          const currentPath = get().currentPath;
          const newPath = `${currentPath}/${folderName}`.replace(/\/+/g, '/');
          await get().loadDirectory(newPath);
        },

        navigateToParent: async () => {
          const currentPath = get().currentPath;
          const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
          await get().loadDirectory(parentPath);
        },

        navigateToPath: async (path: string) => {
          await get().loadDirectory(path);
        },

        // ====================
        // History Navigation
        // ====================

        goBack: () => {
          const currentIndex = get().currentHistoryIndex;
          if (currentIndex > 0) {
            const history = get().pathHistory;
            const previousPath = history[currentIndex - 1];
            set((state) => {
              state.currentHistoryIndex = currentIndex - 1;
            });
            get().loadDirectory(previousPath);
          }
        },

        goForward: () => {
          const currentIndex = get().currentHistoryIndex;
          const history = get().pathHistory;
          if (currentIndex < history.length - 1) {
            const nextPath = history[currentIndex + 1];
            set((state) => {
              state.currentHistoryIndex = currentIndex + 1;
            });
            get().loadDirectory(nextPath);
          }
        },

        canGoBack: () => {
          return get().currentHistoryIndex > 0;
        },

        canGoForward: () => {
          const currentIndex = get().currentHistoryIndex;
          const history = get().pathHistory;
          return currentIndex < history.length - 1;
        },

        // ====================
        // File Operations
        // ====================

        selectFile: (filePath: string) => {
          set((state) => {
            state.selectedFiles.clear();
            state.selectedFiles.add(filePath);
          });
        },

        selectMultipleFiles: (filePaths: string[]) => {
          set((state) => {
            state.selectedFiles.clear();
            filePaths.forEach(path => state.selectedFiles.add(path));
          });
        },

        toggleFileSelection: (filePath: string) => {
          set((state) => {
            if (state.selectedFiles.has(filePath)) {
              state.selectedFiles.delete(filePath);
            } else {
              state.selectedFiles.add(filePath);
            }
          });
        },

        clearSelection: () => {
          set((state) => {
            state.selectedFiles.clear();
          });
        },

        selectAll: () => {
          const allFilePaths = get().directoryListing.map(item => item.path);
          get().selectMultipleFiles(allFilePaths);
        },

        // ====================
        // Document Management
        // ====================

        openDocument: async (filePath: string) => {
          set((state) => {
            state.isLoadingDocument = true;
            state.documentError = null;
          });

          try {
            // Check if document is already open
            const existingDoc = get().openDocuments.find(doc => doc.filePath === filePath);
            if (existingDoc) {
              get().setActiveDocument(existingDoc.id);
              set((state) => {
                state.isLoadingDocument = false;
              });
              return;
            }

            // Create new document caddy
            const fileName = filePath.split('/').pop() || 'Untitled';
            const newDocument: DocumentCaddy = {
              id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              title: fileName,
              filePath: filePath,
              isActive: true,
              position_x: 50 + (get().openDocuments.length * 20),
              position_y: 50 + (get().openDocuments.length * 20),
              width: 600,
              height: 400,
              z_index: get().openDocuments.length + 1,
            };

            set((state) => {
              // Deactivate other documents
              state.openDocuments.forEach(doc => doc.isActive = false);

              // Add new document
              state.openDocuments.push(newDocument);
              state.activeDocumentId = newDocument.id;
              state.isLoadingDocument = false;
            });

          } catch (error) {
            console.error('Failed to open document:', error);
            set((state) => {
              state.documentError = error instanceof Error ? error.message : 'Failed to open document';
              state.isLoadingDocument = false;
            });
          }
        },

        closeDocument: (documentId: string) => {
          set((state) => {
            const index = state.openDocuments.findIndex(doc => doc.id === documentId);
            if (index !== -1) {
              state.openDocuments.splice(index, 1);

              // If this was the active document, activate another one
              if (state.activeDocumentId === documentId) {
                if (state.openDocuments.length > 0) {
                  const newActiveDoc = state.openDocuments[Math.max(0, index - 1)];
                  state.activeDocumentId = newActiveDoc.id;
                  newActiveDoc.isActive = true;
                } else {
                  state.activeDocumentId = null;
                }
              }
            }
          });
        },

        setActiveDocument: (documentId: string) => {
          set((state) => {
            state.openDocuments.forEach(doc => {
              doc.isActive = doc.id === documentId;
            });
            state.activeDocumentId = documentId;
          });
        },

        updateDocumentPosition: (documentId: string, x: number, y: number) => {
          set((state) => {
            const doc = state.openDocuments.find(d => d.id === documentId);
            if (doc) {
              doc.position_x = x;
              doc.position_y = y;
            }
          });
        },

        updateDocumentSize: (documentId: string, width: number, height: number) => {
          set((state) => {
            const doc = state.openDocuments.find(d => d.id === documentId);
            if (doc) {
              doc.width = width;
              doc.height = height;
            }
          });
        },

        // ====================
        // View Preferences
        // ====================

        toggleHiddenFiles: () => {
          set((state) => {
            state.showHiddenFiles = !state.showHiddenFiles;
          });
          get().refreshDirectory();
        },

        setSortBy: (field: 'name' | 'size' | 'modified') => {
          set((state) => {
            state.sortBy = field;
          });
        },

        setSortOrder: (order: 'asc' | 'desc') => {
          set((state) => {
            state.sortOrder = order;
          });
        },

        setViewMode: (mode: 'list' | 'grid') => {
          set((state) => {
            state.viewMode = mode;
          });
        },

        // ====================
        // Layout Management
        // ====================

        updateLayout: (layout: Partial<WorkspaceLayout>) => {
          set((state) => {
            if (state.workspaceLayout) {
              Object.assign(state.workspaceLayout, layout);
              state.workspaceLayout.last_modified = new Date().toISOString();
            }
          });
        },

        resetLayout: () => {
          set((state) => {
            state.workspaceLayout = { ...mockLayout };
          });
        },

        // ====================
        // Error Handling
        // ====================

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        clearDirectoryError: () => {
          set((state) => {
            state.directoryError = null;
          });
        },

        clearDocumentError: () => {
          set((state) => {
            state.documentError = null;
          });
        },

        // ====================
        // Utility Methods
        // ====================

        refreshDirectory: async () => {
          const currentPath = get().currentPath;
          if (currentPath) {
            await get().loadDirectory(currentPath);
          }
        },

        getFileByPath: (path: string) => {
          return get().directoryListing.find(item => item.path === path);
        },

        isDirectory: (path: string) => {
          const item = get().getFileByPath(path);
          return item?.item_type === 'directory';
        },

        isFile: (path: string) => {
          const item = get().getFileByPath(path);
          return item?.item_type === 'file';
        },

        // ====================
        // Compatibility Methods (for API compatibility with old store)
        // ====================

        // Alias for WorkspacePage.tsx compatibility
        openWorkspace: async (projectId: string, projectName: string, sourceFolder: string) => {
          return get().loadWorkspace(projectId);
        },

        // Alias for FileExplorer.tsx compatibility
        fileExplorerItems: get().directoryListing,
        refreshFiles: () => get().refreshDirectory(),
        createDocumentCaddy: (filePath: string) => get().openDocument(filePath),

        // Alias for SearchPanel.tsx compatibility
        searchResults: [],
        searchFiles: async (query: string) => {
          console.log('Search not implemented yet:', query);
        },

        // Compatibility properties for useWorkspaceEvents.ts
        get currentWorkspace() {
          const state = get();
          return state.currentProject ? {
            id: state.currentProject.id,
            name: state.currentProject.name,
            documents: Object.fromEntries(state.openDocuments.map(doc => [doc.id, doc])),
          } : null;
        },

        operations: {
          get loading() { return get().isLoading; },
        },

        // Error state compatibility
        get errorState() {
          const state = get();
          return {
            hasError: state.error !== null,
            error: state.error,
            directoryError: state.directoryError,
            documentError: state.documentError,
          };
        },

        retryLastOperation: () => {
          console.log('Retry operation not implemented');
        },

        isErrorRecoverable: (error: string) => {
          return !error.includes('fatal') && !error.includes('permission');
        },

        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },

      })),
      {
        name: 'workspace-store',
        partialize: (state) => ({
          currentProject: state.currentProject,
          workspaceLayout: state.workspaceLayout,
          showHiddenFiles: state.showHiddenFiles,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          viewMode: state.viewMode,
        }),
      }
    ),
    {
      name: 'workspace-store',
    }
  )
);

// ====================
// Store Hooks and Selectors
// ====================

/**
 * Hook for accessing workspace navigation state
 */
export const useWorkspaceNavigation = () => {
  return useWorkspaceStore((state) => ({
    currentPath: state.currentPath,
    directoryListing: state.directoryListing,
    breadcrumbs: state.breadcrumbs,
    isLoading: state.isLoadingDirectory,
    error: state.directoryError,
    canGoBack: state.canGoBack(),
    canGoForward: state.canGoForward(),
    navigateToFolder: state.navigateToFolder,
    navigateToParent: state.navigateToParent,
    goBack: state.goBack,
    goForward: state.goForward,
  }));
};

/**
 * Hook for accessing document management state
 */
export const useDocumentManagement = () => {
  return useWorkspaceStore((state) => ({
    openDocuments: state.openDocuments,
    activeDocumentId: state.activeDocumentId,
    isLoading: state.isLoadingDocument,
    error: state.documentError,
    openDocument: state.openDocument,
    closeDocument: state.closeDocument,
    setActiveDocument: state.setActiveDocument,
  }));
};

/**
 * Hook for accessing file selection state
 */
export const useFileSelection = () => {
  return useWorkspaceStore((state) => ({
    selectedFiles: Array.from(state.selectedFiles),
    selectedCount: state.selectedFiles.size,
    selectFile: state.selectFile,
    toggleFileSelection: state.toggleFileSelection,
    clearSelection: state.clearSelection,
    selectAll: state.selectAll,
  }));
};

/**
 * Hook for accessing workspace actions
 */
export const useWorkspaceActions = () => {
  return useWorkspaceStore((state) => ({
    loadWorkspace: state.loadWorkspace,
    setCurrentProject: state.setCurrentProject,
    clearWorkspace: state.clearWorkspace,
    loadDirectory: state.loadDirectory,
    refreshDirectory: state.refreshDirectory,
    clearError: state.clearError,
  }));
};

// Export store for direct access
export default useWorkspaceStore;