import { WorkspaceId, DocumentCaddyId } from '../domain/value-objects/identifiers';
import { Position, Dimensions } from '../domain/value-objects/geometry';
import { LayoutMode, LayoutModeType, DocumentLayoutResult } from '../domain/value-objects/layout-mode';
import { DocumentCaddy } from '../domain/entities/document-caddy';
import { Workspace } from '../domain/aggregates/workspace';
import {
  AnyWorkspaceDomainEvent,
  WorkspaceCreatedEvent,
  LayoutModeChangedEvent,
  DocumentAddedEvent,
  DocumentRemovedEvent,
  DocumentActivatedEvent,
  DocumentMovedEvent,
  DocumentResizedEvent,
  WorkspaceEventPublisher
} from '../domain/events/workspace-events';

/**
 * Interface for workspace repository
 */
export interface WorkspaceRepository {
  save(workspace: Workspace): Promise<void>;
  findById(id: WorkspaceId): Promise<Workspace | undefined>;
  findByName(name: string): Promise<Workspace | undefined>;
  delete(id: WorkspaceId): Promise<boolean>;
  exists(id: WorkspaceId): Promise<boolean>;
}

/**
 * Interface for document file operations
 */
export interface DocumentFileService {
  exists(filePath: string): Promise<boolean>;
  getTitle(filePath: string): Promise<string>;
  validatePath(filePath: string): Promise<boolean>;
}

/**
 * Application service for workspace operations
 * Orchestrates domain logic and coordinates with infrastructure
 */
export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly fileService: DocumentFileService,
    private readonly eventPublisher: WorkspaceEventPublisher
  ) {}

  /**
   * Creates a new workspace
   */
  async createWorkspace(
    name: string,
    layoutMode: LayoutModeType = LayoutModeType.STACKED,
    workspaceSize?: Dimensions
  ): Promise<Workspace> {
    // Check for duplicate names
    const existing = await this.repository.findByName(name);
    if (existing) {
      throw new Error(`Workspace with name "${name}" already exists`);
    }

    const layout = LayoutMode.fromString(layoutMode);
    const size = workspaceSize || Dimensions.default();
    const workspace = Workspace.create(name, layout, size);

    await this.repository.save(workspace);

    // Publish domain event
    const event = new WorkspaceCreatedEvent(
      workspace.getId().toString(),
      workspace.getName(),
      layout.getType(),
      size.toSize()
    );
    await this.eventPublisher.publish(event);

    return workspace;
  }

  /**
   * Gets workspace by ID
   */
  async getWorkspace(workspaceId: WorkspaceId): Promise<Workspace> {
    const workspace = await this.repository.findById(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId.toString()}`);
    }
    return workspace;
  }

  /**
   * Updates workspace name
   */
  async updateWorkspaceName(workspaceId: WorkspaceId, newName: string): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId);
    const oldName = workspace.getName();

    workspace.updateName(newName);
    await this.repository.save(workspace);

    // Publish domain event
    const event = new WorkspaceCreatedEvent(
      workspace.getId().toString(),
      newName,
      workspace.getLayoutMode().getType(),
      workspace.getWorkspaceSize().toSize()
    );
    await this.eventPublisher.publish(event);
  }

  /**
   * Switches workspace layout mode
   */
  async switchLayoutMode(
    workspaceId: WorkspaceId,
    newLayoutMode: LayoutModeType,
    triggeredBy: 'user' | 'auto-freeform' = 'user'
  ): Promise<DocumentLayoutResult[]> {
    const workspace = await this.getWorkspace(workspaceId);
    const previousMode = workspace.getLayoutMode().getType();

    const newLayout = LayoutMode.fromString(newLayoutMode);
    const layoutResults = workspace.switchLayoutMode(newLayout);

    await this.repository.save(workspace);

    // Publish domain event
    const event = new LayoutModeChangedEvent(
      workspace.getId().toString(),
      previousMode,
      newLayoutMode,
      triggeredBy
    );
    await this.eventPublisher.publish(event);

    return layoutResults;
  }

  /**
   * Adds a document to the workspace
   */
  async addDocument(
    workspaceId: WorkspaceId,
    filePath: string,
    position?: Position,
    dimensions?: Dimensions
  ): Promise<{ document: DocumentCaddy; wasActivated: boolean }> {
    const workspace = await this.getWorkspace(workspaceId);

    // Validate file exists and get title
    if (!(await this.fileService.exists(filePath))) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (!(await this.fileService.validatePath(filePath))) {
      throw new Error(`Invalid file path: ${filePath}`);
    }

    const title = await this.fileService.getTitle(filePath);

    const document = workspace.addDocument(filePath, title, position, dimensions);
    const wasActivated = document.isActiveCaddy();

    await this.repository.save(workspace);

    // Publish domain event
    const event = new DocumentAddedEvent(
      workspace.getId().toString(),
      document.getId().toString(),
      filePath,
      title,
      document.getPosition().toPoint(),
      document.getDimensions().toSize(),
      wasActivated
    );
    await this.eventPublisher.publish(event);

    return { document, wasActivated };
  }

  /**
   * Removes a document from the workspace
   */
  async removeDocument(workspaceId: WorkspaceId, documentId: DocumentCaddyId): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId);
    const document = workspace.getDocument(documentId);

    if (!document) {
      return false;
    }

    const wasActive = document.isActiveCaddy();
    const filePath = document.getFilePath();

    const removed = workspace.removeDocument(documentId);
    if (removed) {
      await this.repository.save(workspace);

      // Publish domain event
      const event = new DocumentRemovedEvent(
        workspace.getId().toString(),
        documentId.toString(),
        filePath,
        wasActive
      );
      await this.eventPublisher.publish(event);
    }

    return removed;
  }

  /**
   * Removes all documents from the workspace
   */
  async removeAllDocuments(workspaceId: WorkspaceId): Promise<number> {
    const workspace = await this.getWorkspace(workspaceId);
    const documentCount = workspace.getDocumentCount();

    workspace.removeAllDocuments();
    await this.repository.save(workspace);

    return documentCount;
  }

  /**
   * Activates a specific document
   */
  async activateDocument(workspaceId: WorkspaceId, documentId: DocumentCaddyId): Promise<void> {
    const workspace = await this.getWorkspace(workspaceId);
    const currentActive = workspace.getActiveDocument();
    const previousActiveId = currentActive?.getId().toString();

    workspace.activateDocument(documentId);
    await this.repository.save(workspace);

    // Publish domain event
    const event = new DocumentActivatedEvent(
      workspace.getId().toString(),
      documentId.toString(),
      previousActiveId
    );
    await this.eventPublisher.publish(event);
  }

  /**
   * Moves a document to a new position
   */
  async moveDocument(
    workspaceId: WorkspaceId,
    documentId: DocumentCaddyId,
    newPosition: Position
  ): Promise<{ layoutResults: DocumentLayoutResult[]; triggeredAutoFreeform: boolean }> {
    const workspace = await this.getWorkspace(workspaceId);
    const document = workspace.getDocument(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId.toString()}`);
    }

    const oldPosition = document.getPosition();
    const oldLayoutMode = workspace.getLayoutMode().getType();

    const layoutResults = workspace.moveDocument(documentId, newPosition);
    const triggeredAutoFreeform = workspace.getLayoutMode().getType() !== oldLayoutMode;

    await this.repository.save(workspace);

    // Publish domain event
    const event = new DocumentMovedEvent(
      workspace.getId().toString(),
      documentId.toString(),
      oldPosition.toPoint(),
      newPosition.toPoint(),
      triggeredAutoFreeform
    );
    await this.eventPublisher.publish(event);

    return { layoutResults, triggeredAutoFreeform };
  }

  /**
   * Resizes a document
   */
  async resizeDocument(
    workspaceId: WorkspaceId,
    documentId: DocumentCaddyId,
    newDimensions: Dimensions
  ): Promise<{ layoutResults: DocumentLayoutResult[]; triggeredAutoFreeform: boolean }> {
    const workspace = await this.getWorkspace(workspaceId);
    const document = workspace.getDocument(documentId);

    if (!document) {
      throw new Error(`Document not found: ${documentId.toString()}`);
    }

    const oldDimensions = document.getDimensions();
    const oldLayoutMode = workspace.getLayoutMode().getType();

    const layoutResults = workspace.resizeDocument(documentId, newDimensions);
    const triggeredAutoFreeform = workspace.getLayoutMode().getType() !== oldLayoutMode;

    await this.repository.save(workspace);

    // Publish domain event
    const event = new DocumentResizedEvent(
      workspace.getId().toString(),
      documentId.toString(),
      oldDimensions.toSize(),
      newDimensions.toSize(),
      triggeredAutoFreeform
    );
    await this.eventPublisher.publish(event);

    return { layoutResults, triggeredAutoFreeform };
  }

  /**
   * Calculates current layout for all documents
   */
  async calculateLayout(workspaceId: WorkspaceId): Promise<DocumentLayoutResult[]> {
    const workspace = await this.getWorkspace(workspaceId);
    return workspace.calculateCurrentLayout();
  }

  /**
   * Updates workspace size and recalculates layout
   */
  async updateWorkspaceSize(
    workspaceId: WorkspaceId,
    newSize: Dimensions
  ): Promise<DocumentLayoutResult[]> {
    const workspace = await this.getWorkspace(workspaceId);
    const layoutResults = workspace.updateWorkspaceSize(newSize);

    await this.repository.save(workspace);

    return layoutResults;
  }

  /**
   * Gets all documents in the workspace
   */
  async getDocuments(workspaceId: WorkspaceId): Promise<DocumentCaddy[]> {
    const workspace = await this.getWorkspace(workspaceId);
    return workspace.getAllDocuments();
  }

  /**
   * Gets workspace statistics
   */
  async getWorkspaceStats(workspaceId: WorkspaceId): Promise<{
    documentCount: number;
    layoutMode: LayoutModeType;
    activeDocumentId?: string;
    isEmpty: boolean;
    lastModified: Date;
  }> {
    const workspace = await this.getWorkspace(workspaceId);
    const activeDoc = workspace.getActiveDocument();

    return {
      documentCount: workspace.getDocumentCount(),
      layoutMode: workspace.getLayoutMode().getType(),
      activeDocumentId: activeDoc?.getId().toString(),
      isEmpty: workspace.isEmpty(),
      lastModified: workspace.getLastModified()
    };
  }

  /**
   * Checks if a document already exists in the workspace by file path
   */
  async hasDocument(workspaceId: WorkspaceId, filePath: string): Promise<boolean> {
    const workspace = await this.getWorkspace(workspaceId);
    const documents = workspace.getAllDocuments();
    return documents.some(doc => doc.getFilePath() === filePath);
  }

  /**
   * Deletes the workspace
   */
  async deleteWorkspace(workspaceId: WorkspaceId): Promise<boolean> {
    return await this.repository.delete(workspaceId);
  }

  /**
   * Checks if a workspace exists
   */
  async workspaceExists(workspaceId: WorkspaceId): Promise<boolean> {
    return await this.repository.exists(workspaceId);
  }
}