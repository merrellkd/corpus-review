// Event classes use primitive types for serialization compatibility
import { LayoutModeType } from '../value-objects/layout-mode';

/**
 * Base interface for all workspace domain events
 */
export interface WorkspaceDomainEvent {
  readonly eventId: string;
  readonly workspaceId: string;
  readonly occurredAt: Date;
  readonly eventType: string;
}

/**
 * Event fired when a new workspace is created
 */
export class WorkspaceCreatedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'WorkspaceCreated';

  constructor(
    readonly workspaceId: string,
    readonly workspaceName: string,
    readonly initialLayoutMode: LayoutModeType,
    readonly workspaceSize: { width: number; height: number }
  ) {}
}

/**
 * Event fired when workspace name is updated
 */
export class WorkspaceNameUpdatedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'WorkspaceNameUpdated';

  constructor(
    readonly workspaceId: string,
    readonly oldName: string,
    readonly newName: string
  ) {}
}

/**
 * Event fired when workspace size is changed
 */
export class WorkspaceSizeChangedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'WorkspaceSizeChanged';

  constructor(
    readonly workspaceId: string,
    readonly oldSize: { width: number; height: number },
    readonly newSize: { width: number; height: number }
  ) {}
}

/**
 * Event fired when layout mode is switched
 */
export class LayoutModeChangedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'LayoutModeChanged';

  constructor(
    readonly workspaceId: string,
    readonly previousMode: LayoutModeType,
    readonly newMode: LayoutModeType,
    readonly triggeredBy: 'user' | 'auto-freeform'
  ) {}
}

/**
 * Event fired when a document is added to workspace
 */
export class DocumentAddedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentAdded';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly filePath: string,
    readonly title: string,
    readonly position: { x: number; y: number },
    readonly dimensions: { width: number; height: number },
    readonly wasActivated: boolean
  ) {}
}

/**
 * Event fired when a document is removed from workspace
 */
export class DocumentRemovedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentRemoved';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly filePath: string,
    readonly wasActive: boolean
  ) {}
}

/**
 * Event fired when all documents are removed from workspace
 */
export class AllDocumentsRemovedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'AllDocumentsRemoved';

  constructor(
    readonly workspaceId: string,
    readonly documentCount: number
  ) {}
}

/**
 * Event fired when a document becomes active
 */
export class DocumentActivatedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentActivated';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly previousActiveDocumentId?: string
  ) {}
}

/**
 * Event fired when a document is moved
 */
export class DocumentMovedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentMoved';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly oldPosition: { x: number; y: number },
    readonly newPosition: { x: number; y: number },
    readonly triggeredAutoFreeform: boolean
  ) {}
}

/**
 * Event fired when a document is resized
 */
export class DocumentResizedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentResized';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly oldDimensions: { width: number; height: number },
    readonly newDimensions: { width: number; height: number },
    readonly triggeredAutoFreeform: boolean
  ) {}
}

/**
 * Event fired when a document's z-index changes
 */
export class DocumentZIndexChangedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentZIndexChanged';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly oldZIndex: number,
    readonly newZIndex: number
  ) {}
}

/**
 * Event fired when a document caddy state changes
 */
export class DocumentCaddyStateChangedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentCaddyStateChanged';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly oldState: string,
    readonly newState: string,
    readonly errorMessage?: string
  ) {}
}

/**
 * Event fired when document layout is recalculated
 */
export class DocumentLayoutRecalculatedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DocumentLayoutRecalculated';

  constructor(
    readonly workspaceId: string,
    readonly layoutMode: LayoutModeType,
    readonly documentCount: number,
    readonly reason: 'layout-switch' | 'size-change' | 'document-added' | 'document-removed'
  ) {}
}

/**
 * Event fired when a duplicate document is detected and focused instead of created
 */
export class DuplicateDocumentFocusedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'DuplicateDocumentFocused';

  constructor(
    readonly workspaceId: string,
    readonly documentId: string,
    readonly filePath: string
  ) {}
}

/**
 * Event fired when workspace state is persisted
 */
export class WorkspacePersistedEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'WorkspacePersisted';

  constructor(
    readonly workspaceId: string,
    readonly documentCount: number,
    readonly persistenceType: 'auto' | 'manual'
  ) {}
}

/**
 * Event fired when workspace state is restored
 */
export class WorkspaceRestoredEvent implements WorkspaceDomainEvent {
  readonly eventId: string = crypto.randomUUID();
  readonly occurredAt: Date = new Date();
  readonly eventType = 'WorkspaceRestored';

  constructor(
    readonly workspaceId: string,
    readonly documentCount: number,
    readonly layoutMode: LayoutModeType,
    readonly restoredFrom: string
  ) {}
}

/**
 * Type union of all workspace domain events
 */
export type AnyWorkspaceDomainEvent =
  | WorkspaceCreatedEvent
  | WorkspaceNameUpdatedEvent
  | WorkspaceSizeChangedEvent
  | LayoutModeChangedEvent
  | DocumentAddedEvent
  | DocumentRemovedEvent
  | AllDocumentsRemovedEvent
  | DocumentActivatedEvent
  | DocumentMovedEvent
  | DocumentResizedEvent
  | DocumentZIndexChangedEvent
  | DocumentCaddyStateChangedEvent
  | DocumentLayoutRecalculatedEvent
  | DuplicateDocumentFocusedEvent
  | WorkspacePersistedEvent
  | WorkspaceRestoredEvent;

/**
 * Interface for domain event handlers
 */
export interface WorkspaceEventHandler<TEvent extends WorkspaceDomainEvent> {
  handle(event: TEvent): void | Promise<void>;
}

/**
 * Interface for publishing domain events
 */
export interface WorkspaceEventPublisher {
  publish(event: AnyWorkspaceDomainEvent): void | Promise<void>;
  publishMany(events: AnyWorkspaceDomainEvent[]): void | Promise<void>;
}

/**
 * Interface for subscribing to domain events
 */
export interface WorkspaceEventSubscriber {
  subscribe<TEvent extends AnyWorkspaceDomainEvent>(
    eventType: TEvent['eventType'],
    handler: WorkspaceEventHandler<TEvent>
  ): void;

  unsubscribe<TEvent extends AnyWorkspaceDomainEvent>(
    eventType: TEvent['eventType'],
    handler: WorkspaceEventHandler<TEvent>
  ): void;
}

/**
 * Utility functions for working with workspace events
 */
export class WorkspaceEventUtils {
  /**
   * Creates a typed event handler function
   */
  static createHandler<TEvent extends AnyWorkspaceDomainEvent>(
    handler: (event: TEvent) => void | Promise<void>
  ): WorkspaceEventHandler<TEvent> {
    return { handle: handler };
  }

  /**
   * Filters events by workspace ID
   */
  static forWorkspace(workspaceId: string) {
    return (event: AnyWorkspaceDomainEvent): boolean => {
      return event.workspaceId === workspaceId;
    };
  }

  /**
   * Filters events by document ID
   */
  static forDocument(documentId: string) {
    return (event: AnyWorkspaceDomainEvent): boolean => {
      return 'documentId' in event && event.documentId === documentId;
    };
  }

  /**
   * Filters events by type
   */
  static ofType<TEvent extends AnyWorkspaceDomainEvent>(
    eventType: TEvent['eventType']
  ) {
    return (event: AnyWorkspaceDomainEvent): event is TEvent => {
      return event.eventType === eventType;
    };
  }

  /**
   * Gets events that occurred within a time range
   */
  static withinTimeRange(startTime: Date, endTime: Date) {
    return (event: AnyWorkspaceDomainEvent): boolean => {
      return event.occurredAt >= startTime && event.occurredAt <= endTime;
    };
  }

  /**
   * Serializes an event to JSON
   */
  static serialize(event: AnyWorkspaceDomainEvent): string {
    return JSON.stringify({
      ...event,
      occurredAt: event.occurredAt.toISOString()
    });
  }

  /**
   * Deserializes an event from JSON
   */
  static deserialize(jsonString: string): AnyWorkspaceDomainEvent {
    const data = JSON.parse(jsonString);
    return {
      ...data,
      occurredAt: new Date(data.occurredAt)
    };
  }
}