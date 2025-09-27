/**
 * Project Store Types
 *
 * Type definitions for the Project Zustand store, including state,
 * actions, and related interfaces for managing project data.
 */

import type {
  Project,
  ProjectMetadata,
  CreateProjectParams,
  UpdateProjectParams,
} from './aggregates';

import type {
  ProjectList,
  RepositoryStats,
  ValidationResult,
} from '../services/project-repository';

// ====================
// Store State Types
// ====================

/**
 * Project store state
 */
export interface ProjectState {
  // Current projects data
  projects: Project[];
  currentProject: Project | null;
  recentProjects: Project[];

  // List management
  projectList: ProjectList | null;
  totalProjects: number;
  currentPage: number;
  pageSize: number;

  // Repository statistics
  stats: RepositoryStats | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  isFetching: boolean;

  // Error states
  error: string | null;
  validationErrors: Record<string, string[]>;

  // UI state
  selectedProjectIds: Set<string>;
  searchQuery: string;
  sortBy: ProjectSortField;
  sortOrder: SortOrder;
  filterBy: ProjectFilter;

  // Modal/dialog states
  showCreateDialog: boolean;
  showDeleteDialog: boolean;
  showUpdateDialog: boolean;
  projectToDelete: string | null;
  projectToUpdate: string | null;
}

/**
 * Project store actions
 */
export interface ProjectActions {
  // Data fetching actions
  fetchProjects: () => Promise<void>;
  fetchProjectsPaged: (offset?: number, limit?: number) => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  fetchProjectByName: (name: string) => Promise<Project | null>;
  fetchRecentProjects: (limit?: number) => Promise<void>;
  fetchStats: () => Promise<void>;

  // CRUD actions
  createProject: (params: CreateProjectParams) => Promise<Project | null>;
  updateProject: (id: string, params: UpdateProjectParams) => Promise<Project | null>;
  deleteProject: (id: string, confirm?: boolean) => Promise<boolean>;
  deleteBulkProjects: (ids: string[], confirm?: boolean) => Promise<boolean>;

  // Search and filter actions
  searchProjects: (query: string, offset?: number, limit?: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: ProjectSortField, order?: SortOrder) => void;
  setFilter: (filter: ProjectFilter) => void;
  clearSearch: () => void;

  // Selection actions
  selectProject: (id: string) => void;
  selectMultipleProjects: (ids: string[]) => void;
  toggleProjectSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Navigation actions
  openProject: (id: string) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  openProjectFolder: (id: string) => Promise<void>;

  // Dialog actions
  showCreateProjectDialog: () => void;
  hideCreateProjectDialog: () => void;
  showDeleteProjectDialog: (projectId: string) => void;
  hideDeleteProjectDialog: () => void;
  showUpdateProjectDialog: (projectId: string) => void;
  hideUpdateProjectDialog: () => void;

  // Pagination actions
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => void;

  // Utility actions
  refreshProjects: () => Promise<void>;
  resetStore: () => void;
  clearError: () => void;
  isNameAvailable: (name: string) => Promise<boolean>;
  validateProjectAccess: (id: string) => Promise<ValidationResult>;

  // Event system
  emitEvent: <T extends ProjectStoreEvent>(
    event: T,
    payload: ProjectStoreEventPayload[T]
  ) => void;
}

/**
 * Complete project store interface
 */
export interface ProjectStore extends ProjectState, ProjectActions {}

// ====================
// Supporting Types
// ====================

/**
 * Project sorting fields
 */
export type ProjectSortField =
  | 'name'
  | 'created_at'
  | 'source_folder'
  | 'note'
  | 'accessibility';

/**
 * Sort order
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Project filter options
 */
export interface ProjectFilter {
  accessible?: boolean | null;
  hasNote?: boolean | null;
  createdAfter?: Date | null;
  createdBefore?: Date | null;
  sourceFolderContains?: string | null;
}

/**
 * Default project filter
 */
export const DEFAULT_PROJECT_FILTER: ProjectFilter = {
  accessible: null,
  hasNote: null,
  createdAfter: null,
  createdBefore: null,
  sourceFolderContains: null,
};

/**
 * Pagination configuration
 */
export interface PaginationConfig {
  defaultPageSize: number;
  maxPageSize: number;
  showPageSizeOptions: number[];
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  defaultPageSize: 20,
  maxPageSize: 100,
  showPageSizeOptions: [10, 20, 50, 100],
};

/**
 * Store configuration
 */
export interface ProjectStoreConfig {
  // Auto-refresh settings
  autoRefreshInterval?: number; // milliseconds
  enableAutoRefresh?: boolean;

  // Cache settings
  cacheTimeout?: number; // milliseconds
  maxCacheSize?: number;

  // UI settings
  defaultSort?: { field: ProjectSortField; order: SortOrder };
  pagination?: PaginationConfig;

  // Feature flags
  enableBulkOperations?: boolean;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableStatistics?: boolean;
}

export const DEFAULT_STORE_CONFIG: ProjectStoreConfig = {
  autoRefreshInterval: 5 * 60 * 1000, // 5 minutes
  enableAutoRefresh: false,
  cacheTimeout: 2 * 60 * 1000, // 2 minutes
  maxCacheSize: 1000,
  defaultSort: { field: 'name', order: 'asc' },
  pagination: DEFAULT_PAGINATION_CONFIG,
  enableBulkOperations: true,
  enableSearch: true,
  enableFiltering: true,
  enableStatistics: true,
};

// ====================
// Event Types
// ====================

/**
 * Store events
 */
export type ProjectStoreEvent =
  | 'project-created'
  | 'project-updated'
  | 'project-deleted'
  | 'projects-loaded'
  | 'project-selected'
  | 'search-updated'
  | 'filter-updated'
  | 'error-occurred'
  | 'loading-started'
  | 'loading-completed';

/**
 * Event payload types
 */
export interface ProjectStoreEventPayload {
  'project-created': { project: Project };
  'project-updated': { project: Project; previousData: Project };
  'project-deleted': { projectId: string };
  'projects-loaded': { count: number; hasMore: boolean };
  'project-selected': { project: Project | null };
  'search-updated': { query: string; resultCount: number };
  'filter-updated': { filter: ProjectFilter };
  'error-occurred': { error: string; context?: string };
  'loading-started': { operation: string };
  'loading-completed': { operation: string; success: boolean };
}

/**
 * Event listener type
 */
export type ProjectStoreEventListener<T extends ProjectStoreEvent = ProjectStoreEvent> =
  (payload: ProjectStoreEventPayload[T]) => void;

// ====================
// Error Types
// ====================

/**
 * Store operation errors
 */
export class ProjectStoreError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ProjectStoreError';
  }
}

/**
 * Validation error for store operations
 */
export interface StoreValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Operation result type
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: StoreValidationError[];
}

// ====================
// Utility Types
// ====================

/**
 * Store slice for splitting large stores
 */
export interface ProjectStoreSlice<T = ProjectStore> {
  (...args: Parameters<StateCreator<ProjectStore, [], [], T>>): T;
}

// Import StateCreator type from Zustand
type StateCreator<T, Mis = [], Mos = [], U = T> = (
  set: (
    partial: T | Partial<T> | ((state: T) => T | Partial<T>),
    replace?: boolean | undefined
  ) => void,
  get: () => T,
  api: {
    setState: (
      partial: T | Partial<T> | ((state: T) => T | Partial<T>),
      replace?: boolean | undefined
    ) => void;
    getState: () => T;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
    destroy: () => void;
  }
) => U;

/**
 * Async operation state
 */
export interface AsyncOperationState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/**
 * Store persistence configuration
 */
export interface PersistenceConfig {
  name: string;
  version: number;
  migrate?: (persistedState: unknown, version: number) => ProjectState | Promise<ProjectState>;
  partialize?: (state: ProjectStore) => Partial<ProjectState>;
  onRehydrateStorage?: () => void;
}

export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  name: 'project-store',
  version: 1,
  partialize: (state) => ({
    // Only persist these parts of the state
    currentProject: state.currentProject,
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    filterBy: state.filterBy,
    pageSize: state.pageSize,
  }),
};