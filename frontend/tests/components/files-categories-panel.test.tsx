import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { FilesCategoriesPanel } from '../../src/features/workspace-navigation/components/FilesCategoriesPanel'
import { useUiStore } from '../../src/stores/ui-store'
import type { UiState } from '../../src/stores/ui-store'

const mockToggleFileExplorer = vi.fn()
const mockToggleCategoryExplorer = vi.fn()

const setUiState = (overrides: Partial<UiState>) => {
  useUiStore.setState(
    () => ({
      filesPanelOpen: true,
      categoriesPanelOpen: false,
      searchPanelOpen: false,
      lastFilesCategories: { filesPanelOpen: true, categoriesPanelOpen: false },
      workspaceLayout: { explorerWidth: 30, workspaceWidth: 70 },
      toggleFilesCategories: vi.fn(),
      toggleSearchPanel: vi.fn(),
      toggleFileExplorer: mockToggleFileExplorer,
      toggleCategoryExplorer: mockToggleCategoryExplorer,
      setExplorerWidth: vi.fn(),
      resetPanels: vi.fn(),
      ...overrides,
    }),
    true
  )
}

describe('FilesCategoriesPanel - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUiState({})
  })

  describe('Panel Visibility', () => {
    it('should not render when Files & Categories panel is not active', () => {
      setUiState({
        filesPanelOpen: false,
        categoriesPanelOpen: false,
      })

      const { container } = render(<FilesCategoriesPanel />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when Files & Categories panel is active', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: false,
      })

      render(<FilesCategoriesPanel />)
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
    })
  })

  describe('Section Visibility', () => {
    it('should show only File Explorer when fileExplorerVisible is true', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: false,
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByTestId('file-explorer-section')).toBeInTheDocument()
      expect(screen.queryByTestId('category-explorer-section')).not.toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('file-only-layout')
    })

    it('should show only Category Explorer when categoryExplorerVisible is true', () => {
      setUiState({
        filesPanelOpen: false,
        categoriesPanelOpen: true,
      })

      render(<FilesCategoriesPanel />)

      expect(screen.queryByTestId('file-explorer-section')).not.toBeInTheDocument()
      expect(screen.getByTestId('category-explorer-section')).toBeInTheDocument()

      const panel = screen.getByTestId('files-categories-panel')
      expect(panel).toHaveClass('category-only-layout')
    })

    it('should show both sections when both are visible', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: true,
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
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: false,
      })

      render(<FilesCategoriesPanel />)

      const fileExplorerToggle = screen.getByTestId('file-explorer-toggle')
      fireEvent.click(fileExplorerToggle)

      expect(mockToggleFileExplorer).toHaveBeenCalledTimes(1)
    })

    it('should call toggleCategoryExplorer when Category Explorer toggle is clicked', () => {
      setUiState({
        filesPanelOpen: false,
        categoriesPanelOpen: true,
      })

      render(<FilesCategoriesPanel />)

      const categoryExplorerToggle = screen.getByTestId('category-explorer-toggle')
      fireEvent.click(categoryExplorerToggle)

      expect(mockToggleCategoryExplorer).toHaveBeenCalledTimes(1)
    })
  })

  describe('Drag-Drop Status', () => {
    it('should show drag-drop available message when both sections are visible', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: true,
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Drag files from File Explorer to Category Explorer to categorize them')).toBeInTheDocument()
    })

    it('should show appropriate message when drag-drop is not available', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: false,
      })

      render(<FilesCategoriesPanel />)

      expect(screen.getByText('Show both File Explorer and Category Explorer to enable drag-and-drop categorization')).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('should show correct active/inactive states for section toggles', () => {
      setUiState({
        filesPanelOpen: true,
        categoriesPanelOpen: false,
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
