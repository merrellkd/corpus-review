/**
 * Project Store - Unified Store Location
 *
 * Re-exports for clean imports from centralized store location
 */

export {
  useProjectStore,
  useProjectList,
  useCurrentProject,
  useProjectActions,
  useProjectDialogs,
  useProjectSelection
} from './project-store';

export type {
  ProjectStore,
  ProjectState,
  ProjectActions,
  ProjectSortField,
  SortOrder,
  ProjectFilter,
  ProjectStoreEvent,
  ProjectStoreEventPayload,
  ProjectStoreEventListener,
  OperationResult,
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectList,
  RepositoryStats,
  ValidationResult,
} from './project-store-types';

export {
  ProjectStoreError,
  DEFAULT_PROJECT_FILTER,
  DEFAULT_STORE_CONFIG,
  DEFAULT_PERSISTENCE_CONFIG,
} from './project-store-types';

// Default export for convenience
export { useProjectStore as default } from './project-store';