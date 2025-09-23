import { invoke } from '@tauri-apps/api/tauri';
import { Workspace } from '../domain/aggregates/workspace';
import { WorkspaceId } from '../domain/value-objects/identifiers';
import { Position, Dimensions } from '../domain/value-objects/geometry';
import { LayoutModeType, LayoutMode } from '../domain/value-objects/layout-mode';
import { DocumentCaddy, DocumentCaddyState } from '../domain/entities/document-caddy';

/**
 * Serialized workspace layout for persistence
 */
export interface SerializedWorkspaceLayout {
  workspaceId: string;
  name: string;
  layoutMode: string;
  workspaceDimensions: {
    width: number;
    height: number;
  };
  documents: SerializedDocumentLayout[];
  metadata: {
    version: string;
    createdAt: string;
    lastModified: string;
    saveCount: number;
    autoSaveEnabled: boolean;
  };
  settings: {
    gridSnapEnabled: boolean;
    documentStackingOrder: 'zIndex' | 'lastModified' | 'manual';
    defaultDocumentDimensions: {
      width: number;
      height: number;
    };
    layoutTransitionsEnabled: boolean;
    autoLayoutEnabled: boolean;
  };
}

/**
 * Serialized document layout for persistence
 */
export interface SerializedDocumentLayout {
  documentId: string;
  filePath: string;
  title: string;
  position: {
    x: number;
    y: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
  zIndex: number;
  isActive: boolean;
  isVisible: boolean;
  state: string;
  errorMessage?: string;
  isDraggable: boolean;
  isResizable: boolean;
  metadata: {
    addedAt: string;
    lastModified: string;
    accessCount: number;
  };
}

/**
 * Layout persistence configuration
 */
export interface PersistenceConfig {
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in milliseconds
  maxBackups: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  syncToCloud: boolean;
}

/**
 * Layout restoration options
 */
export interface RestorationOptions {
  validateFilePaths: boolean;
  restoreInactiveDocuments: boolean;
  fallbackToDefault: boolean;
  preserveZIndices: boolean;
  maintainAspectRatios: boolean;
}

/**
 * Layout backup metadata
 */
export interface LayoutBackup {
  id: string;
  workspaceId: string;
  timestamp: string;
  size: number;
  checksum: string;
  isAutoSave: boolean;
  description?: string;
}

/**
 * Default persistence configuration
 */
const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  autoSaveEnabled: true,
  autoSaveInterval: 30000, // 30 seconds
  maxBackups: 10,
  compressionEnabled: true,
  encryptionEnabled: false,
  syncToCloud: false,
};

/**
 * Default restoration options
 */
const DEFAULT_RESTORATION_OPTIONS: RestorationOptions = {
  validateFilePaths: true,
  restoreInactiveDocuments: true,
  fallbackToDefault: true,
  preserveZIndices: true,
  maintainAspectRatios: false,
};

/**
 * Layout persistence service for managing workspace state
 */
export class LayoutPersistenceService {
  private config: PersistenceConfig;
  private autoSaveTimer: NodeJS.Timeout | null = null;
  private isAutoSaving = false;

  constructor(config: PersistenceConfig = DEFAULT_PERSISTENCE_CONFIG) {
    this.config = { ...DEFAULT_PERSISTENCE_CONFIG, ...config };
  }

  /**
   * Serialize a workspace to persistable format
   */
  public serializeWorkspace(workspace: Workspace): SerializedWorkspaceLayout {
    const documents = workspace.getAllDocuments();

    return {
      workspaceId: workspace.getId().toString(),
      name: workspace.getName(),
      layoutMode: workspace.getLayoutMode().getType(),
      workspaceDimensions: workspace.getWorkspaceSize().toSize(),
      documents: documents.map(doc => this.serializeDocument(doc)),
      metadata: {
        version: '1.0.0',
        createdAt: workspace.getCreatedAt().toISOString(),
        lastModified: workspace.getLastModified().toISOString(),
        saveCount: 0, // This would be tracked separately
        autoSaveEnabled: this.config.autoSaveEnabled,
      },
      settings: {
        gridSnapEnabled: false, // Would come from workspace settings
        documentStackingOrder: 'zIndex',
        defaultDocumentDimensions: {
          width: 400,
          height: 500,
        },
        layoutTransitionsEnabled: true,
        autoLayoutEnabled: true,
      },
    };
  }

  /**
   * Serialize a document to persistable format
   */
  private serializeDocument(document: DocumentCaddy): SerializedDocumentLayout {
    return {
      documentId: document.getId().toString(),
      filePath: document.getFilePath(),
      title: document.getTitle(),
      position: document.getPosition().toPoint(),
      dimensions: document.getDimensions().toSize(),
      zIndex: document.getZIndex(),
      isActive: document.isActiveCaddy(),
      isVisible: document.isVisible(),
      state: document.getState(),
      errorMessage: document.getErrorMessage(),
      isDraggable: true, // Default value since method doesn't exist yet
      isResizable: true, // Default value since method doesn't exist yet
      metadata: {
        addedAt: new Date().toISOString(), // Would be tracked by document
        lastModified: new Date().toISOString(),
        accessCount: 0, // Would be tracked by document
      },
    };
  }

  /**
   * Deserialize workspace layout from persistence format
   */
  public async deserializeWorkspace(
    data: SerializedWorkspaceLayout,
    options: RestorationOptions = DEFAULT_RESTORATION_OPTIONS
  ): Promise<Workspace> {
    // Create workspace instance
    const workspaceId = WorkspaceId.fromString(data.workspaceId);
    const layoutMode = LayoutMode.fromString(data.layoutMode as LayoutModeType);
    const workspaceDimensions = Dimensions.fromValues(
      data.workspaceDimensions.width,
      data.workspaceDimensions.height
    );

    const workspace = Workspace.create(data.name, layoutMode, workspaceDimensions);

    // Restore documents
    for (const docData of data.documents) {
      try {
        // Validate file path if required
        if (options.validateFilePaths) {
          const fileExists = await this.validateFilePath(docData.filePath);
          if (!fileExists) {
            console.warn(`File not found during restoration: ${docData.filePath}`);
            if (!options.fallbackToDefault) {
              continue;
            }
          }
        }

        // Skip inactive documents if not restoring them
        if (!options.restoreInactiveDocuments && !docData.isVisible) {
          continue;
        }

        // Create position and dimensions
        let position = Position.fromCoordinates(docData.position.x, docData.position.y);
        let dimensions = Dimensions.fromValues(docData.dimensions.width, docData.dimensions.height);

        // Maintain aspect ratios if required
        if (options.maintainAspectRatios) {
          const aspectRatio = docData.dimensions.width / docData.dimensions.height;
          if (dimensions.getWidth() / dimensions.getHeight() !== aspectRatio) {
            dimensions = Dimensions.fromValues(
              dimensions.getHeight() * aspectRatio,
              dimensions.getHeight()
            );
          }
        }

        // Add document to workspace
        workspace.addDocument(docData.filePath, docData.title, position, dimensions);

        // Set additional properties if preserving z-indices
        if (options.preserveZIndices) {
          const addedDoc = workspace.getActiveDocument();
          if (addedDoc) {
            // Note: In a full implementation, you'd need methods to set these properties
            // addedDoc.setZIndex(docData.zIndex);
            // addedDoc.setVisible(docData.isVisible);
          }
        }
      } catch (error) {
        console.error(`Failed to restore document ${docData.filePath}:`, error);
        if (!options.fallbackToDefault) {
          throw error;
        }
      }
    }

    return workspace;
  }

  /**
   * Save workspace layout to persistent storage
   */
  public async saveLayout(workspace: Workspace, description?: string): Promise<boolean> {
    try {
      const serializedLayout = this.serializeWorkspace(workspace);

      // Save to Tauri backend
      const result: boolean = await invoke('save_workspace_layout', {
        layout: serializedLayout,
        isAutoSave: false,
        description,
      });

      if (result) {
        console.log(`Workspace layout saved: ${workspace.getName()}`);
      }

      return result;
    } catch (error) {
      console.error('Failed to save workspace layout:', error);
      return false;
    }
  }

  /**
   * Load workspace layout from persistent storage
   */
  public async loadLayout(
    workspaceId: string,
    options: RestorationOptions = DEFAULT_RESTORATION_OPTIONS
  ): Promise<Workspace | null> {
    try {
      const serializedLayout: SerializedWorkspaceLayout = await invoke('load_workspace_layout', {
        workspaceId,
      });

      if (!serializedLayout) {
        console.warn(`No saved layout found for workspace: ${workspaceId}`);
        return null;
      }

      const workspace = await this.deserializeWorkspace(serializedLayout, options);
      console.log(`Workspace layout loaded: ${workspace.getName()}`);

      return workspace;
    } catch (error) {
      console.error('Failed to load workspace layout:', error);

      if (options.fallbackToDefault) {
        console.log('Creating default workspace as fallback');
        return this.createDefaultWorkspace();
      }

      return null;
    }
  }

  /**
   * Auto-save workspace layout at regular intervals
   */
  public startAutoSave(workspace: Workspace): void {
    if (!this.config.autoSaveEnabled || this.autoSaveTimer) {
      return;
    }

    this.autoSaveTimer = setInterval(async () => {
      if (this.isAutoSaving) {
        return;
      }

      this.isAutoSaving = true;

      try {
        const serializedLayout = this.serializeWorkspace(workspace);

        await invoke('save_workspace_layout', {
          layout: serializedLayout,
          isAutoSave: true,
        });

        console.log('Auto-saved workspace layout');
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        this.isAutoSaving = false;
      }
    }, this.config.autoSaveInterval);

    console.log(`Auto-save started for workspace: ${workspace.getName()}`);
  }

  /**
   * Stop auto-save
   */
  public stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('Auto-save stopped');
    }
  }

  /**
   * Create backup of workspace layout
   */
  public async createBackup(workspace: Workspace, description?: string): Promise<string | null> {
    try {
      const serializedLayout = this.serializeWorkspace(workspace);

      const backupId: string = await invoke('create_workspace_backup', {
        layout: serializedLayout,
        description,
      });

      console.log(`Backup created with ID: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error('Failed to create backup:', error);
      return null;
    }
  }

  /**
   * List available backups for a workspace
   */
  public async listBackups(workspaceId: string): Promise<LayoutBackup[]> {
    try {
      const backups: LayoutBackup[] = await invoke('list_workspace_backups', {
        workspaceId,
      });

      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore workspace from backup
   */
  public async restoreFromBackup(
    backupId: string,
    options: RestorationOptions = DEFAULT_RESTORATION_OPTIONS
  ): Promise<Workspace | null> {
    try {
      const serializedLayout: SerializedWorkspaceLayout = await invoke('restore_workspace_backup', {
        backupId,
      });

      const workspace = await this.deserializeWorkspace(serializedLayout, options);
      console.log(`Workspace restored from backup: ${backupId}`);

      return workspace;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  /**
   * Clean up old backups based on configuration
   */
  public async cleanupBackups(workspaceId: string): Promise<number> {
    try {
      const deletedCount: number = await invoke('cleanup_workspace_backups', {
        workspaceId,
        maxBackups: this.config.maxBackups,
      });

      console.log(`Cleaned up ${deletedCount} old backups`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup backups:', error);
      return 0;
    }
  }

  /**
   * Validate if a file path exists
   */
  private async validateFilePath(filePath: string): Promise<boolean> {
    try {
      const exists: boolean = await invoke('file_exists', { filePath });
      return exists;
    } catch (error) {
      console.error(`Failed to validate file path ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Create a default workspace when restoration fails
   */
  private createDefaultWorkspace(): Workspace {
    const layoutMode = LayoutMode.fromString(LayoutModeType.STACKED);
    const dimensions = Dimensions.fromValues(1200, 800);
    return Workspace.create('Default Workspace', layoutMode, dimensions);
  }

  /**
   * Update persistence configuration
   */
  public updateConfig(newConfig: Partial<PersistenceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart auto-save if interval changed
    if (newConfig.autoSaveInterval && this.autoSaveTimer) {
      this.stopAutoSave();
      // Note: Would need workspace reference to restart auto-save
    }
  }

  /**
   * Get current persistence configuration
   */
  public getConfig(): PersistenceConfig {
    return { ...this.config };
  }

  /**
   * Export workspace layout to file
   */
  public async exportLayout(workspace: Workspace, filePath: string): Promise<boolean> {
    try {
      const serializedLayout = this.serializeWorkspace(workspace);

      const result: boolean = await invoke('export_workspace_layout', {
        layout: serializedLayout,
        filePath,
      });

      console.log(`Workspace layout exported to: ${filePath}`);
      return result;
    } catch (error) {
      console.error('Failed to export layout:', error);
      return false;
    }
  }

  /**
   * Import workspace layout from file
   */
  public async importLayout(
    filePath: string,
    options: RestorationOptions = DEFAULT_RESTORATION_OPTIONS
  ): Promise<Workspace | null> {
    try {
      const serializedLayout: SerializedWorkspaceLayout = await invoke('import_workspace_layout', {
        filePath,
      });

      const workspace = await this.deserializeWorkspace(serializedLayout, options);
      console.log(`Workspace layout imported from: ${filePath}`);

      return workspace;
    } catch (error) {
      console.error('Failed to import layout:', error);
      return null;
    }
  }
}

/**
 * Hook for using layout persistence in React components
 */
export const useLayoutPersistence = (config?: Partial<PersistenceConfig>) => {
  const persistenceService = new LayoutPersistenceService(config ? { ...DEFAULT_PERSISTENCE_CONFIG, ...config } : DEFAULT_PERSISTENCE_CONFIG);

  return {
    saveLayout: persistenceService.saveLayout.bind(persistenceService),
    loadLayout: persistenceService.loadLayout.bind(persistenceService),
    startAutoSave: persistenceService.startAutoSave.bind(persistenceService),
    stopAutoSave: persistenceService.stopAutoSave.bind(persistenceService),
    createBackup: persistenceService.createBackup.bind(persistenceService),
    listBackups: persistenceService.listBackups.bind(persistenceService),
    restoreFromBackup: persistenceService.restoreFromBackup.bind(persistenceService),
    cleanupBackups: persistenceService.cleanupBackups.bind(persistenceService),
    exportLayout: persistenceService.exportLayout.bind(persistenceService),
    importLayout: persistenceService.importLayout.bind(persistenceService),
    updateConfig: persistenceService.updateConfig.bind(persistenceService),
    getConfig: persistenceService.getConfig.bind(persistenceService),
  };
};

/**
 * Factory function to create a persistence service
 */
export const createLayoutPersistenceService = (config?: Partial<PersistenceConfig>): LayoutPersistenceService => {
  return new LayoutPersistenceService(config ? { ...DEFAULT_PERSISTENCE_CONFIG, ...config } : DEFAULT_PERSISTENCE_CONFIG);
};

// Export defaults for external use
export { DEFAULT_PERSISTENCE_CONFIG, DEFAULT_RESTORATION_OPTIONS };

export default LayoutPersistenceService;