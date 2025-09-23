import { Position, Dimensions } from './geometry';
import { DocumentCaddyId } from './identifiers';

/**
 * Enumeration of available layout modes
 */
export enum LayoutModeType {
  STACKED = 'stacked',
  GRID = 'grid',
  FREEFORM = 'freeform'
}

/**
 * Interface for layout mode strategies
 */
export interface LayoutStrategy {
  /**
   * Calculates positions and dimensions for all documents in this layout mode
   */
  calculateLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions,
    activeDocumentId?: DocumentCaddyId
  ): DocumentLayoutResult[];

  /**
   * Determines if this layout mode supports user-initiated resizing
   */
  supportsResizing(): boolean;

  /**
   * Determines if this layout mode supports user-initiated dragging
   */
  supportsDragging(): boolean;

  /**
   * Gets the CSS class name for this layout mode
   */
  getCssClassName(): string;
}

/**
 * Information about a document needed for layout calculations
 */
export interface DocumentLayoutInfo {
  id: DocumentCaddyId;
  currentPosition: Position;
  currentDimensions: Dimensions;
  isActive: boolean;
  zIndex: number;
}

/**
 * Result of layout calculation for a single document
 */
export interface DocumentLayoutResult {
  id: DocumentCaddyId;
  position: Position;
  dimensions: Dimensions;
  zIndex: number;
  isVisible: boolean;
}

/**
 * Stacked layout strategy - only active document fully visible
 */
export class StackedLayoutStrategy implements LayoutStrategy {
  calculateLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions,
    activeDocumentId?: DocumentCaddyId
  ): DocumentLayoutResult[] {
    const results: DocumentLayoutResult[] = [];

    for (const doc of documents) {
      const isActive = activeDocumentId ? doc.id.equals(activeDocumentId) : doc.isActive;

      if (isActive) {
        // Active document takes center stage with constrained dimensions
        const maxWidth = Math.min(workspaceSize.getWidth() * 0.9, 1000);
        const maxHeight = Math.min(workspaceSize.getHeight() * 0.9, 700);
        const dimensions = Dimensions.fromValues(maxWidth, maxHeight);

        const centerX = (workspaceSize.getWidth() - dimensions.getWidth()) / 2;
        const centerY = (workspaceSize.getHeight() - dimensions.getHeight()) / 2;
        const position = Position.fromCoordinates(centerX, centerY);

        results.push({
          id: doc.id,
          position,
          dimensions,
          zIndex: 10,
          isVisible: true
        });
      } else {
        // Inactive documents are hidden but positioned for tab switching
        results.push({
          id: doc.id,
          position: Position.origin(),
          dimensions: Dimensions.minimum(),
          zIndex: 0,
          isVisible: false
        });
      }
    }

    return results;
  }

  supportsResizing(): boolean {
    return false;
  }

  supportsDragging(): boolean {
    return false;
  }

  getCssClassName(): string {
    return 'stacked-layout';
  }
}

/**
 * Grid layout strategy - documents arranged in responsive grid
 */
export class GridLayoutStrategy implements LayoutStrategy {
  calculateLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions
  ): DocumentLayoutResult[] {
    const results: DocumentLayoutResult[] = [];
    const docCount = documents.length;

    if (docCount === 0) return results;

    // Calculate optimal grid dimensions
    const { cols, rows } = this.calculateGridDimensions(docCount);

    // Calculate cell dimensions with padding
    const padding = 20;
    const cellWidth = (workspaceSize.getWidth() - padding * (cols + 1)) / cols;
    const cellHeight = (workspaceSize.getHeight() - padding * (rows + 1)) / rows;

    const cellDimensions = Dimensions.fromValues(
      Math.max(cellWidth, Dimensions.minimum().getWidth()),
      Math.max(cellHeight, Dimensions.minimum().getHeight())
    );

    documents.forEach((doc, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const x = padding + col * (cellDimensions.getWidth() + padding);
      const y = padding + row * (cellDimensions.getHeight() + padding);

      results.push({
        id: doc.id,
        position: Position.fromCoordinates(x, y),
        dimensions: cellDimensions,
        zIndex: doc.isActive ? 5 : 1,
        isVisible: true
      });
    });

    return results;
  }

  supportsResizing(): boolean {
    return false;
  }

  supportsDragging(): boolean {
    return false;
  }

  getCssClassName(): string {
    return 'grid-layout';
  }

  private calculateGridDimensions(docCount: number): { cols: number; rows: number } {
    if (docCount <= 1) return { cols: 1, rows: 1 };
    if (docCount <= 2) return { cols: 2, rows: 1 };
    if (docCount <= 4) return { cols: 2, rows: 2 };
    if (docCount <= 6) return { cols: 3, rows: 2 };
    if (docCount <= 9) return { cols: 3, rows: 3 };

    // For larger numbers, aim for roughly square layout
    const cols = Math.ceil(Math.sqrt(docCount));
    const rows = Math.ceil(docCount / cols);
    return { cols, rows };
  }
}

/**
 * Freeform layout strategy - documents positioned freely by user
 */
export class FreeformLayoutStrategy implements LayoutStrategy {
  calculateLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions
  ): DocumentLayoutResult[] {
    const results: DocumentLayoutResult[] = [];

    for (const doc of documents) {
      // Constrain positions to workspace bounds
      const constrainedPosition = doc.currentPosition.constrainToBounds(workspaceSize.toSize());

      // Ensure dimensions fit within workspace
      const maxDimensions = Dimensions.fromValues(
        workspaceSize.getWidth() - constrainedPosition.getX(),
        workspaceSize.getHeight() - constrainedPosition.getY()
      );
      const constrainedDimensions = doc.currentDimensions.constrainToMaximum(maxDimensions);

      results.push({
        id: doc.id,
        position: constrainedPosition,
        dimensions: constrainedDimensions,
        zIndex: doc.zIndex,
        isVisible: true
      });
    }

    return results;
  }

  supportsResizing(): boolean {
    return true;
  }

  supportsDragging(): boolean {
    return true;
  }

  getCssClassName(): string {
    return 'freeform-layout';
  }
}

/**
 * Value object representing the current layout mode and its strategy
 */
export class LayoutMode {
  private static readonly strategies = new Map<LayoutModeType, LayoutStrategy>([
    [LayoutModeType.STACKED, new StackedLayoutStrategy()],
    [LayoutModeType.GRID, new GridLayoutStrategy()],
    [LayoutModeType.FREEFORM, new FreeformLayoutStrategy()]
  ]);

  constructor(private readonly type: LayoutModeType) {}

  /**
   * Creates a LayoutMode for stacked layout
   */
  static stacked(): LayoutMode {
    return new LayoutMode(LayoutModeType.STACKED);
  }

  /**
   * Creates a LayoutMode for grid layout
   */
  static grid(): LayoutMode {
    return new LayoutMode(LayoutModeType.GRID);
  }

  /**
   * Creates a LayoutMode for freeform layout
   */
  static freeform(): LayoutMode {
    return new LayoutMode(LayoutModeType.FREEFORM);
  }

  /**
   * Creates a LayoutMode from string type
   */
  static fromString(type: string): LayoutMode {
    const layoutType = Object.values(LayoutModeType).find(t => t === type);
    if (!layoutType) {
      throw new Error(`Invalid layout mode type: ${type}`);
    }
    return new LayoutMode(layoutType);
  }

  /**
   * Gets the layout mode type
   */
  getType(): LayoutModeType {
    return this.type;
  }

  /**
   * Gets the string representation
   */
  toString(): string {
    return this.type;
  }

  /**
   * Gets the layout strategy for this mode
   */
  getStrategy(): LayoutStrategy {
    const strategy = LayoutMode.strategies.get(this.type);
    if (!strategy) {
      throw new Error(`No strategy found for layout mode: ${this.type}`);
    }
    return strategy;
  }

  /**
   * Calculates layout for documents using this mode's strategy
   */
  calculateLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions,
    activeDocumentId?: DocumentCaddyId
  ): DocumentLayoutResult[] {
    return this.getStrategy().calculateLayout(documents, workspaceSize, activeDocumentId);
  }

  /**
   * Checks if this layout mode supports user resizing
   */
  supportsResizing(): boolean {
    return this.getStrategy().supportsResizing();
  }

  /**
   * Checks if this layout mode supports user dragging
   */
  supportsDragging(): boolean {
    return this.getStrategy().supportsDragging();
  }

  /**
   * Gets the CSS class name for this layout mode
   */
  getCssClassName(): string {
    return this.getStrategy().getCssClassName();
  }

  /**
   * Checks equality with another LayoutMode
   */
  equals(other: LayoutMode): boolean {
    return this.type === other.type;
  }

  /**
   * Determines if switching from this mode to another should trigger auto-freeform
   * This happens when user performs drag/resize actions in non-freeform modes
   */
  shouldAutoSwitchToFreeform(userAction: 'drag' | 'resize'): boolean {
    if (this.type === LayoutModeType.FREEFORM) {
      return false; // Already in freeform
    }

    // Switch to freeform if user tries to drag or resize in structured modes
    return userAction === 'drag' || userAction === 'resize';
  }
}