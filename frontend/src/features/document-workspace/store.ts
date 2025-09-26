import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  documentWorkspaceApi,
  LayoutChangeResponse,
  WorkspaceStateResponse,
  WorkspaceDocumentDto,
  LayoutModeType,
} from './services/document-api';
import {
  DocumentViewModel,
  WorkspaceViewModel,
  Position,
  Dimensions,
  layoutModes,
} from './types';

type AsyncAction<TArgs extends any[] = [], TResult = void> = (
  ...args: TArgs
) => Promise<TResult>;

type DocumentId = string;

type ErrorExtractor = (error: unknown, fallback: string) => string;

type Nullable<T> = T | null;

const extractError: ErrorExtractor = (error, fallback) => {
  if (!error) {
    return fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    const maybe = (error as { message?: unknown }).message;
    if (typeof maybe === 'string') {
      return maybe;
    }
  }
  return fallback;
};

const normalizeDocumentState = (
  state: string | undefined,
): DocumentViewModel['state'] => {
  if (!state) {
    return 'ready';
  }
  const normalized = state.toLowerCase();
  if (normalized === 'loading' || normalized === 'ready' || normalized === 'error' || normalized === 'closing') {
    return normalized;
  }
  return 'ready';
};

const mapDocumentDto = (dto: WorkspaceDocumentDto): DocumentViewModel => ({
  id: dto.document_id,
  title: dto.title,
  filePath: dto.file_path,
  position: { ...dto.position },
  dimensions: { ...dto.dimensions },
  zIndex: dto.z_index ?? 0,
  isActive: dto.is_active,
  isVisible: dto.is_visible,
  state: normalizeDocumentState(dto.state),
  errorMessage: dto.error_message,
  lastModified: dto.last_modified ?? new Date().toISOString(),
});

const mapWorkspaceResponse = (
  response: WorkspaceStateResponse,
): { workspace: WorkspaceViewModel; documents: DocumentViewModel[] } => ({
  workspace: {
    id: response.workspace_id,
    name: response.name,
    layoutMode: response.layout_mode,
    size: { ...response.workspace_size },
    lastModified: response.last_modified ?? new Date().toISOString(),
  },
  documents: response.documents.map(mapDocumentDto),
});

const applyLayoutChange = (
  documents: DocumentViewModel[],
  layoutChange: LayoutChangeResponse | null,
): DocumentViewModel[] => {
  if (!layoutChange || !layoutChange.layout_results) {
    return documents;
  }

  const layoutMap = new Map(
    layoutChange.layout_results.map((result) => [result.document_id, result] as const),
  );

  return documents.map((doc) => {
    const layout = layoutMap.get(doc.id);
    if (!layout) {
      return doc;
    }

    return {
      ...doc,
      position: { ...layout.position },
      dimensions: { ...layout.dimensions },
      zIndex: layout.z_index ?? doc.zIndex,
      isVisible: layout.is_visible,
    };
  });
};

const logFallback = (action: string, error: unknown) => {
  console.warn(`[document-workspace] Falling back for ${action}:`, error);
};

const generateId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

const createFallbackWorkspace = (options?: {
  id?: string;
  name?: string;
  layoutMode?: LayoutModeType;
  size?: Dimensions;
}): WorkspaceViewModel => ({
  id: options?.id ?? generateId('workspace'),
  name: options?.name ?? 'Demo Research Workspace',
  layoutMode: options?.layoutMode ?? layoutModes.FREEFORM,
  size: options?.size ?? { width: 1600, height: 1000 },
  lastModified: new Date().toISOString(),
});

interface FallbackDocumentOptions {
  position?: Position;
  dimensions?: Dimensions;
  title?: string;
  id?: string;
  isActive?: boolean;
}

const createFallbackDocument = (
  filePath: string,
  index: number,
  options?: FallbackDocumentOptions,
): DocumentViewModel => {
  const title = options?.title ?? (filePath.split('/').pop() || filePath);
  return {
    id: options?.id ?? generateId('doc'),
    title,
    filePath,
    position: options?.position ?? { x: 60 + index * 40, y: 60 + index * 30 },
    dimensions: options?.dimensions ?? { width: 420, height: 520 },
    zIndex: index + 1,
    isActive: options?.isActive ?? index === 0,
    isVisible: true,
    state: 'ready',
    errorMessage: undefined,
    lastModified: new Date().toISOString(),
  };
};

const bringToFront = (documents: DocumentViewModel[], documentId: string) => {
  const maxZ = documents.reduce((acc, doc) => Math.max(acc, doc.zIndex), 0);
  return documents.map((doc) =>
    doc.id === documentId ? { ...doc, zIndex: maxZ + 1, isVisible: true } : doc,
  );
};

interface DocumentWorkspaceState {
  workspace: WorkspaceViewModel | null;
  documents: DocumentViewModel[];
  isLoading: boolean;
  isSaving: boolean;
  isTransitioning: boolean;
  error: string | null;

  createWorkspace: AsyncAction<[string, LayoutModeType?, Dimensions?]>;
  loadWorkspace: AsyncAction<[string]>;
  saveWorkspace: AsyncAction<[]>;
  switchLayoutMode: AsyncAction<[LayoutModeType]>;
  updateWorkspaceDimensions: AsyncAction<[Dimensions]>;
  moveDocument: AsyncAction<[DocumentId, Position]>;
  resizeDocument: AsyncAction<[DocumentId, Dimensions]>;
  activateDocument: AsyncAction<[DocumentId]>;
  removeDocument: AsyncAction<[DocumentId]>;
  removeAllDocuments: AsyncAction<[]>;
  addDocument: AsyncAction<[string, Position?, Dimensions?], Nullable<DocumentViewModel>>;
  updateDocumentTitle: (id: DocumentId, title: string) => void;
  clearError: () => void;
}

export const useDocumentWorkspaceStore = create<DocumentWorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    workspace: null,
    documents: [],
    isLoading: false,
    isSaving: false,
    isTransitioning: false,
    error: null,

    createWorkspace: async (name, layoutMode = layoutModes.STACKED, dimensions) => {
      set({ isLoading: true, error: null });
      try {
        const response = await documentWorkspaceApi.createWorkspace({
          name,
          layoutMode,
          workspaceSize: dimensions ?? { width: 1200, height: 800 },
        });

        const workspace: WorkspaceViewModel = {
          id: response.workspace_id,
          name: response.name,
          layoutMode: response.layout_mode,
          size: { ...response.workspace_size },
          lastModified: response.created_at,
        };

        set({ workspace, documents: [], isLoading: false });
      } catch (error) {
        logFallback('createWorkspace', error);
        const fallbackWorkspace = createFallbackWorkspace({
          name,
          layoutMode,
          size: dimensions,
        });
        set({ workspace: fallbackWorkspace, documents: [], isLoading: false });
      }
    },

    loadWorkspace: async (workspaceId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await documentWorkspaceApi.getWorkspaceState(workspaceId);
        const mapped = mapWorkspaceResponse(response);
        set({
          workspace: mapped.workspace,
          documents: mapped.documents,
          isLoading: false,
        });
      } catch (error) {
        logFallback('loadWorkspace', error);
        set((state) => ({
          workspace: state.workspace ?? createFallbackWorkspace(),
          documents: state.documents,
          isLoading: false,
        }));
      }
    },

    saveWorkspace: async () => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      set({ isSaving: true, error: null });
      try {
        await documentWorkspaceApi.saveWorkspaceState(workspace.id);
        set({ isSaving: false });
      } catch (error) {
        logFallback('saveWorkspace', error);
        set({ isSaving: false });
      }
    },

    switchLayoutMode: async (layoutMode: LayoutModeType) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      set({ isTransitioning: true, error: null });
      try {
        const layoutChange = await documentWorkspaceApi.switchLayoutMode({
          workspaceId: workspace.id,
          layoutMode,
        });

        set((state) => ({
          workspace: state.workspace ? { ...state.workspace, layoutMode } : null,
          documents: applyLayoutChange(state.documents, layoutChange),
          isTransitioning: false,
        }));
      } catch (error) {
        logFallback('switchLayoutMode', error);
        set((state) => ({
          workspace: state.workspace ? { ...state.workspace, layoutMode } : null,
          isTransitioning: false,
        }));
      }
    },

    updateWorkspaceDimensions: async (dimensions: Dimensions) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      set({ isTransitioning: true, error: null });
      try {
        const layoutChange = await documentWorkspaceApi.updateWorkspaceSize({
          workspaceId: workspace.id,
          dimensions,
        });

        set((state) => ({
          workspace: state.workspace ? { ...state.workspace, size: { ...dimensions } } : null,
          documents: applyLayoutChange(state.documents, layoutChange),
          isTransitioning: false,
        }));
      } catch (error) {
        logFallback('updateWorkspaceDimensions', error);
        set((state) => ({
          workspace: state.workspace ? { ...state.workspace, size: { ...dimensions } } : null,
          isTransitioning: false,
        }));
      }
    },

    moveDocument: async (documentId: string, position: Position) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      try {
        const layoutChange = await documentWorkspaceApi.moveDocument({
          workspaceId: workspace.id,
          documentId,
          position,
        });

        set((state) => ({
          documents: applyLayoutChange(state.documents, layoutChange),
        }));

        if (layoutChange.triggered_auto_freeform) {
          set((state) => ({
            workspace: state.workspace ? { ...state.workspace, layoutMode: layoutModes.FREEFORM } : null,
          }));
        }
      } catch (error) {
        logFallback('moveDocument', error);
        set((state) => ({
          documents: bringToFront(
            state.documents.map((doc) =>
              doc.id === documentId ? { ...doc, position: { ...position } } : doc,
            ),
            documentId,
          ),
          workspace: state.workspace
            ? { ...state.workspace, layoutMode: layoutModes.FREEFORM }
            : null,
        }));
      }
    },

    resizeDocument: async (documentId: string, dimensions: Dimensions) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      try {
        const layoutChange = await documentWorkspaceApi.resizeDocument({
          workspaceId: workspace.id,
          documentId,
          dimensions,
        });

        set((state) => ({
          documents: applyLayoutChange(state.documents, layoutChange),
        }));

        if (layoutChange.triggered_auto_freeform) {
          set((state) => ({
            workspace: state.workspace ? { ...state.workspace, layoutMode: layoutModes.FREEFORM } : null,
          }));
        }
      } catch (error) {
        logFallback('resizeDocument', error);
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === documentId ? { ...doc, dimensions: { ...dimensions } } : doc,
          ),
          workspace: state.workspace
            ? { ...state.workspace, layoutMode: layoutModes.FREEFORM }
            : null,
        }));
      }
    },

    activateDocument: async (documentId: string) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      try {
        await documentWorkspaceApi.activateDocument({
          workspaceId: workspace.id,
          documentId,
        });

        set((state) => {
          const maxZ = state.documents.reduce((acc, doc) => Math.max(acc, doc.zIndex), 0);
          return {
            documents: state.documents.map((doc) =>
              doc.id === documentId
                ? { ...doc, isActive: true, zIndex: maxZ + 1 }
                : { ...doc, isActive: false },
            ),
          };
        });
      } catch (error) {
        logFallback('activateDocument', error);
        set((state) => {
          const maxZ = state.documents.reduce((acc, doc) => Math.max(acc, doc.zIndex), 0);
          return {
            documents: state.documents.map((doc) =>
              doc.id === documentId
                ? { ...doc, isActive: true, zIndex: maxZ + 1 }
                : { ...doc, isActive: false },
            ),
          };
        });
      }
    },

    removeDocument: async (documentId: string) => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      try {
        const removed = await documentWorkspaceApi.removeDocument({
          workspaceId: workspace.id,
          documentId,
        });

        if (removed) {
          set((state) => ({
            documents: state.documents.filter((doc) => doc.id !== documentId),
          }));
        }
      } catch (error) {
        logFallback('removeDocument', error);
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== documentId),
        }));
      }
    },

    removeAllDocuments: async () => {
      const workspace = get().workspace;
      if (!workspace) {
        return;
      }

      try {
        await documentWorkspaceApi.removeAllDocuments(workspace.id);
        set({ documents: [] });
      } catch (error) {
        logFallback('removeAllDocuments', error);
        set({ documents: [] });
      }
    },

    addDocument: async (filePath: string, position?: Position, dimensions?: Dimensions) => {
      const workspace = get().workspace;
      if (!workspace) {
        return null;
      }

      const previousDocs = get().documents;
      set({ isLoading: true, error: null });
      try {
        await documentWorkspaceApi.addDocument({
          workspaceId: workspace.id,
          filePath,
          position,
          dimensions,
        });

        const refreshed = await documentWorkspaceApi.getWorkspaceState(workspace.id);
        const mapped = mapWorkspaceResponse(refreshed);
        const addedDoc =
          mapped.documents.find((doc) => !previousDocs.some((existing) => existing.id === doc.id)) ||
          null;
        set({
          workspace: mapped.workspace,
          documents: mapped.documents,
          isLoading: false,
        });
        return addedDoc;
      } catch (error) {
        logFallback('addDocument', error);
        const fallbackDoc = createFallbackDocument(filePath, previousDocs.length, {
          position,
          dimensions,
        });
        set((state) => ({
          documents: [...state.documents, fallbackDoc],
          workspace: state.workspace
            ? { ...state.workspace, lastModified: new Date().toISOString() }
            : null,
          isLoading: false,
        }));
        return fallbackDoc;
      }
    },

    updateDocumentTitle: (documentId: string, title: string) => {
      const trimmed = title.trim();

      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId ? { ...doc, title: trimmed || doc.title } : doc,
        ),
      }));
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);

export const documentWorkspaceSelectors = {
  workspace: (state: DocumentWorkspaceState) => state.workspace,
  documents: (state: DocumentWorkspaceState) => state.documents,
  isLoading: (state: DocumentWorkspaceState) => state.isLoading,
  isSaving: (state: DocumentWorkspaceState) => state.isSaving,
  isTransitioning: (state: DocumentWorkspaceState) => state.isTransitioning,
  error: (state: DocumentWorkspaceState) => state.error,
  documentList: (state: DocumentWorkspaceState) => state.documents,
  currentWorkspace: (state: DocumentWorkspaceState) => state.workspace,
  hasError: (state: DocumentWorkspaceState) => Boolean(state.error),
};
