/**
 * Project Zustand Store
 *
 * Central state management for project-related data using Zustand.
 * Provides a clean API for managing projects, search, filtering,
 * pagination, and UI state.
 */

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  Project,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectList,
  RepositoryStats,
  ValidationResult,
} from './types';
import { projectRepository } from './services/project-repository';

import type {
  ProjectStore,
  ProjectState,
  ProjectSortField,
  SortOrder,
  ProjectFilter,
  ProjectStoreEvent,
  ProjectStoreEventPayload,
  ProjectStoreEventListener,
  OperationResult,
} from './types/project-store-types';

import {
  ProjectStoreError,
  DEFAULT_PROJECT_FILTER,
  DEFAULT_STORE_CONFIG,
  DEFAULT_PERSISTENCE_CONFIG,
} from './types/project-store-types';

// ====================
// Initial State
// ====================

const initialState: ProjectState = {
  // Current projects data
  projects: [],
  currentProject: null,
  recentProjects: [],

  // List management
  projectList: null,
  totalProjects: 0,
  currentPage: 1,
  pageSize: DEFAULT_STORE_CONFIG.pagination?.defaultPageSize ?? 20,

  // Repository statistics
  stats: null,

  // Loading states
  isLoading: false,
  isCreating: false,
  isDeleting: false,
  isUpdating: false,
  isFetching: false,

  // Error states
  error: null,
  validationErrors: {},

  // UI state
  selectedProjectIds: new Set(),
  searchQuery: '',
  sortBy: DEFAULT_STORE_CONFIG.defaultSort?.field ?? 'name',
  sortOrder: DEFAULT_STORE_CONFIG.defaultSort?.order ?? 'asc',
  filterBy: { ...DEFAULT_PROJECT_FILTER },

  // Modal/dialog states
  showCreateDialog: false,
  showDeleteDialog: false,
  showUpdateDialog: false,
  projectToDelete: null,
  projectToUpdate: null,
};

// ====================
// Store Implementation
// ====================

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer<ProjectStore>((set, get) => ({
          ...initialState,

          // ====================
          // Data Fetching Actions
          // ====================

          fetchProjects: async () => {
            set((state) => {
              state.isFetching = true;
              state.error = null;
            });

            try {
              const projects = await projectRepository.findAll({
                offset: 0,
                limit: 1000, // Load all projects for basic list
              });

              set((state) => {
                state.projects = projects;
                state.totalProjects = projects.length;
                state.isFetching = false;
              });

              get().emitEvent('projects-loaded', {
                count: projects.length,
                hasMore: false,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
              set((state) => {
                state.error = errorMessage;
                state.isFetching = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchProjects',
              });
            }
          },

          fetchProjectsPaged: async (offset = 0, limit?: number) => {
            const pageSize = limit ?? get().pageSize;

            set((state) => {
              state.isFetching = true;
              state.error = null;
            });

            try {
              const projectList = await projectRepository.findAllPaged({
                offset,
                limit: pageSize,
              });

              set((state) => {
                state.projectList = projectList;
                state.projects = projectList.projects;
                state.totalProjects = projectList.totalCount;
                state.currentPage = projectList.currentPage;
                state.isFetching = false;
              });

              get().emitEvent('projects-loaded', {
                count: projectList.projects.length,
                hasMore: projectList.hasMore,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch projects';
              set((state) => {
                state.error = errorMessage;
                state.isFetching = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchProjectsPaged',
              });
            }
          },

          fetchProject: async (id: string) => {
            try {
              const project = await projectRepository.findById(id);
              if (project) {
                // Update project in current list if it exists
                set((state) => {
                  const index = state.projects.findIndex(p => p.id.value === id);
                  if (index !== -1) {
                    state.projects[index] = project;
                  }
                });
              }
              return project;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : `Failed to fetch project ${id}`;
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchProject',
              });
              return null;
            }
          },

          fetchProjectByName: async (name: string) => {
            try {
              return await projectRepository.findByName(name);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : `Failed to fetch project ${name}`;
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchProjectByName',
              });
              return null;
            }
          },

          fetchRecentProjects: async (limit = 10) => {
            try {
              const recentProjects = await projectRepository.getRecent(limit);
              set((state) => {
                state.recentProjects = recentProjects;
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch recent projects';
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchRecentProjects',
              });
            }
          },

          fetchStats: async () => {
            try {
              const stats = await projectRepository.getStats();
              set((state) => {
                state.stats = stats;
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'fetchStats',
              });
            }
          },

          // ====================
          // CRUD Actions
          // ====================

          createProject: async (params: CreateProjectParams) => {
            set((state) => {
              state.isCreating = true;
              state.error = null;
              state.validationErrors = {};
            });

            try {
              const project = await projectRepository.create(params);

              set((state) => {
                state.projects.unshift(project); // Add to beginning
                state.totalProjects += 1;
                state.isCreating = false;
                state.showCreateDialog = false;
              });

              get().emitEvent('project-created', { project });
              return project;
            } catch (error) {
              // Enhanced error handling with more specific messages
              let errorMessage = 'Failed to create project';

              if (error instanceof Error) {
                // Handle Tauri command errors that come back as JSON
                try {
                  const parsed = JSON.parse(error.message);
                  if (parsed.message) {
                    errorMessage = parsed.message;
                  }
                } catch {
                  // Not JSON, use the error message directly
                  errorMessage = error.message;
                }

                // Provide more user-friendly messages based on error content
                if (errorMessage.includes('UNIQUE constraint failed') || errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
                  errorMessage = 'A project with this name already exists. Please choose a different name.';
                } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
                  errorMessage = 'Permission denied. Please check that you have access to the selected folder.';
                } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
                  errorMessage = 'The selected folder does not exist. Please choose an existing folder.';
                } else if (errorMessage.includes('database') || errorMessage.includes('connection')) {
                  errorMessage = 'Database error occurred. Please try again or contact support if the issue persists.';
                } else if (errorMessage.includes('Invalid folder path') || errorMessage.includes('path')) {
                  errorMessage = 'Invalid folder path. Please select a valid folder location.';
                } else if (errorMessage.includes('Invalid project name') || errorMessage.includes('name')) {
                  errorMessage = 'Invalid project name. Please ensure the name is between 1-255 characters.';
                } else if (errorMessage.includes('timeout')) {
                  errorMessage = 'Operation timed out. Please try again.';
                } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                  errorMessage = 'Network error occurred. Please check your connection and try again.';
                }
              }

              console.error('Project creation error details:', error);

              set((state) => {
                state.error = errorMessage;
                state.isCreating = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'createProject',
              });

              // Re-throw with the improved error message so the form can display it
              throw new Error(errorMessage);
            }
          },

          updateProject: async (id: string, params: UpdateProjectParams) => {
            set((state) => {
              state.isUpdating = true;
              state.error = null;
              state.validationErrors = {};
            });

            try {
              const currentProject = await get().fetchProject(id);
              if (!currentProject) {
                throw new ProjectStoreError(`Project ${id} not found`, 'updateProject');
              }

              // Apply updates to the domain object
              const updatedProject = currentProject.clone(params);
              const result = await projectRepository.update(updatedProject);

              set((state) => {
                // Update in projects list
                const index = state.projects.findIndex(p => p.id.value === id);
                if (index !== -1) {
                  state.projects[index] = result;
                }

                // Update current project if it's the one being updated
                if (state.currentProject?.id.value === id) {
                  state.currentProject = result;
                }

                state.isUpdating = false;
                state.showUpdateDialog = false;
                state.projectToUpdate = null;
              });

              get().emitEvent('project-updated', {
                project: result,
                previousData: currentProject,
              });
              return result;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to update project';
              set((state) => {
                state.error = errorMessage;
                state.isUpdating = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'updateProject',
              });
              return null;
            }
          },

          deleteProject: async (id: string, confirm = false) => {
            set((state) => {
              state.isDeleting = true;
              state.error = null;
            });

            try {
              await projectRepository.delete(id, confirm);

              set((state) => {
                state.projects = state.projects.filter(p => p.id.value !== id);
                state.totalProjects = Math.max(0, state.totalProjects - 1);
                state.selectedProjectIds.delete(id);

                if (state.currentProject?.id.value === id) {
                  state.currentProject = null;
                }

                state.isDeleting = false;
                state.showDeleteDialog = false;
                state.projectToDelete = null;
              });

              get().emitEvent('project-deleted', { projectId: id });
              return true;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete project';
              set((state) => {
                state.error = errorMessage;
                state.isDeleting = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'deleteProject',
              });
              return false;
            }
          },

          deleteBulkProjects: async (ids: string[], confirm = false) => {
            set((state) => {
              state.isDeleting = true;
              state.error = null;
            });

            try {
              await projectRepository.deleteBulk(ids, confirm);

              set((state) => {
                state.projects = state.projects.filter(p => !ids.includes(p.id.value));
                state.totalProjects = Math.max(0, state.totalProjects - ids.length);

                // Clear selections for deleted projects
                ids.forEach(id => state.selectedProjectIds.delete(id));

                // Clear current project if it was deleted
                if (state.currentProject && ids.includes(state.currentProject.id.value)) {
                  state.currentProject = null;
                }

                state.isDeleting = false;
              });

              ids.forEach(id => {
                get().emitEvent('project-deleted', { projectId: id });
              });
              return true;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete projects';
              set((state) => {
                state.error = errorMessage;
                state.isDeleting = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'deleteBulkProjects',
              });
              return false;
            }
          },

          // ====================
          // Search and Filter Actions
          // ====================

          searchProjects: async (query: string, offset = 0, limit?: number) => {
            const pageSize = limit ?? get().pageSize;

            set((state) => {
              state.isFetching = true;
              state.error = null;
              state.searchQuery = query;
            });

            try {
              const projectList = await projectRepository.search(query, {
                offset,
                limit: pageSize,
              });

              set((state) => {
                state.projectList = projectList;
                state.projects = projectList.projects;
                state.totalProjects = projectList.totalCount;
                state.currentPage = projectList.currentPage;
                state.isFetching = false;
              });

              get().emitEvent('search-updated', {
                query,
                resultCount: projectList.totalCount,
              });
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to search projects';
              set((state) => {
                state.error = errorMessage;
                state.isFetching = false;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'searchProjects',
              });
            }
          },

          setSearchQuery: (query: string) => {
            set((state) => {
              state.searchQuery = query;
            });

            // Auto-search after delay would be implemented here
            // For now, just trigger immediate search if query is not empty
            if (query.trim()) {
              get().searchProjects(query);
            } else {
              get().clearSearch();
            }
          },

          setSortBy: (field: ProjectSortField, order?: SortOrder) => {
            set((state) => {
              state.sortBy = field;
              if (order) {
                state.sortOrder = order;
              } else {
                // Toggle order if same field
                state.sortOrder = state.sortBy === field && state.sortOrder === 'asc' ? 'desc' : 'asc';
              }
            });

            // Re-fetch with new sorting
            get().refreshProjects();
          },

          setFilter: (filter: ProjectFilter) => {
            set((state) => {
              state.filterBy = { ...filter };
            });

            get().emitEvent('filter-updated', { filter });
            get().refreshProjects();
          },

          clearSearch: () => {
            set((state) => {
              state.searchQuery = '';
            });
            get().fetchProjectsPaged(0);
          },

          // ====================
          // Selection Actions
          // ====================

          selectProject: (id: string) => {
            set((state) => {
              state.selectedProjectIds.clear();
              state.selectedProjectIds.add(id);
            });

            const project = get().projects.find(p => p.id.value === id) || null;
            get().emitEvent('project-selected', { project });
          },

          selectMultipleProjects: (ids: string[]) => {
            set((state) => {
              state.selectedProjectIds.clear();
              ids.forEach(id => state.selectedProjectIds.add(id));
            });
          },

          toggleProjectSelection: (id: string) => {
            set((state) => {
              if (state.selectedProjectIds.has(id)) {
                state.selectedProjectIds.delete(id);
              } else {
                state.selectedProjectIds.add(id);
              }
            });
          },

          clearSelection: () => {
            set((state) => {
              state.selectedProjectIds.clear();
            });
          },

          selectAll: () => {
            const allIds = get().projects.map(p => p.id.value);
            get().selectMultipleProjects(allIds);
          },

          // ====================
          // Navigation Actions
          // ====================

          openProject: async (id: string) => {
            try {
              const project = await projectRepository.openProject(id);
              set((state) => {
                state.currentProject = project;
              });

              get().emitEvent('project-selected', { project });
              return project;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to open project';
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'openProject',
              });
              return null;
            }
          },

          setCurrentProject: (project: Project | null) => {
            set((state) => {
              state.currentProject = project;
            });

            get().emitEvent('project-selected', { project });
          },

          openProjectFolder: async (id: string) => {
            try {
              await projectRepository.openProjectFolder(id);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to open project folder';
              set((state) => {
                state.error = errorMessage;
              });

              get().emitEvent('error-occurred', {
                error: errorMessage,
                context: 'openProjectFolder',
              });
            }
          },

          // ====================
          // Dialog Actions
          // ====================

          showCreateProjectDialog: () => {
            set((state) => {
              state.showCreateDialog = true;
              state.error = null;
              state.validationErrors = {};
            });
          },

          hideCreateProjectDialog: () => {
            set((state) => {
              state.showCreateDialog = false;
              state.error = null;
              state.validationErrors = {};
            });
          },

          showDeleteProjectDialog: (projectId: string) => {
            set((state) => {
              state.showDeleteDialog = true;
              state.projectToDelete = projectId;
              state.error = null;
            });
          },

          hideDeleteProjectDialog: () => {
            set((state) => {
              state.showDeleteDialog = false;
              state.projectToDelete = null;
              state.error = null;
            });
          },

          showUpdateProjectDialog: (projectId: string) => {
            set((state) => {
              state.showUpdateDialog = true;
              state.projectToUpdate = projectId;
              state.error = null;
              state.validationErrors = {};
            });
          },

          hideUpdateProjectDialog: () => {
            set((state) => {
              state.showUpdateDialog = false;
              state.projectToUpdate = null;
              state.error = null;
              state.validationErrors = {};
            });
          },

          // ====================
          // Pagination Actions
          // ====================

          nextPage: async () => {
            const state = get();
            if (state.projectList?.hasMore) {
              const nextOffset = state.currentPage * state.pageSize;
              await get().fetchProjectsPaged(nextOffset);
            }
          },

          previousPage: async () => {
            const state = get();
            if (state.currentPage > 1) {
              const prevOffset = (state.currentPage - 2) * state.pageSize;
              await get().fetchProjectsPaged(prevOffset);
            }
          },

          goToPage: async (page: number) => {
            const state = get();
            const maxPage = Math.ceil(state.totalProjects / state.pageSize);
            const targetPage = Math.max(1, Math.min(page, maxPage));
            const offset = (targetPage - 1) * state.pageSize;
            await get().fetchProjectsPaged(offset);
          },

          setPageSize: (size: number) => {
            set((state) => {
              state.pageSize = size;
              state.currentPage = 1; // Reset to first page
            });
            get().fetchProjectsPaged(0, size);
          },

          // ====================
          // Utility Actions
          // ====================

          refreshProjects: async () => {
            const state = get();
            if (state.searchQuery.trim()) {
              await get().searchProjects(state.searchQuery, 0);
            } else {
              await get().fetchProjectsPaged(0);
            }
          },

          resetStore: () => {
            set(() => ({ ...initialState }));
          },

          clearError: () => {
            set((state) => {
              state.error = null;
              state.validationErrors = {};
            });
          },

          isNameAvailable: async (name: string) => {
            try {
              return await projectRepository.isNameAvailable(name);
            } catch (error) {
              // On error, we should throw the error rather than assume name is unavailable
              throw error;
            }
          },

          validateProjectAccess: async (id: string) => {
            try {
              return await projectRepository.validateAccess(id);
            } catch (error) {
              return {
                valid: false,
                errors: [error instanceof Error ? error.message : 'Validation failed'],
              };
            }
          },

          // ====================
          // Event System
          // ====================

          emitEvent: <T extends ProjectStoreEvent>(
            event: T,
            payload: ProjectStoreEventPayload[T]
          ) => {
            // This would be used by external event listeners
            // Implementation depends on specific event system needs
            console.debug(`Project Store Event: ${event}`, payload);
          },

        })),
      ),
      {
        name: DEFAULT_PERSISTENCE_CONFIG.name,
        version: DEFAULT_PERSISTENCE_CONFIG.version,
        partialize: DEFAULT_PERSISTENCE_CONFIG.partialize,
      }
    ),
    {
      name: 'project-store',
    }
  )
);

// ====================
// Store Hooks and Selectors
// ====================

/**
 * Hook for accessing project list state
 */
export const useProjectList = () => {
  return useProjectStore((state) => ({
    projects: state.projects,
    isLoading: state.isFetching,
    error: state.error,
    totalProjects: state.totalProjects,
    currentPage: state.currentPage,
    hasMore: state.projectList?.hasMore ?? false,
  }));
};

/**
 * Hook for accessing current project state
 */
export const useCurrentProject = () => {
  return useProjectStore((state) => ({
    currentProject: state.currentProject,
    isLoading: state.isLoading,
    error: state.error,
  }));
};

/**
 * Hook for accessing project actions
 */
export const useProjectActions = () => {
  return useProjectStore((state) => ({
    fetchProjects: state.fetchProjects,
    fetchProjectsPaged: state.fetchProjectsPaged,
    createProject: state.createProject,
    updateProject: state.updateProject,
    deleteProject: state.deleteProject,
    openProject: state.openProject,
    searchProjects: state.searchProjects,
    setSearchQuery: state.setSearchQuery,
    refreshProjects: state.refreshProjects,
    clearError: state.clearError,
  }));
};

/**
 * Hook for accessing dialog states and actions
 */
export const useProjectDialogs = () => {
  return useProjectStore((state) => ({
    showCreateDialog: state.showCreateDialog,
    showDeleteDialog: state.showDeleteDialog,
    showUpdateDialog: state.showUpdateDialog,
    projectToDelete: state.projectToDelete,
    projectToUpdate: state.projectToUpdate,
    showCreateProjectDialog: state.showCreateProjectDialog,
    hideCreateProjectDialog: state.hideCreateProjectDialog,
    showDeleteProjectDialog: state.showDeleteProjectDialog,
    hideDeleteProjectDialog: state.hideDeleteProjectDialog,
    showUpdateProjectDialog: state.showUpdateProjectDialog,
    hideUpdateProjectDialog: state.hideUpdateProjectDialog,
  }));
};

/**
 * Hook for accessing selection state
 */
export const useProjectSelection = () => {
  return useProjectStore((state) => ({
    selectedProjectIds: Array.from(state.selectedProjectIds),
    selectedCount: state.selectedProjectIds.size,
    selectProject: state.selectProject,
    toggleProjectSelection: state.toggleProjectSelection,
    clearSelection: state.clearSelection,
    selectAll: state.selectAll,
  }));
};

// Export store for direct access
export default useProjectStore;