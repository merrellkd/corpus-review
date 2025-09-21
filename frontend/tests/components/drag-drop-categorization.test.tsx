import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import { DragDropCategorizationWorkflow } from '../../src/components/DragDropCategorizationWorkflow'

// Mock the file categorization store
vi.mock('../../src/stores/fileCategorization', () => ({
  useFileCategorization: vi.fn(() => ({
    isDragging: false,
    draggedFile: null,
    dropTarget: null,
    isValidDrop: false,
    dropError: null,
    dragPreview: null,
    dropZoneStates: {},
    lastOperation: null,
    startDrag: vi.fn(),
    setDropTarget: vi.fn(),
    completeDrop: vi.fn(),
    cancelDrag: vi.fn(),
    setDropZoneHover: vi.fn()
  }))
}))

// Mock the unified panel state store
vi.mock('../../src/stores/unifiedPanelState', () => ({
  useUnifiedPanelState: vi.fn(() => ({
    isDragDropAvailable: true
  }))
}))

describe('Drag-and-Drop File Categorization Workflow', () => {
  const mockStartDrag = vi.fn()
  const mockSetDropTarget = vi.fn()
  const mockCompleteDrop = vi.fn()
  const mockCancelDrag = vi.fn()
  const mockSetDropZoneHover = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Drag Initiation', () => {
    it('should start drag operation when file is dragged from File Explorer', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        startDrag: mockStartDrag,
        setDropTarget: mockSetDropTarget,
        completeDrop: mockCompleteDrop,
        cancelDrag: mockCancelDrag,
        setDropZoneHover: mockSetDropZoneHover
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const fileItem = screen.getByTestId('file-item-document.pdf')

      // Simulate drag start
      const dragStartEvent = createEvent.dragStart(fileItem)
      fireEvent(fileItem, dragStartEvent)

      expect(mockStartDrag).toHaveBeenCalledWith({
        path: '/project/source/document.pdf',
        name: 'document.pdf',
        type: 'file',
        size: 1024
      })
    })

    it('should show drag preview when dragging starts', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file', size: 1024 },
        dropTarget: null,
        isValidDrop: false,
        dragPreview: {
          fileName: 'document.pdf',
          fileType: 'PDF Document',
          fileIcon: 'pdf-icon',
          dragCount: 1
        },
        startDrag: mockStartDrag,
        setDropTarget: mockSetDropTarget,
        completeDrop: mockCompleteDrop,
        cancelDrag: mockCancelDrag
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      expect(screen.getByTestId('drag-preview')).toBeInTheDocument()
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.getByText('PDF Document')).toBeInTheDocument()
    })

    it('should prevent drag start when drag-drop is not available', () => {
      const { useUnifiedPanelState } = require('../../src/stores/unifiedPanelState')
      useUnifiedPanelState.mockReturnValue({
        isDragDropAvailable: false
      })

      render(<DragDropCategorizationWorkflow />)

      const fileItem = screen.getByTestId('file-item-document.pdf')

      // File should not be draggable when drag-drop not available
      expect(fileItem).toHaveAttribute('draggable', 'false')
    })
  })

  describe('Drop Target Interaction', () => {
    it('should highlight valid drop targets during drag', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        dropZoneStates: {
          'category-research': { isHovered: false, isValidTarget: true, canAcceptDrop: true },
          'category-documentation': { isHovered: false, isValidTarget: true, canAcceptDrop: true }
        },
        startDrag: mockStartDrag,
        setDropTarget: mockSetDropTarget,
        setDropZoneHover: mockSetDropZoneHover
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const researchDropZone = screen.getByTestId('drop-zone-category-research')
      const documentationDropZone = screen.getByTestId('drop-zone-category-documentation')

      expect(researchDropZone).toHaveClass('valid-drop-target')
      expect(documentationDropZone).toHaveClass('valid-drop-target')
    })

    it('should call setDropZoneHover when hovering over drop target', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        dropZoneStates: {
          'category-research': { isHovered: false, isValidTarget: true, canAcceptDrop: true }
        },
        setDropZoneHover: mockSetDropZoneHover
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const dropZone = screen.getByTestId('drop-zone-category-research')

      fireEvent.dragEnter(dropZone)
      expect(mockSetDropZoneHover).toHaveBeenCalledWith('category-research', true)

      fireEvent.dragLeave(dropZone)
      expect(mockSetDropZoneHover).toHaveBeenCalledWith('category-research', false)
    })

    it('should call setDropTarget when dragging over valid target', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        setDropTarget: mockSetDropTarget
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const dropZone = screen.getByTestId('drop-zone-category-research')

      fireEvent.dragOver(dropZone)
      expect(mockSetDropTarget).toHaveBeenCalledWith('category-research')
    })

    it('should show visual feedback for hovered drop targets', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: 'category-research',
        isValidDrop: true,
        dropZoneStates: {
          'category-research': { isHovered: true, isValidTarget: true, canAcceptDrop: true }
        }
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const dropZone = screen.getByTestId('drop-zone-category-research')
      expect(dropZone).toHaveClass('hovered')
      expect(dropZone).toHaveClass('valid-drop')
    })
  })

  describe('Drop Completion', () => {
    it('should complete drop operation on valid drop', async () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: 'category-research',
        isValidDrop: true,
        completeDrop: mockCompleteDrop
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const dropZone = screen.getByTestId('drop-zone-category-research')

      const dropEvent = createEvent.drop(dropZone)
      fireEvent(dropZone, dropEvent)

      expect(mockCompleteDrop).toHaveBeenCalled()
    })

    it('should prevent drop on invalid targets', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: 'invalid-target',
        isValidDrop: false,
        dropError: 'Invalid drop target',
        completeDrop: mockCompleteDrop
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const dropZone = screen.getByTestId('drop-zone-invalid-target')

      const dropEvent = createEvent.drop(dropZone)
      fireEvent(dropZone, dropEvent)

      expect(mockCompleteDrop).not.toHaveBeenCalled()
      expect(screen.getByText('Invalid drop target')).toBeInTheDocument()
    })

    it('should show success feedback after successful drop', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        lastOperation: {
          file: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
          category: 'research',
          status: 'success'
        }
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      expect(screen.getByTestId('success-message')).toBeInTheDocument()
      expect(screen.getByText('document.pdf categorized as research')).toBeInTheDocument()
    })

    it('should show error feedback after failed drop', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        lastOperation: {
          file: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
          category: 'research',
          status: 'error',
          error: 'Backend error'
        }
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      expect(screen.getByTestId('error-message')).toBeInTheDocument()
      expect(screen.getByText('Failed to categorize document.pdf: Backend error')).toBeInTheDocument()
    })
  })

  describe('Drag Cancellation', () => {
    it('should cancel drag operation on ESC key', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        cancelDrag: mockCancelDrag
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(mockCancelDrag).toHaveBeenCalled()
    })

    it('should cancel drag operation when dragging outside valid drop zones', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        cancelDrag: mockCancelDrag
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      // Drag end without valid drop
      fireEvent.dragEnd(document)
      expect(mockCancelDrag).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should provide keyboard navigation for file categorization', () => {
      render(<DragDropCategorizationWorkflow />)

      const fileItem = screen.getByTestId('file-item-document.pdf')

      // File should be focusable
      expect(fileItem).toHaveAttribute('tabindex', '0')

      // Should support keyboard activation
      fireEvent.keyDown(fileItem, { key: 'Enter', code: 'Enter' })
      // Should show categorization menu or similar keyboard-accessible interface
    })

    it('should announce drag operations to screen readers', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: true,
        draggedFile: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
        dropTarget: null,
        isValidDrop: false,
        dragPreview: {
          fileName: 'document.pdf',
          fileType: 'PDF Document',
          fileIcon: 'pdf-icon',
          dragCount: 1
        }
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      const ariaLiveRegion = screen.getByTestId('drag-announcements')
      expect(ariaLiveRegion).toHaveAttribute('aria-live', 'polite')
      expect(ariaLiveRegion).toHaveTextContent('Dragging document.pdf')
    })

    it('should provide proper ARIA labels for drop zones', () => {
      render(<DragDropCategorizationWorkflow />)

      const researchDropZone = screen.getByTestId('drop-zone-category-research')
      expect(researchDropZone).toHaveAttribute('aria-label', 'Drop files to categorize as research')
      expect(researchDropZone).toHaveAttribute('role', 'button')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid file types gracefully', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        dropError: 'File type not supported for categorization',
        startDrag: mockStartDrag
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      expect(screen.getByText('File type not supported for categorization')).toBeInTheDocument()
    })

    it('should handle network errors during categorization', () => {
      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        lastOperation: {
          file: { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' },
          category: 'research',
          status: 'error',
          error: 'Network error: Unable to connect to server'
        }
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<DragDropCategorizationWorkflow />)

      expect(screen.getByText('Failed to categorize document.pdf: Network error: Unable to connect to server')).toBeInTheDocument()
    })
  })
})