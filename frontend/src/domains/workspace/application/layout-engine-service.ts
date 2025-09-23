import { Position, Dimensions } from '../domain/value-objects/geometry';
import {
  LayoutMode,
  LayoutModeType,
  DocumentLayoutInfo,
  DocumentLayoutResult,
  StackedLayoutStrategy,
  GridLayoutStrategy,
  FreeformLayoutStrategy
} from '../domain/value-objects/layout-mode';
import { DocumentCaddyId } from '../domain/value-objects/identifiers';

/**
 * Animation configuration for layout transitions
 */
export interface LayoutAnimationConfig {
  duration: number; // in milliseconds
  easing: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  staggerDelay?: number; // delay between animating each document
}

/**
 * Layout calculation result with animation data
 */
export interface AnimatedLayoutResult extends DocumentLayoutResult {
  animationDelay?: number;
  fromPosition?: Position;
  fromDimensions?: Dimensions;
}

/**
 * Service for managing layout calculations and transitions
 * Handles the complex logic of positioning and animating documents
 */
export class LayoutEngineService {
  private static readonly DEFAULT_ANIMATION: LayoutAnimationConfig = {
    duration: 300,
    easing: 'ease-out',
    staggerDelay: 50
  };

  private currentLayout: DocumentLayoutResult[] = [];
  private animationInProgress = false;

  /**
   * Calculates layout for documents using the specified layout mode
   */
  calculateLayout(
    documents: DocumentLayoutInfo[],
    layoutMode: LayoutMode,
    workspaceSize: Dimensions,
    activeDocumentId?: DocumentCaddyId
  ): DocumentLayoutResult[] {
    const results = layoutMode.calculateLayout(documents, workspaceSize, activeDocumentId);
    this.currentLayout = results;
    return results;
  }

  /**
   * Calculates layout with animation data for smooth transitions
   */
  calculateAnimatedLayout(
    documents: DocumentLayoutInfo[],
    layoutMode: LayoutMode,
    workspaceSize: Dimensions,
    activeDocumentId?: DocumentCaddyId,
    animationConfig: LayoutAnimationConfig = LayoutEngineService.DEFAULT_ANIMATION
  ): AnimatedLayoutResult[] {
    const newLayout = this.calculateLayout(documents, layoutMode, workspaceSize, activeDocumentId);

    return newLayout.map((result, index) => {
      const previousResult = this.currentLayout.find(prev => prev.id.equals(result.id));

      const animatedResult: AnimatedLayoutResult = {
        ...result,
        animationDelay: animationConfig.staggerDelay ? index * animationConfig.staggerDelay : 0
      };

      if (previousResult) {
        animatedResult.fromPosition = previousResult.position;
        animatedResult.fromDimensions = previousResult.dimensions;
      }

      return animatedResult;
    });
  }

  /**
   * Optimizes layout for a specific scenario (e.g., large number of documents)
   */
  calculateOptimizedLayout(
    documents: DocumentLayoutInfo[],
    layoutMode: LayoutMode,
    workspaceSize: Dimensions,
    options: {
      maxDocumentsVisible?: number;
      prioritizeActive?: boolean;
      minimumDocumentSize?: Dimensions;
    } = {}
  ): DocumentLayoutResult[] {
    let optimizedDocuments = [...documents];

    // If too many documents, prioritize visible ones
    if (options.maxDocumentsVisible && documents.length > options.maxDocumentsVisible) {
      if (options.prioritizeActive) {
        // Sort by active state, then by last modified
        optimizedDocuments.sort((a, b) => {
          if (a.isActive !== b.isActive) {
            return a.isActive ? -1 : 1;
          }
          return 0; // Maintain original order for same priority
        });
      }
      optimizedDocuments = optimizedDocuments.slice(0, options.maxDocumentsVisible);
    }

    const results = layoutMode.calculateLayout(optimizedDocuments, workspaceSize);

    // Apply minimum size constraints if specified
    if (options.minimumDocumentSize) {
      return results.map(result => ({
        ...result,
        dimensions: result.dimensions.enforceMinimum(options.minimumDocumentSize!)
      }));
    }

    return results;
  }

  /**
   * Calculates layout that avoids overlaps in freeform mode
   */
  calculateNonOverlappingLayout(
    documents: DocumentLayoutInfo[],
    workspaceSize: Dimensions,
    padding: number = 20
  ): DocumentLayoutResult[] {
    if (documents.length === 0) return [];

    const results: DocumentLayoutResult[] = [];
    const placedRects: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (const doc of documents) {
      let position = doc.currentPosition;
      let dimensions = doc.currentDimensions;

      // Find a non-overlapping position
      let attempts = 0;
      const maxAttempts = 100;

      while (attempts < maxAttempts) {
        const proposedRect = {
          x: position.getX(),
          y: position.getY(),
          width: dimensions.getWidth(),
          height: dimensions.getHeight()
        };

        // Check for overlaps with existing rectangles
        const hasOverlap = placedRects.some(rect =>
          this.rectanglesOverlap(proposedRect, rect, padding)
        );

        if (!hasOverlap) {
          // Position is good, place the document
          placedRects.push(proposedRect);
          results.push({
            id: doc.id,
            position,
            dimensions,
            zIndex: doc.zIndex,
            isVisible: true
          });
          break;
        }

        // Try a new position
        position = this.findNextPosition(position, dimensions, workspaceSize, placedRects, padding);
        attempts++;
      }

      // If we couldn't find a non-overlapping position, place it anyway
      if (attempts >= maxAttempts) {
        results.push({
          id: doc.id,
          position: doc.currentPosition,
          dimensions: doc.currentDimensions,
          zIndex: doc.zIndex,
          isVisible: true
        });
      }
    }

    return results;
  }

  /**
   * Snaps documents to a grid for alignment
   */
  snapToGrid(
    results: DocumentLayoutResult[],
    gridSize: number = 20
  ): DocumentLayoutResult[] {
    return results.map(result => ({
      ...result,
      position: Position.fromCoordinates(
        Math.round(result.position.getX() / gridSize) * gridSize,
        Math.round(result.position.getY() / gridSize) * gridSize
      )
    }));
  }

  /**
   * Validates that a layout fits within workspace bounds
   */
  validateLayout(
    results: DocumentLayoutResult[],
    workspaceSize: Dimensions
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const result of results) {
      const rightEdge = result.position.getX() + result.dimensions.getWidth();
      const bottomEdge = result.position.getY() + result.dimensions.getHeight();

      if (rightEdge > workspaceSize.getWidth()) {
        issues.push(`Document ${result.id.toString()} extends beyond right edge`);
      }

      if (bottomEdge > workspaceSize.getHeight()) {
        issues.push(`Document ${result.id.toString()} extends beyond bottom edge`);
      }

      if (result.position.getX() < 0 || result.position.getY() < 0) {
        issues.push(`Document ${result.id.toString()} has negative position`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Gets the currently calculated layout
   */
  getCurrentLayout(): DocumentLayoutResult[] {
    return [...this.currentLayout];
  }

  /**
   * Checks if animation is currently in progress
   */
  isAnimating(): boolean {
    return this.animationInProgress;
  }

  /**
   * Sets the animation state
   */
  setAnimationState(animating: boolean): void {
    this.animationInProgress = animating;
  }

  /**
   * Calculates the best layout mode for the current document count and workspace size
   */
  suggestOptimalLayoutMode(
    documentCount: number,
    workspaceSize: Dimensions,
    currentMode?: LayoutModeType
  ): LayoutModeType {
    if (documentCount === 0) {
      return LayoutModeType.STACKED;
    }

    if (documentCount === 1) {
      return LayoutModeType.STACKED;
    }

    const workspaceArea = workspaceSize.getArea();
    const avgDocumentArea = 600 * 400; // Default document size
    const totalDocumentArea = documentCount * avgDocumentArea;

    // If documents would be too small in grid, use stacked
    if (totalDocumentArea > workspaceArea * 0.8) {
      return LayoutModeType.STACKED;
    }

    // For 2-4 documents, grid works well
    if (documentCount <= 4) {
      return LayoutModeType.GRID;
    }

    // For many documents, suggest grid if there's space, otherwise stacked
    if (documentCount <= 9 && workspaceArea > 1000 * 800) {
      return LayoutModeType.GRID;
    }

    // If user is already in freeform, don't suggest changing
    if (currentMode === LayoutModeType.FREEFORM) {
      return LayoutModeType.FREEFORM;
    }

    return LayoutModeType.STACKED;
  }

  private rectanglesOverlap(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number },
    padding: number
  ): boolean {
    return !(
      rect1.x + rect1.width + padding <= rect2.x ||
      rect2.x + rect2.width + padding <= rect1.x ||
      rect1.y + rect1.height + padding <= rect2.y ||
      rect2.y + rect2.height + padding <= rect1.y
    );
  }

  private findNextPosition(
    currentPosition: Position,
    dimensions: Dimensions,
    workspaceSize: Dimensions,
    placedRects: Array<{ x: number; y: number; width: number; height: number }>,
    padding: number
  ): Position {
    // Simple strategy: try moving right, then down
    const stepSize = 50;

    let x = currentPosition.getX() + stepSize;
    let y = currentPosition.getY();

    // If moving right would go out of bounds, wrap to next row
    if (x + dimensions.getWidth() > workspaceSize.getWidth()) {
      x = 0;
      y += stepSize;
    }

    // If moving down would go out of bounds, wrap to top
    if (y + dimensions.getHeight() > workspaceSize.getHeight()) {
      y = 0;
    }

    return Position.fromCoordinates(x, y);
  }
}