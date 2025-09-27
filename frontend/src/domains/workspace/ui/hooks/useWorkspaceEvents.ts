import { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../../../stores/workspace';

/**
 * Simple workspace change callbacks
 */
export interface WorkspaceCallbacks {
  onDocumentAdded?: (documentId: string, filePath: string) => void;
  onDocumentRemoved?: (documentId: string) => void;
  onDocumentActivated?: (documentId: string) => void;
  onWorkspaceLoaded?: (workspaceName: string, documentCount: number) => void;
}

/**
 * Simplified workspace change detection hook
 * Replaces complex event system with simple callbacks
 */
export const useWorkspaceEvents = (callbacks?: WorkspaceCallbacks) => {
  const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace);
  const documents = useWorkspaceStore(state => state.openDocuments);
  const isLoading = useWorkspaceStore(state => state.isLoading);
  const activeDocumentId = useWorkspaceStore(state => state.activeDocumentId);

  const prevValues = useRef({
    documentCount: 0,
    isLoading: true,
    activeDocumentId: null as string | null,
    documentIds: new Set<string>()
  });

  useEffect(() => {
    const prev = prevValues.current;
    const currentDocumentIds = new Set(documents.map(doc => doc.id));

    // Workspace loaded
    if (prev.isLoading && !isLoading && currentWorkspace && callbacks?.onWorkspaceLoaded) {
      callbacks.onWorkspaceLoaded(currentWorkspace.name || 'Workspace', documents.length);
    }

    // Document added
    if (documents.length > prev.documentCount && callbacks?.onDocumentAdded) {
      const newDocuments = documents.filter(doc => !prev.documentIds.has(doc.id));
      newDocuments.forEach(doc => {
        callbacks.onDocumentAdded?.(doc.id, doc.filePath);
      });
    }

    // Document removed
    if (documents.length < prev.documentCount && callbacks?.onDocumentRemoved) {
      const removedIds = Array.from(prev.documentIds).filter(id => !currentDocumentIds.has(id));
      removedIds.forEach(id => {
        callbacks.onDocumentRemoved?.(id);
      });
    }

    // Document activated
    if (activeDocumentId !== prev.activeDocumentId && activeDocumentId && callbacks?.onDocumentActivated) {
      callbacks.onDocumentActivated(activeDocumentId);
    }

    // Update refs
    prevValues.current = {
      documentCount: documents.length,
      isLoading,
      activeDocumentId,
      documentIds: currentDocumentIds
    };
  }, [currentWorkspace, documents, isLoading, activeDocumentId, callbacks]);
};

/**
 * Hook for logging workspace changes (debugging)
 */
export const useWorkspaceEventLogger = (enabled: boolean = true) => {
  useWorkspaceEvents(enabled ? {
    onDocumentAdded: (id, path) => console.log('Document added:', { id, path }),
    onDocumentRemoved: (id) => console.log('Document removed:', { id }),
    onDocumentActivated: (id) => console.log('Document activated:', { id }),
    onWorkspaceLoaded: (name, count) => console.log('Workspace loaded:', { name, count })
  } : undefined);
};

export default useWorkspaceEvents;