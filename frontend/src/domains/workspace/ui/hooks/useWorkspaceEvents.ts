import { useEffect, useCallback, useRef } from 'react';
import { useWorkspaceStore, DocumentUIState } from '../stores/workspace-store';
import { WorkspaceId } from '../../domain/value-objects/identifiers';
import { Position, Dimensions } from '../../domain/value-objects/geometry';
import { LayoutModeType } from '../../domain/value-objects/layout-mode';
import { DocumentCaddyState } from '../../domain/entities/document-caddy';

/**
 * Event types for workspace operations
 */
export interface WorkspaceEvent {
  type: string;
  timestamp: number;
  workspaceId: string;
  payload: any;
}

export interface DocumentAddedEvent extends WorkspaceEvent {
  type: 'document-added';
  payload: {
    documentId: string;
    filePath: string;
    position: Position;
    dimensions: Dimensions;
  };
}

export interface DocumentRemovedEvent extends WorkspaceEvent {
  type: 'document-removed';
  payload: {
    documentId: string;
  };
}

export interface DocumentMovedEvent extends WorkspaceEvent {
  type: 'document-moved';
  payload: {
    documentId: string;
    oldPosition: Position;
    newPosition: Position;
  };
}

export interface DocumentResizedEvent extends WorkspaceEvent {
  type: 'document-resized';
  payload: {
    documentId: string;
    oldDimensions: Dimensions;
    newDimensions: Dimensions;
  };
}

export interface DocumentActivatedEvent extends WorkspaceEvent {
  type: 'document-activated';
  payload: {
    documentId: string;
    previousActiveDocumentId?: string;
  };
}

export interface LayoutModeChangedEvent extends WorkspaceEvent {
  type: 'layout-mode-changed';
  payload: {
    oldMode: LayoutModeType;
    newMode: LayoutModeType;
    triggeredBy: 'user' | 'auto-freeform';
  };
}

export interface WorkspaceResizedEvent extends WorkspaceEvent {
  type: 'workspace-resized';
  payload: {
    oldDimensions: Dimensions;
    newDimensions: Dimensions;
  };
}

export interface WorkspaceLoadedEvent extends WorkspaceEvent {
  type: 'workspace-loaded';
  payload: {
    workspaceName: string;
    documentCount: number;
  };
}

export interface WorkspaceSavedEvent extends WorkspaceEvent {
  type: 'workspace-saved';
  payload: {
    workspaceName: string;
    documentCount: number;
  };
}

export interface DocumentStateChangedEvent extends WorkspaceEvent {
  type: 'document-state-changed';
  payload: {
    documentId: string;
    oldState: DocumentCaddyState;
    newState: DocumentCaddyState;
    errorMessage?: string;
  };
}

/**
 * Union type for all workspace events
 */
export type WorkspaceEventType =
  | DocumentAddedEvent
  | DocumentRemovedEvent
  | DocumentMovedEvent
  | DocumentResizedEvent
  | DocumentActivatedEvent
  | LayoutModeChangedEvent
  | WorkspaceResizedEvent
  | WorkspaceLoadedEvent
  | WorkspaceSavedEvent
  | DocumentStateChangedEvent;

/**
 * Event handler function type
 */
export type WorkspaceEventHandler<T extends WorkspaceEvent = WorkspaceEvent> = (event: T) => void;

/**
 * Event subscription configuration
 */
export interface EventSubscription {
  eventType: string;
  handler: WorkspaceEventHandler;
  once?: boolean;
}

/**
 * Hook for managing workspace event subscriptions and dispatching
 */
export const useWorkspaceEvents = (workspaceId?: string) => {
  const eventListeners = useRef<Map<string, WorkspaceEventHandler[]>>(new Map());
  const currentWorkspace = useWorkspaceStore(state => state.currentWorkspace);
  const documents = useWorkspaceStore(state =>
    state.currentWorkspace ? Object.values(state.currentWorkspace.documents) : []
  );
  const isLoading = useWorkspaceStore(state => state.operations.loading);

  // Create event dispatcher
  const dispatchEvent = useCallback((event: WorkspaceEventType) => {
    const listeners = eventListeners.current.get(event.type) || [];
    listeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in workspace event handler for ${event.type}:`, error);
      }
    });

    // Also dispatch to global listeners
    const globalListeners = eventListeners.current.get('*') || [];
    globalListeners.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in global workspace event handler:`, error);
      }
    });
  }, []);

  // Subscribe to events
  const subscribe = useCallback((
    eventType: string,
    handler: WorkspaceEventHandler,
    options?: { once?: boolean }
  ) => {
    const wrappedHandler = options?.once
      ? (event: WorkspaceEvent) => {
          handler(event);
          unsubscribe(eventType, wrappedHandler);
        }
      : handler;

    const listeners = eventListeners.current.get(eventType) || [];
    listeners.push(wrappedHandler);
    eventListeners.current.set(eventType, listeners);

    // Return unsubscribe function
    return () => unsubscribe(eventType, wrappedHandler);
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((eventType: string, handler: WorkspaceEventHandler) => {
    const listeners = eventListeners.current.get(eventType) || [];
    const index = listeners.indexOf(handler);
    if (index > -1) {
      listeners.splice(index, 1);
      eventListeners.current.set(eventType, listeners);
    }
  }, []);

  // Clear all subscriptions
  const clearSubscriptions = useCallback(() => {
    eventListeners.current.clear();
  }, []);

  // Get current workspace ID
  const getWorkspaceId = useCallback(() => {
    return workspaceId || currentWorkspace?.id || '';
  }, [workspaceId, currentWorkspace]);

  // Helper function to create event base
  const createEventBase = useCallback((type: string, payload: any): WorkspaceEvent => ({
    type,
    timestamp: Date.now(),
    workspaceId: getWorkspaceId(),
    payload,
  }), [getWorkspaceId]);

  // Event dispatchers for specific events
  const dispatchDocumentAdded = useCallback((
    documentId: string,
    filePath: string,
    position: Position,
    dimensions: Dimensions
  ) => {
    const event: DocumentAddedEvent = {
      ...createEventBase('document-added', {
        documentId,
        filePath,
        position,
        dimensions,
      }),
      type: 'document-added',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchDocumentRemoved = useCallback((documentId: string) => {
    const event: DocumentRemovedEvent = {
      ...createEventBase('document-removed', { documentId }),
      type: 'document-removed',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchDocumentMoved = useCallback((
    documentId: string,
    oldPosition: Position,
    newPosition: Position
  ) => {
    const event: DocumentMovedEvent = {
      ...createEventBase('document-moved', {
        documentId,
        oldPosition,
        newPosition,
      }),
      type: 'document-moved',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchDocumentResized = useCallback((
    documentId: string,
    oldDimensions: Dimensions,
    newDimensions: Dimensions
  ) => {
    const event: DocumentResizedEvent = {
      ...createEventBase('document-resized', {
        documentId,
        oldDimensions,
        newDimensions,
      }),
      type: 'document-resized',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchDocumentActivated = useCallback((
    documentId: string,
    previousActiveDocumentId?: string
  ) => {
    const event: DocumentActivatedEvent = {
      ...createEventBase('document-activated', {
        documentId,
        previousActiveDocumentId,
      }),
      type: 'document-activated',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchLayoutModeChanged = useCallback((
    oldMode: LayoutModeType,
    newMode: LayoutModeType,
    triggeredBy: 'user' | 'auto-freeform' = 'user'
  ) => {
    const event: LayoutModeChangedEvent = {
      ...createEventBase('layout-mode-changed', {
        oldMode,
        newMode,
        triggeredBy,
      }),
      type: 'layout-mode-changed',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchWorkspaceResized = useCallback((
    oldDimensions: Dimensions,
    newDimensions: Dimensions
  ) => {
    const event: WorkspaceResizedEvent = {
      ...createEventBase('workspace-resized', {
        oldDimensions,
        newDimensions,
      }),
      type: 'workspace-resized',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchWorkspaceLoaded = useCallback((
    workspaceName: string,
    documentCount: number
  ) => {
    const event: WorkspaceLoadedEvent = {
      ...createEventBase('workspace-loaded', {
        workspaceName,
        documentCount,
      }),
      type: 'workspace-loaded',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchWorkspaceSaved = useCallback((
    workspaceName: string,
    documentCount: number
  ) => {
    const event: WorkspaceSavedEvent = {
      ...createEventBase('workspace-saved', {
        workspaceName,
        documentCount,
      }),
      type: 'workspace-saved',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  const dispatchDocumentStateChanged = useCallback((
    documentId: string,
    oldState: DocumentCaddyState,
    newState: DocumentCaddyState,
    errorMessage?: string
  ) => {
    const event: DocumentStateChangedEvent = {
      ...createEventBase('document-state-changed', {
        documentId,
        oldState,
        newState,
        errorMessage,
      }),
      type: 'document-state-changed',
    };
    dispatchEvent(event);
  }, [createEventBase, dispatchEvent]);

  // Auto-detect workspace changes and dispatch events
  const prevWorkspace = useRef(currentWorkspace);
  const prevDocuments = useRef(documents);
  const prevIsLoading = useRef(isLoading);

  useEffect(() => {
    // Detect workspace loaded
    if (prevIsLoading.current && !isLoading && currentWorkspace) {
      dispatchWorkspaceLoaded(currentWorkspace.name, documents.length);
    }

    // Detect document count changes
    if (prevDocuments.current.length !== documents.length && currentWorkspace) {
      const prevCount = prevDocuments.current.length;
      const currentCount = documents.length;

      if (currentCount > prevCount) {
        // New document(s) added
        const newDocuments = documents.filter((doc: any) =>
          !prevDocuments.current.some((prevDoc: any) => prevDoc.id === doc.id)
        );
        newDocuments.forEach((doc: DocumentUIState) => {
          dispatchDocumentAdded(doc.id, doc.filePath,
            Position.fromCoordinates(doc.position.x, doc.position.y),
            Dimensions.fromValues(doc.dimensions.width, doc.dimensions.height)
          );
        });
      } else if (currentCount < prevCount) {
        // Document(s) removed
        const removedDocuments = prevDocuments.current.filter((prevDoc: DocumentUIState) =>
          !documents.some((doc: DocumentUIState) => doc.id === prevDoc.id)
        );
        removedDocuments.forEach((doc: DocumentUIState) => {
          dispatchDocumentRemoved(doc.id);
        });
      }
    }

    // Detect document state changes
    documents.forEach((doc: DocumentUIState) => {
      const prevDoc = prevDocuments.current.find((p: DocumentUIState) => p.id === doc.id);
      if (prevDoc) {
        // Check for position changes
        const docPos = Position.fromCoordinates(doc.position.x, doc.position.y);
        const prevPos = Position.fromCoordinates(prevDoc.position.x, prevDoc.position.y);
        if (!prevPos.equals(docPos)) {
          dispatchDocumentMoved(doc.id, prevPos, docPos);
        }

        // Check for dimension changes
        const docDim = Dimensions.fromValues(doc.dimensions.width, doc.dimensions.height);
        const prevDim = Dimensions.fromValues(prevDoc.dimensions.width, prevDoc.dimensions.height);
        if (!prevDim.equals(docDim)) {
          dispatchDocumentResized(doc.id, prevDim, docDim);
        }

        // Check for activation changes
        if (!prevDoc.isActive && doc.isActive) {
          const prevActiveDoc = prevDocuments.current.find((p: DocumentUIState) => p.isActive);
          dispatchDocumentActivated(doc.id, prevActiveDoc?.id);
        }

        // Check for state changes
        if (prevDoc.state !== doc.state) {
          dispatchDocumentStateChanged(doc.id, prevDoc.state, doc.state, doc.errorMessage);
        }
      }
    });

    // Update refs
    prevWorkspace.current = currentWorkspace;
    prevDocuments.current = documents;
    prevIsLoading.current = isLoading;
  }, [
    currentWorkspace,
    documents,
    isLoading,
    dispatchWorkspaceLoaded,
    dispatchDocumentAdded,
    dispatchDocumentRemoved,
    dispatchDocumentMoved,
    dispatchDocumentResized,
    dispatchDocumentActivated,
    dispatchDocumentStateChanged,
  ]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      clearSubscriptions();
    };
  }, [clearSubscriptions]);

  return {
    // Subscription management
    subscribe,
    unsubscribe,
    clearSubscriptions,

    // Event dispatchers
    dispatchEvent,
    dispatchDocumentAdded,
    dispatchDocumentRemoved,
    dispatchDocumentMoved,
    dispatchDocumentResized,
    dispatchDocumentActivated,
    dispatchLayoutModeChanged,
    dispatchWorkspaceResized,
    dispatchWorkspaceLoaded,
    dispatchWorkspaceSaved,
    dispatchDocumentStateChanged,

    // Utilities
    getWorkspaceId,
  };
};

/**
 * Hook for subscribing to specific workspace events
 */
export const useWorkspaceEventSubscription = <T extends WorkspaceEvent>(
  eventType: string,
  handler: WorkspaceEventHandler<T>,
  options?: { once?: boolean; workspaceId?: string }
) => {
  const { subscribe } = useWorkspaceEvents(options?.workspaceId);

  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler as WorkspaceEventHandler, options);
    return unsubscribe;
  }, [subscribe, eventType, handler, options]);
};

/**
 * Hook for dispatching workspace events
 */
export const useWorkspaceEventDispatcher = (workspaceId?: string) => {
  const {
    dispatchEvent,
    dispatchDocumentAdded,
    dispatchDocumentRemoved,
    dispatchDocumentMoved,
    dispatchDocumentResized,
    dispatchDocumentActivated,
    dispatchLayoutModeChanged,
    dispatchWorkspaceResized,
    dispatchWorkspaceLoaded,
    dispatchWorkspaceSaved,
    dispatchDocumentStateChanged,
  } = useWorkspaceEvents(workspaceId);

  return {
    dispatchEvent,
    dispatchDocumentAdded,
    dispatchDocumentRemoved,
    dispatchDocumentMoved,
    dispatchDocumentResized,
    dispatchDocumentActivated,
    dispatchLayoutModeChanged,
    dispatchWorkspaceResized,
    dispatchWorkspaceLoaded,
    dispatchWorkspaceSaved,
    dispatchDocumentStateChanged,
  };
};

/**
 * Event logging hook for debugging
 */
export const useWorkspaceEventLogger = (workspaceId?: string, enabled: boolean = true) => {
  const { subscribe } = useWorkspaceEvents(workspaceId);

  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribe('*', (event) => {
      console.log(`[Workspace Event] ${event.type}:`, {
        timestamp: new Date(event.timestamp).toISOString(),
        workspaceId: event.workspaceId,
        payload: event.payload,
      });
    });

    return unsubscribe;
  }, [subscribe, enabled]);
};

export default useWorkspaceEvents;