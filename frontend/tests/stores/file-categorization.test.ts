import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFileCategorization, useFileCategorizationWithOptions, fileCategorizationStore } from '../../src/stores/fileCategorization'

describe('Drag-and-Drop File Categorization State', () => {
  beforeEach(() => {
    // Reset store state between tests
    fileCategorizationStore.setState({
      isDragging: false,
      draggedFile: null,
      draggedFiles: [],
      dropTarget: null,
      dragState: 'idle',
      bulkOperation: false,
      isValidDrop: false,
      dropError: null,
      suggestedCategories: [],
      dragPreview: null,
      dropZoneStates: {},
      lastOperation: null,
      lastBulkOperation: null,
      operationHistory: [],
      canUndo: false
    })
  })

  describe('Drag State Management', () => {
    it('should initialize with no active drag', () => {
      const { result } = renderHook(() => useFileCategorization())

      expect(result.current.isDragging).toBe(false)
      expect(result.current.draggedFile).toBeNull()
      expect(result.current.dropTarget).toBeNull()
    })

    it('should start drag operation with file data', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      expect(result.current.isDragging).toBe(true)
      expect(result.current.draggedFile).toEqual(mockFile)
      expect(result.current.dragState).toBe('dragging')
    })

    it('should update drop target when dragging over valid target', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropTarget('category-research')
      })

      expect(result.current.dropTarget).toBe('category-research')
      expect(result.current.isValidDrop).toBe(true)
    })

    it('should reject invalid drop targets', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropTarget('invalid-target')
      })

      expect(result.current.dropTarget).toBeNull()
      expect(result.current.isValidDrop).toBe(false)
      expect(result.current.dropError).toBe('Invalid drop target')
    })

    it('should complete successful drop operation', async () => {
      const mockOnCategorize = vi.fn().mockResolvedValue(true)
      const { result } = renderHook(() =>
        useFileCategorizationWithOptions({ onCategorizeFile: mockOnCategorize })
      )

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropTarget('category-research')
      })

      await act(async () => {
        await result.current.completeDrop()
      })

      expect(mockOnCategorize).toHaveBeenCalledWith(
        mockFile,
        'research'
      )
      expect(result.current.isDragging).toBe(false)
      expect(result.current.draggedFile).toBeNull()
      expect(result.current.lastOperation).toEqual({
        file: mockFile,
        category: 'research',
        status: 'success'
      })
    })

    it('should handle failed drop operation', async () => {
      const mockOnCategorize = vi.fn().mockRejectedValue(new Error('Backend error'))
      const { result } = renderHook(() =>
        useFileCategorizationWithOptions({ onCategorizeFile: mockOnCategorize })
      )

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropTarget('category-research')
      })

      await act(async () => {
        await result.current.completeDrop()
      })

      expect(result.current.isDragging).toBe(false)
      expect(result.current.lastOperation).toEqual({
        file: mockFile,
        category: 'research',
        status: 'error',
        error: 'Backend error'
      })
    })

    it('should cancel drag operation', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.cancelDrag()
      })

      expect(result.current.isDragging).toBe(false)
      expect(result.current.draggedFile).toBeNull()
      expect(result.current.dropTarget).toBeNull()
    })
  })

  describe('Category Validation', () => {
    it('should validate category targets based on available categories', () => {
      const availableCategories = ['research', 'documentation', 'archive']
      const { result } = renderHook(() =>
        useFileCategorization({ availableCategories })
      )

      expect(result.current.isValidCategory('research')).toBe(true)
      expect(result.current.isValidCategory('documentation')).toBe(true)
      expect(result.current.isValidCategory('invalid')).toBe(false)
    })

    it('should provide category suggestions based on file type', () => {
      const { result } = renderHook(() => useFileCategorization())

      const pdfFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      const imageFile = {
        path: '/project/source/diagram.png',
        name: 'diagram.png',
        type: 'file' as const,
        size: 2048
      }

      act(() => {
        result.current.startDrag(pdfFile)
      })
      expect(result.current.suggestedCategories).toContain('documentation')

      act(() => {
        result.current.startDrag(imageFile)
      })
      expect(result.current.suggestedCategories).toContain('images')
    })

    it('should prevent duplicate categorization', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024,
        categories: ['research'] // Already categorized
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropTarget('research')
      })

      expect(result.current.isValidDrop).toBe(false)
      expect(result.current.dropError).toBe('File already in this category')
    })
  })

  describe('Bulk Operations', () => {
    it('should support multi-file selection for bulk categorization', () => {
      const { result } = renderHook(() => useFileCategorization())

      const files = [
        { path: '/project/source/doc1.pdf', name: 'doc1.pdf', type: 'file' as const },
        { path: '/project/source/doc2.pdf', name: 'doc2.pdf', type: 'file' as const },
        { path: '/project/source/doc3.pdf', name: 'doc3.pdf', type: 'file' as const }
      ]

      act(() => {
        result.current.startBulkDrag(files)
      })

      expect(result.current.isDragging).toBe(true)
      expect(result.current.draggedFiles).toHaveLength(3)
      expect(result.current.bulkOperation).toBe(true)
    })

    it('should complete bulk categorization', async () => {
      const mockOnBulkCategorize = vi.fn().mockResolvedValue([true, true, false])
      const { result } = renderHook(() =>
        useFileCategorization({ onBulkCategorizeFiles: mockOnBulkCategorize })
      )

      const files = [
        { path: '/project/source/doc1.pdf', name: 'doc1.pdf', type: 'file' as const },
        { path: '/project/source/doc2.pdf', name: 'doc2.pdf', type: 'file' as const },
        { path: '/project/source/doc3.pdf', name: 'doc3.pdf', type: 'file' as const }
      ]

      act(() => {
        result.current.startBulkDrag(files)
      })

      act(() => {
        result.current.setDropTarget('category-research')
      })

      await act(async () => {
        await result.current.completeBulkDrop()
      })

      expect(mockOnBulkCategorize).toHaveBeenCalledWith(files, 'research')
      expect(result.current.lastBulkOperation).toEqual({
        files,
        category: 'research',
        results: [true, true, false],
        successCount: 2,
        failureCount: 1
      })
    })
  })

  describe('Visual Feedback', () => {
    it('should provide drag preview data', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      expect(result.current.dragPreview).toEqual({
        fileName: 'document.pdf',
        fileType: 'PDF Document',
        fileIcon: 'pdf-icon',
        dragCount: 1
      })
    })

    it('should track drop zone hover states', () => {
      const { result } = renderHook(() => useFileCategorization())

      act(() => {
        result.current.setDropZoneHover('category-research', true)
      })

      expect(result.current.dropZoneStates['category-research']).toEqual({
        isHovered: true,
        isValidTarget: true,
        canAcceptDrop: false // No active drag
      })
    })

    it('should update drop zone states during active drag', () => {
      const { result } = renderHook(() => useFileCategorization())

      const mockFile = {
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file' as const,
        size: 1024
      }

      act(() => {
        result.current.startDrag(mockFile)
      })

      act(() => {
        result.current.setDropZoneHover('category-research', true)
      })

      expect(result.current.dropZoneStates['category-research']).toEqual({
        isHovered: true,
        isValidTarget: true,
        canAcceptDrop: true
      })
    })
  })

  describe('Undo/Redo Operations', () => {
    it('should track categorization history for undo', () => {
      const { result } = renderHook(() => useFileCategorization())

      const operations = [
        { file: { name: 'doc1.pdf' }, category: 'research', timestamp: Date.now() },
        { file: { name: 'doc2.pdf' }, category: 'archive', timestamp: Date.now() + 1000 }
      ]

      act(() => {
        operations.forEach(op => result.current.addToHistory(op))
      })

      expect(result.current.operationHistory).toHaveLength(2)
      expect(result.current.canUndo).toBe(true)
    })

    it('should support undo of last categorization', async () => {
      const mockOnUncategorize = vi.fn().mockResolvedValue(true)
      const { result } = renderHook(() =>
        useFileCategorization({ onUncategorizeFile: mockOnUncategorize })
      )

      const operation = {
        file: { path: '/project/source/doc1.pdf', name: 'doc1.pdf' },
        category: 'research',
        timestamp: Date.now()
      }

      act(() => {
        result.current.addToHistory(operation)
      })

      await act(async () => {
        await result.current.undoLastOperation()
      })

      expect(mockOnUncategorize).toHaveBeenCalledWith(
        operation.file,
        operation.category
      )
      expect(result.current.operationHistory).toHaveLength(0)
    })
  })
})