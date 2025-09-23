import { Position, Dimensions } from '../domain/value-objects/geometry';
import { LayoutModeType } from '../domain/value-objects/layout-mode';

/**
 * Generate a UUID v4 compatible string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
import {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  AddDocumentRequest,
  AddDocumentResponse,
  LayoutModeChangeRequest,
  LayoutModeChangeResponse,
  WorkspaceStateResponse
} from './tauri-workspace-adapter';

/**
 * Mock workspace adapter for browser development
 */
export class MockWorkspaceAdapter {
  private mockWorkspaces: Map<string, any> = new Map();
  private currentWorkspaceId: string | null = null;
  private lastUpdateTime: number = 0;
  private updateDebounceMs: number = 100; // Prevent rapid updates

  constructor() {
    // Initialize with demo data
    this.initializeMockData();
  }

  /**
   * Helper to find workspace with fallback
   */
  private findWorkspace(workspaceId: string): { workspace: any; id: string } | null {
    // Try exact match first
    let workspace = this.mockWorkspaces.get(workspaceId);
    if (workspace) {
      return { workspace, id: workspaceId };
    }

    // Try current workspace as fallback
    if (this.currentWorkspaceId) {
      workspace = this.mockWorkspaces.get(this.currentWorkspaceId);
      if (workspace) {
        return { workspace, id: this.currentWorkspaceId };
      }
    }

    // Try any available workspace as last resort
    if (this.mockWorkspaces.size > 0) {
      const firstEntry = Array.from(this.mockWorkspaces.entries())[0];
      console.warn(`Mock: Using fallback workspace ${firstEntry[0]} instead of ${workspaceId}`);
      return { workspace: firstEntry[1], id: firstEntry[0] };
    }

    return null;
  }

  private initializeMockData() {
    const demoWorkspaceId = `mws_${generateUUID()}`;
    this.mockWorkspaces.set(demoWorkspaceId, {
      workspace_id: demoWorkspaceId,
      name: 'Demo Research Workspace',
      layout_mode: 'FREEFORM',
      workspace_size: { width: 1200, height: 800 },
      documents: [],
      last_modified: new Date().toISOString(),
    });
    this.currentWorkspaceId = demoWorkspaceId;
  }

  /**
   * Creates a new workspace
   */
  async createWorkspace(
    name: string,
    layoutMode: LayoutModeType = LayoutModeType.STACKED,
    workspaceSize?: Dimensions
  ): Promise<CreateWorkspaceResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));

    const workspaceId = `mws_${generateUUID()}`;
    const workspace = {
      workspace_id: workspaceId,
      name,
      layout_mode: layoutMode,
      workspace_size: workspaceSize
        ? workspaceSize.toSize()
        : { width: 1200, height: 800 },
      documents: [],
      last_modified: new Date().toISOString(),
    };

    this.mockWorkspaces.set(workspaceId, workspace);
    this.currentWorkspaceId = workspaceId;

    console.log('Mock: Created workspace', workspace);

    return {
      workspace_id: workspaceId,
      name,
      layout_mode: layoutMode,
      workspace_size: workspace.workspace_size,
      created_at: new Date().toISOString(),
    };
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
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const documentId = `doc_${generateUUID()}`;
    const title = filePath.split('/').pop() || filePath;

    const document = {
      document_id: documentId,
      file_path: filePath,
      title,
      position: position?.toPoint() || { x: 50 + workspace.documents.length * 60, y: 50 + workspace.documents.length * 40 },
      dimensions: dimensions?.toSize() || { width: 400, height: 500 },
      z_index: workspace.documents.length + 1,
      is_active: workspace.documents.length === 0, // First document is active
      is_visible: true,
      state: 'Ready',
      error_message: undefined,
    };

    workspace.documents.push(document);
    workspace.last_modified = new Date().toISOString();

    console.log('Mock: Added document', document);

    return {
      document_id: documentId,
      file_path: filePath,
      title,
      position: document.position,
      dimensions: document.dimensions,
      was_activated: document.is_active,
    };
  }

  /**
   * Removes a document from workspace
   */
  async removeDocument(workspaceId: string, documentId: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const index = workspace.documents.findIndex((doc: any) => doc.document_id === documentId);
    if (index === -1) {
      return false;
    }

    workspace.documents.splice(index, 1);
    workspace.last_modified = new Date().toISOString();

    console.log('Mock: Removed document', documentId);
    return true;
  }

  /**
   * Removes all documents from workspace
   */
  async removeAllDocuments(workspaceId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const count = workspace.documents.length;
    workspace.documents = [];
    workspace.last_modified = new Date().toISOString();

    console.log('Mock: Removed all documents, count:', count);
    return count;
  }

  /**
   * Activates a document in workspace
   */
  async activateDocument(workspaceId: string, documentId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    // Deactivate all documents
    workspace.documents.forEach((doc: any) => {
      doc.is_active = false;
    });

    // Activate the target document
    const document = workspace.documents.find((doc: any) => doc.document_id === documentId);
    if (document) {
      document.is_active = true;
      workspace.last_modified = new Date().toISOString();
      console.log('Mock: Activated document', documentId);
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
    await new Promise(resolve => setTimeout(resolve, 50));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const document = workspace.documents.find((doc: any) => doc.document_id === documentId);
    if (document) {
      document.position = position.toPoint();
      workspace.last_modified = new Date().toISOString();
      console.log('Mock: Moved document', documentId, 'to', position.toPoint());
    }

    return {
      layout_results: workspace.documents.map((doc: any) => ({
        document_id: doc.document_id,
        position: doc.position,
        dimensions: doc.dimensions,
        z_index: doc.z_index,
        is_visible: doc.is_visible,
      })),
      triggered_auto_freeform: false,
    };
  }

  /**
   * Resizes a document in workspace
   */
  async resizeDocument(
    workspaceId: string,
    documentId: string,
    dimensions: Dimensions
  ): Promise<LayoutModeChangeResponse> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const document = workspace.documents.find((doc: any) => doc.document_id === documentId);
    if (document) {
      document.dimensions = dimensions.toSize();
      workspace.last_modified = new Date().toISOString();
      console.log('Mock: Resized document', documentId, 'to', dimensions.toSize());
    }

    return {
      layout_results: workspace.documents.map((doc: any) => ({
        document_id: doc.document_id,
        position: doc.position,
        dimensions: doc.dimensions,
        z_index: doc.z_index,
        is_visible: doc.is_visible,
      })),
      triggered_auto_freeform: false,
    };
  }

  /**
   * Switches workspace layout mode
   */
  async switchLayoutMode(
    workspaceId: string,
    layoutMode: LayoutModeType,
    triggeredBy: 'user' | 'auto-freeform' = 'user'
  ): Promise<LayoutModeChangeResponse> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    workspace.layout_mode = layoutMode;
    workspace.last_modified = new Date().toISOString();

    // Apply automatic layout based on mode
    if (layoutMode === LayoutModeType.STACKED) {
      workspace.documents.forEach((doc: any, index: number) => {
        doc.position = { x: 20, y: 20 + index * 60 };
        doc.dimensions = { width: 600, height: 400 };
        doc.z_index = index + 1;
      });
    } else if (layoutMode === LayoutModeType.GRID) {
      const docCount = workspace.documents.length;

      if (docCount > 0) {
        // Calculate optimal grid dimensions that most evenly match a square
        const calculateGridDimensions = (count: number) => {
          if (count <= 1) return { cols: 1, rows: 1 };
          if (count <= 2) return { cols: 2, rows: 1 };
          if (count <= 4) return { cols: 2, rows: 2 };
          if (count <= 6) return { cols: 3, rows: 2 };
          if (count <= 9) return { cols: 3, rows: 3 };

          // For larger numbers, aim for roughly square layout
          const cols = Math.ceil(Math.sqrt(count));
          const rows = Math.ceil(count / cols);
          return { cols, rows };
        };

        const { cols, rows } = calculateGridDimensions(docCount);

        // Calculate cell dimensions with padding to fill entire workspace
        const padding = 20;
        const cellWidth = (workspace.workspace_size.width - padding * (cols + 1)) / cols;
        const cellHeight = (workspace.workspace_size.height - padding * (rows + 1)) / rows;

        // Ensure minimum dimensions
        const minWidth = 200;
        const minHeight = 150;
        const finalCellWidth = Math.max(cellWidth, minWidth);
        const finalCellHeight = Math.max(cellHeight, minHeight);

        workspace.documents.forEach((doc: any, index: number) => {
          const row = Math.floor(index / cols);
          const col = index % cols;

          const x = padding + col * (finalCellWidth + padding);
          const y = padding + row * (finalCellHeight + padding);

          doc.position = { x, y };
          doc.dimensions = { width: finalCellWidth, height: finalCellHeight };
          doc.z_index = index + 1;
        });
      }
    }

    console.log('Mock: Switched layout mode to', layoutMode);

    return {
      layout_results: workspace.documents.map((doc: any) => ({
        document_id: doc.document_id,
        position: doc.position,
        dimensions: doc.dimensions,
        z_index: doc.z_index,
        is_visible: doc.is_visible,
      })),
      triggered_auto_freeform: triggeredBy === 'auto-freeform',
    };
  }

  /**
   * Gets complete workspace state
   */
  async getWorkspaceState(workspaceId: string): Promise<WorkspaceStateResponse> {
    await new Promise(resolve => setTimeout(resolve, 50));

    const result = this.findWorkspace(workspaceId);
    if (!result) {
      console.warn(`Mock: No workspaces available for ID: ${workspaceId}`);
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const { workspace, id } = result;

    console.log('Mock: Retrieved workspace state', id);
    return workspace;
  }

  /**
   * Updates workspace size
   */
  async updateWorkspaceSize(
    workspaceId: string,
    dimensions: Dimensions
  ): Promise<LayoutModeChangeResponse> {
    // Debounce rapid updates
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateDebounceMs) {
      // Return cached response without any processing
      const result = this.findWorkspace(workspaceId);
      if (result) {
        return {
          layout_results: result.workspace.documents.map((doc: any) => ({
            document_id: doc.document_id,
            position: doc.position,
            dimensions: doc.dimensions,
            z_index: doc.z_index,
            is_visible: doc.is_visible,
          })),
          triggered_auto_freeform: false,
        };
      }
      return {
        layout_results: [],
        triggered_auto_freeform: false,
      };
    }

    const result = this.findWorkspace(workspaceId);
    if (!result) {
      console.warn(`Mock: No workspaces available for ID: ${workspaceId}`);
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    const { workspace } = result;

    // Check if dimensions actually changed (with tolerance for floating point precision)
    const currentSize = workspace.workspace_size;
    const newSize = dimensions.toSize();
    const tolerance = 1; // 1px tolerance

    const widthChanged = Math.abs(currentSize.width - newSize.width) > tolerance;
    const heightChanged = Math.abs(currentSize.height - newSize.height) > tolerance;

    if (!widthChanged && !heightChanged) {
      // No significant change, return early without logging
      return {
        layout_results: workspace.documents.map((doc: any) => ({
          document_id: doc.document_id,
          position: doc.position,
          dimensions: doc.dimensions,
          z_index: doc.z_index,
          is_visible: doc.is_visible,
        })),
        triggered_auto_freeform: false,
      };
    }

    // Update debounce timer only when we actually process a change
    this.lastUpdateTime = now;

    await new Promise(resolve => setTimeout(resolve, 50));

    workspace.workspace_size = newSize;
    workspace.last_modified = new Date().toISOString();

    console.log('Mock: Updated workspace size', newSize);

    return {
      layout_results: workspace.documents.map((doc: any) => ({
        document_id: doc.document_id,
        position: doc.position,
        dimensions: doc.dimensions,
        z_index: doc.z_index,
        is_visible: doc.is_visible,
      })),
      triggered_auto_freeform: false,
    };
  }

  /**
   * Saves workspace state
   */
  async saveWorkspaceState(workspaceId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const workspace = this.mockWorkspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    console.log('Mock: Saved workspace state', workspaceId);
    // In a real implementation, this would persist to storage
  }

  /**
   * Loads workspace state
   */
  async loadWorkspaceState(workspaceId: string): Promise<WorkspaceStateResponse> {
    return this.getWorkspaceState(workspaceId);
  }
}

// Singleton instance for shared state across components
let mockWorkspaceAdapterInstance: MockWorkspaceAdapter | null = null;

/**
 * Factory function to create mock workspace adapter (singleton)
 */
export const createMockWorkspaceAdapter = (): MockWorkspaceAdapter => {
  if (!mockWorkspaceAdapterInstance) {
    mockWorkspaceAdapterInstance = new MockWorkspaceAdapter();
  }
  return mockWorkspaceAdapterInstance;
};

export default MockWorkspaceAdapter;