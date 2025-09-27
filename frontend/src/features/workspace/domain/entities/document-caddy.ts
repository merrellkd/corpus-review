import { DocumentCaddyId } from '../value-objects/identifiers';
import { Position, Dimensions } from '../value-objects/geometry';

/**
 * Document caddy states during its lifecycle
 */
export enum DocumentCaddyState {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  CLOSING = 'closing'
}

/**
 * Document caddy entity representing a document container in the workspace
 * Encapsulates document rendering, positioning, and interaction state
 */
export class DocumentCaddy {
  private constructor(
    private readonly id: DocumentCaddyId,
    private filePath: string,
    private title: string,
    private position: Position,
    private dimensions: Dimensions,
    private isActive: boolean,
    private zIndex: number,
    private state: DocumentCaddyState,
    private lastModified: Date,
    private createdAt: Date,
    private errorMessage?: string
  ) {}

  /**
   * Creates a new DocumentCaddy for opening a document
   */
  static create(
    filePath: string,
    title: string,
    initialPosition: Position = Position.origin(),
    initialDimensions: Dimensions = Dimensions.default()
  ): DocumentCaddy {
    return new DocumentCaddy(
      DocumentCaddyId.create(),
      filePath,
      title,
      initialPosition,
      initialDimensions,
      false,
      0,
      DocumentCaddyState.LOADING,
      new Date(),
      new Date()
    );
  }

  /**
   * Reconstitutes a DocumentCaddy from stored data
   */
  static fromData(data: {
    id: string;
    filePath: string;
    title: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    isActive: boolean;
    zIndex: number;
    state: string;
    lastModified: string;
    createdAt: string;
    errorMessage?: string | undefined;
  }): DocumentCaddy {
    return new DocumentCaddy(
      DocumentCaddyId.fromString(data.id),
      data.filePath,
      data.title,
      Position.fromPoint(data.position),
      Dimensions.fromSize(data.dimensions),
      data.isActive,
      data.zIndex,
      data.state as DocumentCaddyState,
      new Date(data.lastModified),
      new Date(data.createdAt),
      data.errorMessage
    );
  }

  /**
   * Gets the document caddy ID
   */
  getId(): DocumentCaddyId {
    return this.id;
  }

  /**
   * Gets the file path
   */
  getFilePath(): string {
    return this.filePath;
  }

  /**
   * Gets the document title
   */
  getTitle(): string {
    return this.title;
  }

  /**
   * Updates the document title
   */
  updateTitle(newTitle: string): void {
    if (!newTitle.trim()) {
      throw new Error('Document title cannot be empty');
    }
    this.title = newTitle.trim();
    this.lastModified = new Date();
  }

  /**
   * Gets the current position
   */
  getPosition(): Position {
    return this.position;
  }

  /**
   * Moves the document caddy to a new position
   */
  moveTo(newPosition: Position): void {
    this.position = newPosition;
    this.lastModified = new Date();
  }

  /**
   * Gets the current dimensions
   */
  getDimensions(): Dimensions {
    return this.dimensions;
  }

  /**
   * Resizes the document caddy
   */
  resize(newDimensions: Dimensions): void {
    this.dimensions = newDimensions;
    this.lastModified = new Date();
  }

  /**
   * Checks if this caddy is the active one
   */
  isActiveCaddy(): boolean {
    return this.isActive;
  }

  /**
   * Activates this document caddy
   */
  activate(): void {
    this.isActive = true;
    this.lastModified = new Date();
  }

  /**
   * Deactivates this document caddy
   */
  deactivate(): void {
    this.isActive = false;
    this.lastModified = new Date();
  }

  /**
   * Gets the z-index for layering
   */
  getZIndex(): number {
    return this.zIndex;
  }

  /**
   * Sets the z-index for layering
   */
  setZIndex(newZIndex: number): void {
    if (newZIndex < 0) {
      throw new Error('Z-index must be non-negative');
    }
    this.zIndex = newZIndex;
    this.lastModified = new Date();
  }

  /**
   * Brings this caddy to the front by setting a high z-index
   */
  bringToFront(currentMaxZIndex: number): void {
    this.setZIndex(currentMaxZIndex + 1);
  }

  /**
   * Gets the current state
   */
  getState(): DocumentCaddyState {
    return this.state;
  }

  /**
   * Marks the document as ready after successful loading
   */
  markReady(): void {
    if (this.state !== DocumentCaddyState.LOADING) {
      throw new Error(`Cannot mark ready from state: ${this.state}`);
    }
    this.state = DocumentCaddyState.READY;
    this.errorMessage = undefined;
    this.lastModified = new Date();
  }

  /**
   * Marks the document as having an error
   */
  markError(errorMessage: string): void {
    this.state = DocumentCaddyState.ERROR;
    this.errorMessage = errorMessage;
    this.lastModified = new Date();
  }

  /**
   * Initiates the closing process
   */
  startClosing(): void {
    this.state = DocumentCaddyState.CLOSING;
    this.lastModified = new Date();
  }

  /**
   * Gets the error message if in error state
   */
  getErrorMessage(): string | undefined {
    return this.errorMessage;
  }

  /**
   * Checks if the document is ready for interaction
   */
  isReady(): boolean {
    return this.state === DocumentCaddyState.READY;
  }

  /**
   * Checks if the document has an error
   */
  hasError(): boolean {
    return this.state === DocumentCaddyState.ERROR;
  }

  /**
   * Checks if the document is currently loading
   */
  isLoading(): boolean {
    return this.state === DocumentCaddyState.LOADING;
  }

  /**
   * Checks if the document is closing
   */
  isClosing(): boolean {
    return this.state === DocumentCaddyState.CLOSING;
  }

  /**
   * Gets the last modified timestamp
   */
  getLastModified(): Date {
    return new Date(this.lastModified);
  }

  /**
   * Gets the creation timestamp
   */
  getCreatedAt(): Date {
    return new Date(this.createdAt);
  }

  /**
   * Determines if this caddy can be interacted with
   */
  canInteract(): boolean {
    return this.state === DocumentCaddyState.READY;
  }

  /**
   * Determines if this caddy can be moved
   */
  canMove(): boolean {
    return this.canInteract() && !this.isClosing();
  }

  /**
   * Determines if this caddy can be resized
   */
  canResize(): boolean {
    return this.canInteract() && !this.isClosing();
  }

  /**
   * Exports the caddy data for serialization
   */
  toData(): {
    id: string;
    filePath: string;
    title: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    isActive: boolean;
    zIndex: number;
    state: string;
    lastModified: string;
    createdAt: string;
    errorMessage?: string | undefined;
  } {
    return {
      id: this.id.toString(),
      filePath: this.filePath,
      title: this.title,
      position: this.position.toPoint(),
      dimensions: this.dimensions.toSize(),
      isActive: this.isActive,
      zIndex: this.zIndex,
      state: this.state,
      lastModified: this.lastModified.toISOString(),
      createdAt: this.createdAt.toISOString(),
      errorMessage: this.errorMessage
    };
  }

  /**
   * Creates a copy of this caddy with updated position and dimensions
   * Used for layout calculations without mutating the original
   */
  withLayout(position: Position, dimensions: Dimensions, zIndex?: number): DocumentCaddy {
    return new DocumentCaddy(
      this.id,
      this.filePath,
      this.title,
      position,
      dimensions,
      this.isActive,
      zIndex ?? this.zIndex,
      this.state,
      this.lastModified,
      this.createdAt,
      this.errorMessage
    );
  }

  /**
   * Checks if the document caddy is visible in the current layout
   */
  isVisible(): boolean {
    return this.state !== DocumentCaddyState.CLOSING;
  }

  /**
   * Checks equality with another DocumentCaddy based on ID
   */
  equals(other: DocumentCaddy): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Gets a string representation for debugging
   */
  toString(): string {
    return `DocumentCaddy(${this.id.toString()}, ${this.title}, ${this.state})`;
  }
}