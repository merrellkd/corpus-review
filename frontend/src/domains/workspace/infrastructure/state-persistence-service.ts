import { WorkspaceId, DocumentCaddyId } from '../domain/value-objects/identifiers';
import { Workspace } from '../domain/aggregates/workspace';
import { DocumentCaddy } from '../domain/entities/document-caddy';
import { LayoutModeType } from '../domain/value-objects/layout-mode';

/**
 * Interface for workspace state persistence operations
 */
export interface StatePersistenceService {
  saveWorkspaceState(workspace: Workspace): Promise<void>;
  loadWorkspaceState(workspaceId: WorkspaceId): Promise<WorkspaceState | undefined>;
  saveWorkspaceSnapshot(workspaceId: WorkspaceId, snapshot: WorkspaceSnapshot): Promise<void>;
  loadWorkspaceSnapshot(workspaceId: WorkspaceId, snapshotId: string): Promise<WorkspaceSnapshot | undefined>;
  listWorkspaceSnapshots(workspaceId: WorkspaceId): Promise<WorkspaceSnapshotMetadata[]>;
  deleteWorkspaceSnapshot(workspaceId: WorkspaceId, snapshotId: string): Promise<boolean>;
  exportWorkspaceState(workspaceId: WorkspaceId): Promise<WorkspaceExport>;
  importWorkspaceState(exportData: WorkspaceExport): Promise<WorkspaceId>;
  clearWorkspaceState(workspaceId: WorkspaceId): Promise<void>;
}

/**
 * Complete workspace state for persistence
 */
export interface WorkspaceState {
  workspace: WorkspaceData;
  documents: DocumentData[];
  layoutState: LayoutState;
  metadata: StateMetadata;
}

/**
 * Workspace data for serialization
 */
export interface WorkspaceData {
  id: string;
  name: string;
  layoutMode: LayoutModeType;
  workspaceSize: { width: number; height: number };
  activeDocumentId?: string | undefined;
  createdAt: string;
  lastModified: string;
}

/**
 * Document data for serialization
 */
export interface DocumentData {
  id: string;
  filePath: string;
  title: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  isActive: boolean;
  zIndex: number;
  state: string;
  errorMessage?: string | undefined;
  createdAt: string;
  lastModified: string;
}

/**
 * Layout state information
 */
export interface LayoutState {
  calculatedPositions: DocumentLayoutPosition[];
  transitionState?: {
    fromMode: LayoutModeType;
    toMode: LayoutModeType;
    progress: number;
    startedAt: string;
  };
  userCustomizations: UserLayoutCustomizations;
}

/**
 * Document position in calculated layout
 */
export interface DocumentLayoutPosition {
  documentId: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  zIndex: number;
  isVisible: boolean;
}

/**
 * User customizations to layout behavior
 */
export interface UserLayoutCustomizations {
  snapToGrid: boolean;
  gridSize: number;
  autoArrange: boolean;
  animationDuration: number;
  minimumDocumentSize: { width: number; height: number };
  maximumDocumentSize: { width: number; height: number };
  padding: number;
}

/**
 * State metadata for versioning and tracking
 */
export interface StateMetadata {
  version: string;
  savedAt: string;
  savedBy: string;
  checksum: string;
  size: number;
}

/**
 * Workspace snapshot for restore points
 */
export interface WorkspaceSnapshot {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  state: WorkspaceState;
  createdAt: string;
  tags: string[];
}

/**
 * Snapshot metadata for listing
 */
export interface WorkspaceSnapshotMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  documentCount: number;
  layoutMode: LayoutModeType;
  tags: string[];
  size: number;
}

/**
 * Export format for workspace sharing
 */
export interface WorkspaceExport {
  format: 'workspace-export-v1';
  exportedAt: string;
  exportedBy: string;
  workspace: WorkspaceState;
  metadata: {
    originalWorkspaceId: string;
    documentPaths: string[];
    dependencies: string[];
  };
}

/**
 * Implementation of state persistence using browser storage
 */
export class BrowserStatePersistenceService implements StatePersistenceService {
  private static readonly STORAGE_PREFIX = 'workspace_state_';
  private static readonly SNAPSHOT_PREFIX = 'workspace_snapshot_';
  private static readonly CURRENT_VERSION = '1.0.0';

  constructor(
    private readonly storage: Storage = localStorage,
    private readonly compressionEnabled: boolean = true
  ) {}

  async saveWorkspaceState(workspace: Workspace): Promise<void> {
    const state = this.createWorkspaceState(workspace);
    const serializedState = await this.serializeState(state);
    const key = this.getStateKey(workspace.getId());

    this.storage.setItem(key, serializedState);
  }

  async loadWorkspaceState(workspaceId: WorkspaceId): Promise<WorkspaceState | undefined> {
    const key = this.getStateKey(workspaceId);
    const serializedState = this.storage.getItem(key);

    if (!serializedState) {
      return undefined;
    }

    try {
      return await this.deserializeState(serializedState);
    } catch (error) {
      console.warn(`Failed to load workspace state for ${workspaceId.toString()}: ${error}`);
      return undefined;
    }
  }

  async saveWorkspaceSnapshot(workspaceId: WorkspaceId, snapshot: WorkspaceSnapshot): Promise<void> {
    const serializedSnapshot = await this.serializeSnapshot(snapshot);
    const key = this.getSnapshotKey(workspaceId, snapshot.id);

    this.storage.setItem(key, serializedSnapshot);

    // Update snapshot index
    await this.updateSnapshotIndex(workspaceId, snapshot);
  }

  async loadWorkspaceSnapshot(workspaceId: WorkspaceId, snapshotId: string): Promise<WorkspaceSnapshot | undefined> {
    const key = this.getSnapshotKey(workspaceId, snapshotId);
    const serializedSnapshot = this.storage.getItem(key);

    if (!serializedSnapshot) {
      return undefined;
    }

    try {
      return await this.deserializeSnapshot(serializedSnapshot);
    } catch (error) {
      console.warn(`Failed to load workspace snapshot ${snapshotId}: ${error}`);
      return undefined;
    }
  }

  async listWorkspaceSnapshots(workspaceId: WorkspaceId): Promise<WorkspaceSnapshotMetadata[]> {
    const indexKey = this.getSnapshotIndexKey(workspaceId);
    const indexData = this.storage.getItem(indexKey);

    if (!indexData) {
      return [];
    }

    try {
      const index = JSON.parse(indexData) as WorkspaceSnapshotMetadata[];
      return index.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.warn(`Failed to load snapshot index for ${workspaceId.toString()}: ${error}`);
      return [];
    }
  }

  async deleteWorkspaceSnapshot(workspaceId: WorkspaceId, snapshotId: string): Promise<boolean> {
    const key = this.getSnapshotKey(workspaceId, snapshotId);
    const existed = this.storage.getItem(key) !== null;

    if (existed) {
      this.storage.removeItem(key);
      await this.removeFromSnapshotIndex(workspaceId, snapshotId);
    }

    return existed;
  }

  async exportWorkspaceState(workspaceId: WorkspaceId): Promise<WorkspaceExport> {
    const state = await this.loadWorkspaceState(workspaceId);

    if (!state) {
      throw new Error(`Workspace state not found: ${workspaceId.toString()}`);
    }

    const documentPaths = state.documents.map(doc => doc.filePath);

    return {
      format: 'workspace-export-v1',
      exportedAt: new Date().toISOString(),
      exportedBy: 'multi-document-workspace',
      workspace: state,
      metadata: {
        originalWorkspaceId: workspaceId.toString(),
        documentPaths,
        dependencies: []
      }
    };
  }

  async importWorkspaceState(exportData: WorkspaceExport): Promise<WorkspaceId> {
    if (exportData.format !== 'workspace-export-v1') {
      throw new Error(`Unsupported export format: ${exportData.format}`);
    }

    // Generate new workspace ID for import
    const newWorkspaceId = WorkspaceId.create();

    // Update workspace ID in the state
    const updatedState = {
      ...exportData.workspace,
      workspace: {
        ...exportData.workspace.workspace,
        id: newWorkspaceId.toString(),
        name: `${exportData.workspace.workspace.name} (Imported)`,
        lastModified: new Date().toISOString()
      }
    };

    const serializedState = await this.serializeState(updatedState);
    const key = this.getStateKey(newWorkspaceId);

    this.storage.setItem(key, serializedState);

    return newWorkspaceId;
  }

  async clearWorkspaceState(workspaceId: WorkspaceId): Promise<void> {
    const stateKey = this.getStateKey(workspaceId);
    this.storage.removeItem(stateKey);

    // Clear all snapshots
    const snapshots = await this.listWorkspaceSnapshots(workspaceId);
    for (const snapshot of snapshots) {
      await this.deleteWorkspaceSnapshot(workspaceId, snapshot.id);
    }

    // Clear snapshot index
    const indexKey = this.getSnapshotIndexKey(workspaceId);
    this.storage.removeItem(indexKey);
  }

  private createWorkspaceState(workspace: Workspace): WorkspaceState {
    const workspaceData: WorkspaceData = {
      id: workspace.getId().toString(),
      name: workspace.getName(),
      layoutMode: workspace.getLayoutMode().getType(),
      workspaceSize: workspace.getWorkspaceSize().toSize(),
      activeDocumentId: workspace.getActiveDocument()?.getId().toString(),
      createdAt: workspace.getCreatedAt().toISOString(),
      lastModified: workspace.getLastModified().toISOString()
    };

    const documents = workspace.getAllDocuments();
    const documentData: DocumentData[] = documents.map(doc => ({
      id: doc.getId().toString(),
      filePath: doc.getFilePath(),
      title: doc.getTitle(),
      position: doc.getPosition().toPoint(),
      dimensions: doc.getDimensions().toSize(),
      isActive: doc.isActiveCaddy(),
      zIndex: doc.getZIndex(),
      state: doc.getState(),
      errorMessage: doc.getErrorMessage(),
      createdAt: doc.getCreatedAt().toISOString(),
      lastModified: doc.getLastModified().toISOString()
    }));

    const layoutState: LayoutState = {
      calculatedPositions: [],
      userCustomizations: {
        snapToGrid: false,
        gridSize: 20,
        autoArrange: true,
        animationDuration: 300,
        minimumDocumentSize: { width: 100, height: 50 },
        maximumDocumentSize: { width: 1200, height: 800 },
        padding: 20
      }
    };

    const metadata: StateMetadata = {
      version: BrowserStatePersistenceService.CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      savedBy: 'multi-document-workspace',
      checksum: this.calculateChecksum(workspaceData, documentData),
      size: 0 // Will be calculated during serialization
    };

    return {
      workspace: workspaceData,
      documents: documentData,
      layoutState,
      metadata
    };
  }

  private async serializeState(state: WorkspaceState): Promise<string> {
    const serialized = JSON.stringify(state);
    state.metadata.size = serialized.length;

    if (this.compressionEnabled && typeof CompressionStream !== 'undefined') {
      try {
        return await this.compressString(serialized);
      } catch (error) {
        console.warn('Compression failed, using uncompressed data:', error);
        return serialized;
      }
    }

    return serialized;
  }

  private async deserializeState(serializedState: string): Promise<WorkspaceState> {
    let dataString = serializedState;

    if (this.compressionEnabled && this.isCompressedData(serializedState)) {
      try {
        dataString = await this.decompressString(serializedState);
      } catch (error) {
        throw new Error(`Failed to decompress state data: ${error}`);
      }
    }

    return JSON.parse(dataString);
  }

  private async serializeSnapshot(snapshot: WorkspaceSnapshot): Promise<string> {
    const serialized = JSON.stringify(snapshot);

    if (this.compressionEnabled && typeof CompressionStream !== 'undefined') {
      try {
        return await this.compressString(serialized);
      } catch (error) {
        console.warn('Snapshot compression failed, using uncompressed data:', error);
        return serialized;
      }
    }

    return serialized;
  }

  private async deserializeSnapshot(serializedSnapshot: string): Promise<WorkspaceSnapshot> {
    let dataString = serializedSnapshot;

    if (this.compressionEnabled && this.isCompressedData(serializedSnapshot)) {
      try {
        dataString = await this.decompressString(serializedSnapshot);
      } catch (error) {
        throw new Error(`Failed to decompress snapshot data: ${error}`);
      }
    }

    return JSON.parse(dataString);
  }

  private async updateSnapshotIndex(workspaceId: WorkspaceId, snapshot: WorkspaceSnapshot): Promise<void> {
    const indexKey = this.getSnapshotIndexKey(workspaceId);
    const existingIndex = await this.listWorkspaceSnapshots(workspaceId);

    const metadata: WorkspaceSnapshotMetadata = {
      id: snapshot.id,
      name: snapshot.name,
      description: snapshot.description,
      createdAt: snapshot.createdAt,
      documentCount: snapshot.state.documents.length,
      layoutMode: snapshot.state.workspace.layoutMode,
      tags: snapshot.tags,
      size: JSON.stringify(snapshot).length
    };

    // Remove existing entry if it exists
    const updatedIndex = existingIndex.filter(item => item.id !== snapshot.id);
    updatedIndex.push(metadata);

    this.storage.setItem(indexKey, JSON.stringify(updatedIndex));
  }

  private async removeFromSnapshotIndex(workspaceId: WorkspaceId, snapshotId: string): Promise<void> {
    const indexKey = this.getSnapshotIndexKey(workspaceId);
    const existingIndex = await this.listWorkspaceSnapshots(workspaceId);

    const updatedIndex = existingIndex.filter(item => item.id !== snapshotId);
    this.storage.setItem(indexKey, JSON.stringify(updatedIndex));
  }

  private calculateChecksum(workspaceData: WorkspaceData, documentData: DocumentData[]): string {
    const combined = JSON.stringify({ workspace: workspaceData, documents: documentData });

    // Simple checksum using hash code
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  private async compressString(data: string): Promise<string> {
    if (typeof CompressionStream === 'undefined') {
      return data;
    }

    const stream = new CompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new TextEncoder().encode(data));
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }

    return btoa(String.fromCharCode(...compressed));
  }

  private async decompressString(compressedData: string): Promise<string> {
    if (typeof DecompressionStream === 'undefined') {
      return compressedData;
    }

    const compressed = new Uint8Array(atob(compressedData).split('').map(c => c.charCodeAt(0)));

    const stream = new DecompressionStream('gzip');
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(compressed);
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        chunks.push(value);
      }
    }

    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      decompressed.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(decompressed);
  }

  private isCompressedData(data: string): boolean {
    try {
      // Try to parse as JSON - if it succeeds, it's not compressed
      JSON.parse(data);
      return false;
    } catch {
      // If JSON parsing fails, assume it's compressed
      return true;
    }
  }

  private getStateKey(workspaceId: WorkspaceId): string {
    return `${BrowserStatePersistenceService.STORAGE_PREFIX}${workspaceId.toString()}`;
  }

  private getSnapshotKey(workspaceId: WorkspaceId, snapshotId: string): string {
    return `${BrowserStatePersistenceService.SNAPSHOT_PREFIX}${workspaceId.toString()}_${snapshotId}`;
  }

  private getSnapshotIndexKey(workspaceId: WorkspaceId): string {
    return `${BrowserStatePersistenceService.SNAPSHOT_PREFIX}index_${workspaceId.toString()}`;
  }
}