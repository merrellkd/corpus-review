import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceDto, DirectoryListingDto } from '../domains/workspace/application/dtos/workspace-dtos';

/**
 * Navigation history entry
 */
interface NavigationHistoryEntry {
  path: string;
  timestamp: number;
}

/**
 * Workspace store state interface
 */
interface WorkspaceState {
  // Current workspace data
  currentWorkspace: WorkspaceDto | null;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Navigation history
  navigationHistory: NavigationHistoryEntry[];
  currentHistoryIndex: number;

  // Actions
  openWorkspace: (projectId: string, projectName: string, sourceFolder: string) => Promise<void>;
  listDirectory: (projectId: string, projectName: string, sourceFolder: string, currentPath: string) => Promise<void>;
  navigateToFolder: (projectId: string, projectName: string, sourceFolder: string, currentPath: string, folderName: string) => Promise<void>;
  navigateToParent: (projectId: string, projectName: string, sourceFolder: string, currentPath: string) => Promise<void>;
  navigateToPath: (projectId: string, projectName: string, sourceFolder: string, targetPath: string) => Promise<void>;
  clearWorkspace: () => void;
  clearError: () => void;

  // Navigation history actions
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
  addToHistory: (path: string) => void;
}

/**
 * Workspace store implementation using Zustand
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentWorkspace: null,
    isLoading: false,
    error: null,
    navigationHistory: [],
    currentHistoryIndex: -1,

    // Open workspace for a project
    openWorkspace: async (projectId: string, projectName: string, sourceFolder: string) => {
      set({ isLoading: true, error: null });

      try {
        const workspace = await invoke<WorkspaceDto>('open_workspace_navigation', {
          projectId,
          projectName,
          sourceFolder,
        });

        console.log('Workspace opened successfully:', {
          workspace,
          hasDirectoryListing: !!workspace.directoryListing,
          directoryListingEntries: workspace.directoryListing?.entries?.length || 0,
        });

        set({
          currentWorkspace: workspace,
          isLoading: false,
          navigationHistory: [{ path: workspace.currentPath, timestamp: Date.now() }],
          currentHistoryIndex: 0,
        });
      } catch (error) {
        console.error('Failed to open workspace:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to open workspace',
          isLoading: false,
        });
      }
    },

    // List directory contents
    listDirectory: async (projectId: string, projectName: string, sourceFolder: string, currentPath: string) => {
      set({ isLoading: true, error: null });

      try {
        const directoryListing = await invoke<DirectoryListingDto>('list_directory', {
          projectId,
          projectName,
          sourceFolder,
          currentPath,
        });

        set(state => ({
          currentWorkspace: state.currentWorkspace ? {
            ...state.currentWorkspace,
            currentPath,
            directoryListing,
          } : null,
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to list directory:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to list directory',
          isLoading: false,
        });
      }
    },

    // Navigate to a specific folder
    navigateToFolder: async (projectId: string, projectName: string, sourceFolder: string, currentPath: string, folderName: string) => {
      set({ isLoading: true, error: null });

      try {
        const workspace = await invoke<WorkspaceDto>('navigate_to_folder', {
          projectId,
          projectName,
          sourceFolder,
          currentPath,
          folderName,
        });

        get().addToHistory(workspace.currentPath);
        set({
          currentWorkspace: workspace,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to navigate to folder:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to navigate to folder',
          isLoading: false,
        });
      }
    },

    // Navigate to parent directory
    navigateToParent: async (projectId: string, projectName: string, sourceFolder: string, currentPath: string) => {
      set({ isLoading: true, error: null });

      try {
        const workspace = await invoke<WorkspaceDto>('navigate_to_parent', {
          projectId,
          projectName,
          sourceFolder,
          currentPath,
        });

        get().addToHistory(workspace.currentPath);
        set({
          currentWorkspace: workspace,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to navigate to parent:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to navigate to parent',
          isLoading: false,
        });
      }
    },

    // Navigate to a specific path
    navigateToPath: async (projectId: string, projectName: string, sourceFolder: string, targetPath: string) => {
      set({ isLoading: true, error: null });

      try {
        const workspace = await invoke<WorkspaceDto>('navigate_to_path', {
          projectId,
          projectName,
          sourceFolder,
          targetPath,
        });

        get().addToHistory(workspace.currentPath);
        set({
          currentWorkspace: workspace,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to navigate to path:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to navigate to path',
          isLoading: false,
        });
      }
    },

    // Clear workspace data
    clearWorkspace: () => {
      set({
        currentWorkspace: null,
        isLoading: false,
        error: null,
        navigationHistory: [],
        currentHistoryIndex: -1,
      });
    },

    // Clear error state
    clearError: () => {
      set({ error: null });
    },

    // Navigation history management
    canGoBack: () => {
      const state = get();
      return state.currentHistoryIndex > 0;
    },

    canGoForward: () => {
      const state = get();
      return state.currentHistoryIndex < state.navigationHistory.length - 1;
    },

    goBack: async () => {
      const state = get();
      if (!state.canGoBack() || !state.currentWorkspace) return;

      const newIndex = state.currentHistoryIndex - 1;
      const targetPath = state.navigationHistory[newIndex].path;

      await state.navigateToPath(
        state.currentWorkspace.projectId,
        state.currentWorkspace.projectName,
        state.currentWorkspace.sourceFolder,
        targetPath
      );

      set({ currentHistoryIndex: newIndex });
    },

    goForward: async () => {
      const state = get();
      if (!state.canGoForward() || !state.currentWorkspace) return;

      const newIndex = state.currentHistoryIndex + 1;
      const targetPath = state.navigationHistory[newIndex].path;

      await state.navigateToPath(
        state.currentWorkspace.projectId,
        state.currentWorkspace.projectName,
        state.currentWorkspace.sourceFolder,
        targetPath
      );

      set({ currentHistoryIndex: newIndex });
    },

    addToHistory: (path: string) => {
      set(state => {
        // Don't add duplicate entries
        const lastEntry = state.navigationHistory[state.currentHistoryIndex];
        if (lastEntry && lastEntry.path === path) {
          return state;
        }

        // Remove any forward history when navigating to a new path
        const newHistory = state.navigationHistory.slice(0, state.currentHistoryIndex + 1);
        newHistory.push({ path, timestamp: Date.now() });

        // Limit history size to prevent memory issues
        const maxHistorySize = 50;
        if (newHistory.length > maxHistorySize) {
          newHistory.shift();
        }

        return {
          ...state,
          navigationHistory: newHistory,
          currentHistoryIndex: newHistory.length - 1,
        };
      });
    },
  }))
);

// Export types for external use
export type { WorkspaceState, NavigationHistoryEntry };