import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock the unified panel state store
vi.mock('../../src/stores/ui', () => ({
  useUnifiedPanelState: vi.fn()
}))

import { FilesCategoriesPanel } from '../../src/features/document-workspace/components/FilesCategoriesPanel'
import { useUnifiedPanelState } from '../../src/stores/ui'
import type { PanelStateType, LastValidState } from '../../src/stores/ui'

const mockToggleFileExplorer = vi.fn()
const mockToggleCategoryExplorer = vi.fn()
const mockToggleFilesCategories = vi.fn()
const mockToggleSearch = vi.fn()
const mockSetState = vi.fn()
const mockSetLastValidState = vi.fn()
const mockUseUnifiedPanelState = vi.mocked(useUnifiedPanelState)

// Default mock return value with all required properties
const createMockStoreState = (overrides = {}) => ({
  // Required state properties from the error message
  currentState: 'none' as PanelStateType,
  lastValidFilesCategories: {
    fileExplorerVisible: false,
    categoryExplorerVisible: false
  } as LastValidState,
  isFilesCategoriesPanelActive: false,
  isSearchPanelActive: false,

  // Panel visibility states
  fileExplorerVisible: false,
  categoryExplorerVisible: false,
  isDragDropAvailable: false,

  // Required action methods
  toggleFileExplorer: mockToggleFileExplorer,
  toggleCategoryExplorer: mockToggleCategoryExplorer,
  toggleFilesCategories: mockToggleFilesCategories,
  toggleSearch: mockToggleSearch,
  setState: mockSetState,
  setLastValidState: mockSetLastValidState,

  // Other required properties that might be used
  activePanel: 'none' as const,
  layoutMode: 'full-width' as const,

  // Apply any overrides
  ...overrides
})

describe('FilesCategoriesPanel - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Panel Visibility', () => {
    it('should not render when Files & Categories panel is not active', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: false,
        fileExplorerVisible: false,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

      const { container } = render(<FilesCategoriesPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when Files & Categories panel is active', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
    })
  })

  describe('Section Visibility', () => {
    it('should show only File Explorer when fileExplorerVisible is true', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.queryByTestId('category-explorer-section')).not.toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('file-only-layout')
    })

    it('should show only Category Explorer when categoryExplorerVisible is true', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: false,
        categoryExplorerVisible: true,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)

      expect(screen.queryByTestId('file-explorer-section')).not.toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-section')).toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('category-only-layout')
    })

    it('should show both sections when both are visible', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        isDragDropAvailable: true
      }))

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
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      fireEvent.click(fileExplorerToggle)

      expect(mockToggleFileExplorer).toHaveBeenCalledTimes(1)
    })

    it('should call toggleCategoryExplorer when Category Explorer toggle is clicked', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: false,
        categoryExplorerVisible: true,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)

      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')
      fireEvent.click(categoryExplorerToggle)

      expect(mockToggleCategoryExplorer).toHaveBeenCalledTimes(1)
    })
  })

  describe('Drag-Drop Status', () => {
    it('should show drag-drop available message when both sections are visible', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        isDragDropAvailable: true
      }))

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Drag files from File Explorer to Category Explorer to categorize them')).toBeInTheDocument()
    })

    it('should show appropriate message when drag-drop is not available', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Show both File Explorer and Category Explorer to enable drag-and-drop categorization')).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('should show correct active/inactive states for section toggles', () => {
      mockUseUnifiedPanelState.mockReturnValue(createMockStoreState({
        isFilesCategoriesPanelActive: true,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false
      }))

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