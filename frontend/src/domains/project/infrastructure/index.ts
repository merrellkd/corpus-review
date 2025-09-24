/**
 * Project Infrastructure Layer exports
 */

// DTOs and types
export * from './dtos';

// Tauri command wrappers
export {
  createProject,
  checkProjectNameAvailability,
  getProjectCreationStats,
  listProjects,
  listProjectsPaged,
  searchProjects,
  getProject,
  getProjectByName,
  getRepositoryStats,
  getInaccessibleProjects,
  findProjectsByDateRange,
  deleteProject,
  getProjectForDeletion,
  deleteProjectsBulk,
  checkDeletionSafety,
  openProject,
  openProjectByName,
  getRecentProjects,
  openProjectFolder,
  getProjectOpeningStats,
  updateProject,
  ProjectCommandError,
  isProjectCommandError,
  extractErrorMessage,
  createErrorResponse,
  // Alias backend validation functions to avoid conflicts
  validateCreateProjectRequest as validateCreateProjectRequestBackend,
  validateDeleteProjectRequest as validateDeleteProjectRequestBackend,
  validateProjectAccess,
} from './tauri-commands';

// Repository implementation
export * from './project-repository';

// Conversion utilities
export * from './converters';