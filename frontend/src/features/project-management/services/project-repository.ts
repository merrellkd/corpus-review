/**
 * Project Repository Implementation
 *
 * This repository provides a domain-focused interface over the Tauri commands,
 * handling DTO-to-Domain conversions and providing a clean API that matches
 * the backend repository interface.
 */

import {
  Project,
  ProjectMetadata,
  CreateProjectParams,
  UpdateProjectParams,
  ProjectError,
} from '../types';
import {
  ProjectDto,
  ProjectListDto,
  RepositoryStatsDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  DeleteProjectRequest,
  ListProjectsParams,
  SearchProjectsParams,
  FindProjectsByDateRangeParams,
} from './dtos';
import * as TauriCommands from './tauri-commands';

/**
 * Repository interface for Project domain operations
 */
export interface IProjectRepository {
  // Core CRUD operations
  create(params: CreateProjectParams): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByName(name: string): Promise<Project | null>;
  update(project: Project): Promise<Project>;
  delete(id: string, confirm?: boolean): Promise<void>;

  // List and search operations
  findAll(params?: ListProjectsParams): Promise<Project[]>;
  findAllPaged(params?: ListProjectsParams): Promise<ProjectList>;
  search(query: string, params?: ListProjectsParams): Promise<ProjectList>;
  findByDateRange(startDate: Date, endDate: Date, params?: ListProjectsParams): Promise<ProjectList>;

  // Statistics and metadata
  getStats(): Promise<RepositoryStats>;
  getInaccessible(): Promise<Project[]>;
  getRecent(limit?: number): Promise<Project[]>;

  // Validation and utility
  isNameAvailable(name: string): Promise<boolean>;
  validateAccess(id: string): Promise<ValidationResult>;
  exists(id: string): Promise<boolean>;
}

/**
 * Project list with pagination information
 */
export interface ProjectList {
  projects: Project[];
  totalCount: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
}

/**
 * Repository statistics
 */
export interface RepositoryStats {
  totalProjects: number;
  accessibleProjects: number;
  inaccessibleProjects: number;
  accessibilityPercentage: number;
  projectsWithNotes: number;
  notesPercentage: number;
  averageNameLength: number;
  oldestProjectDate?: Date;
  newestProjectDate?: Date;
  databaseSizeBytes?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Repository error class
 */
export class RepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Project Repository Implementation using Tauri commands
 */
export class ProjectRepository implements IProjectRepository {
  // ====================
  // DTO-Domain Conversion Helpers
  // ====================

  private dtoToProject(dto: ProjectDto): Project {
    try {
      return Project.fromData(
        dto.id,
        dto.name,
        dto.source_folder,
        dto.note || null,
        dto.created_at
      );
    } catch (error) {
      throw new RepositoryError(
        `Failed to convert DTO to Project: ${error instanceof Error ? error.message : String(error)}`,
        error
      );
    }
  }

  private dtosToProjects(dtos: ProjectDto[]): Project[] {
    return dtos.map(dto => this.dtoToProject(dto));
  }

  private dtoListToProjectList(dtoList: ProjectListDto): ProjectList {
    return {
      projects: this.dtosToProjects(dtoList.projects),
      totalCount: dtoList.total_count,
      offset: dtoList.offset,
      limit: dtoList.limit,
      hasMore: dtoList.has_more,
      currentPage: Math.floor(dtoList.offset / Math.max(dtoList.limit, 1)) + 1,
      totalPages: Math.ceil(dtoList.total_count / Math.max(dtoList.limit, 1)),
    };
  }

  private statsToRepositoryStats(stats: RepositoryStatsDto): RepositoryStats {
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
  }

  private projectToUpdateRequest(project: Project): UpdateProjectRequest {
    return {
      id: project.id.value,
      name: project.name.value,
      note: project.note?.value || undefined,
    };
  }

  private handleTauriError(operation: string, error: unknown): never {
    const message = TauriCommands.extractErrorMessage(error);
    throw new RepositoryError(`${operation} failed: ${message}`, error);
  }

  // ====================
  // Core CRUD Operations
  // ====================

  async create(params: CreateProjectParams): Promise<Project> {
    try {
      const request: CreateProjectRequest = {
        name: params.name,
        source_folder: params.sourceFolder,
        note: params.note,
      };

      const dto = await TauriCommands.createProject(request);
      return this.dtoToProject(dto);
    } catch (error) {
      this.handleTauriError('Project creation', error);
    }
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const dto = await TauriCommands.getProject(id);
      return this.dtoToProject(dto);
    } catch (error) {
      // If project not found, return null instead of throwing
      if (TauriCommands.extractErrorMessage(error).includes('not found')) {
        return null;
      }
      this.handleTauriError('Find project by ID', error);
    }
  }

  async findByName(name: string): Promise<Project | null> {
    try {
      const dto = await TauriCommands.getProjectByName(name);
      return this.dtoToProject(dto);
    } catch (error) {
      // If project not found, return null instead of throwing
      if (TauriCommands.extractErrorMessage(error).includes('not found')) {
        return null;
      }
      this.handleTauriError('Find project by name', error);
    }
  }

  async update(project: Project): Promise<Project> {
    try {
      const request = this.projectToUpdateRequest(project);
      const dto = await TauriCommands.updateProject(request);
      return this.dtoToProject(dto);
    } catch (error) {
      this.handleTauriError('Project update', error);
    }
  }

  async delete(id: string, confirm: boolean = false): Promise<void> {
    try {
      const request: DeleteProjectRequest = {
        id,
        confirm,
      };
      await TauriCommands.deleteProject(request);
    } catch (error) {
      this.handleTauriError('Project deletion', error);
    }
  }

  // ====================
  // List and Search Operations
  // ====================

  async findAll(params?: ListProjectsParams): Promise<Project[]> {
    try {
      const dtos = await TauriCommands.listProjects(params);
      return this.dtosToProjects(dtos);
    } catch (error) {
      this.handleTauriError('List all projects', error);
    }
  }

  async findAllPaged(params?: ListProjectsParams): Promise<ProjectList> {
    try {
      const dtoList = await TauriCommands.listProjectsPaged(params);
      return this.dtoListToProjectList(dtoList);
    } catch (error) {
      this.handleTauriError('List projects with pagination', error);
    }
  }

  async search(query: string, params?: ListProjectsParams): Promise<ProjectList> {
    try {
      const searchParams: SearchProjectsParams = {
        query,
        offset: params?.offset,
        limit: params?.limit,
      };
      const dtoList = await TauriCommands.searchProjects(searchParams);
      return this.dtoListToProjectList(dtoList);
    } catch (error) {
      this.handleTauriError('Search projects', error);
    }
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    params?: ListProjectsParams
  ): Promise<ProjectList> {
    try {
      const dateParams: FindProjectsByDateRangeParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        offset: params?.offset,
        limit: params?.limit,
      };
      const dtoList = await TauriCommands.findProjectsByDateRange(dateParams);
      return this.dtoListToProjectList(dtoList);
    } catch (error) {
      this.handleTauriError('Find projects by date range', error);
    }
  }

  // ====================
  // Statistics and Metadata
  // ====================

  async getStats(): Promise<RepositoryStats> {
    try {
      const statsDto = await TauriCommands.getRepositoryStats();
      return this.statsToRepositoryStats(statsDto);
    } catch (error) {
      this.handleTauriError('Get repository statistics', error);
    }
  }

  async getInaccessible(): Promise<Project[]> {
    try {
      const dtos = await TauriCommands.getInaccessibleProjects();
      return this.dtosToProjects(dtos);
    } catch (error) {
      this.handleTauriError('Get inaccessible projects', error);
    }
  }

  async getRecent(limit: number = 10): Promise<Project[]> {
    try {
      const dtos = await TauriCommands.getRecentProjects(limit);
      return this.dtosToProjects(dtos);
    } catch (error) {
      this.handleTauriError('Get recent projects', error);
    }
  }

  // ====================
  // Validation and Utility
  // ====================

  async isNameAvailable(name: string): Promise<boolean> {
    try {
      return await TauriCommands.checkProjectNameAvailability(name);
    } catch (error) {
      this.handleTauriError('Check name availability', error);
    }
  }

  async validateAccess(id: string): Promise<ValidationResult> {
    try {
      const result = await TauriCommands.validateProjectAccess(id);
      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      this.handleTauriError('Validate project access', error);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const project = await this.findById(id);
      return project !== null;
    } catch (error) {
      // If there's an error other than "not found", it likely means the project exists
      // but there's an access issue
      return false;
    }
  }

  // ====================
  // Additional Utility Methods
  // ====================

  /**
   * Open a project folder in the system file explorer
   */
  async openProjectFolder(id: string): Promise<void> {
    try {
      await TauriCommands.openProjectFolder(id);
    } catch (error) {
      this.handleTauriError('Open project folder', error);
    }
  }

  /**
   * Open/activate a project
   */
  async openProject(id: string): Promise<Project> {
    try {
      const dto = await TauriCommands.openProject(id);
      return this.dtoToProject(dto);
    } catch (error) {
      this.handleTauriError('Open project', error);
    }
  }

  /**
   * Bulk delete multiple projects
   */
  async deleteBulk(ids: string[], confirm: boolean = false): Promise<void> {
    try {
      const request = {
        ids,
        confirm,
      };
      await TauriCommands.deleteProjectsBulk(request);
    } catch (error) {
      this.handleTauriError('Bulk delete projects', error);
    }
  }

  /**
   * Validate a create project request
   */
  async validateCreateRequest(params: CreateProjectParams): Promise<ValidationResult> {
    try {
      const request: CreateProjectRequest = {
        name: params.name,
        source_folder: params.sourceFolder,
        note: params.note,
      };
      const result = await TauriCommands.validateCreateProjectRequest(request);
      return {
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      this.handleTauriError('Validate create project request', error);
    }
  }
}

// ====================
// Default Export
// ====================

/**
 * Default project repository instance
 */
export const projectRepository = new ProjectRepository();

/**
 * Create a new project repository instance (for testing or special cases)
 */
export const createProjectRepository = (): IProjectRepository => {
  return new ProjectRepository();
};