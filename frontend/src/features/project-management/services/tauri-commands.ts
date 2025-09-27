/**
 * Tauri command wrappers for Project domain
 *
 * This module provides strongly-typed wrappers around Tauri invoke calls
 * for all project-related backend commands. Each wrapper handles error
 * conversion and type safety.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  ProjectDto,
  ProjectListDto,
  RepositoryStatsDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  DeleteProjectRequest,
  ListProjectsParams,
  SearchProjectsParams,
  FindProjectsByDateRangeParams,
  BulkDeleteProjectsRequest,
  ProjectCreationStatsDto,
  ProjectOpeningStatsDto,
  ProjectValidationResult,
  TauriError,
} from './dtos';

// ====================
// Error Handling
// ====================

class ProjectCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ProjectCommandError';
  }
}

const handleTauriError = (command: string) => (error: unknown): never => {
  let message = 'Unknown error occurred';

  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    // Try to extract message from various error formats
    const errorObj = error as any;
    if (errorObj.message && typeof errorObj.message === 'string') {
      message = errorObj.message;
    } else if (errorObj.error && typeof errorObj.error === 'string') {
      message = errorObj.error;
    } else if (errorObj.toString && typeof errorObj.toString === 'function') {
      const stringified = errorObj.toString();
      if (stringified !== '[object Object]') {
        message = stringified;
      }
    }
  }

  console.error(`Tauri command '${command}' failed:`, error);
  throw new ProjectCommandError(message, command, error);
};

// ====================
// Create Project Commands
// ====================

/**
 * Create a new project
 */
export const createProject = async (request: CreateProjectRequest): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('create_project', { request });
  } catch (error) {
    throw handleTauriError('create_project')(error);
  }
};

/**
 * Validate project creation request without creating
 */
export const validateCreateProjectRequest = async (
  request: CreateProjectRequest
): Promise<ProjectValidationResult> => {
  try {
    return await invoke<ProjectValidationResult>('validate_create_project_request', { request });
  } catch (error) {
    throw handleTauriError('validate_create_project_request')(error);
  }
};

/**
 * Check if a project name is available
 */
export const checkProjectNameAvailability = async (name: string): Promise<boolean> => {
  try {
    return await invoke<boolean>('check_project_name_availability', { name });
  } catch (error) {
    throw handleTauriError('check_project_name_availability')(error);
  }
};

/**
 * Get project creation statistics
 */
export const getProjectCreationStats = async (): Promise<ProjectCreationStatsDto> => {
  try {
    return await invoke<ProjectCreationStatsDto>('get_project_creation_stats');
  } catch (error) {
    throw handleTauriError('get_project_creation_stats')(error);
  }
};

// ====================
// List/Search Project Commands
// ====================

/**
 * List all projects with optional pagination
 */
export const listProjects = async (params?: ListProjectsParams): Promise<ProjectDto[]> => {
  try {
    return await invoke<ProjectDto[]>('list_projects', params ? { ...params } : {});
  } catch (error) {
    throw handleTauriError('list_projects')(error);
  }
};

/**
 * List projects with pagination information
 */
export const listProjectsPaged = async (params?: ListProjectsParams): Promise<ProjectListDto> => {
  try {
    const offset = params?.offset ?? 0;
    const limit = params?.limit ?? 50;
    return await invoke<ProjectListDto>('list_projects_paged', { offset, limit });
  } catch (error) {
    throw handleTauriError('list_projects_paged')(error);
  }
};

/**
 * Search projects by query string
 */
export const searchProjects = async (params: SearchProjectsParams): Promise<ProjectListDto> => {
  try {
    const { query, offset = 0, limit = 50 } = params;
    return await invoke<ProjectListDto>('search_projects', { query, offset, limit });
  } catch (error) {
    throw handleTauriError('search_projects')(error);
  }
};

/**
 * Get a single project by ID
 */
export const getProject = async (id: string): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('get_project', { id });
  } catch (error) {
    throw handleTauriError('get_project')(error);
  }
};

/**
 * Get a single project by name
 */
export const getProjectByName = async (name: string): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('get_project_by_name', { name });
  } catch (error) {
    throw handleTauriError('get_project_by_name')(error);
  }
};

/**
 * Get repository statistics
 */
export const getRepositoryStats = async (): Promise<RepositoryStatsDto> => {
  try {
    return await invoke<RepositoryStatsDto>('get_repository_stats');
  } catch (error) {
    throw handleTauriError('get_repository_stats')(error);
  }
};

/**
 * Get list of inaccessible projects
 */
export const getInaccessibleProjects = async (): Promise<ProjectDto[]> => {
  try {
    return await invoke<ProjectDto[]>('get_inaccessible_projects');
  } catch (error) {
    throw handleTauriError('get_inaccessible_projects')(error);
  }
};

/**
 * Find projects by date range
 */
export const findProjectsByDateRange = async (
  params: FindProjectsByDateRangeParams
): Promise<ProjectListDto> => {
  try {
    const { start_date, end_date, offset = 0, limit = 50 } = params;
    return await invoke<ProjectListDto>('find_projects_by_date_range', {
      startDate: start_date,
      endDate: end_date,
      offset,
      limit,
    });
  } catch (error) {
    throw handleTauriError('find_projects_by_date_range')(error);
  }
};

// ====================
// Delete Project Commands
// ====================

/**
 * Delete a single project
 */
export const deleteProject = async (request: DeleteProjectRequest): Promise<void> => {
  try {
    await invoke<void>('delete_project', { request });
  } catch (error) {
    throw handleTauriError('delete_project')(error);
  }
};

/**
 * Validate project deletion request
 */
export const validateDeleteProjectRequest = async (
  request: DeleteProjectRequest
): Promise<ProjectValidationResult> => {
  try {
    return await invoke<ProjectValidationResult>('validate_delete_project_request', { request });
  } catch (error) {
    throw handleTauriError('validate_delete_project_request')(error);
  }
};

/**
 * Get project information for deletion confirmation
 */
export const getProjectForDeletion = async (id: string): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('get_project_for_deletion', { id });
  } catch (error) {
    throw handleTauriError('get_project_for_deletion')(error);
  }
};

/**
 * Delete multiple projects in bulk
 */
export const deleteProjectsBulk = async (request: BulkDeleteProjectsRequest): Promise<void> => {
  try {
    await invoke<void>('delete_projects_bulk', { request });
  } catch (error) {
    throw handleTauriError('delete_projects_bulk')(error);
  }
};

/**
 * Check if deletion is safe (no dependencies, etc.)
 */
export const checkDeletionSafety = async (id: string): Promise<boolean> => {
  try {
    return await invoke<boolean>('check_deletion_safety', { id });
  } catch (error) {
    throw handleTauriError('check_deletion_safety')(error);
  }
};

// ====================
// Open Project Commands
// ====================

/**
 * Open a project (sets it as active/current)
 */
export const openProject = async (id: string): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('open_project', { id });
  } catch (error) {
    throw handleTauriError('open_project')(error);
  }
};

/**
 * Open a project by name
 */
export const openProjectByName = async (name: string): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('open_project_by_name', { name });
  } catch (error) {
    throw handleTauriError('open_project_by_name')(error);
  }
};

/**
 * Validate project access before opening
 */
export const validateProjectAccess = async (id: string): Promise<ProjectValidationResult> => {
  try {
    return await invoke<ProjectValidationResult>('validate_project_access', { id });
  } catch (error) {
    throw handleTauriError('validate_project_access')(error);
  }
};

/**
 * Get list of recently opened projects
 */
export const getRecentProjects = async (limit?: number): Promise<ProjectDto[]> => {
  try {
    return await invoke<ProjectDto[]>('get_recent_projects', { limit: limit ?? 10 });
  } catch (error) {
    throw handleTauriError('get_recent_projects')(error);
  }
};

/**
 * Open project folder in system file explorer
 */
export const openProjectFolder = async (id: string): Promise<void> => {
  try {
    await invoke<void>('open_project_folder', { id });
  } catch (error) {
    throw handleTauriError('open_project_folder')(error);
  }
};

/**
 * Get project opening statistics
 */
export const getProjectOpeningStats = async (): Promise<ProjectOpeningStatsDto> => {
  try {
    return await invoke<ProjectOpeningStatsDto>('get_project_opening_stats');
  } catch (error) {
    throw handleTauriError('get_project_opening_stats')(error);
  }
};

// ====================
// Update Project Commands (if supported by backend)
// ====================

/**
 * Update an existing project
 * Note: This command may not be implemented in the current backend
 */
export const updateProject = async (request: UpdateProjectRequest): Promise<ProjectDto> => {
  try {
    return await invoke<ProjectDto>('update_project', { request });
  } catch (error) {
    throw handleTauriError('update_project')(error);
  }
};

// ====================
// Helper Functions
// ====================

/**
 * Check if an error is a ProjectCommandError
 */
export const isProjectCommandError = (error: unknown): error is ProjectCommandError => {
  return error instanceof ProjectCommandError;
};

/**
 * Extract error message from various error types
 */
export const extractErrorMessage = (error: unknown): string => {
  if (isProjectCommandError(error)) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorObj = error as any;
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message;
    } else if (errorObj.error && typeof errorObj.error === 'string') {
      return errorObj.error;
    } else if (errorObj.toString && typeof errorObj.toString === 'function') {
      const stringified = errorObj.toString();
      if (stringified !== '[object Object]') {
        return stringified;
      }
    }
  }

  return 'An unknown error occurred';
};

/**
 * Create a standardized error response
 */
export const createErrorResponse = (command: string, error: unknown): TauriError => ({
  message: extractErrorMessage(error),
  code: isProjectCommandError(error) ? error.command : undefined,
  details: isProjectCommandError(error) ? { originalError: error.originalError } : undefined,
});

// ====================
// Export Error Class
// ====================

export { ProjectCommandError };