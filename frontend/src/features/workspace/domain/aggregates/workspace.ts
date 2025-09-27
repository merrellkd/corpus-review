import { WorkspaceId, DocumentCaddyId } from '../value-objects/identifiers';
import { Position, Dimensions } from '../value-objects/geometry';
import { LayoutMode, LayoutModeType, DocumentLayoutInfo, DocumentLayoutResult } from '../value-objects/layout-mode';
import { DocumentCaddy } from '../entities/document-caddy';

/**
 * Workspace aggregate root - manages the collection of document caddies and their layout
 * Enforces business rules and coordinates document lifecycle operations
 */
export class Workspace {
  private documentCaddies: Map<string, DocumentCaddy> = new Map();
  private activeDocumentId: DocumentCaddyId | undefined;
  private lastModified: Date;

  private constructor(
    private readonly id: WorkspaceId,
    private name: string,
    private layoutMode: LayoutMode,
    private workspaceSize: Dimensions,
    private readonly createdAt: Date,
    initialDocuments?: DocumentCaddy[]
  ) {
    this.lastModified = new Date();

    if (initialDocuments) {
      for (const doc of initialDocuments) {
        this.documentCaddies.set(doc.getId().toString(), doc);
        if (doc.isActiveCaddy()) {
          this.activeDocumentId = doc.getId();
        }
      }
    }
  }

  /**
   * Creates a new empty workspace
   */
  static create(
    name: string,
    initialLayoutMode: LayoutMode = LayoutMode.stacked(),
    workspaceSize: Dimensions = Dimensions.fromValues(1200, 800)
  ): Workspace {
    if (!name.trim()) {
      throw new Error('Workspace name cannot be empty');
    }

    return new Workspace(
      WorkspaceId.create(),
      name.trim(),
      initialLayoutMode,
      workspaceSize,
      new Date()
    );
  }

  /**
   * Reconstitutes a workspace from stored data
   */
  static fromData(data: {
    id: string;
    name: string;
    layoutMode: string;
    workspaceSize: { width: number; height: number };
    createdAt: string;
    lastModified: string;
    documents: any[];
    activeDocumentId?: string | undefined;
  }): Workspace {
    const documents = data.documents.map(docData => DocumentCaddy.fromData(docData));

    const workspace = new Workspace(
      WorkspaceId.fromString(data.id),
      data.name,
      LayoutMode.fromString(data.layoutMode),
      Dimensions.fromSize(data.workspaceSize),
      new Date(data.createdAt),
      documents
    );

    workspace.lastModified = new Date(data.lastModified);

    if (data.activeDocumentId) {
      workspace.activeDocumentId = DocumentCaddyId.fromString(data.activeDocumentId);
    }

    return workspace;
  }

  /**
   * Gets the workspace ID
   */
  getId(): WorkspaceId {
    return this.id;
  }

  /**
   * Gets the workspace name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Updates the workspace name
   */
  updateName(newName: string): void {
    if (!newName.trim()) {
      throw new Error('Workspace name cannot be empty');
    }
    this.name = newName.trim();
    this.touch();
  }

  /**
   * Gets the current layout mode
   */
  getLayoutMode(): LayoutMode {
    return this.layoutMode;
  }

  /**
   * Switches to a new layout mode and recalculates positions
   */
  switchLayoutMode(newLayoutMode: LayoutMode): DocumentLayoutResult[] {
    if (this.layoutMode.equals(newLayoutMode)) {
      return this.calculateCurrentLayout();
    }

    this.layoutMode = newLayoutMode;
    this.touch();

    return this.calculateCurrentLayout();
  }

  /**
   * Gets the workspace dimensions
   */
  getWorkspaceSize(): Dimensions {
    return this.workspaceSize;
  }

  /**
   * Updates the workspace size and recalculates layout
   */
  updateWorkspaceSize(newSize: Dimensions): DocumentLayoutResult[] {
    this.workspaceSize = newSize;
    this.touch();
    return this.calculateCurrentLayout();
  }

  /**
   * Adds a new document to the workspace
   */
  addDocument(
    filePath: string,
    title: string,
    position?: Position,
    dimensions?: Dimensions
  ): DocumentCaddy {
    // Check for duplicate documents
    const existingDoc = this.findDocumentByPath(filePath);
    if (existingDoc) {
      // Focus existing document instead of creating duplicate
      this.activateDocument(existingDoc.getId());
      return existingDoc;
    }

    // Calculate position for new document based on current layout mode
    const calculatedPosition = position || this.calculatePositionForNewDocument();
    const calculatedDimensions = dimensions || this.calculateDimensionsForNewDocument();

    const newDocument = DocumentCaddy.create(
      filePath,
      title,
      calculatedPosition,
      calculatedDimensions
    );

    // Set appropriate z-index
    const maxZIndex = this.getMaxZIndex();
    newDocument.setZIndex(maxZIndex + 1);

    this.documentCaddies.set(newDocument.getId().toString(), newDocument);

    // Auto-activate if this is the first document or no document is currently active
    if (this.documentCaddies.size === 1 || !this.activeDocumentId) {
      this.activateDocument(newDocument.getId());
    }

    this.touch();
    return newDocument;
  }

  /**
   * Removes a document from the workspace
   */
  removeDocument(documentId: DocumentCaddyId): boolean {
    const document = this.documentCaddies.get(documentId.toString());
    if (!document) {
      return false;
    }

    // Start closing process
    document.startClosing();

    // If this was the active document, activate another one
    if (this.activeDocumentId?.equals(documentId)) {
      this.activateNextDocument(documentId);
    }

    this.documentCaddies.delete(documentId.toString());
    this.touch();
    return true;
  }

  /**
   * Removes all documents from the workspace
   */
  removeAllDocuments(): void {
    for (const doc of this.documentCaddies.values()) {
      doc.startClosing();
    }

    this.documentCaddies.clear();
    this.activeDocumentId = undefined;
    this.touch();
  }

  /**
   * Activates a specific document
   */
  activateDocument(documentId: DocumentCaddyId): void {
    const targetDocument = this.documentCaddies.get(documentId.toString());
    if (!targetDocument) {
      throw new Error(`Document not found: ${documentId.toString()}`);
    }

    // Deactivate current active document
    if (this.activeDocumentId) {
      const currentActive = this.documentCaddies.get(this.activeDocumentId.toString());
      currentActive?.deactivate();
    }

    // Activate target document
    targetDocument.activate();
    targetDocument.bringToFront(this.getMaxZIndex());
    this.activeDocumentId = documentId;
    this.touch();
  }

  /**
   * Gets the currently active document
   */
  getActiveDocument(): DocumentCaddy | undefined {
    if (!this.activeDocumentId) {
      return undefined;
    }
    return this.documentCaddies.get(this.activeDocumentId.toString());
  }

  /**
   * Gets all documents in the workspace
   */
  getAllDocuments(): DocumentCaddy[] {
    return Array.from(this.documentCaddies.values());
  }

  /**
   * Gets a specific document by ID
   */
  getDocument(documentId: DocumentCaddyId): DocumentCaddy | undefined {
    return this.documentCaddies.get(documentId.toString());
  }

  /**
   * Gets the number of documents in the workspace
   */
  getDocumentCount(): number {
    return this.documentCaddies.size;
  }

  /**
   * Checks if the workspace is empty
   */
  isEmpty(): boolean {
    return this.documentCaddies.size === 0;
  }

  /**
   * Moves a document to a new position (triggers auto-freeform if needed)
   */
  moveDocument(documentId: DocumentCaddyId, newPosition: Position): DocumentLayoutResult[] {
    const document = this.documentCaddies.get(documentId.toString());
    if (!document || !document.canMove()) {
      throw new Error(`Cannot move document: ${documentId.toString()}`);
    }

    // Check if we need to auto-switch to freeform mode
    if (this.layoutMode.shouldAutoSwitchToFreeform('drag')) {
      this.layoutMode = LayoutMode.freeform();
    }

    document.moveTo(newPosition);
    this.touch();

    return this.calculateCurrentLayout();
  }

  /**
   * Resizes a document (triggers auto-freeform if needed)
   */
  resizeDocument(documentId: DocumentCaddyId, newDimensions: Dimensions): DocumentLayoutResult[] {
    const document = this.documentCaddies.get(documentId.toString());
    if (!document || !document.canResize()) {
      throw new Error(`Cannot resize document: ${documentId.toString()}`);
    }

    // Check if we need to auto-switch to freeform mode
    if (this.layoutMode.shouldAutoSwitchToFreeform('resize')) {
      this.layoutMode = LayoutMode.freeform();
    }

    document.resize(newDimensions);
    this.touch();

    return this.calculateCurrentLayout();
  }

  /**
   * Calculates layout for all documents using current layout mode
   */
  calculateCurrentLayout(): DocumentLayoutResult[] {
    const documents = this.getAllDocuments();
    const layoutInfos: DocumentLayoutInfo[] = documents.map(doc => ({
      id: doc.getId(),
      currentPosition: doc.getPosition(),
      currentDimensions: doc.getDimensions(),
      isActive: doc.isActiveCaddy(),
      zIndex: doc.getZIndex()
    }));

    return this.layoutMode.calculateLayout(
      layoutInfos,
      this.workspaceSize,
      this.activeDocumentId
    );
  }

  /**
   * Applies a calculated layout to the documents
   */
  applyLayout(layoutResults: DocumentLayoutResult[]): void {
    for (const result of layoutResults) {
      const document = this.documentCaddies.get(result.id.toString());
      if (document) {
        document.moveTo(result.position);
        document.resize(result.dimensions);
        document.setZIndex(result.zIndex);
      }
    }
    this.touch();
  }

  /**
   * Gets the creation timestamp
   */
  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  /**
   * Gets the last modified timestamp
   */
  getLastModified(): Date {
    return new Date(this.lastModified);
  }

  /**
   * Exports workspace data for serialization
   */
  toData(): {
    id: string;
    name: string;
    layoutMode: string;
    workspaceSize: { width: number; height: number };
    createdAt: string;
    lastModified: string;
    documents: any[];
    activeDocumentId?: string | undefined;
  } {
    return {
      id: this.id.toString(),
      name: this.name,
      layoutMode: this.layoutMode.toString(),
      workspaceSize: this.workspaceSize.toSize(),
      createdAt: this.createdAt.toISOString(),
      lastModified: this.lastModified.toISOString(),
      documents: this.getAllDocuments().map(doc => doc.toData()),
      activeDocumentId: this.activeDocumentId?.toString()
    };
  }

  private findDocumentByPath(filePath: string): DocumentCaddy | undefined {
    return Array.from(this.documentCaddies.values())
      .find(doc => doc.getFilePath() === filePath);
  }

  private calculatePositionForNewDocument(): Position {
    if (this.layoutMode.getType() === LayoutModeType.FREEFORM) {
      // In freeform, offset new documents slightly
      const offset = (this.documentCaddies.size % 10) * 30;
      return Position.fromCoordinates(offset, offset);
    }

    // For other modes, use origin (layout will be calculated later)
    return Position.origin();
  }

  private calculateDimensionsForNewDocument(): Dimensions {
    return Dimensions.default();
  }

  private getMaxZIndex(): number {
    let maxZ = 0;
    for (const doc of this.documentCaddies.values()) {
      maxZ = Math.max(maxZ, doc.getZIndex());
    }
    return maxZ;
  }

  private activateNextDocument(excludeId: DocumentCaddyId): void {
    const documents = this.getAllDocuments()
      .filter(doc => !doc.getId().equals(excludeId))
      .sort((a, b) => b.getLastModified().getTime() - a.getLastModified().getTime());

    if (documents.length > 0) {
      this.activateDocument(documents[0].getId());
    } else {
      this.activeDocumentId = undefined;
    }
  }

  private touch(): void {
    this.lastModified = new Date();
  }
}