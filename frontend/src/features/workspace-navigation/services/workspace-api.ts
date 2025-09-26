import { invoke } from '@tauri-apps/api/core';

export interface FileEntryDto {
  name: string;
  path: string;
  entryType: 'file' | 'directory';
  size: number | null;
  modified: string;
}

export interface DirectoryListingDto {
  entries: FileEntryDto[];
  isRoot: boolean;
  parentPath: string | null;
  canNavigateUp: boolean;
}

export interface WorkspaceDto {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
  directoryListing: DirectoryListingDto;
}

export interface BackendProjectDto {
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

export interface WorkspaceNavigationRequestBase extends Record<string, unknown> {
  projectId: string;
  projectName: string;
  sourceFolder: string;
}

export interface DirectoryRequest extends WorkspaceNavigationRequestBase {
  currentPath: string;
}

export interface NavigateToFolderRequest extends DirectoryRequest {
  folderName: string;
}

export interface NavigateToPathRequest extends WorkspaceNavigationRequestBase {
  targetPath: string;
}

export const workspaceApi = {
  openProject: (id: string) => invoke<BackendProjectDto>('open_project', { id }),
  openWorkspaceNavigation: (request: WorkspaceNavigationRequestBase) =>
    invoke<WorkspaceDto>('open_workspace_navigation', request),
  listDirectory: (request: DirectoryRequest) => invoke<DirectoryListingDto>('list_directory', request),
  navigateToFolder: (request: NavigateToFolderRequest) =>
    invoke<WorkspaceDto>('navigate_to_folder', request),
  navigateToParent: (request: DirectoryRequest) =>
    invoke<WorkspaceDto>('navigate_to_parent', request),
  navigateToPath: (request: NavigateToPathRequest) =>
    invoke<WorkspaceDto>('navigate_to_path', request),
};

export type WorkspaceApi = typeof workspaceApi;
