import { create } from 'zustand';

export interface PanelSnapshot {
  filesPanelOpen: boolean;
  categoriesPanelOpen: boolean;
}

export interface WorkspaceLayoutState {
  explorerWidth: number;
  workspaceWidth: number;
}

export interface UiState {
  filesPanelOpen: boolean;
  categoriesPanelOpen: boolean;
  searchPanelOpen: boolean;
  lastFilesCategories: PanelSnapshot;
  workspaceLayout: WorkspaceLayoutState;

  toggleFilesCategories: () => void;
  toggleSearchPanel: () => void;
  toggleFileExplorer: () => void;
  toggleCategoryExplorer: () => void;
  setExplorerWidth: (explorerWidth: number) => void;
  resetPanels: () => void;
}

const DEFAULT_LAYOUT: WorkspaceLayoutState = {
  explorerWidth: 30,
  workspaceWidth: 70,
};

const ensureValidSnapshot = (snapshot: PanelSnapshot): PanelSnapshot => {
  if (!snapshot.filesPanelOpen && !snapshot.categoriesPanelOpen) {
    return { filesPanelOpen: true, categoriesPanelOpen: false };
  }
  return snapshot;
};

export const useUiStore = create<UiState>()((set, get) => ({
  filesPanelOpen: true,
  categoriesPanelOpen: false,
  searchPanelOpen: false,
  lastFilesCategories: { filesPanelOpen: true, categoriesPanelOpen: false },
  workspaceLayout: DEFAULT_LAYOUT,

  toggleFilesCategories: () => {
    const state = get();

    if (state.searchPanelOpen) {
      const snapshot = ensureValidSnapshot(state.lastFilesCategories);
      set({
        searchPanelOpen: false,
        filesPanelOpen: snapshot.filesPanelOpen,
        categoriesPanelOpen: snapshot.categoriesPanelOpen,
      });
      return;
    }

    const hasPanelsOpen = state.filesPanelOpen || state.categoriesPanelOpen;

    if (hasPanelsOpen) {
      const snapshot: PanelSnapshot = {
        filesPanelOpen: state.filesPanelOpen,
        categoriesPanelOpen: state.categoriesPanelOpen,
      };
      set({
        filesPanelOpen: false,
        categoriesPanelOpen: false,
        lastFilesCategories: snapshot,
      });
    } else {
      const snapshot = ensureValidSnapshot(state.lastFilesCategories);
      set({
        filesPanelOpen: snapshot.filesPanelOpen,
        categoriesPanelOpen: snapshot.categoriesPanelOpen,
      });
    }
  },

  toggleSearchPanel: () => {
    const state = get();

    if (state.searchPanelOpen) {
      const snapshot = ensureValidSnapshot(state.lastFilesCategories);
      set({
        searchPanelOpen: false,
        filesPanelOpen: snapshot.filesPanelOpen,
        categoriesPanelOpen: snapshot.categoriesPanelOpen,
      });
    } else {
      const snapshot: PanelSnapshot = {
        filesPanelOpen: state.filesPanelOpen,
        categoriesPanelOpen: state.categoriesPanelOpen,
      };
      const safeSnapshot = ensureValidSnapshot(snapshot);
      set({
        searchPanelOpen: true,
        filesPanelOpen: false,
        categoriesPanelOpen: false,
        lastFilesCategories: safeSnapshot,
      });
    }
  },

  toggleFileExplorer: () => {
    const state = get();
    const filesPanelOpen = !state.filesPanelOpen;
    const categoriesPanelOpen = state.categoriesPanelOpen;

    set({
      filesPanelOpen,
      categoriesPanelOpen,
      searchPanelOpen: false,
      lastFilesCategories: ensureValidSnapshot({ filesPanelOpen, categoriesPanelOpen }),
    });
  },

  toggleCategoryExplorer: () => {
    const state = get();
    const categoriesPanelOpen = !state.categoriesPanelOpen;
    const filesPanelOpen = state.filesPanelOpen;

    set({
      categoriesPanelOpen,
      filesPanelOpen,
      searchPanelOpen: false,
      lastFilesCategories: ensureValidSnapshot({ filesPanelOpen, categoriesPanelOpen }),
    });
  },

  setExplorerWidth: (explorerWidth: number) => {
    const width = Math.max(0, Math.min(100, explorerWidth));
    set({
      workspaceLayout: {
        explorerWidth: width,
        workspaceWidth: Math.max(0, 100 - width),
      },
    });
  },

  resetPanels: () => {
    set({
      filesPanelOpen: true,
      categoriesPanelOpen: false,
      searchPanelOpen: false,
      lastFilesCategories: { filesPanelOpen: true, categoriesPanelOpen: false },
    });
  },
}));

export const uiSelectors = {
  isFilesCategoriesPanelActive: (state: UiState) => state.filesPanelOpen || state.categoriesPanelOpen,
  isSearchPanelActive: (state: UiState) => state.searchPanelOpen,
  isDragDropAvailable: (state: UiState) => state.filesPanelOpen && state.categoriesPanelOpen,
  fileExplorerVisible: (state: UiState) => state.filesPanelOpen,
  categoryExplorerVisible: (state: UiState) => state.categoriesPanelOpen,
  workspaceLayout: (state: UiState) => state.workspaceLayout,
};
