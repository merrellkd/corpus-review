import { DocumentCaddyId } from '../domain/value-objects/identifiers';
import { Position, Dimensions } from '../domain/value-objects/geometry';
import { DocumentCaddy, DocumentCaddyState } from '../domain/entities/document-caddy';
import {
  DocumentCaddyStateChangedEvent,
  WorkspaceEventPublisher
} from '../domain/events/workspace-events';

/**
 * Interface for document rendering operations
 */
export interface DocumentRenderer {
  loadDocument(filePath: string): Promise<void>;
  renderDocument(documentId: DocumentCaddyId, container: HTMLElement): Promise<void>;
  unloadDocument(documentId: DocumentCaddyId): Promise<void>;
  updateDocumentView(documentId: DocumentCaddyId, position: Position, dimensions: Dimensions): Promise<void>;
  getDocumentMetadata(filePath: string): Promise<DocumentMetadata>;
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  title: string;
  fileSize: number;
  lastModified: Date;
  mimeType: string;
  pageCount?: number;
  author?: string;
}

/**
 * Interface for document interaction tracking
 */
export interface DocumentInteractionTracker {
  trackDocumentOpened(documentId: DocumentCaddyId, filePath: string): void;
  trackDocumentClosed(documentId: DocumentCaddyId, duration: number): void;
  trackDocumentActivated(documentId: DocumentCaddyId): void;
  trackDocumentMoved(documentId: DocumentCaddyId, fromPosition: Position, toPosition: Position): void;
  trackDocumentResized(documentId: DocumentCaddyId, fromSize: Dimensions, toSize: Dimensions): void;
}

/**
 * Service for managing document caddy lifecycle and operations
 * Handles document loading, rendering, and interaction coordination
 */
export class DocumentCaddyService {
  private loadingDocuments = new Set<string>();
  private renderingDocuments = new Set<string>();

  constructor(
    private readonly renderer: DocumentRenderer,
    private readonly interactionTracker: DocumentInteractionTracker,
    private readonly eventPublisher: WorkspaceEventPublisher
  ) {}

  /**
   * Initializes a document caddy with loading state
   */
  async initializeDocumentCaddy(
    filePath: string,
    position?: Position,
    dimensions?: Dimensions
  ): Promise<DocumentCaddy> {
    // Get document metadata to determine title
    const metadata = await this.renderer.getDocumentMetadata(filePath);

    const caddy = DocumentCaddy.create(
      filePath,
      metadata.title,
      position || Position.origin(),
      dimensions || Dimensions.default()
    );

    // Track document opening
    this.interactionTracker.trackDocumentOpened(caddy.getId(), filePath);

    return caddy;
  }

  /**
   * Loads and prepares a document for rendering
   */
  async loadDocument(
    caddy: DocumentCaddy,
    _workspaceId: string
  ): Promise<void> {
    const documentId = caddy.getId();
    const filePath = caddy.getFilePath();

    // Prevent duplicate loading
    if (this.loadingDocuments.has(documentId.toString())) {
      return;
    }

    this.loadingDocuments.add(documentId.toString());

    try {
      // Load the document content
      await this.renderer.loadDocument(filePath);

      // Mark document as ready
      caddy.markReady();

      // Publish state change event
      await this.publishStateChangeEvent(_workspaceId, caddy, DocumentCaddyState.LOADING, DocumentCaddyState.READY);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      caddy.markError(errorMessage);

      // Publish error state event
      await this.publishStateChangeEvent(_workspaceId, caddy, DocumentCaddyState.LOADING, DocumentCaddyState.ERROR, errorMessage);

      throw error;
    } finally {
      this.loadingDocuments.delete(documentId.toString());
    }
  }

  /**
   * Renders a document caddy in the UI
   */
  async renderDocumentCaddy(
    caddy: DocumentCaddy,
    container: HTMLElement,
    workspaceId: string
  ): Promise<void> {
    const documentId = caddy.getId();

    if (!caddy.isReady()) {
      throw new Error(`Document caddy is not ready for rendering: ${documentId.toString()}`);
    }

    // Prevent duplicate rendering
    if (this.renderingDocuments.has(documentId.toString())) {
      return;
    }

    this.renderingDocuments.add(documentId.toString());

    try {
      await this.renderer.renderDocument(documentId, container);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Rendering error occurred';
      caddy.markError(errorMessage);

      // Publish error state event
      await this.publishStateChangeEvent(workspaceId, caddy, DocumentCaddyState.READY, DocumentCaddyState.ERROR, errorMessage);

      throw error;
    } finally {
      this.renderingDocuments.delete(documentId.toString());
    }
  }

  /**
   * Updates document caddy position and size in the UI
   */
  async updateDocumentCaddyView(
    caddy: DocumentCaddy,
    newPosition: Position,
    newDimensions: Dimensions,
    _workspaceId: string
  ): Promise<void> {
    if (!caddy.canInteract()) {
      throw new Error(`Document caddy cannot be updated: ${caddy.getId().toString()}`);
    }

    const oldPosition = caddy.getPosition();
    const oldDimensions = caddy.getDimensions();

    // Update domain model
    caddy.moveTo(newPosition);
    caddy.resize(newDimensions);

    try {
      // Update renderer view
      await this.renderer.updateDocumentView(caddy.getId(), newPosition, newDimensions);

      // Track interaction
      if (!oldPosition.equals(newPosition)) {
        this.interactionTracker.trackDocumentMoved(caddy.getId(), oldPosition, newPosition);
      }

      if (!oldDimensions.equals(newDimensions)) {
        this.interactionTracker.trackDocumentResized(caddy.getId(), oldDimensions, newDimensions);
      }

    } catch (error) {
      // Revert changes on error
      caddy.moveTo(oldPosition);
      caddy.resize(oldDimensions);
      throw error;
    }
  }

  /**
   * Activates a document caddy
   */
  async activateDocumentCaddy(
    caddy: DocumentCaddy,
    _workspaceId: string
  ): Promise<void> {
    if (!caddy.canInteract()) {
      throw new Error(`Document caddy cannot be activated: ${caddy.getId().toString()}`);
    }

    caddy.activate();

    // Track activation
    this.interactionTracker.trackDocumentActivated(caddy.getId());
  }

  /**
   * Deactivates a document caddy
   */
  async deactivateDocumentCaddy(caddy: DocumentCaddy): Promise<void> {
    caddy.deactivate();
  }

  /**
   * Brings a document caddy to the front
   */
  async bringToFront(
    caddy: DocumentCaddy,
    currentMaxZIndex: number
  ): Promise<void> {
    if (!caddy.canInteract()) {
      throw new Error(`Document caddy cannot be brought to front: ${caddy.getId().toString()}`);
    }

    caddy.bringToFront(currentMaxZIndex);
  }

  /**
   * Initiates the closing process for a document caddy
   */
  async startClosingDocumentCaddy(
    caddy: DocumentCaddy,
    workspaceId: string
  ): Promise<void> {
    const documentId = caddy.getId();
    const oldState = caddy.getState();

    caddy.startClosing();

    // Publish state change event
    await this.publishStateChangeEvent(workspaceId, caddy, oldState, DocumentCaddyState.CLOSING);

    // Track document closing
    const duration = Date.now() - caddy.getCreatedAt().getTime();
    this.interactionTracker.trackDocumentClosed(documentId, duration);
  }

  /**
   * Completes the document caddy cleanup
   */
  async cleanupDocumentCaddy(caddy: DocumentCaddy): Promise<void> {
    const documentId = caddy.getId();

    try {
      // Unload from renderer
      await this.renderer.unloadDocument(documentId);
    } catch (error) {
      // Log error but don't throw - cleanup should always succeed
      console.warn(`Error during document cleanup: ${error}`);
    }

    // Clean up any pending operations
    this.loadingDocuments.delete(documentId.toString());
    this.renderingDocuments.delete(documentId.toString());
  }

  /**
   * Updates document caddy title
   */
  async updateDocumentTitle(
    caddy: DocumentCaddy,
    newTitle: string
  ): Promise<void> {
    if (!caddy.canInteract()) {
      throw new Error(`Document caddy title cannot be updated: ${caddy.getId().toString()}`);
    }

    caddy.updateTitle(newTitle);
  }

  /**
   * Gets document caddy interaction capabilities
   */
  getDocumentCapabilities(caddy: DocumentCaddy): {
    canMove: boolean;
    canResize: boolean;
    canActivate: boolean;
    canClose: boolean;
    canInteract: boolean;
  } {
    return {
      canMove: caddy.canMove(),
      canResize: caddy.canResize(),
      canActivate: caddy.canInteract(),
      canClose: caddy.canInteract(),
      canInteract: caddy.canInteract()
    };
  }

  /**
   * Checks if a document is currently loading
   */
  isDocumentLoading(documentId: DocumentCaddyId): boolean {
    return this.loadingDocuments.has(documentId.toString());
  }

  /**
   * Checks if a document is currently rendering
   */
  isDocumentRendering(documentId: DocumentCaddyId): boolean {
    return this.renderingDocuments.has(documentId.toString());
  }

  /**
   * Gets all currently loading documents
   */
  getLoadingDocuments(): string[] {
    return Array.from(this.loadingDocuments);
  }

  /**
   * Gets all currently rendering documents
   */
  getRenderingDocuments(): string[] {
    return Array.from(this.renderingDocuments);
  }

  /**
   * Validates document caddy state for a specific operation
   */
  validateOperationPermission(
    caddy: DocumentCaddy,
    operation: 'move' | 'resize' | 'activate' | 'close' | 'interact'
  ): { allowed: boolean; reason?: string } {
    switch (operation) {
      case 'move':
        return {
          allowed: caddy.canMove(),
          reason: caddy.canMove() ? undefined : `Document is in ${caddy.getState()} state`
        } as { allowed: boolean; reason?: string };

      case 'resize':
        return {
          allowed: caddy.canResize(),
          reason: caddy.canResize() ? undefined : `Document is in ${caddy.getState()} state`
        } as { allowed: boolean; reason?: string };

      case 'activate':
      case 'close':
      case 'interact':
        return {
          allowed: caddy.canInteract(),
          reason: caddy.canInteract() ? undefined : `Document is in ${caddy.getState()} state`
        } as { allowed: boolean; reason?: string };

      default:
        return {
          allowed: false,
          reason: `Unknown operation: ${operation}`
        };
    }
  }

  private async publishStateChangeEvent(
    workspaceId: string,
    caddy: DocumentCaddy,
    oldState: DocumentCaddyState,
    newState: DocumentCaddyState,
    errorMessage?: string
  ): Promise<void> {
    const event = new DocumentCaddyStateChangedEvent(
      workspaceId,
      caddy.getId().toString(),
      oldState,
      newState,
      errorMessage
    );

    await this.eventPublisher.publish(event);
  }
}