import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

// Backend DTO shapes duplicated locally to decouple from domain layer
interface ProjectDto {
  id: string;
  name: string;
  source_folder: string;
  source_folder_name?: string;
  note?: string;
  note_preview?: string;
  note_line_count?: number;
  created_at: string;
  is_accessible: boolean;
}

interface ProjectListDto {
  projects: ProjectDto[];
  total_count: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

interface RepositoryStatsDto {
  total_projects: number;
  accessible_projects: number;
  inaccessible_projects: number;
  accessibility_percentage: number;
  projects_with_notes: number;
  notes_percentage: number;
  average_name_length: number;
  oldest_project_date?: string;
  newest_project_date?: string;
  database_size_bytes?: number;
}

interface CreateProjectRequest {
  name: string;
  source_folder: string;
  note?: string;
}

interface DeleteProjectRequest {
  id: string;
  confirm?: boolean;
}

interface BulkDeleteProjectsRequest {
  ids: string[];
  confirm?: boolean;
}

interface ProjectListItem {
  id: string;
  name: string;
  sourceFolder: string;
  sourceFolderName: string;
  note?: string;
  notePreview?: string;
  noteLineCount?: number;
  createdAt: string;
  isAccessible: boolean;
}

interface ProjectRepositoryStats {
  totalProjects: number;
  accessibleProjects: number;
  inaccessibleProjects: number;
  accessibilityPercentage: number;
  projectsWithNotes: number;
  notesPercentage: number;
  averageNameLength: number;
  oldestProjectDate?: string;
  newestProjectDate?: string;
  databaseSizeBytes?: number;
}

interface ProjectManagementState {
  projects: ProjectListItem[];
  totalProjects: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  error: string | null;
  searchQuery: string;
  selectedProjectIds: string[];
  showCreateDialog: boolean;
  showDeleteDialog: boolean;
  projectToDelete: string | null;
  projectToUpdate: string | null;
  currentProject: ProjectListItem | null;
  stats: ProjectRepositoryStats | null;

  fetchProjectsPaged: (offset?: number, limit?: number) => Promise<void>;
  refreshProjects: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  createProject: (request: CreateProjectRequest) => Promise<ProjectListItem | null>;
  deleteProject: (id: string) => Promise<void>;
  deleteBulkProjects: (ids: string[]) => Promise<void>;
  openProject: (id: string) => Promise<ProjectListItem | null>;
  openProjectFolder: (id: string) => Promise<void>;
  isNameAvailable: (name: string) => Promise<boolean>;
  clearError: () => void;

  selectProject: (id: string) => void;
  toggleProjectSelection: (id: string) => void;
  selectMultipleProjects: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;

  showCreateProjectDialog: () => void;
  hideCreateProjectDialog: () => void;
  showDeleteProjectDialog: (projectId: string) => void;
  hideDeleteProjectDialog: () => void;
  showUpdateProjectDialog: (projectId: string) => void;
  hideUpdateProjectDialog: () => void;

  fetchStats: () => Promise<void>;
}

const PAGE_SIZE_DEFAULT = 50;

const mapProjectDto = (dto: ProjectDto): ProjectListItem => ({
  id: dto.id,
  name: dto.name,
  sourceFolder: dto.source_folder,
  sourceFolderName: dto.source_folder_name || dto.source_folder.split('/').filter(Boolean).pop() || dto.name,
  note: dto.note,
  notePreview: dto.note_preview || (dto.note ? dto.note.slice(0, 100) : undefined),
  noteLineCount: dto.note_line_count,
  createdAt: dto.created_at,
  isAccessible: dto.is_accessible,
});

const mapStatsDto = (dto: RepositoryStatsDto): ProjectRepositoryStats => ({
  totalProjects: dto.total_projects,
  accessibleProjects: dto.accessible_projects,
  inaccessibleProjects: dto.inaccessible_projects,
  accessibilityPercentage: dto.accessibility_percentage,
  projectsWithNotes: dto.projects_with_notes,
  notesPercentage: dto.notes_percentage,
  averageNameLength: dto.average_name_length,
  oldestProjectDate: dto.oldest_project_date,
  newestProjectDate: dto.newest_project_date,
  databaseSizeBytes: dto.database_size_bytes,
});

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (!error) {
    return fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (maybeMessage && typeof maybeMessage === 'string') {
      return maybeMessage;
    }
  }
  return fallback;
};

const fetchProjectList = async (query: string, offset: number, limit: number): Promise<ProjectListDto> => {
  if (query.trim().length > 0) {
    return await invoke<ProjectListDto>('search_projects', { query, offset, limit });
  }
  return await invoke<ProjectListDto>('list_projects_paged', { offset, limit });
};

export const useProjectManagementStore = create<ProjectManagementState>()(
  subscribeWithSelector((set, get) => ({
    projects: [],
    totalProjects: 0,
    currentPage: 1,
    pageSize: PAGE_SIZE_DEFAULT,
    hasMore: false,
    isLoading: false,
    isCreating: false,
    isDeleting: false,
    error: null,
    searchQuery: '',
    selectedProjectIds: [],
    showCreateDialog: false,
    showDeleteDialog: false,
    projectToDelete: null,
    projectToUpdate: null,
    currentProject: null,
    stats: null,

    fetchProjectsPaged: async (offset = 0, limit) => {
      const state = get();
      const pageSize = limit ?? state.pageSize ?? PAGE_SIZE_DEFAULT;
      set({ isLoading: true, error: null });

      try {
        const dto = await fetchProjectList(state.searchQuery, offset, pageSize);
        const projects = dto.projects.map(mapProjectDto);
        set({
          projects,
          totalProjects: dto.total_count,
          hasMore: dto.has_more,
          currentPage: Math.floor(offset / Math.max(pageSize, 1)) + 1,
          pageSize,
          isLoading: false,
        });
      } catch (error) {
        set({
          isLoading: false,
          error: extractErrorMessage(error, 'Failed to load projects'),
        });
      }
    },

    refreshProjects: async () => {
      const state = get();
      await get().fetchProjectsPaged((state.currentPage - 1) * state.pageSize, state.pageSize);
    },

    setSearchQuery: async (query: string) => {
      set({ searchQuery: query });
      await get().fetchProjectsPaged(0, get().pageSize);
    },

    createProject: async (request) => {
      set({ isCreating: true, error: null });

      try {
        const dto = await invoke<ProjectDto>('create_project', { request });
        const project = mapProjectDto(dto);
        await get().fetchProjectsPaged(0, get().pageSize);
        set({ isCreating: false, showCreateDialog: false });
        return project;
      } catch (error) {
        set({
          isCreating: false,
          error: extractErrorMessage(error, 'Failed to create project'),
        });
        return null;
      }
    },

    deleteProject: async (id: string) => {
      set({ isDeleting: true, error: null });

      try {
        const request: DeleteProjectRequest = { id };
        await invoke<void>('delete_project', { request });
        await get().fetchProjectsPaged((get().currentPage - 1) * get().pageSize, get().pageSize);
        set({ isDeleting: false, showDeleteDialog: false, projectToDelete: null });
      } catch (error) {
        set({
          isDeleting: false,
          error: extractErrorMessage(error, 'Failed to delete project'),
        });
      }
    },

    deleteBulkProjects: async (ids: string[]) => {
      if (ids.length === 0) {
        return;
      }

      set({ isDeleting: true, error: null });

      try {
        const request: BulkDeleteProjectsRequest = { ids };
        await invoke<void>('delete_projects_bulk', { request });
        await get().fetchProjectsPaged((get().currentPage - 1) * get().pageSize, get().pageSize);
        set({
          isDeleting: false,
          showDeleteDialog: false,
          projectToDelete: null,
          selectedProjectIds: [],
        });
      } catch (error) {
        set({
          isDeleting: false,
          error: extractErrorMessage(error, 'Failed to delete selected projects'),
        });
      }
    },

    openProject: async (id: string) => {
      try {
        const dto = await invoke<ProjectDto>('open_project', { id });
        const project = mapProjectDto(dto);
        set({ currentProject: project });
        return project;
      } catch (error) {
        set({ error: extractErrorMessage(error, 'Failed to open project') });
        return null;
      }
    },

    openProjectFolder: async (id: string) => {
      try {
        await invoke<void>('open_project_folder', { id });
      } catch (error) {
        set({ error: extractErrorMessage(error, 'Failed to open project folder') });
      }
    },

    isNameAvailable: async (name: string) => {
      try {
        return await invoke<boolean>('check_project_name_availability', { name });
      } catch (error) {
        set({ error: extractErrorMessage(error, 'Failed to check project name availability') });
        return true;
      }
    },

    clearError: () => {
      set({ error: null });
    },

    selectProject: (id: string) => {
      set({ selectedProjectIds: [id] });
    },

    toggleProjectSelection: (id: string) => {
      set((state) => {
        const isSelected = state.selectedProjectIds.includes(id);
        const selectedProjectIds = isSelected
          ? state.selectedProjectIds.filter(existingId => existingId !== id)
          : [...state.selectedProjectIds, id];
        return { selectedProjectIds };
      });
    },

    selectMultipleProjects: (ids: string[]) => {
      set({ selectedProjectIds: Array.from(new Set([...get().selectedProjectIds, ...ids])) });
    },

    selectAll: () => {
      set((state) => ({ selectedProjectIds: state.projects.map(project => project.id) }));
    },

    clearSelection: () => {
      set({ selectedProjectIds: [] });
    },

    showCreateProjectDialog: () => {
      set({ showCreateDialog: true, error: null });
    },

    hideCreateProjectDialog: () => {
      set({ showCreateDialog: false });
    },

    showDeleteProjectDialog: (projectId: string) => {
      set({ showDeleteDialog: true, projectToDelete: projectId, error: null });
    },

    hideDeleteProjectDialog: () => {
      set({ showDeleteDialog: false, projectToDelete: null });
    },

    showUpdateProjectDialog: (projectId: string) => {
      set({ projectToUpdate: projectId });
    },

    hideUpdateProjectDialog: () => {
      set({ projectToUpdate: null });
    },

    fetchStats: async () => {
      try {
        const statsDto = await invoke<RepositoryStatsDto>('get_repository_stats');
        set({ stats: mapStatsDto(statsDto) });
      } catch (error) {
        set({ error: extractErrorMessage(error, 'Failed to load repository stats') });
      }
    },
  }))
);

export type { ProjectListItem, ProjectRepositoryStats };

export const useProjectStore = useProjectManagementStore;

export const useProjectList = () =>
  useProjectManagementStore((state) => ({
    projects: state.projects,
    totalProjects: state.totalProjects,
    currentPage: state.currentPage,
    pageSize: state.pageSize,
    hasMore: state.hasMore,
    isLoading: state.isLoading,
    error: state.error,
  }));

export const useProjectActions = () =>
  useProjectManagementStore((state) => ({
    fetchProjectsPaged: state.fetchProjectsPaged,
    refreshProjects: state.refreshProjects,
    setSearchQuery: state.setSearchQuery,
    createProject: state.createProject,
    deleteProject: state.deleteProject,
    deleteBulkProjects: state.deleteBulkProjects,
    openProject: state.openProject,
    openProjectFolder: state.openProjectFolder,
    isNameAvailable: state.isNameAvailable,
    clearError: state.clearError,
  }));

export const useProjectDialogs = () =>
  useProjectManagementStore((state) => ({
    showCreateDialog: state.showCreateDialog,
    showDeleteDialog: state.showDeleteDialog,
    projectToDelete: state.projectToDelete,
    projectToUpdate: state.projectToUpdate,
    showCreateProjectDialog: state.showCreateProjectDialog,
    hideCreateProjectDialog: state.hideCreateProjectDialog,
    showDeleteProjectDialog: state.showDeleteProjectDialog,
    hideDeleteProjectDialog: state.hideDeleteProjectDialog,
    showUpdateProjectDialog: state.showUpdateProjectDialog,
    hideUpdateProjectDialog: state.hideUpdateProjectDialog,
  }));

export const useProjectSelection = () =>
  useProjectManagementStore((state) => ({
    selectedProjectIds: state.selectedProjectIds,
    selectedCount: state.selectedProjectIds.length,
    selectProject: state.selectProject,
    toggleProjectSelection: state.toggleProjectSelection,
    selectMultipleProjects: state.selectMultipleProjects,
    selectAll: state.selectAll,
    clearSelection: state.clearSelection,
  }));

export const useProjectStats = () =>
  useProjectManagementStore((state) => ({
    stats: state.stats,
    fetchStats: state.fetchStats,
  }));
