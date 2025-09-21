import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FilesCategoriesPanel } from '../../src/components/FilesCategoriesPanel'

// Mock the section visibility store
vi.mock('../../src/stores/sectionVisibilityStore', () => ({
  useSectionVisibility: vi.fn(() => ({
    fileExplorerSectionVisible: true,
    categoryExplorerSectionVisible: true,
    shouldShowPanel: true,
    isDragDropAvailable: true,
    dragDropStatusMessage: 'Drag files from File Explorer to Category Explorer to assign categories',
    sectionLayout: {
      fileExplorerHeight: 50,
      categoryExplorerHeight: 50,
      layout: 'split'
    },
    toggleFileExplorerSection: vi.fn(),
    toggleCategoryExplorerSection: vi.fn(),
    resizeSections: vi.fn()
  }))
}))

// Mock the file categorization store
vi.mock('../../src/stores/fileCategorization', () => ({
  useFileCategorization: vi.fn(() => ({
    isDragging: false,
    draggedFile: null,
    dropTarget: null,
    isValidDrop: false,
    startDrag: vi.fn(),
    setDropTarget: vi.fn(),
    completeDrop: vi.fn(),
    cancelDrag: vi.fn()
  }))
}))

describe('FilesCategoriesPanel - Independent Section Management', () => {
  const mockToggleFileExplorer = vi.fn()
  const mockToggleCategoryExplorer = vi.fn()
  const mockResizeSections = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Panel Structure and Layout', () => {
    it('should render with both File Explorer and Category Explorer sections', () => {
      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-section')).toBeInTheDocument()
      expect(screen.getByTestId('section-resize-handle')).toBeInTheDocument()
    })

    it('should render section toggle controls', () => {
      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('file-explorer-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-toggle')).toBeInTheDocument()

      // Should show section labels
      expect(screen.getByText('File Explorer')).toBeInTheDocument()
      expect(screen.getByText('Category Explorer')).toBeInTheDocument()
    })

    it('should apply correct layout based on section visibility state', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: true,
        sectionLayout: {
          fileExplorerHeight: 100,
          categoryExplorerHeight: 0,
          layout: 'file-only'
        },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer,
        resizeSections: mockResizeSections
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('file-only-layout')

      // Only File Explorer should be visible
      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.queryByTestId('category-explorer-section')).not.toBeInTheDocument()
    })
  })

  describe('Independent Section Toggling', () => {
    it('should toggle File Explorer section independently', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 50, categoryExplorerHeight: 50, layout: 'split' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer,
        resizeSections: mockResizeSections
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      fireEvent.click(screen.getByTestId('file-explorer-toggle'))
      expect(mockToggleFileExplorer).toHaveBeenCalledTimes(1)
    })

    it('should toggle Category Explorer section independently', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 50, categoryExplorerHeight: 50, layout: 'split' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer,
        resizeSections: mockResizeSections
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      fireEvent.click(screen.getByTestId('category-explorer-toggle'))
      expect(mockToggleCategoryExplorer).toHaveBeenCalledTimes(1)
    })

    it('should show toggle states correctly', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 100, categoryExplorerHeight: 0, layout: 'file-only' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')

      expect(fileExplorerToggle).toHaveClass('active')
      expect(categoryExplorerToggle).not.toHaveClass('active')
    })
  })

  describe('Section Resizing', () => {
    it('should render resize handle when both sections are visible', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 50, categoryExplorerHeight: 50, layout: 'split' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer,
        resizeSections: mockResizeSections
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('section-resize-handle')).toBeInTheDocument()
    })

    it('should not render resize handle when only one section is visible', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 100, categoryExplorerHeight: 0, layout: 'file-only' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      expect(screen.queryByTestId('section-resize-handle')).not.toBeInTheDocument()
    })

    it('should apply correct height proportions to sections', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 70, categoryExplorerHeight: 30, layout: 'split' },
        toggleFileExplorerSection: mockToggleFileExplorer,
        toggleCategoryExplorerSection: mockToggleCategoryExplorer
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      const fileExplorerSection = screen.getByTestId('file-explorer-section')
      const categoryExplorerSection = screen.getByTestId('category-explorer-section')

      expect(fileExplorerSection).toHaveStyle('height: 70%')
      expect(categoryExplorerSection).toHaveStyle('height: 30%')
    })
  })

  describe('Drag-and-Drop Integration', () => {
    it('should display drag-drop status message when both sections visible', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        isDragDropAvailable: true,
        dragDropStatusMessage: 'Drag files from File Explorer to Category Explorer to assign categories',
        sectionLayout: { fileExplorerHeight: 50, categoryExplorerHeight: 50, layout: 'split' }
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Drag files from File Explorer to Category Explorer to assign categories')).toBeInTheDocument()
    })

    it('should display appropriate message when drag-drop not available', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: true,
        isDragDropAvailable: false,
        dragDropStatusMessage: 'Show Category Explorer section to enable file categorization',
        sectionLayout: { fileExplorerHeight: 100, categoryExplorerHeight: 0, layout: 'file-only' }
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Show Category Explorer section to enable file categorization')).toBeInTheDocument()
    })

    it('should integrate with file categorization store for drag operations', () => {
      const mockStartDrag = vi.fn()
      const mockCompleteDrop = vi.fn()

      const mockUseFileCategorization = vi.fn(() => ({
        isDragging: false,
        draggedFile: null,
        dropTarget: null,
        isValidDrop: false,
        startDrag: mockStartDrag,
        setDropTarget: vi.fn(),
        completeDrop: mockCompleteDrop,
        cancelDrag: vi.fn()
      }))

      vi.mocked(require('../../src/stores/fileCategorization')).useFileCategorization.mockImplementation(mockUseFileCategorization)

      render(<FilesCategoriesPanel />)

      // Component should have access to drag operations
      expect(mockUseFileCategorization).toHaveBeenCalled()
    })
  })

  describe('Panel Auto-Hide Behavior', () => {
    it('should not render when both sections are hidden', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: false,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: false,
        sectionLayout: { fileExplorerHeight: 0, categoryExplorerHeight: 0, layout: 'split' }
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
    })

    it('should render with proper layout classes based on section states', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: false,
        categoryExplorerSectionVisible: true,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 0, categoryExplorerHeight: 100, layout: 'category-only' }
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('category-only-layout')
    })
  })

  describe('Accessibility', () => {
    it('should provide proper ARIA labels for section toggles', () => {
      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')

      expect(fileExplorerToggle).toHaveAttribute('aria-label', 'Toggle File Explorer section')
      expect(categoryExplorerToggle).toHaveAttribute('aria-label', 'Toggle Category Explorer section')
    })

    it('should indicate section visibility states to screen readers', () => {
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: true,
        sectionLayout: { fileExplorerHeight: 100, categoryExplorerHeight: 0, layout: 'file-only' }
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')

      expect(fileExplorerToggle).toHaveAttribute('aria-pressed', 'true')
      expect(categoryExplorerToggle).toHaveAttribute('aria-pressed', 'false')
    })

    it('should provide semantic structure for screen readers', () => {
      render(<FilesCategoriesPanel />)

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveAttribute('role', 'region')
      expect(panel).toHaveAttribute('aria-label', 'Files and Categories Panel')
    })
  })
})