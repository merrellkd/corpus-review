/**
 * Project Feature - Main Entry Point
 * Clean exports following flat feature organization pattern
 */

// Re-export main component
export { ProjectWorkspace } from './components/ProjectWorkspace';

// Re-export project types
export type {
  Project,
  ProjectMetadata,
  CreateProjectParams,
  UpdateProjectParams
} from './types/project-types';

// Re-export FolderPath utilities
export { FolderPathUtil as FolderPath, createFolderPath } from './types/project-types';
// Note: FolderPath type is exported implicitly through the utility usage

// Re-export workspace types
export type {
  WorkspaceProps,
  WorkspaceLayout,
  WorkspaceLayoutState
} from './types/workspace-types';