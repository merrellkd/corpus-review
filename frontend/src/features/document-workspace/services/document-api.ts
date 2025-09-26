import { invoke } from '@tauri-apps/api/core';

export type LayoutModeType = 'stacked' | 'grid' | 'freeform';
export type LayoutModeTrigger = 'user' | 'auto-freeform';

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface CreateWorkspacePayload {
  name: string;
  layoutMode?: LayoutModeType;
  workspaceSize?: Size;
}

export interface CreateWorkspaceResponse {
  workspace_id: string;
  name: string;
  layout_mode: LayoutModeType;
  workspace_size: Size;
  created_at: string;
}

export interface WorkspaceDocumentDto {
  document_id: string;
  file_path: string;
  title: string;
  position: Point;
  dimensions: Size;
  z_index: number;
  is_active: boolean;
  is_visible: boolean;
  state: string;
  error_message?: string;
  last_modified?: string;
}

export interface WorkspaceStateResponse {
  workspace_id: string;
  name: string;
  layout_mode: LayoutModeType;
  workspace_size: Size;
  documents: WorkspaceDocumentDto[];
  last_modified: string;
}

export interface LayoutResultDto {
  document_id: string;
  position: Point;
  dimensions: Size;
  z_index: number;
  is_visible: boolean;
}

export interface LayoutChangeResponse {
  layout_results: LayoutResultDto[];
  triggered_auto_freeform: boolean;
}

export interface AddDocumentPayload {
  workspaceId: string;
  filePath: string;
  position?: Point;
  dimensions?: Size;
}

export interface MoveDocumentPayload {
  workspaceId: string;
  documentId: string;
  position: Point;
}

export interface ResizeDocumentPayload {
  workspaceId: string;
  documentId: string;
  dimensions: Size;
}

export interface SwitchLayoutPayload {
  workspaceId: string;
  layoutMode: LayoutModeType;
  triggeredBy?: LayoutModeTrigger;
}

export interface UpdateWorkspaceSizePayload {
  workspaceId: string;
  dimensions: Size;
}

export interface ActivateDocumentPayload {
  workspaceId: string;
  documentId: string;
}

export interface RemoveDocumentPayload {
  workspaceId: string;
  documentId: string;
}

export interface AddDocumentResponse {
  document_id: string;
  file_path: string;
  title: string;
  position: Point;
  dimensions: Size;
  z_index?: number;
  was_activated: boolean;
}

const withWorkspaceId = (workspaceId: string) => ({ workspace_id: workspaceId });

export const documentWorkspaceApi = {
  createWorkspace: async ({ name, layoutMode = 'stacked', workspaceSize }: CreateWorkspacePayload) =>
    invoke<CreateWorkspaceResponse>('create_workspace', {
      name,
      layout_mode: layoutMode,
      workspace_size: workspaceSize ?? { width: 1200, height: 800 },
    }),

  getWorkspaceState: async (workspaceId: string) =>
    invoke<WorkspaceStateResponse>('get_workspace_state', {
      workspace_id: workspaceId,
    }),

  loadWorkspaceState: async (workspaceId: string) =>
    invoke<WorkspaceStateResponse>('load_workspace_state', withWorkspaceId(workspaceId)),

  saveWorkspaceState: async (workspaceId: string) =>
    invoke<void>('save_workspace_state', withWorkspaceId(workspaceId)),

  switchLayoutMode: async ({ workspaceId, layoutMode, triggeredBy = 'user' }: SwitchLayoutPayload) =>
    invoke<LayoutChangeResponse>('switch_layout_mode', {
      workspace_id: workspaceId,
      layout_mode: layoutMode,
      triggered_by: triggeredBy,
    }),

  moveDocument: async ({ workspaceId, documentId, position }: MoveDocumentPayload) =>
    invoke<LayoutChangeResponse>('move_document', {
      workspace_id: workspaceId,
      document_id: documentId,
      position,
    }),

  resizeDocument: async ({ workspaceId, documentId, dimensions }: ResizeDocumentPayload) =>
    invoke<LayoutChangeResponse>('resize_document', {
      workspace_id: workspaceId,
      document_id: documentId,
      dimensions,
    }),

  updateWorkspaceSize: async ({ workspaceId, dimensions }: UpdateWorkspaceSizePayload) =>
    invoke<LayoutChangeResponse>('update_workspace_size', {
      workspace_id: workspaceId,
      dimensions,
    }),

  activateDocument: async ({ workspaceId, documentId }: ActivateDocumentPayload) =>
    invoke<void>('activate_document', {
      workspace_id: workspaceId,
      document_id: documentId,
    }),

  addDocument: async ({ workspaceId, filePath, position, dimensions }: AddDocumentPayload) =>
    invoke<AddDocumentResponse>('add_document_to_workspace', {
      workspace_id: workspaceId,
      file_path: filePath,
      position,
      dimensions,
    }),

  removeDocument: async ({ workspaceId, documentId }: RemoveDocumentPayload) =>
    invoke<boolean>('remove_document_from_workspace', {
      workspace_id: workspaceId,
      document_id: documentId,
    }),

  removeAllDocuments: async (workspaceId: string) =>
    invoke<number>('remove_all_documents_from_workspace', withWorkspaceId(workspaceId)),
};

export type DocumentWorkspaceApi = typeof documentWorkspaceApi;
