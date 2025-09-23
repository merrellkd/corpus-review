import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { WorkspaceId, DocumentCaddyId } from '../../domain/value-objects/identifiers';
import { Position, Dimensions } from '../../domain/value-objects/geometry';
import { LayoutModeType, DocumentLayoutResult } from '../../domain/value-objects/layout-mode';
import { DocumentCaddyState } from '../../domain/entities/document-caddy';
import { WorkspaceService } from '../../application/workspace-service';
import { TauriWorkspaceAdapter, TauriErrorHandler } from '../../application/tauri-workspace-adapter';
import { createMockWorkspaceAdapter } from '../../application/mock-workspace-adapter';

/**
 * Detect if we're running in Tauri environment
 */
const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' &&
         window.__TAURI_IPC__ !== undefined;
};

/**
 * Create appropriate workspace adapter based on environment
 */
const createWorkspaceAdapter = () => {
  return isTauriEnvironment()
    ? new TauriWorkspaceAdapter()
    : createMockWorkspaceAdapter() as any; // Cast to match interface
};

/**
 * Handle workspace errors for both environments
 */
const handleWorkspaceError = (error: unknown): Error => {
  if (isTauriEnvironment()) {
    return TauriErrorHandler.handleWorkspaceError(error);
  } else {
    // Simple error handling for mock environment
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Workspace operation failed: ${error}`);
  }
};

/**
 * Document state for UI
 */
export interface DocumentUIState {
  id: string;
  title: string;
  filePath: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  isVisible: boolean;
  state: DocumentCaddyState;
  errorMessage?: string | undefined;
  isDraggable: boolean;
  isResizable: boolean;
  lastModified: Date;
}

/**
 * Workspace state for UI
 */
export interface WorkspaceUIState {
  id: string;
  name: string;
  layoutMode: LayoutModeType;
  workspaceDimensions: { width: number; height: number };
  documents: Record<string, DocumentUIState>;
  documentOrder: string[]; // For z-index management
  activeDocumentId?: string;
  isLoading: boolean;
  isTransitioning: boolean;
  error?: string;
  lastModified: Date;
}

/**
 * Application state
 */
export interface WorkspaceAppState {
  // Current workspace
  currentWorkspace?: WorkspaceUIState | undefined;

  // Global error state
  error?: string;

  // UI state
  commandBarState: {
    isLoading: boolean;
    disabled: boolean;
  };

  // Layout transition state
  transitionState: {
    isTransitioning: boolean;
    fromLayoutMode?: LayoutModeType;
    toLayoutMode?: LayoutModeType;
    animations: DocumentLayoutResult[];
  };

  // Async operation tracking
  operations: {
    creating: boolean;
    loading: boolean;
    saving: boolean;
    addingDocument: boolean;
    removingDocument: boolean;
    movingDocument: boolean;
    resizingDocument: boolean;
    switchingLayout: boolean;
  };

  // Performance tracking
  performance: {
    lastOperationTime: number;
    averageOperationTime: number;
    operationCount: number;
  };
}

/**
 * Store actions
 */
export interface WorkspaceStoreActions {
  // Workspace operations
  createWorkspace: (name: string, layoutMode?: LayoutModeType, dimensions?: Dimensions) => Promise<void>;
  loadWorkspace: (workspaceId: string) => Promise<void>;
  saveWorkspace: () => Promise<void>;
  updateWorkspaceName: (newName: string) => Promise<void>;
  updateWorkspaceDimensions: (dimensions: Dimensions) => Promise<void>;

  // Layout operations
  switchLayoutMode: (mode: LayoutModeType, triggeredBy?: 'user' | 'auto-freeform') => Promise<void>;
  setTransitionState: (state: Partial<WorkspaceAppState['transitionState']>) => void;
  completeTransition: () => void;

  // Document operations
  addDocument: (filePath: string, position?: Position, dimensions?: Dimensions) => Promise<void>;
  removeDocument: (documentId: string) => Promise<void>;
  removeAllDocuments: () => Promise<void>;
  activateDocument: (documentId: string) => Promise<void>;
  moveDocument: (documentId: string, position: Position) => Promise<void>;
  resizeDocument: (documentId: string, dimensions: Dimensions) => Promise<void>;
  updateDocumentTitle: (documentId: string, newTitle: string) => Promise<void>;

  // UI state management
  setLoading: (isLoading: boolean) => void;
  setError: (error?: string) => void;
  clearError: () => void;
  setCommandBarState: (state: Partial<WorkspaceAppState['commandBarState']>) => void;

  // Internal helpers
  updateDocument: (documentId: string, updates: Partial<DocumentUIState>) => void;
  reorderDocuments: (documentIds: string[]) => void;
  setOperationState: (operation: keyof WorkspaceAppState['operations'], isActive: boolean) => void;
  trackOperation: (operation: () => Promise<void>) => Promise<void>;

  // Reset and cleanup
  reset: () => void;
  cleanup: () => void;
}

/**
 * Combined store type
 */
export type WorkspaceStore = WorkspaceAppState & WorkspaceStoreActions;

/**
 * Initial state
 */
const initialState: WorkspaceAppState = {
  currentWorkspace: undefined,
  commandBarState: {
    isLoading: false,
    disabled: false,
  },
  transitionState: {
    isTransitioning: false,
    animations: [],
  },
  operations: {
    creating: false,
    loading: false,
    saving: false,
    addingDocument: false,
    removingDocument: false,
    movingDocument: false,
    resizingDocument: false,
    switchingLayout: false,
  },
  performance: {
    lastOperationTime: 0,
    averageOperationTime: 0,
    operationCount: 0,
  },
};

/**
 * Workspace store with Zustand
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Workspace operations
        createWorkspace: async (name: string, layoutMode = LayoutModeType.STACKED, dimensions) => {
          await get().trackOperation(async () => {
            set((state) => {
              state.operations.creating = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.createWorkspace(name, layoutMode, dimensions);

              set((state) => {
                state.currentWorkspace = {
                  id: response.workspace_id,
                  name: response.name,
                  layoutMode: response.layout_mode as LayoutModeType,
                  workspaceDimensions: response.workspace_size,
                  documents: {},
                  documentOrder: [],
                  isLoading: false,
                  isTransitioning: false,
                  lastModified: new Date(response.created_at),
                };
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.creating = false;
              });
            }
          });
        },

        loadWorkspace: async (workspaceId: string) => {
          await get().trackOperation(async () => {
            set((state) => {
              state.operations.loading = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.getWorkspaceState(workspaceId);

              const documents: Record<string, DocumentUIState> = {};
              const documentOrder: string[] = [];

              response.documents.forEach((doc: any) => {
                documents[doc.document_id] = {
                  id: doc.document_id,
                  title: doc.title,
                  filePath: doc.file_path,
                  position: doc.position,
                  dimensions: doc.dimensions,
                  zIndex: doc.z_index,
                  isActive: doc.is_active,
                  isVisible: doc.is_visible,
                  state: doc.state as DocumentCaddyState,
                  errorMessage: doc.error_message,
                  isDraggable: doc.state === 'ready',
                  isResizable: doc.state === 'ready',
                  lastModified: new Date(),
                };
                documentOrder.push(doc.document_id);
              });

              // Sort by z-index
              documentOrder.sort((a, b) => documents[a].zIndex - documents[b].zIndex);

              set((state) => {
                state.currentWorkspace = {
                  id: response.workspace_id,
                  name: response.name,
                  layoutMode: response.layout_mode as LayoutModeType,
                  workspaceDimensions: response.workspace_size,
                  documents,
                  documentOrder,
                  activeDocumentId: response.documents.find((d: any) => d.is_active)?.document_id,
                  isLoading: false,
                  isTransitioning: false,
                  lastModified: new Date(response.last_modified),
                };
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.loading = false;
              });
            }
          });
        },

        saveWorkspace: async () => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.saving = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              await adapter.saveWorkspaceState(get().currentWorkspace!.id);

              set((state) => {
                if (state.currentWorkspace) {
                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.saving = false;
              });
            }
          });
        },

        updateWorkspaceName: async (newName: string) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            try {
              // Update local state immediately for optimistic UI
              set((state) => {
                if (state.currentWorkspace) {
                  state.currentWorkspace.name = newName;
                  state.currentWorkspace.lastModified = new Date();
                }
              });

              // Save to backend
              await get().saveWorkspace();
            } catch (error) {
              // Revert on error
              throw error;
            }
          });
        },

        updateWorkspaceDimensions: async (dimensions: Dimensions) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.updateWorkspaceSize(
                get().currentWorkspace!.id,
                dimensions
              );

              set((state) => {
                if (state.currentWorkspace) {
                  state.currentWorkspace.workspaceDimensions = dimensions.toSize();
                  state.currentWorkspace.lastModified = new Date();

                  // Update document positions from layout results
                  response.layout_results.forEach((result: any) => {
                    if (state.currentWorkspace!.documents[result.document_id]) {
                      state.currentWorkspace!.documents[result.document_id].position = result.position;
                      state.currentWorkspace!.documents[result.document_id].dimensions = result.dimensions;
                      state.currentWorkspace!.documents[result.document_id].zIndex = result.z_index;
                      state.currentWorkspace!.documents[result.document_id].isVisible = result.is_visible;
                    }
                  });
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            }
          });
        },

        // Layout operations
        switchLayoutMode: async (mode: LayoutModeType, triggeredBy = 'user') => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.switchingLayout = true;
              state.transitionState.isTransitioning = true;
              state.transitionState.fromLayoutMode = state.currentWorkspace?.layoutMode;
              state.transitionState.toLayoutMode = mode;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.switchLayoutMode(
                get().currentWorkspace!.id,
                mode,
                triggeredBy
              );

              set((state) => {
                if (state.currentWorkspace) {
                  state.currentWorkspace.layoutMode = mode;
                  state.currentWorkspace.lastModified = new Date();

                  // Update document positions from layout results
                  response.layout_results.forEach((result: any) => {
                    if (state.currentWorkspace!.documents[result.document_id]) {
                      state.currentWorkspace!.documents[result.document_id].position = result.position;
                      state.currentWorkspace!.documents[result.document_id].dimensions = result.dimensions;
                      state.currentWorkspace!.documents[result.document_id].zIndex = result.z_index;
                      state.currentWorkspace!.documents[result.document_id].isVisible = result.is_visible;
                    }
                  });

                  state.transitionState.animations = response.layout_results.map((result: any) => ({
                    id: DocumentCaddyId.fromString(result.document_id),
                    position: Position.fromCoordinates(result.position.x, result.position.y),
                    dimensions: Dimensions.fromValues(result.dimensions.width, result.dimensions.height),
                    zIndex: result.z_index,
                    isVisible: result.is_visible,
                  }));
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
                state.transitionState.isTransitioning = false;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.switchingLayout = false;
              });
            }
          });
        },

        setTransitionState: (state) => {
          set((draft) => {
            Object.assign(draft.transitionState, state);
          });
        },

        completeTransition: () => {
          set((state) => {
            state.transitionState.isTransitioning = false;
            state.transitionState.fromLayoutMode = undefined;
            state.transitionState.toLayoutMode = undefined;
            state.transitionState.animations = [];
          });
        },

        // Document operations
        addDocument: async (filePath: string, position?, dimensions?) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.addingDocument = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.addDocument(
                get().currentWorkspace!.id,
                filePath,
                position,
                dimensions
              );

              set((state) => {
                if (state.currentWorkspace) {
                  const newDocument: DocumentUIState = {
                    id: response.document_id,
                    title: response.title,
                    filePath: response.file_path,
                    position: response.position,
                    dimensions: response.dimensions,
                    zIndex: Object.keys(state.currentWorkspace.documents).length + 1,
                    isActive: response.was_activated,
                    isVisible: true,
                    state: DocumentCaddyState.READY,
                    isDraggable: true,
                    isResizable: true,
                    lastModified: new Date(),
                  };

                  state.currentWorkspace.documents[response.document_id] = newDocument;
                  state.currentWorkspace.documentOrder.push(response.document_id);

                  if (response.was_activated) {
                    state.currentWorkspace.activeDocumentId = response.document_id;
                  }

                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.addingDocument = false;
              });
            }
          });
        },

        removeDocument: async (documentId: string) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.removingDocument = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const removed = await adapter.removeDocument(
                get().currentWorkspace!.id,
                documentId
              );

              if (removed) {
                set((state) => {
                  if (state.currentWorkspace) {
                    delete state.currentWorkspace.documents[documentId];
                    state.currentWorkspace.documentOrder = state.currentWorkspace.documentOrder.filter(
                      (id: string) => id !== documentId
                    );

                    if (state.currentWorkspace.activeDocumentId === documentId) {
                      state.currentWorkspace.activeDocumentId = state.currentWorkspace.documentOrder[0];
                    }

                    state.currentWorkspace.lastModified = new Date();
                  }
                });
              }
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.removingDocument = false;
              });
            }
          });
        },

        removeAllDocuments: async () => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            try {
              const adapter = createWorkspaceAdapter();
              await adapter.removeAllDocuments(get().currentWorkspace!.id);

              set((state) => {
                if (state.currentWorkspace) {
                  state.currentWorkspace.documents = {};
                  state.currentWorkspace.documentOrder = [];
                  state.currentWorkspace.activeDocumentId = undefined;
                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            }
          });
        },

        activateDocument: async (documentId: string) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            try {
              const adapter = createWorkspaceAdapter();
              await adapter.activateDocument(get().currentWorkspace!.id, documentId);

              set((state) => {
                if (state.currentWorkspace) {
                  // Deactivate all documents
                  Object.keys(state.currentWorkspace.documents).forEach((id: string) => {
                    state.currentWorkspace!.documents[id].isActive = false;
                  });

                  // Activate target document
                  if (state.currentWorkspace.documents[documentId]) {
                    state.currentWorkspace.documents[documentId].isActive = true;
                    state.currentWorkspace.activeDocumentId = documentId;
                  }

                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            }
          });
        },

        moveDocument: async (documentId: string, position: Position) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.movingDocument = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.moveDocument(
                get().currentWorkspace!.id,
                documentId,
                position
              );

              set((state) => {
                if (state.currentWorkspace) {
                  // Update all affected documents from layout results
                  response.layout_results.forEach((result: any) => {
                    if (state.currentWorkspace!.documents[result.document_id]) {
                      state.currentWorkspace!.documents[result.document_id].position = result.position;
                      state.currentWorkspace!.documents[result.document_id].dimensions = result.dimensions;
                      state.currentWorkspace!.documents[result.document_id].zIndex = result.z_index;
                      state.currentWorkspace!.documents[result.document_id].isVisible = result.is_visible;
                    }
                  });

                  // Check if layout mode changed due to auto-freeform
                  if (response.triggered_auto_freeform) {
                    state.currentWorkspace.layoutMode = LayoutModeType.FREEFORM;
                  }

                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.movingDocument = false;
              });
            }
          });
        },

        resizeDocument: async (documentId: string, dimensions: Dimensions) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            set((state) => {
              state.operations.resizingDocument = true;
            });

            try {
              const adapter = createWorkspaceAdapter();
              const response = await adapter.resizeDocument(
                get().currentWorkspace!.id,
                documentId,
                dimensions
              );

              set((state) => {
                if (state.currentWorkspace) {
                  // Update all affected documents from layout results
                  response.layout_results.forEach((result: any) => {
                    if (state.currentWorkspace!.documents[result.document_id]) {
                      state.currentWorkspace!.documents[result.document_id].position = result.position;
                      state.currentWorkspace!.documents[result.document_id].dimensions = result.dimensions;
                      state.currentWorkspace!.documents[result.document_id].zIndex = result.z_index;
                      state.currentWorkspace!.documents[result.document_id].isVisible = result.is_visible;
                    }
                  });

                  // Check if layout mode changed due to auto-freeform
                  if (response.triggered_auto_freeform) {
                    state.currentWorkspace.layoutMode = LayoutModeType.FREEFORM;
                  }

                  state.currentWorkspace.lastModified = new Date();
                }
              });
            } catch (error) {
              const handledError = handleWorkspaceError(error);
              set((state) => {
                state.error = handledError.message;
              });
              throw handledError;
            } finally {
              set((state) => {
                state.operations.resizingDocument = false;
              });
            }
          });
        },

        updateDocumentTitle: async (documentId: string, newTitle: string) => {
          if (!get().currentWorkspace) return;

          await get().trackOperation(async () => {
            try {
              // Update local state optimistically
              set((state) => {
                if (state.currentWorkspace?.documents[documentId]) {
                  state.currentWorkspace.documents[documentId].title = newTitle;
                  state.currentWorkspace.documents[documentId].lastModified = new Date();
                  state.currentWorkspace.lastModified = new Date();
                }
              });

              // Save to backend
              await get().saveWorkspace();
            } catch (error) {
              // Revert on error
              throw error;
            }
          });
        },

        // UI state management
        setLoading: (isLoading: boolean) => {
          set((state) => {
            if (state.currentWorkspace) {
              state.currentWorkspace.isLoading = isLoading;
            }
          });
        },

        setError: (error?: string) => {
          set((state) => {
            state.error = error;
          });
        },

        clearError: () => {
          set((state) => {
            state.error = undefined;
          });
        },

        setCommandBarState: (newState) => {
          set((state) => {
            Object.assign(state.commandBarState, newState);
          });
        },

        // Internal helpers
        updateDocument: (documentId: string, updates: Partial<DocumentUIState>) => {
          set((state) => {
            if (state.currentWorkspace?.documents[documentId]) {
              Object.assign(state.currentWorkspace.documents[documentId], updates);
              state.currentWorkspace.documents[documentId].lastModified = new Date();
              state.currentWorkspace.lastModified = new Date();
            }
          });
        },

        reorderDocuments: (documentIds: string[]) => {
          set((state) => {
            if (state.currentWorkspace) {
              state.currentWorkspace.documentOrder = documentIds;
              state.currentWorkspace.lastModified = new Date();
            }
          });
        },

        setOperationState: (operation, isActive) => {
          set((state) => {
            state.operations[operation] = isActive;
          });
        },

        trackOperation: async (operation: () => Promise<void>) => {
          const startTime = performance.now();

          try {
            await operation();
          } finally {
            const endTime = performance.now();
            const operationTime = endTime - startTime;

            set((state) => {
              const newCount = state.performance.operationCount + 1;
              const newAverage = (
                (state.performance.averageOperationTime * state.performance.operationCount) +
                operationTime
              ) / newCount;

              state.performance.lastOperationTime = operationTime;
              state.performance.averageOperationTime = newAverage;
              state.performance.operationCount = newCount;
            });
          }
        },

        // Reset and cleanup
        reset: () => {
          set(() => ({ ...initialState }));
        },

        cleanup: () => {
          // Any cleanup logic for subscriptions, timers, etc.
        },
      }))
    )
  )
);

/**
 * Selectors for common state access patterns
 */
export const workspaceSelectors = {
  currentWorkspace: (state: WorkspaceStore) => state.currentWorkspace,
  documents: (state: WorkspaceStore) => state.currentWorkspace?.documents || {},
  documentList: (state: WorkspaceStore) => {
    const workspace = state.currentWorkspace;
    if (!workspace) return [];
    return workspace.documentOrder.map(id => workspace.documents[id]).filter(Boolean);
  },
  activeDocument: (state: WorkspaceStore) => {
    const workspace = state.currentWorkspace;
    if (!workspace?.activeDocumentId) return undefined;
    return workspace.documents[workspace.activeDocumentId];
  },
  isLoading: (state: WorkspaceStore) => {
    // Only show global loading for major workspace operations
    const {
      movingDocument,
      resizingDocument,
      addingDocument,
      removingDocument,
      saving,
      ...majorOperations
    } = state.operations;
    return Object.values(majorOperations).some(Boolean);
  },
  hasError: (state: WorkspaceStore) => !!state.error,
  documentCount: (state: WorkspaceStore) => state.currentWorkspace?.documentOrder.length || 0,
  layoutMode: (state: WorkspaceStore) => state.currentWorkspace?.layoutMode,
  workspaceDimensions: (state: WorkspaceStore) => state.currentWorkspace?.workspaceDimensions,
  isTransitioning: (state: WorkspaceStore) => state.transitionState.isTransitioning,
  performance: (state: WorkspaceStore) => state.performance,
};

export default useWorkspaceStore;