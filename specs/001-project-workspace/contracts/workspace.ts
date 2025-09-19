// Project Workspace API Contracts
// Generated from functional requirements FR-001 through FR-012

export interface WorkspaceLayoutDto {
  id: string;
  projectId: string;
  panelStates: PanelVisibilityStateDto;
  panelSizes: PanelDimensionStateDto;
  lastModified: string; // ISO datetime
}

export interface PanelVisibilityStateDto {
  fileExplorerVisible: boolean;
  categoryExplorerVisible: boolean;
  searchPanelVisible: boolean;
  documentWorkspaceVisible: boolean; // always true
}

export interface PanelDimensionStateDto {
  explorerWidth: number; // percentage 0-100
  workspaceWidth: number; // calculated percentage
  panelHeights: Record<string, number>; // panel type -> height percentage
}

export interface FileSystemItemDto {
  path: string;
  name: string;
  type: 'file' | 'directory';
  parentPath: string | null;
  lastModified: string; // ISO datetime
  size: number | null; // bytes, null for directories
  isAccessible: boolean;
}

export interface DocumentCaddyDto {
  id: string;
  filePath: string;
  title: string;
  isActive: boolean;
  position: CaddyPositionDto;
  dimensions: CaddyDimensionsDto;
  scrollPosition: number;
}

export interface CaddyPositionDto {
  x: number;
  y: number;
  zIndex: number;
}

export interface CaddyDimensionsDto {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

export interface ProjectDto {
  id: string;
  name: string;
  sourceFolderPath: string;
  reportsFolderPath: string;
}

// Tauri Command Contracts (snake_case as per constitution)

export interface GetWorkspaceLayoutRequest {
  project_id: string;
}

export interface GetWorkspaceLayoutResponse {
  layout: WorkspaceLayoutDto | null;
}

export interface SaveWorkspaceLayoutRequest {
  layout: WorkspaceLayoutDto;
}

export interface SaveWorkspaceLayoutResponse {
  success: boolean;
  error?: string;
}

export interface ListFolderContentsRequest {
  folder_path: string;
}

export interface ListFolderContentsResponse {
  items: FileSystemItemDto[];
  error?: string;
}

export interface GetProjectDetailsRequest {
  project_id: string;
}

export interface GetProjectDetailsResponse {
  project: ProjectDto | null;
  error?: string;
}

export interface UpdatePanelVisibilityRequest {
  project_id: string;
  panel_type: 'file_explorer' | 'category_explorer' | 'search_panel';
  visible: boolean;
}

export interface UpdatePanelVisibilityResponse {
  success: boolean;
  new_layout: WorkspaceLayoutDto;
}

export interface UpdatePanelSizesRequest {
  project_id: string;
  dimensions: PanelDimensionStateDto;
}

export interface UpdatePanelSizesResponse {
  success: boolean;
  new_layout: WorkspaceLayoutDto;
}

export interface CreateDocumentCaddyRequest {
  file_path: string;
  workspace_id: string;
}

export interface CreateDocumentCaddyResponse {
  caddy: DocumentCaddyDto;
  error?: string;
}

export interface UpdateDocumentCaddyRequest {
  caddy_id: string;
  position?: CaddyPositionDto;
  dimensions?: CaddyDimensionsDto;
  scroll_position?: number;
  is_active?: boolean;
}

export interface UpdateDocumentCaddyResponse {
  success: boolean;
  updated_caddy: DocumentCaddyDto;
}

// Error Response Types

export interface WorkspaceErrorResponse {
  error: string;
  code: 'FOLDER_INACCESSIBLE' | 'LAYOUT_NOT_FOUND' | 'INVALID_PROJECT' | 'PERSISTENCE_FAILED';
  details?: Record<string, unknown>;
}