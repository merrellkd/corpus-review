import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the unified panel state store
vi.mock('../../src/stores/unifiedPanelState', () => ({
  useUnifiedPanelState: vi.fn()
}))

import { FilesCategoriesPanel } from '../../src/components/FilesCategoriesPanel'
import { useUnifiedPanelState } from '../../src/stores/unifiedPanelState'

const mockToggleFileExplorer = vi.fn()
const mockToggleCategoryExplorer = vi.fn()
const mockUseUnifiedPanelState = vi.mocked(useUnifiedPanelState)

describe('FilesCategoriesPanel - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Panel Visibility', () => {
    it('should not render when Files & Categories panel is not active', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: false,
        fileExplorerVisible: false,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      const { container } = render(<FilesCategoriesPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when Files & Categories panel is active', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
    })
  })

  describe('Section Visibility', () => {
    it('should show only File Explorer when fileExplorerVisible is true', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.queryByTestId('category-explorer-section')).not.toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('file-only-layout')
    })

    it('should show only Category Explorer when categoryExplorerVisible is true', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: false,
        categoryExplorerVisible: true,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      expect(screen.queryByTestId('file-explorer-section')).not.toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-section')).toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('category-only-layout')
    })

    it('should show both sections when both are visible', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        isDragDropAvailable: true,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-section')).toBeInTheDocument()
      expect(screen.getByTestId('section-resize-handle')).toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('split-layout')
    })
  })

  describe('Section Toggle Interactions', () => {
    it('should call toggleFileExplorer when File Explorer toggle is clicked', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      fireEvent.click(fileExplorerToggle)

      expect(mockToggleFileExplorer).toHaveBeenCalledTimes(1)
    })

    it('should call toggleCategoryExplorer when Category Explorer toggle is clicked', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: false,
        categoryExplorerVisible: true,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')
      fireEvent.click(categoryExplorerToggle)

      expect(mockToggleCategoryExplorer).toHaveBeenCalledTimes(1)
    })
  })

  describe('Drag-Drop Status', () => {
    it('should show drag-drop available message when both sections are visible', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        isDragDropAvailable: true,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Drag files from File Explorer to Category Explorer to categorize them')).toBeInTheDocument()
    })

    it('should show appropriate message when drag-drop is not available', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Show both File Explorer and Category Explorer to enable drag-and-drop categorization')).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('should show correct active/inactive states for section toggles', () => {
      mockUseUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFileExplorer: mockToggleFileExplorer,
        toggleCategoryExplorer: mockToggleCategoryExplorer
      })

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')

      expect(fileExplorerToggle).toHaveClass('active', 'bg-blue-600', 'text-white')
      expect(categoryExplorerToggle).toHaveClass('bg-gray-200', 'text-gray-700')

      expect(fileExplorerToggle).toHaveAttribute('aria-pressed', 'true')
      expect(categoryExplorerToggle).toHaveAttribute('aria-pressed', 'false')
    })
  })
})