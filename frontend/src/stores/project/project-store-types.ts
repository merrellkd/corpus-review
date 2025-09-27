/**
 * Project Store Types
 *
 * Type definitions for the unified project store
 */

import type {
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectList,
  RepositoryStats,
  ValidationResult,
} from '../../features/project-management/types';

// Re-export from feature types
export type {
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectList,
  RepositoryStats,
  ValidationResult,
};

// Store-specific types
export type ProjectSortField = 'name' | 'created' | 'modified' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface ProjectFilter {
  hasDescription?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
}

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
  validationErrors: Record<string, string>;

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

export interface ProjectActions {
  // Data fetching
  fetchProjects: () => Promise<void>;
  fetchProjectsPaged: (offset?: number, limit?: number) => Promise<void>;
  fetchProject: (id: string) => Promise<Project | null>;
  fetchProjectByName: (name: string) => Promise<Project | null>;
  fetchRecentProjects: (limit?: number) => Promise<void>;
  fetchStats: () => Promise<void>;

  // CRUD operations
  createProject: (params: CreateProjectParams) => Promise<Project>;
  updateProject: (id: string, params: UpdateProjectParams) => Promise<Project | null>;
  deleteProject: (id: string, confirm?: boolean) => Promise<boolean>;
  deleteBulkProjects: (ids: string[], confirm?: boolean) => Promise<boolean>;

  // Search and filter
  searchProjects: (query: string, offset?: number, limit?: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: ProjectSortField, order?: SortOrder) => void;
  setFilter: (filter: ProjectFilter) => void;
  clearSearch: () => void;

  // Selection
  selectProject: (id: string) => void;
  selectMultipleProjects: (ids: string[]) => void;
  toggleProjectSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Navigation
  openProject: (id: string) => Promise<Project | null>;
  setCurrentProject: (project: Project | null) => void;
  openProjectFolder: (id: string) => Promise<void>;

  // Dialogs
  showCreateProjectDialog: () => void;
  hideCreateProjectDialog: () => void;
  showDeleteProjectDialog: (projectId: string) => void;
  hideDeleteProjectDialog: () => void;
  showUpdateProjectDialog: (projectId: string) => void;
  hideUpdateProjectDialog: () => void;

  // Pagination
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => void;

  // Utilities
  refreshProjects: () => Promise<void>;
  resetStore: () => void;
  clearError: () => void;
  isNameAvailable: (name: string) => Promise<boolean>;
  validateProjectAccess: (id: string) => Promise<ValidationResult>;

  // Events
  emitEvent: <T extends ProjectStoreEvent>(
    event: T,
    payload: ProjectStoreEventPayload[T]
  ) => void;
}

export interface ProjectStore extends ProjectState, ProjectActions {}

// Event system types
export type ProjectStoreEvent =
  | 'projects-loaded'
  | 'project-created'
  | 'project-updated'
  | 'project-deleted'
  | 'project-selected'
  | 'search-updated'
  | 'filter-updated'
  | 'error-occurred';

export interface ProjectStoreEventPayload {
  'projects-loaded': { count: number; hasMore: boolean };
  'project-created': { project: Project };
  'project-updated': { project: Project; previousData: Project };
  'project-deleted': { projectId: string };
  'project-selected': { project: Project | null };
  'search-updated': { query: string; resultCount: number };
  'filter-updated': { filter: ProjectFilter };
  'error-occurred': { error: string; context: string };
}

export type ProjectStoreEventListener<T extends ProjectStoreEvent> = (
  payload: ProjectStoreEventPayload[T]
) => void;

export type OperationResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Error handling
export class ProjectStoreError extends Error {
  constructor(message: string, public context?: string) {
    super(message);
    this.name = 'ProjectStoreError';
  }
}

// Configuration defaults
export const DEFAULT_PROJECT_FILTER: ProjectFilter = {};

export const DEFAULT_STORE_CONFIG = {
  pagination: {
    defaultPageSize: 20,
  },
  defaultSort: {
    field: 'name' as ProjectSortField,
    order: 'asc' as SortOrder,
  },
};

export const DEFAULT_PERSISTENCE_CONFIG = {
  name: 'project-store',
  version: 1,
  partialize: (state: ProjectStore) => ({
    currentProject: state.currentProject,
    recentProjects: state.recentProjects,
    searchQuery: state.searchQuery,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    filterBy: state.filterBy,
    pageSize: state.pageSize,
  }),
};