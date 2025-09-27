/**
 * Domain-DTO Converters
 *
 * This module provides bidirectional conversion utilities between
 * domain objects and DTOs, ensuring data integrity and proper
 * error handling during transformations.
 */

import {
  Project,
  ProjectMetadata,
  ProjectId,
  ProjectName,
  FolderPath,
  ProjectNote,
  CreatedAt,
  ProjectData,
  CreateProjectParams,
  UpdateProjectParams,
} from '../domain';

import type {
  ProjectDto,
  ProjectListDto,
  RepositoryStatsDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  DeleteProjectRequest,
  ProjectSummary,
} from './dtos';

// ====================
// Conversion Errors
// ====================

export class ConversionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ConversionError';
  }
}

// ====================
// Project Conversions
// ====================

/**
 * Convert ProjectDto to Project domain object
 */
export const dtoToProject = (dto: ProjectDto): Project => {
  try {
    return Project.fromData(
      dto.id,
      dto.name,
      dto.source_folder,
      dto.note || null,
      dto.created_at
    );
  } catch (error) {
    throw new ConversionError(
      `Failed to convert ProjectDto to Project: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

/**
 * Convert Project domain object to ProjectDto
 */
export const projectToDto = (project: Project): ProjectDto => {
  try {
    const metadata = project.metadata();

    return {
      id: project.id.value,
      name: project.name.value,
      source_folder: project.sourceFolder.value,
      source_folder_name: project.sourceFolder.folderName() || undefined,
      note: project.note?.value || undefined,
      note_preview: project.note?.preview(100) || undefined,
      note_line_count: project.note?.lineCount,
      created_at: project.createdAt.toISOString(),
      is_accessible: true, // Assume accessible unless told otherwise
    };
  } catch (error) {
    throw new ConversionError(
      `Failed to convert Project to ProjectDto: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

/**
 * Convert array of ProjectDtos to array of Projects
 */
export const dtosToProjects = (dtos: ProjectDto[]): Project[] => {
  return dtos.map((dto, index) => {
    try {
      return dtoToProject(dto);
    } catch (error) {
      throw new ConversionError(
        `Failed to convert ProjectDto at index ${index}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  });
};

/**
 * Convert array of Projects to array of ProjectDtos
 */
export const projectsToDtos = (projects: Project[]): ProjectDto[] => {
  return projects.map((project, index) => {
    try {
      return projectToDto(project);
    } catch (error) {
      throw new ConversionError(
        `Failed to convert Project at index ${index}: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  });
};

// ====================
// Request Conversions
// ====================

/**
 * Convert CreateProjectParams to CreateProjectRequest
 */
export const paramsToCreateRequest = (params: CreateProjectParams): CreateProjectRequest => {
  return {
    name: params.name,
    source_folder: params.sourceFolder,
    note: params.note,
  };
};

/**
 * Convert UpdateProjectParams to UpdateProjectRequest
 */
export const paramsToUpdateRequest = (
  id: string,
  params: UpdateProjectParams
): UpdateProjectRequest => {
  return {
    id,
    name: params.name,
    note: params.note === null ? undefined : params.note,
  };
};

/**
 * Convert Project to UpdateProjectRequest
 */
export const projectToUpdateRequest = (project: Project): UpdateProjectRequest => {
  return {
    id: project.id.value,
    name: project.name.value,
    note: project.note?.value || undefined,
  };
};

// ====================
// Metadata Conversions
// ====================

/**
 * Convert ProjectDto to ProjectMetadata
 */
export const dtoToMetadata = (dto: ProjectDto): ProjectMetadata => {
  try {
    return {
      id: ProjectId.fromString(dto.id),
      name: ProjectName.new(dto.name),
      sourceFolderName: dto.source_folder_name || null,
      sourceFolderPath: dto.source_folder,
      notePreview: dto.note_preview || null,
      noteLineCount: dto.note_line_count || null,
      createdAt: CreatedAt.fromString(dto.created_at),
      isAccessible: dto.is_accessible,
    };
  } catch (error) {
    throw new ConversionError(
      `Failed to convert ProjectDto to ProjectMetadata: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

/**
 * Convert ProjectMetadata to ProjectDto
 */
export const metadataToDto = (metadata: ProjectMetadata): ProjectDto => {
  try {
    return {
      id: metadata.id.value,
      name: metadata.name.value,
      source_folder: metadata.sourceFolderPath,
      source_folder_name: metadata.sourceFolderName || undefined,
      note: metadata.notePreview || undefined, // For metadata, use preview as note
      note_preview: metadata.notePreview || undefined,
      note_line_count: metadata.noteLineCount || undefined,
      created_at: metadata.createdAt.toISOString(),
      is_accessible: metadata.isAccessible,
    };
  } catch (error) {
    throw new ConversionError(
      `Failed to convert ProjectMetadata to ProjectDto: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

// ====================
// Summary Conversions
// ====================

/**
 * Convert ProjectDto to ProjectSummary
 */
export const dtoToSummary = (dto: ProjectDto): ProjectSummary => {
  return {
    id: dto.id,
    name: dto.name,
    source_folder_name: dto.source_folder_name || undefined,
    note_preview: dto.note_preview || undefined,
    created_at: dto.created_at,
    is_accessible: dto.is_accessible,
  };
};

/**
 * Convert Project to ProjectSummary
 */
export const projectToSummary = (project: Project): ProjectSummary => {
  return {
    id: project.id.value,
    name: project.name.value,
    source_folder_name: project.sourceFolder.folderName() || undefined,
    note_preview: project.note?.preview(100) || undefined,
    created_at: project.createdAt.toISOString(),
    is_accessible: true, // Assume accessible unless told otherwise
  };
};

// ====================
// Data Format Conversions
// ====================

/**
 * Convert Project to ProjectData (plain object)
 */
export const projectToData = (project: Project): ProjectData => {
  return project.toJSON();
};

/**
 * Convert ProjectData to Project
 */
export const dataToProject = (data: ProjectData): Project => {
  try {
    return Project.fromData(
      data.id,
      data.name,
      data.sourceFolder,
      data.note,
      data.createdAt
    );
  } catch (error) {
    throw new ConversionError(
      `Failed to convert ProjectData to Project: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

// ====================
// List Conversions
// ====================

/**
 * Convert ProjectListDto to structured project list with pagination
 */
export const dtoListToProjectList = (dtoList: ProjectListDto) => {
  try {
    const projects = dtosToProjects(dtoList.projects);

    return {
      projects,
      totalCount: dtoList.total_count,
      offset: dtoList.offset,
      limit: dtoList.limit,
      hasMore: dtoList.has_more,
      currentPage: Math.floor(dtoList.offset / Math.max(dtoList.limit, 1)) + 1,
      totalPages: Math.ceil(dtoList.total_count / Math.max(dtoList.limit, 1)),
    };
  } catch (error) {
    throw new ConversionError(
      `Failed to convert ProjectListDto to project list: ${error instanceof Error ? error.message : String(error)}`,
      error
    );
  }
};

// ====================
// Statistics Conversions
// ====================

/**
 * Convert RepositoryStatsDto to structured stats object
 */
export const statsToRepositoryStats = (stats: RepositoryStatsDto) => {
  return {
    totalProjects: stats.total_projects,
    accessibleProjects: stats.accessible_projects,
    inaccessibleProjects: stats.inaccessible_projects,
    accessibilityPercentage: stats.accessibility_percentage,
    projectsWithNotes: stats.projects_with_notes,
    notesPercentage: stats.notes_percentage,
    averageNameLength: stats.average_name_length,
    oldestProjectDate: stats.oldest_project_date ? new Date(stats.oldest_project_date) : undefined,
    newestProjectDate: stats.newest_project_date ? new Date(stats.newest_project_date) : undefined,
    databaseSizeBytes: stats.database_size_bytes,
  };
};

// ====================
// Validation Helpers
// ====================

/**
 * Validate that a DTO can be converted to a domain object
 */
export const validateDtoConversion = (dto: ProjectDto): string[] => {
  const errors: string[] = [];

  try {
    ProjectId.fromString(dto.id);
  } catch (error) {
    errors.push(`Invalid project ID: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    ProjectName.new(dto.name);
  } catch (error) {
    errors.push(`Invalid project name: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    FolderPath.new(dto.source_folder);
  } catch (error) {
    errors.push(`Invalid source folder: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (dto.note) {
    try {
      ProjectNote.new(dto.note);
    } catch (error) {
      errors.push(`Invalid project note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    CreatedAt.fromString(dto.created_at);
  } catch (error) {
    errors.push(`Invalid created_at timestamp: ${error instanceof Error ? error.message : String(error)}`);
  }

  return errors;
};

/**
 * Safely convert DTO to Project with validation
 */
export const safeDtoToProject = (dto: ProjectDto): { success: true; project: Project } | { success: false; errors: string[] } => {
  const validationErrors = validateDtoConversion(dto);

  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  try {
    const project = dtoToProject(dto);
    return { success: true, project };
  } catch (error) {
    return {
      success: false,
      errors: [`Conversion failed: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

// ====================
// Utility Functions
// ====================

/**
 * Check if an object looks like a valid ProjectDto
 */
export const isValidProjectDto = (obj: any): obj is ProjectDto => {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.source_folder === 'string' &&
    typeof obj.created_at === 'string' &&
    typeof obj.is_accessible === 'boolean' &&
    obj.id.startsWith('proj_')
  );
};

/**
 * Clean and normalize a DTO (trim strings, handle nulls, etc.)
 */
export const normalizeProjectDto = (dto: ProjectDto): ProjectDto => {
  return {
    ...dto,
    name: dto.name.trim(),
    source_folder: dto.source_folder.trim(),
    note: dto.note?.trim() || undefined,
    note_preview: dto.note_preview?.trim() || undefined,
    source_folder_name: dto.source_folder_name?.trim() || undefined,
  };
};

/**
 * Create a minimal ProjectDto for testing or mocking
 */
export const createMinimalProjectDto = (overrides: Partial<ProjectDto> = {}): ProjectDto => {
  return {
    id: 'proj_00000000-0000-0000-0000-000000000000',
    name: 'Test Project',
    source_folder: '/test/folder',
    source_folder_name: 'folder',
    note: undefined,
    note_preview: undefined,
    note_line_count: undefined,
    created_at: new Date().toISOString(),
    is_accessible: true,
    ...overrides,
  };
};