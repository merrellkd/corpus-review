/**
 * Panel Zustand Store - Unified Location
 *
 * Central state management for UI panels, layout, and navigation state.
 * Consolidates functionality from panelStateMachine.ts and unifiedPanelState.ts
 * into a single, unified interface.
 *
 * Migrated from: stores/ui.ts, stores/ui.ts
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  UIStore,
  UIState,
  UIActions,
  UIStateCallbacks,
  ActivePanelType,
  PanelStateType,
  LayoutMode,
  PanelLayout,
  LastValidState,
} from './ui-store-types';

import {
  DEFAULT_PANEL_LAYOUT,
  DEFAULT_UI_CONFIG,
  UIStoreError,
} from './ui-store-types';

// ====================
// Helper Functions
// ====================

const computePanelProperties = (activePanel: ActivePanelType) => ({
  isFilesCategoriesPanelActive: activePanel === 'files_categories',
  isSearchPanelActive: activePanel === 'search',
  layoutMode: activePanel === 'none' ? 'full-width' as LayoutMode : 'two-column' as LayoutMode
});

const computePropertiesFromState = (currentState: PanelStateType) => {
  const isFilesCategoriesPanelActive = ['files-only', 'categories-only', 'files-and-categories'].includes(currentState);
  const isSearchPanelActive = currentState === 'search';
  const isDragDropAvailable = currentState === 'files-and-categories';

  const fileExplorerVisible = ['files-only', 'files-and-categories'].includes(currentState);
  const categoryExplorerVisible = ['categories-only', 'files-and-categories'].includes(currentState);

  return {
    isFilesCategoriesPanelActive,
    isSearchPanelActive,
    isDragDropAvailable,
    fileExplorerVisible,
    categoryExplorerVisible,
  };
};

// ====================
// Initial State
// ====================

const initialState: UIState = {
  // Active panel state
  activePanel: DEFAULT_UI_CONFIG.activePanel,
  currentState: DEFAULT_UI_CONFIG.currentState,
  lastValidFilesCategories: {
    fileExplorerVisible: true,
    categoryExplorerVisible: false,
  },

  // Panel layout
  panels: { ...DEFAULT_PANEL_LAYOUT },

  // Computed properties
  ...computePanelProperties(DEFAULT_UI_CONFIG.activePanel),
  ...computePropertiesFromState(DEFAULT_UI_CONFIG.currentState),

  // Global UI state
  isFullscreen: false,
  isSidebarCollapsed: false,
  theme: DEFAULT_UI_CONFIG.theme,

  // Navigation state
  currentView: 'workspace',
  navigationHistory: ['workspace'],

  // Loading and error states
  isLoading: false,
  error: null,

  // Timestamps and sync
  timestamp: Date.now(),
  hasUnsyncedChanges: false,
};

// ====================
// Store Implementation
// ====================

export const usePanelStore = create<UIStore>()(
  devtools(
    persist(
      immer<UIStore>((set, get) => ({
        ...initialState,

        // Callbacks
        callbacks: {},

        // ====================
        // Panel State Machine Actions (from panelStateMachine)
        // ====================

        toggleFilesCategoriesPanel: () => {
          const currentActivePanel = get().activePanel;
          const newActivePanel: ActivePanelType = currentActivePanel === 'files_categories' ? 'none' : 'files_categories';

          set((state) => {
            const oldPanel = state.activePanel;
            state.activePanel = newActivePanel;
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;

            // Update computed properties
            const computed = computePanelProperties(newActivePanel);
            Object.assign(state, computed);

            // Call callback if set
            if (state.callbacks.onStateChange) {
              state.callbacks.onStateChange(oldPanel, newActivePanel);
            }

            // Persist state callback
            if (state.callbacks.onPersistState) {
              state.callbacks.onPersistState({
                activePanel: newActivePanel,
                timestamp: state.timestamp,
              });
            }
          });
        },

        toggleSearchPanel: () => {
          const currentActivePanel = get().activePanel;
          const newActivePanel: ActivePanelType = currentActivePanel === 'search' ? 'none' : 'search';

          set((state) => {
            const oldPanel = state.activePanel;
            state.activePanel = newActivePanel;
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;

            // Update computed properties
            const computed = computePanelProperties(newActivePanel);
            Object.assign(state, computed);

            // Call callback if set
            if (state.callbacks.onStateChange) {
              state.callbacks.onStateChange(oldPanel, newActivePanel);
            }

            // Persist state callback
            if (state.callbacks.onPersistState) {
              state.callbacks.onPersistState({
                activePanel: newActivePanel,
                timestamp: state.timestamp,
              });
            }
          });
        },

        // ====================
        // Unified Panel State Actions (from unifiedPanelState)
        // ====================

        setState: (state: PanelStateType) => {
          set((draft) => {
            draft.currentState = state;
            draft.timestamp = Date.now();

            // Update computed properties
            const computed = computePropertiesFromState(state);
            Object.assign(draft, computed);

            // Call callback if set
            if (draft.callbacks.onUnifiedStateChange) {
              draft.callbacks.onUnifiedStateChange({
                currentState: state,
                lastValidFilesCategories: draft.lastValidFilesCategories,
                timestamp: draft.timestamp,
              });
            }
          });
        },

        setLastValidState: (state: LastValidState) => {
          set((draft) => {
            draft.lastValidFilesCategories = { ...state };
            draft.timestamp = Date.now();
          });
        },

        toggleFilesCategories: () => {
          const currentState = get().currentState;
          const newState: PanelStateType = currentState === 'none' ? 'files-and-categories' : 'none';
          get().setState(newState);
        },

        toggleSearch: () => {
          const currentState = get().currentState;
          const newState: PanelStateType = currentState === 'search' ? 'none' : 'search';
          get().setState(newState);
        },

        toggleFileExplorer: () => {
          const current = get();
          const newFileExplorerVisible = !current.fileExplorerVisible;

          let newState: PanelStateType;
          if (newFileExplorerVisible && current.categoryExplorerVisible) {
            newState = 'files-and-categories';
          } else if (newFileExplorerVisible && !current.categoryExplorerVisible) {
            newState = 'files-only';
          } else if (!newFileExplorerVisible && current.categoryExplorerVisible) {
            newState = 'categories-only';
          } else {
            newState = 'none';
          }

          get().setState(newState);
        },

        toggleCategoryExplorer: () => {
          const current = get();
          const newCategoryExplorerVisible = !current.categoryExplorerVisible;

          let newState: PanelStateType;
          if (current.fileExplorerVisible && newCategoryExplorerVisible) {
            newState = 'files-and-categories';
          } else if (!current.fileExplorerVisible && newCategoryExplorerVisible) {
            newState = 'categories-only';
          } else if (current.fileExplorerVisible && !newCategoryExplorerVisible) {
            newState = 'files-only';
          } else {
            newState = 'none';
          }

          get().setState(newState);
        },

        // ====================
        // Panel Management
        // ====================

        togglePanel: (panelId) => {
          set((state) => {
            const panel = state.panels[panelId];
            if (panel) {
              panel.isVisible = !panel.isVisible;
              state.timestamp = Date.now();
              state.hasUnsyncedChanges = true;

              if (state.callbacks.onLayoutChange) {
                state.callbacks.onLayoutChange(state.panels);
              }
            }
          });
        },

        resizePanel: (panelId, width, height) => {
          set((state) => {
            const panel = state.panels[panelId];
            if (panel) {
              panel.width = Math.max(panel.minWidth || 0, Math.min(width, panel.maxWidth || Infinity));
              if (height !== undefined) {
                panel.height = Math.max(panel.minHeight || 0, Math.min(height, panel.maxHeight || Infinity));
              }
              state.timestamp = Date.now();
              state.hasUnsyncedChanges = true;

              if (state.callbacks.onLayoutChange) {
                state.callbacks.onLayoutChange(state.panels);
              }
            }
          });
        },

        movePanel: (panelId, x, y) => {
          set((state) => {
            const panel = state.panels[panelId];
            if (panel && panel.position) {
              panel.position.x = x;
              panel.position.y = y;
              state.timestamp = Date.now();
              state.hasUnsyncedChanges = true;

              if (state.callbacks.onLayoutChange) {
                state.callbacks.onLayoutChange(state.panels);
              }
            }
          });
        },

        collapsePanel: (panelId) => {
          set((state) => {
            const panel = state.panels[panelId];
            if (panel) {
              panel.isCollapsed = true;
              state.timestamp = Date.now();
              state.hasUnsyncedChanges = true;

              if (state.callbacks.onLayoutChange) {
                state.callbacks.onLayoutChange(state.panels);
              }
            }
          });
        },

        expandPanel: (panelId) => {
          set((state) => {
            const panel = state.panels[panelId];
            if (panel) {
              panel.isCollapsed = false;
              state.timestamp = Date.now();
              state.hasUnsyncedChanges = true;

              if (state.callbacks.onLayoutChange) {
                state.callbacks.onLayoutChange(state.panels);
              }
            }
          });
        },

        resetPanelLayout: () => {
          set((state) => {
            state.panels = { ...DEFAULT_PANEL_LAYOUT };
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;

            if (state.callbacks.onLayoutChange) {
              state.callbacks.onLayoutChange(state.panels);
            }
          });
        },

        // ====================
        // Layout Management
        // ====================

        setLayoutMode: (mode: LayoutMode) => {
          set((state) => {
            state.layoutMode = mode;
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;
          });
        },

        toggleFullscreen: () => {
          set((state) => {
            state.isFullscreen = !state.isFullscreen;
            state.timestamp = Date.now();
          });
        },

        toggleSidebar: () => {
          set((state) => {
            state.isSidebarCollapsed = !state.isSidebarCollapsed;
            state.panels.sidebar.isCollapsed = state.isSidebarCollapsed;
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;

            if (state.callbacks.onLayoutChange) {
              state.callbacks.onLayoutChange(state.panels);
            }
          });
        },

        // ====================
        // Theme Management
        // ====================

        setTheme: (theme) => {
          set((state) => {
            state.theme = theme;
            state.timestamp = Date.now();

            if (state.callbacks.onThemeChange) {
              state.callbacks.onThemeChange(theme);
            }
          });
        },

        // ====================
        // Navigation
        // ====================

        setCurrentView: (view) => {
          set((state) => {
            // Add to history if different from current
            if (state.currentView !== view) {
              state.navigationHistory.push(view);
              // Keep history limited to 50 items
              if (state.navigationHistory.length > 50) {
                state.navigationHistory = state.navigationHistory.slice(-50);
              }
            }
            state.currentView = view;
            state.timestamp = Date.now();
          });
        },

        navigateBack: () => {
          const history = get().navigationHistory;
          if (history.length > 1) {
            set((state) => {
              state.navigationHistory.pop(); // Remove current
              state.currentView = state.navigationHistory[state.navigationHistory.length - 1];
              state.timestamp = Date.now();
            });
          }
        },

        navigateForward: () => {
          // This would require a more complex history implementation with forward stack
          // For now, not implemented
        },

        clearNavigationHistory: () => {
          set((state) => {
            state.navigationHistory = [state.currentView];
            state.timestamp = Date.now();
          });
        },

        // ====================
        // State Management
        // ====================

        updateLayout: (layout) => {
          set((state) => {
            Object.assign(state.panels, layout);
            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;

            if (state.callbacks.onLayoutChange) {
              state.callbacks.onLayoutChange(state.panels);
            }
          });
        },

        resetLayout: () => {
          get().resetPanelLayout();
          set((state) => {
            state.activePanel = DEFAULT_UI_CONFIG.activePanel;
            state.currentState = DEFAULT_UI_CONFIG.currentState;
            state.layoutMode = DEFAULT_UI_CONFIG.layoutMode;
            state.isFullscreen = false;
            state.isSidebarCollapsed = false;

            // Update computed properties
            const computed1 = computePanelProperties(state.activePanel);
            const computed2 = computePropertiesFromState(state.currentState);
            Object.assign(state, computed1, computed2);

            state.timestamp = Date.now();
            state.hasUnsyncedChanges = true;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

        retryPersistence: () => {
          set((state) => {
            state.hasUnsyncedChanges = false;
            state.timestamp = Date.now();

            // Retry persistence callback if available
            if (state.callbacks.onPersistState) {
              state.callbacks.onPersistState({
                activePanel: state.activePanel,
                timestamp: state.timestamp,
              });
            }
          });
        },

        // ====================
        // Callbacks Management
        // ====================

        setCallbacks: (callbacks) => {
          set((state) => {
            Object.assign(state.callbacks, callbacks);
          });
        },

        // ====================
        // Internal/Debug Methods
        // ====================

        forceState: (panel: string) => {
          // Debug method for forcing specific states
          if (panel === 'files_categories' || panel === 'search' || panel === 'none') {
            set((state) => {
              state.activePanel = panel as ActivePanelType;
              const computed = computePanelProperties(state.activePanel);
              Object.assign(state, computed);
              state.timestamp = Date.now();
            });
          }
        },

      })),
      {
        name: 'panel-store',
        partialize: (state) => ({
          activePanel: state.activePanel,
          currentState: state.currentState,
          lastValidFilesCategories: state.lastValidFilesCategories,
          panels: state.panels,
          layoutMode: state.layoutMode,
          isSidebarCollapsed: state.isSidebarCollapsed,
          theme: state.theme,
          currentView: state.currentView,
        }),
      }
    ),
    {
      name: 'panel-store',
    }
  )
);

// ====================
// Store Hooks and Selectors
// ====================

/**
 * Hook for accessing panel state machine functionality
 */
export const usePanelStateMachine = () => {
  return usePanelStore((state) => ({
    activePanel: state.activePanel,
    isFilesCategoriesPanelActive: state.isFilesCategoriesPanelActive,
    isSearchPanelActive: state.isSearchPanelActive,
    layoutMode: state.layoutMode,
    hasUnsyncedChanges: state.hasUnsyncedChanges,
    toggleFilesCategoriesPanel: state.toggleFilesCategoriesPanel,
    toggleSearchPanel: state.toggleSearchPanel,
    retryPersistence: state.retryPersistence,
  }));
};

/**
 * Hook for accessing unified panel state functionality
 */
export const useUnifiedPanelState = () => {
  return usePanelStore((state) => ({
    currentState: state.currentState,
    lastValidFilesCategories: state.lastValidFilesCategories,
    isFilesCategoriesPanelActive: state.isFilesCategoriesPanelActive,
    isSearchPanelActive: state.isSearchPanelActive,
    isDragDropAvailable: state.isDragDropAvailable,
    fileExplorerVisible: state.fileExplorerVisible,
    categoryExplorerVisible: state.categoryExplorerVisible,
    setState: state.setState,
    setLastValidState: state.setLastValidState,
    toggleFilesCategories: state.toggleFilesCategories,
    toggleSearch: state.toggleSearch,
    toggleFileExplorer: state.toggleFileExplorer,
    toggleCategoryExplorer: state.toggleCategoryExplorer,
  }));
};

/**
 * Hook for accessing panel layout management
 */
export const usePanelLayout = () => {
  return usePanelStore((state) => ({
    panels: state.panels,
    isFullscreen: state.isFullscreen,
    isSidebarCollapsed: state.isSidebarCollapsed,
    togglePanel: state.togglePanel,
    resizePanel: state.resizePanel,
    movePanel: state.movePanel,
    collapsePanel: state.collapsePanel,
    expandPanel: state.expandPanel,
    resetPanelLayout: state.resetPanelLayout,
    toggleFullscreen: state.toggleFullscreen,
    toggleSidebar: state.toggleSidebar,
  }));
};

/**
 * Hook for accessing UI theme and preferences
 */
export const useUIPreferences = () => {
  return usePanelStore((state) => ({
    theme: state.theme,
    currentView: state.currentView,
    setTheme: state.setTheme,
    setCurrentView: state.setCurrentView,
    navigateBack: state.navigateBack,
    clearNavigationHistory: state.clearNavigationHistory,
  }));
};

// Export store for direct access
export default usePanelStore;