import { invoke } from '@tauri-apps/api/tauri';
import { WorkspaceId } from '../domain/value-objects/identifiers';
import { Position, Dimensions } from '../domain/value-objects/geometry';
import { LayoutModeType, LayoutMode } from '../domain/value-objects/layout-mode';
import { Workspace } from '../domain/aggregates/workspace';
import { WorkspaceRepository, DocumentFileService } from './workspace-service';
import {
  WorkspaceDomainError,
  WorkspaceErrorFactory,
  isWorkspaceDomainError,
  getUserMessage
} from '../domain/errors/workspace-errors';

/**
 * Tauri command request/response types
 */
export interface CreateWorkspaceRequest {
  name: string;
  layout_mode: string;
  workspace_size: { width: number; height: number };
}

export interface CreateWorkspaceResponse {
  workspace_id: string;
  name: string;
  layout_mode: string;
  workspace_size: { width: number; height: number };
  created_at: string;
}

export interface AddDocumentRequest {
  workspace_id: string;
  file_path: string;
  position?: { x: number; y: number };
  dimensions?: { width: number; height: number };
}

export interface AddDocumentResponse {
  document_id: string;
  file_path: string;
  title: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  was_activated: boolean;
}

export interface MoveDocumentRequest {
  workspace_id: string;
  document_id: string;
  position: { x: number; y: number };
}

export interface ResizeDocumentRequest {
  workspace_id: string;
  document_id: string;
  dimensions: { width: number; height: number };
}

export interface LayoutModeChangeRequest {
  workspace_id: string;
  layout_mode: string;
  triggered_by: 'user' | 'auto-freeform';
}

export interface LayoutModeChangeResponse {
  layout_results: Array<{
    document_id: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    z_index: number;
    is_visible: boolean;
  }>;
  triggered_auto_freeform: boolean;
}

export interface WorkspaceStateResponse {
  workspace_id: string;
  name: string;
  layout_mode: string;
  workspace_size: { width: number; height: number };
  documents: Array<{
    document_id: string;
    file_path: string;
    title: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    z_index: number;
    is_active: boolean;
    is_visible: boolean;
    state: string;
    error_message?: string;
  }>;
  last_modified: string;
}

/**
 * Repository implementation that delegates to Tauri backend
 */
export class TauriWorkspaceRepository implements WorkspaceRepository {
  async save(workspace: Workspace): Promise<void> {
    try {
      const workspaceData = this.serializeWorkspace(workspace);
      await invoke('save_workspace', { workspace: workspaceData });
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  async findById(id: WorkspaceId): Promise<Workspace | undefined> {
    try {
      const response: WorkspaceStateResponse = await invoke('get_workspace', {
        workspaceId: id.toString()
      });
      return this.deserializeWorkspace(response);
    } catch (error) {
      // Return undefined for not found, throw for other errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: string }).message;
        if (message.includes('not found') || message.includes('Not found')) {
          return undefined;
        }
      }
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  async findByName(name: string): Promise<Workspace | undefined> {
    try {
      const response: WorkspaceStateResponse = await invoke('get_workspace_by_name', {
        name
      });
      return this.deserializeWorkspace(response);
    } catch (error) {
      // Return undefined for not found, throw for other errors
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as { message: string }).message;
        if (message.includes('not found') || message.includes('Not found')) {
          return undefined;
        }
      }
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  async delete(id: WorkspaceId): Promise<boolean> {
    try {
      const result: boolean = await invoke('delete_workspace', {
        workspaceId: id.toString()
      });
      return result;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  async exists(id: WorkspaceId): Promise<boolean> {
    try {
      const result: boolean = await invoke('workspace_exists', {
        workspaceId: id.toString()
      });
      return result;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  private serializeWorkspace(workspace: Workspace): any {
    return {
      workspace_id: workspace.getId().toString(),
      name: workspace.getName(),
      layout_mode: workspace.getLayoutMode().getType(),
      workspace_size: workspace.getWorkspaceSize().toSize(),
      documents: workspace.getAllDocuments().map(doc => ({
        document_id: doc.getId().toString(),
        file_path: doc.getFilePath(),
        title: doc.getTitle(),
        position: doc.getPosition().toPoint(),
        dimensions: doc.getDimensions().toSize(),
        z_index: doc.getZIndex(),
        is_active: doc.isActiveCaddy(),
        is_visible: doc.isVisible(),
        state: doc.getState(),
        error_message: doc.getErrorMessage(),
      })),
      last_modified: workspace.getLastModified().toISOString(),
    };
  }

  private deserializeWorkspace(data: WorkspaceStateResponse): Workspace {
    // This is a simplified deserialization - in practice, you'd need to properly
    // reconstruct the workspace with all its domain logic
    const workspaceId = WorkspaceId.fromString(data.workspace_id);
    const workspaceSize = Dimensions.fromValues(
      data.workspace_size.width,
      data.workspace_size.height
    );

    // Create workspace using factory method
    const layoutMode = LayoutMode.fromString(data.layout_mode as LayoutModeType);
    const workspace = Workspace.create(data.name, layoutMode, workspaceSize);

    // Add documents
    for (const docData of data.documents) {
      const position = Position.fromCoordinates(docData.position.x, docData.position.y);
      const dimensions = Dimensions.fromValues(docData.dimensions.width, docData.dimensions.height);

      workspace.addDocument(docData.file_path, docData.title, position, dimensions);
    }

    return workspace;
  }
}

/**
 * File service implementation that delegates to Tauri backend
 */
export class TauriDocumentFileService implements DocumentFileService {
  async exists(filePath: string): Promise<boolean> {
    try {
      const result: boolean = await invoke('file_exists', { filePath });
      return result;
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { filePath });
    }
  }

  async getTitle(filePath: string): Promise<string> {
    try {
      const title: string = await invoke('get_file_title', { filePath });
      return title;
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { filePath });
    }
  }

  async validatePath(filePath: string): Promise<boolean> {
    try {
      const isValid: boolean = await invoke('validate_file_path', { filePath });
      return isValid;
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { filePath });
    }
  }
}

/**
 * High-level adapter for workspace operations via Tauri
 */
export class TauriWorkspaceAdapter {
  constructor() {}

  /**
   * Creates a new workspace
   */
  async createWorkspace(
    name: string,
    layoutMode: LayoutModeType = LayoutModeType.STACKED,
    workspaceSize?: Dimensions
  ): Promise<CreateWorkspaceResponse> {
    try {
      const request: CreateWorkspaceRequest = {
        name,
        layout_mode: layoutMode,
        workspace_size: workspaceSize
          ? workspaceSize.toSize()
          : { width: 1200, height: 800 },
      };

      const response: CreateWorkspaceResponse = await invoke('create_workspace', request as any);
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  /**
   * Adds a document to workspace
   */
  async addDocument(
    workspaceId: string,
    filePath: string,
    position?: Position,
    dimensions?: Dimensions
  ): Promise<AddDocumentResponse> {
    try {
      const request: any = {
        workspace_id: workspaceId,
        file_path: filePath,
        position: position?.toPoint(),
        dimensions: dimensions?.toSize(),
      };

      const response: AddDocumentResponse = await invoke('add_document_to_workspace', request as any);
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { filePath });
    }
  }

  /**
   * Removes a document from workspace
   */
  async removeDocument(workspaceId: string, documentId: string): Promise<boolean> {
    try {
      const result: boolean = await invoke('remove_document_from_workspace', {
        workspace_id: workspaceId,
        document_id: documentId,
      });
      return result;
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { documentId });
    }
  }

  /**
   * Removes all documents from workspace
   */
  async removeAllDocuments(workspaceId: string): Promise<number> {
    try {
      const count: number = await invoke('remove_all_documents_from_workspace', {
        workspace_id: workspaceId,
      });
      return count;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  /**
   * Activates a document in workspace
   */
  async activateDocument(workspaceId: string, documentId: string): Promise<void> {
    try {
      await invoke('activate_document', {
        workspace_id: workspaceId,
        document_id: documentId,
      });
    } catch (error) {
      throw TauriErrorHandler.handleDocumentError(error, { documentId });
    }
  }

  /**
   * Moves a document in workspace
   */
  async moveDocument(
    workspaceId: string,
    documentId: string,
    position: Position
  ): Promise<LayoutModeChangeResponse> {
    try {
      const request: MoveDocumentRequest = {
        workspace_id: workspaceId,
        document_id: documentId,
        position: position.toPoint(),
      };

      const response: LayoutModeChangeResponse = await invoke('move_document', request as any);
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleLayoutError(error, { position });
    }
  }

  /**
   * Resizes a document in workspace
   */
  async resizeDocument(
    workspaceId: string,
    documentId: string,
    dimensions: Dimensions
  ): Promise<LayoutModeChangeResponse> {
    try {
      const request: ResizeDocumentRequest = {
        workspace_id: workspaceId,
        document_id: documentId,
        dimensions: dimensions.toSize(),
      };

      const response: LayoutModeChangeResponse = await invoke('resize_document', request as any);
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleLayoutError(error, { dimensions });
    }
  }

  /**
   * Switches workspace layout mode
   */
  async switchLayoutMode(
    workspaceId: string,
    layoutMode: LayoutModeType,
    triggeredBy: 'user' | 'auto-freeform' = 'user'
  ): Promise<LayoutModeChangeResponse> {
    try {
      const request: LayoutModeChangeRequest = {
        workspace_id: workspaceId,
        layout_mode: layoutMode,
        triggered_by: triggeredBy,
      };

      const response: LayoutModeChangeResponse = await invoke('switch_layout_mode', request as any);
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleLayoutError(error, { layoutMode });
    }
  }

  /**
   * Gets complete workspace state
   */
  async getWorkspaceState(workspaceId: string): Promise<WorkspaceStateResponse> {
    try {
      const response: WorkspaceStateResponse = await invoke('get_workspace_state', {
        workspace_id: workspaceId,
      });
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  /**
   * Updates workspace size
   */
  async updateWorkspaceSize(
    workspaceId: string,
    dimensions: Dimensions
  ): Promise<LayoutModeChangeResponse> {
    try {
      const response: LayoutModeChangeResponse = await invoke('update_workspace_size', {
        workspace_id: workspaceId,
        dimensions: dimensions.toSize(),
      });
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleLayoutError(error, { dimensions });
    }
  }

  /**
   * Saves workspace state
   */
  async saveWorkspaceState(workspaceId: string): Promise<void> {
    try {
      await invoke('save_workspace_state', {
        workspace_id: workspaceId,
      });
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }

  /**
   * Loads workspace state
   */
  async loadWorkspaceState(workspaceId: string): Promise<WorkspaceStateResponse> {
    try {
      const response: WorkspaceStateResponse = await invoke('load_workspace_state', {
        workspace_id: workspaceId,
      });
      return response;
    } catch (error) {
      throw TauriErrorHandler.handleWorkspaceError(error);
    }
  }
}

/**
 * Enhanced error handling utilities for Tauri operations
 */
export class TauriErrorHandler {
  /**
   * Handle workspace errors from Tauri backend
   */
  static handleWorkspaceError(error: unknown): WorkspaceDomainError {
    // If already a domain error, return as-is
    if (isWorkspaceDomainError(error)) {
      return error;
    }

    // Use the error factory to create appropriate domain errors
    return WorkspaceErrorFactory.fromTauriError(error);
  }

  /**
   * Handle document operation errors
   */
  static handleDocumentError(error: unknown, context: { filePath?: string; documentId?: string } = {}): WorkspaceDomainError {
    if (isWorkspaceDomainError(error)) {
      return error;
    }

    const domainError = WorkspaceErrorFactory.fromTauriError(error);

    // Add context if available
    if (context.filePath || context.documentId) {
      return new (domainError.constructor as any)(
        context.filePath || context.documentId || 'unknown',
        domainError.message
      );
    }

    return domainError;
  }

  /**
   * Handle layout operation errors
   */
  static handleLayoutError(error: unknown, context: { layoutMode?: string; position?: Position; dimensions?: Dimensions } = {}): WorkspaceDomainError {
    if (isWorkspaceDomainError(error)) {
      return error;
    }

    const domainError = WorkspaceErrorFactory.fromTauriError(error);

    // Create specific errors based on context
    if (context.layoutMode && domainError.code === 'INVALID_LAYOUT_MODE') {
      return WorkspaceErrorFactory.createPositionError(0, 0, domainError.message);
    }

    if (context.position && domainError.code === 'INVALID_POSITION') {
      return WorkspaceErrorFactory.createPositionError(
        context.position.getX(),
        context.position.getY(),
        domainError.message
      );
    }

    if (context.dimensions && domainError.code === 'INVALID_DIMENSIONS') {
      return WorkspaceErrorFactory.createDimensionsError(
        context.dimensions.getWidth(),
        context.dimensions.getHeight(),
        domainError.message
      );
    }

    return domainError;
  }

  /**
   * Check if an error is recoverable (user can retry)
   */
  static isRetryableError(error: unknown): boolean {
    if (isWorkspaceDomainError(error)) {
      return error.recoverable;
    }

    // Legacy check for non-domain errors
    if (error instanceof Error) {
      const retryableMessages = [
        'network error',
        'timeout',
        'connection refused',
        'temporary failure',
        'file access',
        'permission denied'
      ];

      return retryableMessages.some(msg =>
        error.message.toLowerCase().includes(msg)
      );
    }

    return false;
  }

  /**
   * Check if an error requires user confirmation
   */
  static requiresConfirmation(error: unknown): boolean {
    return isWorkspaceDomainError(error) && error.code === 'CONFIRMATION_REQUIRED';
  }

  /**
   * Extract user-friendly error message
   */
  static getUserMessage(error: unknown): string {
    return getUserMessage(error);
  }

  /**
   * Extract error code for logging/analytics
   */
  static getErrorCode(error: unknown): string {
    if (isWorkspaceDomainError(error)) {
      return error.code;
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Create error summary for error boundaries
   */
  static createErrorSummary(error: unknown, operation: string): {
    code: string;
    message: string;
    userMessage: string;
    recoverable: boolean;
    timestamp: Date;
    operation: string;
  } {
    const domainError = isWorkspaceDomainError(error)
      ? error
      : WorkspaceErrorFactory.fromTauriError(error);

    return {
      code: domainError.code,
      message: domainError.message,
      userMessage: domainError.userMessage,
      recoverable: domainError.recoverable,
      timestamp: domainError.timestamp,
      operation
    };
  }
}

/**
 * Factory for creating configured workspace adapter
 */
export const createTauriWorkspaceAdapter = (): TauriWorkspaceAdapter => {
  return new TauriWorkspaceAdapter();
};

/**
 * Factory for creating configured repository
 */
export const createTauriWorkspaceRepository = (): TauriWorkspaceRepository => {
  return new TauriWorkspaceRepository();
};

/**
 * Factory for creating configured file service
 */
export const createTauriDocumentFileService = (): TauriDocumentFileService => {
  return new TauriDocumentFileService();
};

export default TauriWorkspaceAdapter;