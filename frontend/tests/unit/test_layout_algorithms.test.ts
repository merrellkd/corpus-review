import { describe, it, expect, beforeEach } from 'vitest';
import {
  StackedLayoutStrategy,
  GridLayoutStrategy,
  FreeformLayoutStrategy,
  DocumentLayoutInfo
} from '../../src/domains/workspace/domain/value-objects/layout-mode';
import { Position, Dimensions } from '../../src/domains/workspace/domain/value-objects/geometry';
import { DocumentCaddyId } from '../../src/domains/workspace/domain/value-objects/identifiers';

describe('Layout Algorithm Unit Tests', () => {
  let mockDocuments: DocumentLayoutInfo[];
  let workspaceSize: Dimensions;

  beforeEach(() => {
    // Create mock documents for testing
    mockDocuments = [
      {
        id: DocumentCaddyId.create(),
        currentPosition: Position.fromCoordinates(100, 100),
        currentDimensions: Dimensions.fromValues(300, 400),
        isActive: true,
        zIndex: 1,
      },
      {
        id: DocumentCaddyId.create(),
        currentPosition: Position.fromCoordinates(200, 150),
        currentDimensions: Dimensions.fromValues(350, 450),
        isActive: false,
        zIndex: 0,
      },
      {
        id: DocumentCaddyId.create(),
        currentPosition: Position.fromCoordinates(50, 200),
        currentDimensions: Dimensions.fromValues(400, 300),
        isActive: false,
        zIndex: 0,
      },
    ];

    workspaceSize = Dimensions.fromValues(1200, 800);
  });

  describe('StackedLayoutStrategy', () => {
    let stackedLayout: StackedLayoutStrategy;

    beforeEach(() => {
      stackedLayout = new StackedLayoutStrategy();
    });

    it('should place active document at front position', () => {
      const results = stackedLayout.calculateLayout(mockDocuments, workspaceSize);

      const activeDoc = results.find(r => r.id.toString() === mockDocuments[0].id.toString());
      expect(activeDoc).toBeDefined();
      expect(activeDoc!.zIndex).toBeGreaterThan(1);
    });

    it('should position all documents at base coordinates with offsets', () => {
      const results = stackedLayout.calculateLayout(mockDocuments, workspaceSize);

      results.forEach((result) => {
        expect(result.position.getX()).toBeGreaterThanOrEqual(20);
        expect(result.position.getY()).toBeGreaterThanOrEqual(20);
      });
    });

    it('should maintain document dimensions in stacked mode', () => {
      const results = stackedLayout.calculateLayout(mockDocuments, workspaceSize);

      results.forEach((result) => {
        const originalDoc = mockDocuments.find(d => d.id.toString() === result.id.toString());
        expect(result.dimensions.getWidth()).toBe(originalDoc!.currentDimensions.getWidth());
        expect(result.dimensions.getHeight()).toBe(originalDoc!.currentDimensions.getHeight());
      });
    });

    it('should handle empty document list', () => {
      const results = stackedLayout.calculateLayout([], workspaceSize);
      expect(results).toEqual([]);
    });

    it('should handle single document', () => {
      const singleDoc = [mockDocuments[0]];
      const results = stackedLayout.calculateLayout(singleDoc, workspaceSize);

      expect(results).toHaveLength(1);
      expect(results[0].isVisible).toBe(true);
      expect(results[0].zIndex).toBeGreaterThan(0);
    });

    it('should not support resizing', () => {
      expect(stackedLayout.supportsResizing()).toBe(false);
    });

    it('should not support dragging', () => {
      expect(stackedLayout.supportsDragging()).toBe(false);
    });
  });

  describe('GridLayoutStrategy', () => {
    let gridLayout: GridLayoutStrategy;

    beforeEach(() => {
      gridLayout = new GridLayoutStrategy();
    });

    it('should arrange documents in a grid pattern', () => {
      const results = gridLayout.calculateLayout(mockDocuments, workspaceSize);

      expect(results).toHaveLength(3);

      // Check that documents are positioned in a grid
      const positions = results.map(r => ({ x: r.position.getX(), y: r.position.getY() }));

      // Grid should have regular spacing
      const uniqueXPositions = [...new Set(positions.map(p => p.x))].sort((a, b) => a - b);
      const uniqueYPositions = [...new Set(positions.map(p => p.y))].sort((a, b) => a - b);

      // Should have at least some structure
      expect(uniqueXPositions.length).toBeGreaterThan(0);
      expect(uniqueYPositions.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate grid dimensions for different document counts', () => {
      // Test with 1 document
      let results = gridLayout.calculateLayout([mockDocuments[0]], workspaceSize);
      expect(results).toHaveLength(1);

      // Test with 4 documents (should be 2x2)
      const fourDocs = [...mockDocuments, { ...mockDocuments[0], id: DocumentCaddyId.create() }];
      results = gridLayout.calculateLayout(fourDocs, workspaceSize);
      expect(results).toHaveLength(4);

      // Check that all documents fit within workspace
      results.forEach(result => {
        expect(result.position.getX() + result.dimensions.getWidth()).toBeLessThanOrEqual(workspaceSize.getWidth());
        expect(result.position.getY() + result.dimensions.getHeight()).toBeLessThanOrEqual(workspaceSize.getHeight());
      });
    });

    it('should maintain equal cell sizes for all documents', () => {
      const results = gridLayout.calculateLayout(mockDocuments, workspaceSize);

      // All documents should have the same dimensions in grid mode
      const firstDocDimensions = results[0].dimensions;
      results.forEach(result => {
        expect(result.dimensions.getWidth()).toBe(firstDocDimensions.getWidth());
        expect(result.dimensions.getHeight()).toBe(firstDocDimensions.getHeight());
      });
    });

    it('should respect minimum dimensions', () => {
      const smallWorkspace = Dimensions.fromValues(300, 200);
      const results = gridLayout.calculateLayout(mockDocuments, smallWorkspace);

      results.forEach(result => {
        expect(result.dimensions.getWidth()).toBeGreaterThanOrEqual(Dimensions.minimum().getWidth());
        expect(result.dimensions.getHeight()).toBeGreaterThanOrEqual(Dimensions.minimum().getHeight());
      });
    });

    it('should handle large numbers of documents efficiently', () => {
      const manyDocs = Array.from({ length: 25 }, (_, i) => ({
        ...mockDocuments[0],
        id: DocumentCaddyId.create(),
      }));

      const results = gridLayout.calculateLayout(manyDocs, workspaceSize);
      expect(results).toHaveLength(25);

      // Should arrange in roughly square grid (5x5)
      const positions = results.map(r => ({ x: r.position.getX(), y: r.position.getY() }));
      const uniqueXPositions = [...new Set(positions.map(p => p.x))];
      const uniqueYPositions = [...new Set(positions.map(p => p.y))];

      // Should be approximately square
      expect(Math.abs(uniqueXPositions.length - uniqueYPositions.length)).toBeLessThanOrEqual(1);
    });

    it('should not support resizing', () => {
      expect(gridLayout.supportsResizing()).toBe(false);
    });

    it('should not support dragging', () => {
      expect(gridLayout.supportsDragging()).toBe(false);
    });
  });

  describe('FreeformLayoutStrategy', () => {
    let freeformLayout: FreeformLayoutStrategy;

    beforeEach(() => {
      freeformLayout = new FreeformLayoutStrategy();
    });

    it('should preserve original document positions', () => {
      const results = freeformLayout.calculateLayout(mockDocuments, workspaceSize);

      results.forEach((result, index) => {
        const originalDoc = mockDocuments[index];
        expect(result.position.getX()).toBe(originalDoc.currentPosition.getX());
        expect(result.position.getY()).toBe(originalDoc.currentPosition.getY());
      });
    });

    it('should preserve original document dimensions', () => {
      const results = freeformLayout.calculateLayout(mockDocuments, workspaceSize);

      results.forEach((result, index) => {
        const originalDoc = mockDocuments[index];
        expect(result.dimensions.getWidth()).toBe(originalDoc.currentDimensions.getWidth());
        expect(result.dimensions.getHeight()).toBe(originalDoc.currentDimensions.getHeight());
      });
    });

    it('should maintain z-index based on active state', () => {
      const results = freeformLayout.calculateLayout(mockDocuments, workspaceSize);

      const activeDoc = results.find(r => r.id.toString() === mockDocuments[0].id.toString());
      const inactiveDocs = results.filter(r => r.id.toString() !== mockDocuments[0].id.toString());

      expect(activeDoc!.zIndex).toBeGreaterThan(Math.max(...inactiveDocs.map(d => d.zIndex)));
    });

    it('should make all documents visible', () => {
      const results = freeformLayout.calculateLayout(mockDocuments, workspaceSize);

      results.forEach(result => {
        expect(result.isVisible).toBe(true);
      });
    });

    it('should support resizing', () => {
      expect(freeformLayout.supportsResizing()).toBe(true);
    });

    it('should support dragging', () => {
      expect(freeformLayout.supportsDragging()).toBe(true);
    });

    it('should handle documents positioned outside workspace bounds', () => {
      const outOfBoundsDocs = [
        {
          id: DocumentCaddyId.create(),
          currentPosition: Position.fromCoordinates(-100, -100),
          currentDimensions: Dimensions.fromValues(200, 200),
          isActive: false,
          zIndex: 0,
        },
        {
          id: DocumentCaddyId.create(),
          currentPosition: Position.fromCoordinates(1500, 1000),
          currentDimensions: Dimensions.fromValues(300, 300),
          isActive: false,
          zIndex: 0,
        },
      ];

      const results = freeformLayout.calculateLayout(outOfBoundsDocs, workspaceSize);

      // Should preserve positions even if out of bounds (scrollbars will handle)
      expect(results[0].position.getX()).toBe(-100);
      expect(results[0].position.getY()).toBe(-100);
      expect(results[1].position.getX()).toBe(1500);
      expect(results[1].position.getY()).toBe(1000);
    });
  });

  describe('Layout Strategy Selection', () => {
    it('should have appropriate CSS class names', () => {
      const stacked = new StackedLayoutStrategy();
      const grid = new GridLayoutStrategy();
      const freeform = new FreeformLayoutStrategy();

      expect(stacked.getCssClassName()).toBe('stacked-layout');
      expect(grid.getCssClassName()).toBe('grid-layout');
      expect(freeform.getCssClassName()).toBe('freeform-layout');
    });

    it('should handle zero documents consistently across all strategies', () => {
      const strategies = [
        new StackedLayoutStrategy(),
        new GridLayoutStrategy(),
        new FreeformLayoutStrategy(),
      ];

      strategies.forEach(strategy => {
        const results = strategy.calculateLayout([], workspaceSize);
        expect(results).toEqual([]);
      });
    });

    it('should produce valid layout results for all strategies', () => {
      const strategies = [
        new StackedLayoutStrategy(),
        new GridLayoutStrategy(),
        new FreeformLayoutStrategy(),
      ];

      strategies.forEach(strategy => {
        const results = strategy.calculateLayout(mockDocuments, workspaceSize);

        expect(results).toHaveLength(mockDocuments.length);

        results.forEach(result => {
          expect(result.id).toBeDefined();
          expect(result.position).toBeInstanceOf(Position);
          expect(result.dimensions).toBeInstanceOf(Dimensions);
          expect(typeof result.zIndex).toBe('number');
          expect(typeof result.isVisible).toBe('boolean');
        });
      });
    });
  });

  describe('Layout Algorithm Performance', () => {
    it('should handle large document sets efficiently', () => {
      const largeDocumentSet = Array.from({ length: 100 }, (_, i) => ({
        id: DocumentCaddyId.create(),
        currentPosition: Position.fromCoordinates(i * 10, i * 10),
        currentDimensions: Dimensions.fromValues(200 + (i % 100), 150 + (i % 80)),
        isActive: i === 0,
        zIndex: i === 0 ? 1 : 0,
      }));

      const strategies = [
        new StackedLayoutStrategy(),
        new GridLayoutStrategy(),
        new FreeformLayoutStrategy(),
      ];

      strategies.forEach(strategy => {
        const startTime = performance.now();
        const results = strategy.calculateLayout(largeDocumentSet, workspaceSize);
        const endTime = performance.now();

        // Layout calculation should complete within reasonable time (< 50ms)
        expect(endTime - startTime).toBeLessThan(50);
        expect(results).toHaveLength(100);
      });
    });

    it('should be consistent across multiple runs', () => {
      const grid = new GridLayoutStrategy();

      const run1 = grid.calculateLayout(mockDocuments, workspaceSize);
      const run2 = grid.calculateLayout(mockDocuments, workspaceSize);

      expect(run1).toEqual(run2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely small workspace dimensions', () => {
      const tinyWorkspace = Dimensions.fromValues(100, 100);
      const strategies = [
        new StackedLayoutStrategy(),
        new GridLayoutStrategy(),
        new FreeformLayoutStrategy(),
      ];

      strategies.forEach(strategy => {
        const results = strategy.calculateLayout([mockDocuments[0]], tinyWorkspace);
        expect(results).toHaveLength(1);
        expect(results[0].dimensions.getWidth()).toBeGreaterThan(0);
        expect(results[0].dimensions.getHeight()).toBeGreaterThan(0);
      });
    });

    it('should handle extremely large workspace dimensions', () => {
      const hugeWorkspace = Dimensions.fromValues(10000, 8000);
      const grid = new GridLayoutStrategy();

      const results = grid.calculateLayout(mockDocuments, hugeWorkspace);

      results.forEach(result => {
        expect(result.position.getX()).toBeGreaterThanOrEqual(0);
        expect(result.position.getY()).toBeGreaterThanOrEqual(0);
        expect(result.dimensions.getWidth()).toBeGreaterThan(0);
        expect(result.dimensions.getHeight()).toBeGreaterThan(0);
      });
    });

    it('should handle documents with extreme dimension ratios', () => {
      const extremeDocs = [
        {
          id: DocumentCaddyId.create(),
          currentPosition: Position.fromCoordinates(0, 0),
          currentDimensions: Dimensions.fromValues(1000, 50),
          isActive: false,
          zIndex: 0,
        },
        {
          id: DocumentCaddyId.create(),
          currentPosition: Position.fromCoordinates(0, 0),
          currentDimensions: Dimensions.fromValues(50, 1000),
          isActive: false,
          zIndex: 0,
        },
      ];

      const strategies = [
        new StackedLayoutStrategy(),
        new GridLayoutStrategy(),
        new FreeformLayoutStrategy(),
      ];

      strategies.forEach(strategy => {
        const results = strategy.calculateLayout(extremeDocs, workspaceSize);
        expect(results).toHaveLength(2);

        results.forEach(result => {
          expect(result.dimensions.getWidth()).toBeGreaterThan(0);
          expect(result.dimensions.getHeight()).toBeGreaterThan(0);
        });
      });
    });
  });
});