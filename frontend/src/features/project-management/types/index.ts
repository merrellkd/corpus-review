/**
 * Main types export for Project Management feature
 */

// Re-export from aggregates
export {
  Project,
  type ProjectMetadata,
  type ProjectData,
  type CreateProjectParams,
  type UpdateProjectParams
} from './aggregates';

// Re-export from value-objects
export {
  ProjectId,
  ProjectName,
  FolderPath,
  ProjectNote,
  CreatedAt
} from './value-objects';

// Re-export from errors
export {
  ProjectError
} from './errors';

// Re-export from project-store-types
export type {
  ProjectStore,
  ProjectState,
  ProjectSortField,
  SortOrder,
  ProjectFilter,
  ProjectStoreEvent,
  ProjectStoreEventPayload,
  ProjectStoreEventListener,
  OperationResult
} from './project-store-types';

// Re-export from services (infrastructure types that are needed in domain)
export type {
  ProjectList,
  RepositoryStats,
  ValidationResult
} from '../services/project-repository';