/**
 * UI Store Types
 *
 * Type definitions for the unified UI store (panels, layout, navigation state)
 */

// Panel state types (consolidated from both state machines)
export type ActivePanelType = 'none' | 'files_categories' | 'search';
export type PanelStateType = 'none' | 'files-only' | 'categories-only' | 'files-and-categories' | 'search';
export type LayoutMode = 'full-width' | 'two-column';

// Individual panel configurations
export interface PanelConfig {
  id: string;
  name: string;
  isVisible: boolean;
  isCollapsed: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  position?: { x: number; y: number };
  zIndex?: number;
}

// Panel layout state
export interface PanelLayout {
  sidebar: PanelConfig;
  explorer: PanelConfig;
  search: PanelConfig;
  categories: PanelConfig;
  workspace: PanelConfig;
  properties: PanelConfig;
}

// Last valid state tracking
export interface LastValidState {
  fileExplorerVisible: boolean;
  categoryExplorerVisible: boolean;
}

// UI state interface
export interface UIState {
  // Active panel state
  activePanel: ActivePanelType;
  currentState: PanelStateType;
  lastValidFilesCategories: LastValidState;

  // Panel layout
  panels: PanelLayout;
  layoutMode: LayoutMode;

  // Computed properties
  isFilesCategoriesPanelActive: boolean;
  isSearchPanelActive: boolean;
  isDragDropAvailable: boolean;
  fileExplorerVisible: boolean;
  categoryExplorerVisible: boolean;

  // Global UI state
  isFullscreen: boolean;
  isSidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'auto';

  // Navigation state
  currentView: string;
  navigationHistory: string[];

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Timestamps and sync
  timestamp: number;
  hasUnsyncedChanges: boolean;
}

// UI actions interface
export interface UIActions {
  // Panel state machine actions (from panelStateMachine)
  toggleFilesCategoriesPanel: () => void;
  toggleSearchPanel: () => void;

  // Unified panel state actions (from unifiedPanelState)
  setState: (state: PanelStateType) => void;
  setLastValidState: (state: LastValidState) => void;
  toggleFilesCategories: () => void;
  toggleSearch: () => void;
  toggleFileExplorer: () => void;
  toggleCategoryExplorer: () => void;

  // Panel management
  togglePanel: (panelId: keyof PanelLayout) => void;
  resizePanel: (panelId: keyof PanelLayout, width: number, height?: number) => void;
  movePanel: (panelId: keyof PanelLayout, x: number, y: number) => void;
  collapsePanel: (panelId: keyof PanelLayout) => void;
  expandPanel: (panelId: keyof PanelLayout) => void;
  resetPanelLayout: () => void;

  // Layout management
  setLayoutMode: (mode: LayoutMode) => void;
  toggleFullscreen: () => void;
  toggleSidebar: () => void;

  // Theme management
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;

  // Navigation
  setCurrentView: (view: string) => void;
  navigateBack: () => void;
  navigateForward: () => void;
  clearNavigationHistory: () => void;

  // State management
  updateLayout: (layout: Partial<PanelLayout>) => void;
  resetLayout: () => void;
  clearError: () => void;
  retryPersistence: () => void;

  // Internal/debugging
  forceState?: (panel: string) => void;
}

// Event callbacks
export interface UIStateCallbacks {
  onStateChange?: (from: ActivePanelType, to: ActivePanelType) => void;
  onPersistState?: (state: { activePanel: ActivePanelType; timestamp: number }) => void;
  onUnifiedStateChange?: (state: {
    currentState: PanelStateType;
    lastValidFilesCategories: LastValidState;
    timestamp: number
  }) => void;
  onLayoutChange?: (layout: PanelLayout) => void;
  onThemeChange?: (theme: string) => void;
}

// Combined store interface
export interface UIStore extends UIState, UIActions {
  // Callbacks
  callbacks: UIStateCallbacks;
  setCallbacks: (callbacks: Partial<UIStateCallbacks>) => void;
}

// Panel configuration defaults
export const DEFAULT_PANEL_CONFIG: PanelConfig = {
  id: '',
  name: '',
  isVisible: true,
  isCollapsed: false,
  width: 250,
  height: 400,
  minWidth: 150,
  minHeight: 200,
  maxWidth: 800,
  maxHeight: 1000,
  position: { x: 0, y: 0 },
  zIndex: 1,
};

// Default panel layout
export const DEFAULT_PANEL_LAYOUT: PanelLayout = {
  sidebar: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'sidebar',
    name: 'Sidebar',
    width: 60,
    minWidth: 60,
    maxWidth: 200,
  },
  explorer: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'explorer',
    name: 'File Explorer',
    width: 250,
  },
  search: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'search',
    name: 'Search',
    width: 300,
    isVisible: false,
  },
  categories: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'categories',
    name: 'Categories',
    width: 200,
    isVisible: false,
  },
  workspace: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'workspace',
    name: 'Workspace',
    width: 800,
    minWidth: 400,
  },
  properties: {
    ...DEFAULT_PANEL_CONFIG,
    id: 'properties',
    name: 'Properties',
    width: 200,
    isVisible: false,
  },
};

// Configuration options
export const DEFAULT_UI_CONFIG = {
  theme: 'auto' as const,
  layoutMode: 'two-column' as const,
  activePanel: 'none' as ActivePanelType,
  currentState: 'none' as PanelStateType,
  persistState: true,
  autoSave: true,
  autoSaveInterval: 5000, // 5 seconds
};

// Error handling
export class UIStoreError extends Error {
  constructor(message: string, public context?: string) {
    super(message);
    this.name = 'UIStoreError';
  }
}