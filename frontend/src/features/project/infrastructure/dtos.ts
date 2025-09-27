/**
 * Data Transfer Objects for Project domain - matches backend DTOs exactly
 */

// ====================
// Response DTOs
// ====================

/**
 * ProjectDto - Main project data transfer object from backend
 */
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

/**
 * ProjectListDto - Paginated list of projects from backend
 */
export interface ProjectListDto {
  projects: ProjectDto[];
  total_count: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

/**
 * RepositoryStatsDto - Repository statistics from backend
 */
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

// ====================
// Request DTOs
// ====================

/**
 * CreateProjectRequest - Request to create a new project
 */
export interface CreateProjectRequest {
  name: string;
  source_folder: string;
  note?: string;
}

/**
 * UpdateProjectRequest - Request to update an existing project
 */
export interface UpdateProjectRequest {
  id: string;
  name?: string;
  note?: string;
}

/**
 * DeleteProjectRequest - Request to delete a project
 */
export interface DeleteProjectRequest {
  id: string;
  confirm?: boolean;
}

// ====================
// Query Parameters
// ====================

/**
 * ListProjectsParams - Parameters for listing projects
 */
export interface ListProjectsParams {
  offset?: number;
  limit?: number;
}

/**
 * SearchProjectsParams - Parameters for searching projects
 */
export interface SearchProjectsParams {
  query: string;
  offset?: number;
  limit?: number;
}

/**
 * FindProjectsByDateRangeParams - Parameters for date range queries
 */
export interface FindProjectsByDateRangeParams {
  start_date: string; // ISO 8601 date string
  end_date: string;   // ISO 8601 date string
  offset?: number;
  limit?: number;
}

/**
 * BulkDeleteProjectsRequest - Request to delete multiple projects
 */
export interface BulkDeleteProjectsRequest {
  ids: string[];
  confirm?: boolean;
}

// ====================
// Validation DTOs
// ====================

/**
 * ProjectValidationResult - Result of project validation
 */
export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * ProjectCreationStatsDto - Statistics about project creation
 */
export interface ProjectCreationStatsDto {
  total_projects: number;
  projects_created_today: number;
  projects_created_this_week: number;
  projects_created_this_month: number;
  average_projects_per_day: number;
  most_recent_project?: ProjectDto;
}

/**
 * ProjectOpeningStatsDto - Statistics about project opening
 */
export interface ProjectOpeningStatsDto {
  projects_opened_today: number;
  projects_opened_this_week: number;
  most_recently_opened?: ProjectDto;
  most_frequently_opened?: ProjectDto[];
}

// ====================
// Error Response Types
// ====================

/**
 * Standard error response from Tauri commands
 */
export interface TauriError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ====================
// Utility Types
// ====================

/**
 * Pagination info
 */
export interface PaginationInfo {
  offset: number;
  limit: number;
  total_count: number;
  has_more: boolean;
  current_page: number;
  total_pages: number;
}

/**
 * Project summary for quick display
 */
export interface ProjectSummary {
  id: string;
  name: string;
  source_folder_name?: string;
  note_preview?: string;
  created_at: string;
  is_accessible: boolean;
}

// ====================
// Helper Functions
// ====================

/**
 * Type guards for runtime type checking
 */
export const isProjectDto = (obj: any): obj is ProjectDto => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.source_folder === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.is_accessible === 'boolean'
  );
};

export const isProjectListDto = (obj: any): obj is ProjectListDto => {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.projects) &&
    typeof obj.total_count === 'number' &&
    typeof obj.offset === 'number' &&
    typeof obj.limit === 'number' &&
    typeof obj.has_more === 'boolean'
  );
};

export const isRepositoryStatsDto = (obj: any): obj is RepositoryStatsDto => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.total_projects === 'number' &&
    typeof obj.accessible_projects === 'number' &&
    typeof obj.accessibility_percentage === 'number'
  );
};

/**
 * Validation functions
 */
export const validateCreateProjectRequest = (req: CreateProjectRequest): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!req.name || !req.name.trim()) {
    errors.push({ field: 'name', message: 'Project name is required' });
  } else if (req.name.trim().length > 255) {
    errors.push({ field: 'name', message: 'Project name must be 255 characters or less' });
  }

  if (!req.source_folder || !req.source_folder.trim()) {
    errors.push({ field: 'source_folder', message: 'Source folder is required' });
  }

  if (req.note && req.note.length > 1000) {
    errors.push({ field: 'note', message: 'Project note must be 1000 characters or less' });
  }

  return errors;
};

export const validateUpdateProjectRequest = (req: UpdateProjectRequest): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!req.id || !req.id.startsWith('proj_')) {
    errors.push({ field: 'id', message: 'Valid project ID is required' });
  }

  if (req.name !== undefined) {
    if (!req.name.trim()) {
      errors.push({ field: 'name', message: 'Project name cannot be empty when updating' });
    } else if (req.name.trim().length > 255) {
      errors.push({ field: 'name', message: 'Project name must be 255 characters or less' });
    }
  }

  if (req.note !== undefined && req.note.length > 1000) {
    errors.push({ field: 'note', message: 'Project note must be 1000 characters or less' });
  }

  return errors;
};

export const validateDeleteProjectRequest = (req: DeleteProjectRequest): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!req.id || !req.id.startsWith('proj_')) {
    errors.push({ field: 'id', message: 'Valid project ID is required' });
  }

  if (!req.confirm) {
    errors.push({ field: 'confirm', message: 'Deletion must be confirmed' });
  }

  return errors;
};

/**
 * Utility functions for working with DTOs
 */
export const formatBytes = (bytes?: number): string => {
  if (!bytes) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const threshold = 1024;

  if (bytes < threshold) {
    return `${bytes} B`;
  }

  let size = bytes;
  let unitIndex = 0;

  while (size >= threshold && unitIndex < units.length - 1) {
    size /= threshold;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const calculatePaginationInfo = (
  offset: number,
  limit: number,
  totalCount: number
): PaginationInfo => {
  const currentPage = limit === 0 ? 1 : Math.floor(offset / limit) + 1;
  const totalPages = limit === 0 || totalCount === 0 ? 1 : Math.ceil(totalCount / limit);
  const hasMore = offset + limit < totalCount;

  return {
    offset,
    limit,
    total_count: totalCount,
    has_more: hasMore,
    current_page: currentPage,
    total_pages: totalPages,
  };
};

export const getProjectSummary = (dto: ProjectDto): ProjectSummary => ({
  id: dto.id,
  name: dto.name,
  source_folder_name: dto.source_folder_name,
  note_preview: dto.note_preview,
  created_at: dto.created_at,
  is_accessible: dto.is_accessible,
});