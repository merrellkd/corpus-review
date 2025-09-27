/**
 * Unified Store Exports
 *
 * Central export point for all application stores
 */

// Project store
export {
  useProjectStore,
  useProjectList,
  useCurrentProject,
  useProjectActions,
  useProjectDialogs,
  useProjectSelection
} from './project';

export type {
  ProjectStore,
  ProjectState,
  ProjectActions,
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectList,
  RepositoryStats,
  ValidationResult,
} from './project';

// Workspace store
export {
  useWorkspaceStore,
  useWorkspaceNavigation,
  useDocumentManagement,
  useFileSelection,
  useWorkspaceActions
} from './workspace';

export type {
  WorkspaceStore,
  WorkspaceState,
  WorkspaceActions,
  FileSystemItem,
  WorkspaceLayout,
  DocumentCaddy,
} from './workspace';

// UI/Panel store
export {
  usePanelStore,
  usePanelStateMachine,
  useUnifiedPanelState,
  usePanelLayout,
  useUIPreferences
} from './ui';

export type {
  UIStore,
  UIState,
  UIActions,
  ActivePanelType,
  PanelStateType,
  LayoutMode,
  PanelConfig,
  PanelLayout,
} from './ui';

// Shared stores
export {
  useFileCategorization,
  useDragDropState,
  useCategorization,
  useCategoryManagement
} from './shared';

// Store configuration and utilities
export {
  DEFAULT_PROJECT_FILTER,
  DEFAULT_STORE_CONFIG as DEFAULT_PROJECT_CONFIG,
} from './project';

export {
  DEFAULT_WORKSPACE_CONFIG,
} from './workspace';

export {
  DEFAULT_UI_CONFIG,
  DEFAULT_PANEL_CONFIG as DEFAULT_PANEL_LAYOUT,
} from './ui';