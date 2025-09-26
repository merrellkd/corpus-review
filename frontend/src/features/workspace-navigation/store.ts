import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  workspaceApi,
  FileEntryDto,
  DirectoryListingDto,
  WorkspaceDto,
  BackendProjectDto,
} from './services/workspace-api';

export interface FileSystemItem {
  name: string;
  path: string;
  parent_path: string;
  item_type: 'file' | 'directory';
  size: number;
  formatted_size: string;
  is_accessible: boolean;
  last_modified: string;
}

export interface WorkspaceSnapshot {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
  directoryListing: DirectoryListingDto;
}

export interface ProjectSummary {
  id: string;
  name: string;
  sourceFolder: string;
}

interface WorkspaceNavigationState {
  currentProject: ProjectSummary | null;
  currentWorkspace: WorkspaceSnapshot | null;
  currentPath: string;
  fileExplorerItems: FileSystemItem[];
  isLoading: boolean;
  error: string | null;
  navigationHistory: string[];
  currentHistoryIndex: number;
  searchQuery: string;
  searchResults: FileSystemItem[];

  loadWorkspaceById: (projectId: string) => Promise<void>;
  openWorkspaceFromProject: (project: ProjectSummary) => Promise<void>;
  refreshCurrentDirectory: () => Promise<void>;
  navigateToFolder: (folderName: string) => Promise<void>;
  navigateToParent: () => Promise<void>;
  navigateToPath: (targetPath: string, options?: { addToHistory?: boolean }) => Promise<void>;
  clearWorkspace: () => void;
  clearError: () => void;
  searchFiles: (query: string) => void;

  canGoBack: () => boolean;
  canGoForward: () => boolean;
  goBack: () => Promise<void>;
  goForward: () => Promise<void>;
}

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null) {
    return '—';
  }
  if (bytes === 0) {
    return '0 B';
  }

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const adaptFileEntry = (entry: FileEntryDto, parentPath: string): FileSystemItem => ({
  name: entry.name,
  path: entry.path,
  parent_path: parentPath,
  item_type: entry.entryType,
  size: entry.size ?? 0,
  formatted_size: formatFileSize(entry.size),
  is_accessible: true,
  last_modified: entry.modified,
});

const adaptWorkspace = (workspace: WorkspaceDto) => {
  const fileExplorerItems = workspace.directoryListing.entries
    ? workspace.directoryListing.entries.map(entry => adaptFileEntry(entry, workspace.currentPath))
    : [];

  const snapshot: WorkspaceSnapshot = {
    projectId: workspace.projectId,
    projectName: workspace.projectName,
    sourceFolder: workspace.sourceFolder,
    currentPath: workspace.currentPath,
    directoryListing: workspace.directoryListing,
  };

  return { snapshot, fileExplorerItems };
};

const toProjectSummary = (project: BackendProjectDto): ProjectSummary => ({
  id: project.id,
  name: project.name,
  sourceFolder: project.source_folder,
});

export const useWorkspaceNavigationStore = create<WorkspaceNavigationState>()(
  subscribeWithSelector((set, get) => ({
    currentProject: null,
    currentWorkspace: null,
    currentPath: '',
    fileExplorerItems: [],
    isLoading: false,
    error: null,
    navigationHistory: [],
    currentHistoryIndex: -1,
    searchQuery: '',
    searchResults: [],

    loadWorkspaceById: async (projectId: string) => {
      set({ isLoading: true, error: null });

      try {
        const project = await workspaceApi.openProject(projectId);
        const summary = toProjectSummary(project);
        await get().openWorkspaceFromProject(summary);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load project workspace';
        set({ isLoading: false, error: message });
      }
    },

    openWorkspaceFromProject: async (project: ProjectSummary) => {
      set({ isLoading: true, error: null });

      try {
        const workspace = await workspaceApi.openWorkspaceNavigation({
          projectId: project.id,
          projectName: project.name,
          sourceFolder: project.sourceFolder,
        });

        const { snapshot, fileExplorerItems } = adaptWorkspace(workspace);

        set({
          currentProject: project,
          currentWorkspace: snapshot,
          currentPath: snapshot.currentPath,
          fileExplorerItems,
          isLoading: false,
          navigationHistory: [snapshot.currentPath],
          currentHistoryIndex: 0,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to open workspace';
        set({ isLoading: false, error: message });
      }
    },

    refreshCurrentDirectory: async () => {
      const state = get();
      const project = state.currentProject;
      const workspace = state.currentWorkspace;

      if (!project || !workspace) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const listing = await workspaceApi.listDirectory({
          projectId: project.id,
          projectName: project.name,
          sourceFolder: project.sourceFolder,
          currentPath: workspace.currentPath,
        });

        const fileExplorerItems = listing.entries
          ? listing.entries.map(entry => adaptFileEntry(entry, workspace.currentPath))
          : [];

        set(state => ({
          fileExplorerItems,
          currentWorkspace: state.currentWorkspace
            ? { ...state.currentWorkspace, directoryListing: listing }
            : null,
          isLoading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to refresh directory';
        set({ isLoading: false, error: message });
      }
    },

    navigateToFolder: async (folderName: string) => {
      const state = get();
      const project = state.currentProject;
      const workspace = state.currentWorkspace;

      if (!project || !workspace) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await workspaceApi.navigateToFolder({
          projectId: project.id,
          projectName: project.name,
          sourceFolder: project.sourceFolder,
          currentPath: workspace.currentPath,
          folderName,
        });

        const { snapshot, fileExplorerItems } = adaptWorkspace(response);

        set(state => ({
          currentWorkspace: snapshot,
          currentPath: snapshot.currentPath,
          fileExplorerItems,
          isLoading: false,
          navigationHistory: [...state.navigationHistory.slice(0, state.currentHistoryIndex + 1), snapshot.currentPath],
          currentHistoryIndex: state.currentHistoryIndex + 1,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to navigate to ${folderName}`;
        set({ isLoading: false, error: message });
      }
    },

    navigateToParent: async () => {
      const state = get();
      const project = state.currentProject;
      const workspace = state.currentWorkspace;

      if (!project || !workspace) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await workspaceApi.navigateToParent({
          projectId: project.id,
          projectName: project.name,
          sourceFolder: project.sourceFolder,
          currentPath: workspace.currentPath,
        });

        const { snapshot, fileExplorerItems } = adaptWorkspace(response);

        set(state => ({
          currentWorkspace: snapshot,
          currentPath: snapshot.currentPath,
          fileExplorerItems,
          isLoading: false,
          navigationHistory: [...state.navigationHistory.slice(0, state.currentHistoryIndex + 1), snapshot.currentPath],
          currentHistoryIndex: state.currentHistoryIndex + 1,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to navigate to parent folder';
        set({ isLoading: false, error: message });
      }
    },

    navigateToPath: async (targetPath: string, options) => {
      const state = get();
      const project = state.currentProject;
      const workspace = state.currentWorkspace;

      if (!project || !workspace) {
        return;
      }

      set({ isLoading: true, error: null });

      try {
        const response = await workspaceApi.navigateToPath({
          projectId: project.id,
          projectName: project.name,
          sourceFolder: project.sourceFolder,
          targetPath,
        });

        const { snapshot, fileExplorerItems } = adaptWorkspace(response);

        set(state => {
          const baseUpdate = {
            currentWorkspace: snapshot,
            currentPath: snapshot.currentPath,
            fileExplorerItems,
            isLoading: false,
          } as Partial<WorkspaceNavigationState>;

          if (options?.addToHistory === false) {
            return baseUpdate;
          }

          const nextHistory = [
            ...state.navigationHistory.slice(0, state.currentHistoryIndex + 1),
            snapshot.currentPath,
          ];

          return {
            ...baseUpdate,
            navigationHistory: nextHistory,
            currentHistoryIndex: nextHistory.length - 1,
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to navigate to path';
        set({ isLoading: false, error: message });
      }
    },

    clearWorkspace: () => {
      set({
        currentProject: null,
        currentWorkspace: null,
        currentPath: '',
        fileExplorerItems: [],
        navigationHistory: [],
        currentHistoryIndex: -1,
        searchQuery: '',
        searchResults: [],
        isLoading: false,
        error: null,
      });
    },

    clearError: () => {
      set({ error: null });
    },

    searchFiles: (query: string) => {
      const state = get();
      const items = state.fileExplorerItems;
      const trimmed = query.trim();

      if (trimmed === '') {
        set({ searchQuery: '', searchResults: [] });
        return;
      }

      const results = items.filter(item =>
        item.name.toLowerCase().includes(trimmed.toLowerCase())
      );

      set({ searchQuery: trimmed, searchResults: results });
    },

    canGoBack: () => {
      const state = get();
      return state.currentHistoryIndex > 0;
    },

    canGoForward: () => {
      const state = get();
      return state.currentHistoryIndex >= 0 && state.currentHistoryIndex < state.navigationHistory.length - 1;
    },

    goBack: async () => {
      const state = get();
      if (!state.canGoBack()) {
        return;
      }

      const targetIndex = state.currentHistoryIndex - 1;
      const targetPath = state.navigationHistory[targetIndex];

      await get().navigateToPath(targetPath, { addToHistory: false });

      set({ currentHistoryIndex: targetIndex });
    },

    goForward: async () => {
      const state = get();
      if (!state.canGoForward()) {
        return;
      }

      const targetIndex = state.currentHistoryIndex + 1;
      const targetPath = state.navigationHistory[targetIndex];

      await get().navigateToPath(targetPath, { addToHistory: false });

      set({ currentHistoryIndex: targetIndex });
    },
  }))
);
