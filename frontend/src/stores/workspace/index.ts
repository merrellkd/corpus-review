/**
 * Workspace Store - Unified Store Location
 *
 * Re-exports for clean imports from centralized store location
 */

export {
  useWorkspaceStore,
  useWorkspaceNavigation,
  useDocumentManagement,
  useFileSelection,
  useWorkspaceActions
} from './workspace-store';

export type {
  WorkspaceStore,
  WorkspaceState,
  WorkspaceActions,
  Project,
  DocumentCaddy,
  DocumentUIState,
  FileSystemItem,
  WorkspaceLayout,
} from './workspace-store-types';

export {
  DEFAULT_WORKSPACE_CONFIG,
  WorkspaceStoreError,
} from './workspace-store-types';

// Default export for convenience
export { useWorkspaceStore as default } from './workspace-store';