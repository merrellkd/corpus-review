import { WorkspaceId } from '../domain/value-objects/identifiers';
import { Workspace } from '../domain/aggregates/workspace';
import { WorkspaceRepository } from '../application/workspace-service';

/**
 * Interface for workspace storage operations
 */
export interface WorkspaceStorage {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any | undefined>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * Local storage implementation for workspace persistence
 */
export class LocalStorageWorkspaceStorage implements WorkspaceStorage {
  private static readonly STORAGE_PREFIX = 'workspace_';

  async save(key: string, data: any): Promise<void> {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(this.getStorageKey(key), serializedData);
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error}`);
    }
  }

  async load(key: string): Promise<any | undefined> {
    try {
      const item = localStorage.getItem(this.getStorageKey(key));
      return item ? JSON.parse(item) : undefined;
    } catch (error) {
      throw new Error(`Failed to load from localStorage: ${error}`);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const storageKey = this.getStorageKey(key);
      const existed = localStorage.getItem(storageKey) !== null;
      localStorage.removeItem(storageKey);
      return existed;
    } catch (error) {
      throw new Error(`Failed to delete from localStorage: ${error}`);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return localStorage.getItem(this.getStorageKey(key)) !== null;
    } catch (error) {
      throw new Error(`Failed to check existence in localStorage: ${error}`);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const keys: string[] = [];
      const searchPrefix = this.getStorageKey(prefix || '');

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          // Remove storage prefix to get the original key
          const originalKey = key.substring(LocalStorageWorkspaceStorage.STORAGE_PREFIX.length);
          keys.push(originalKey);
        }
      }

      return keys.sort();
    } catch (error) {
      throw new Error(`Failed to list keys from localStorage: ${error}`);
    }
  }

  async clear(): Promise<void> {
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LocalStorageWorkspaceStorage.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      throw new Error(`Failed to clear localStorage: ${error}`);
    }
  }

  private getStorageKey(key: string): string {
    return `${LocalStorageWorkspaceStorage.STORAGE_PREFIX}${key}`;
  }
}

/**
 * IndexedDB storage implementation for larger workspace data
 */
export class IndexedDBWorkspaceStorage implements WorkspaceStorage {
  private static readonly DB_NAME = 'WorkspaceDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'workspaces';

  private db: IDBDatabase | undefined;

  async save(key: string, data: any): Promise<void> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      const request = store.put({ key, data, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save to IndexedDB: ${request.error}`));
    });
  }

  async load(key: string): Promise<any | undefined> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : undefined);
      };
      request.onerror = () => reject(new Error(`Failed to load from IndexedDB: ${request.error}`));
    });
  }

  async delete(key: string): Promise<boolean> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      // First check if it exists
      const getRequest = store.get(key);

      getRequest.onsuccess = () => {
        const existed = getRequest.result !== undefined;

        if (existed) {
          const deleteRequest = store.delete(key);
          deleteRequest.onsuccess = () => resolve(true);
          deleteRequest.onerror = () => reject(new Error(`Failed to delete from IndexedDB: ${deleteRequest.error}`));
        } else {
          resolve(false);
        }
      };

      getRequest.onerror = () => reject(new Error(`Failed to check existence in IndexedDB: ${getRequest.error}`));
    });
  }

  async exists(key: string): Promise<boolean> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      const request = store.count(key);

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => reject(new Error(`Failed to check existence in IndexedDB: ${request.error}`));
    });
  }

  async list(prefix?: string): Promise<string[]> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readonly');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      const keys: string[] = [];
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const key = cursor.key as string;
          if (!prefix || key.startsWith(prefix)) {
            keys.push(key);
          }
          cursor.continue();
        } else {
          resolve(keys.sort());
        }
      };

      request.onerror = () => reject(new Error(`Failed to list keys from IndexedDB: ${request.error}`));
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDBWorkspaceStorage.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(IndexedDBWorkspaceStorage.STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to clear IndexedDB: ${request.error}`));
    });
  }

  private async getDatabase(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IndexedDBWorkspaceStorage.DB_NAME, IndexedDBWorkspaceStorage.DB_VERSION);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(IndexedDBWorkspaceStorage.STORE_NAME)) {
          const store = db.createObjectStore(IndexedDBWorkspaceStorage.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }
}

/**
 * Implementation of WorkspaceRepository using configurable storage backend
 */
export class WorkspaceRepositoryImpl implements WorkspaceRepository {
  constructor(private readonly storage: WorkspaceStorage) {}

  async save(workspace: Workspace): Promise<void> {
    const workspaceData = workspace.toData();
    await this.storage.save(workspace.getId().toString(), workspaceData);
  }

  async findById(id: WorkspaceId): Promise<Workspace | undefined> {
    const data = await this.storage.load(id.toString());

    if (!data) {
      return undefined;
    }

    try {
      return Workspace.fromData(data);
    } catch (error) {
      throw new Error(`Failed to reconstruct workspace from data: ${error}`);
    }
  }

  async findByName(name: string): Promise<Workspace | undefined> {
    // Since we can't efficiently query by name in most storage backends,
    // we need to load all workspaces and filter by name
    const allKeys = await this.storage.list();

    for (const key of allKeys) {
      try {
        const data = await this.storage.load(key);
        if (data && data.name === name) {
          return Workspace.fromData(data);
        }
      } catch (error) {
        // Skip corrupted workspace data
        console.warn(`Skipping corrupted workspace data for key ${key}: ${error}`);
        continue;
      }
    }

    return undefined;
  }

  async delete(id: WorkspaceId): Promise<boolean> {
    return await this.storage.delete(id.toString());
  }

  async exists(id: WorkspaceId): Promise<boolean> {
    return await this.storage.exists(id.toString());
  }

  async listAll(): Promise<Workspace[]> {
    const allKeys = await this.storage.list();
    const workspaces: Workspace[] = [];

    for (const key of allKeys) {
      try {
        const data = await this.storage.load(key);
        if (data) {
          const workspace = Workspace.fromData(data);
          workspaces.push(workspace);
        }
      } catch (error) {
        // Skip corrupted workspace data
        console.warn(`Skipping corrupted workspace data for key ${key}: ${error}`);
        continue;
      }
    }

    // Sort by last modified date (newest first)
    return workspaces.sort((a, b) =>
      b.getLastModified().getTime() - a.getLastModified().getTime()
    );
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  async backup(): Promise<{ [key: string]: any }> {
    const allKeys = await this.storage.list();
    const backup: { [key: string]: any } = {};

    for (const key of allKeys) {
      try {
        const data = await this.storage.load(key);
        if (data) {
          backup[key] = data;
        }
      } catch (error) {
        console.warn(`Failed to backup workspace data for key ${key}: ${error}`);
      }
    }

    return backup;
  }

  async restore(backupData: { [key: string]: any }): Promise<void> {
    // Clear existing data first
    await this.storage.clear();

    // Restore from backup
    for (const [key, data] of Object.entries(backupData)) {
      try {
        await this.storage.save(key, data);
      } catch (error) {
        console.warn(`Failed to restore workspace data for key ${key}: ${error}`);
      }
    }
  }

  async getStorageInfo(): Promise<{
    totalWorkspaces: number;
    storageType: string;
    estimatedSize?: number;
  }> {
    const allKeys = await this.storage.list();
    let estimatedSize = 0;

    // Estimate storage size (rough calculation)
    for (const key of allKeys) {
      try {
        const data = await this.storage.load(key);
        if (data) {
          estimatedSize += JSON.stringify(data).length;
        }
      } catch (error) {
        // Skip corrupted data
        continue;
      }
    }

    return {
      totalWorkspaces: allKeys.length,
      storageType: this.storage.constructor.name,
      estimatedSize
    };
  }
}

/**
 * Factory for creating workspace repositories with different storage backends
 */
export class WorkspaceRepositoryFactory {
  static createWithLocalStorage(): WorkspaceRepositoryImpl {
    return new WorkspaceRepositoryImpl(new LocalStorageWorkspaceStorage());
  }

  static createWithIndexedDB(): WorkspaceRepositoryImpl {
    return new WorkspaceRepositoryImpl(new IndexedDBWorkspaceStorage());
  }

  static createWithCustomStorage(storage: WorkspaceStorage): WorkspaceRepositoryImpl {
    return new WorkspaceRepositoryImpl(storage);
  }

  static async createOptimal(): Promise<WorkspaceRepositoryImpl> {
    // Check if IndexedDB is available and functional
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        // Test IndexedDB availability
        const testDB = indexedDB.open('test', 1);

        return new Promise((resolve) => {
          testDB.onsuccess = () => {
            testDB.result.close();
            indexedDB.deleteDatabase('test');
            resolve(WorkspaceRepositoryFactory.createWithIndexedDB());
          };

          testDB.onerror = () => {
            resolve(WorkspaceRepositoryFactory.createWithLocalStorage());
          };
        });
      } catch (error) {
        return WorkspaceRepositoryFactory.createWithLocalStorage();
      }
    }

    // Fallback to localStorage
    return WorkspaceRepositoryFactory.createWithLocalStorage();
  }
}