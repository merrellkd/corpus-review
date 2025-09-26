import { invoke } from '@tauri-apps/api/core';

export interface ProjectDto {
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

export interface ProjectListDto {
  projects: ProjectDto[];
  total_count: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface RepositoryStatsDto {
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

export interface CreateProjectRequest {
  name: string;
  source_folder: string;
  note?: string;
}

export interface DeleteProjectRequest {
  id: string;
  confirm?: boolean;
}

export interface BulkDeleteProjectsRequest {
  ids: string[];
  confirm?: boolean;
}

const listPaged = async (offset: number, limit: number): Promise<ProjectListDto> => {
  return invoke<ProjectListDto>('list_projects_paged', { offset, limit });
};

const search = async (query: string, offset: number, limit: number): Promise<ProjectListDto> => {
  return invoke<ProjectListDto>('search_projects', { query, offset, limit });
};

const create = async (request: CreateProjectRequest): Promise<ProjectDto> => {
  return invoke<ProjectDto>('create_project', { request });
};

const remove = async (request: DeleteProjectRequest): Promise<void> => {
  await invoke<void>('delete_project', { request });
};

const removeBulk = async (request: BulkDeleteProjectsRequest): Promise<void> => {
  await invoke<void>('delete_projects_bulk', { request });
};

const open = async (id: string): Promise<ProjectDto> => {
  return invoke<ProjectDto>('open_project', { id });
};

const openFolder = async (id: string): Promise<void> => {
  await invoke<void>('open_project_folder', { id });
};

const isNameAvailable = async (name: string): Promise<boolean> => {
  return invoke<boolean>('check_project_name_availability', { name });
};

const getStats = async (): Promise<RepositoryStatsDto> => {
  return invoke<RepositoryStatsDto>('get_repository_stats');
};

export const projectApi = {
  listPaged,
  search,
  create,
  remove,
  removeBulk,
  open,
  openFolder,
  isNameAvailable,
  getStats,
};

export type ProjectApi = typeof projectApi;
