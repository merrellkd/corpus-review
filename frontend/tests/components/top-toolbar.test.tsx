import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopToolbar } from '../../src/components/TopToolbar'

// Mock the panel state machine
vi.mock('../../src/stores/panelStateMachine', () => ({
  usePanelStateMachine: vi.fn(() => ({
    activePanel: 'none',
    isFilesCategoriesPanelActive: false,
    isSearchPanelActive: false,
    toggleFilesCategoriesPanel: vi.fn(),
    toggleSearchPanel: vi.fn()
  }))
}))

describe('TopToolbar - Panel Toggle Controls', () => {
  const mockToggleFilesCategories = vi.fn()
  const mockToggleSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render panel toggle buttons', () => {
      render(<TopToolbar />)

      // Should show both toggle buttons
      expect(screen.getByTestId('files-categories-toggle')).toBeInTheDocument()
      expect(screen.getByTestId('search-toggle')).toBeInTheDocument()

      // Should show button labels
      expect(screen.getByText('Files & Categories')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should render toolbar without project title', () => {
      render(<TopToolbar />)

      // Toolbar should not contain project title (now in main header)
      expect(screen.queryByText('Project Workspace')).not.toBeInTheDocument()

      // But should contain toggle buttons
      expect(screen.getByTestId('files-categories-toggle-button')).toBeInTheDocument()
      expect(screen.getByTestId('search-toggle-button')).toBeInTheDocument()
    })

    it('should apply correct CSS classes for toolbar layout', () => {
      render(<TopToolbar />)

      const toolbar = screen.getByTestId('top-toolbar')
      expect(toolbar).toHaveClass('top-toolbar')

      const toggleGroup = screen.getByTestId('panel-toggles')
      expect(toggleGroup).toHaveClass('panel-toggle-group')
    })
  })

  describe('Panel Toggle States', () => {
    it('should show Files & Categories button as active when panel is active', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      expect(filesCategoriesButton).toHaveClass('active')
      expect(searchButton).not.toHaveClass('active')
    })

    it('should show Search button as active when panel is active', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'search',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: true,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      expect(filesCategoriesButton).not.toHaveClass('active')
      expect(searchButton).toHaveClass('active')
    })

    it('should show both buttons as inactive when no panel is active', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      expect(filesCategoriesButton).not.toHaveClass('active')
      expect(searchButton).not.toHaveClass('active')
    })
  })

  describe('Toggle Interactions', () => {
    it('should call toggleFilesCategoriesPanel when Files & Categories button clicked', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      fireEvent.click(screen.getByTestId('files-categories-toggle'))
      expect(mockToggleFilesCategories).toHaveBeenCalledTimes(1)
    })

    it('should call toggleSearchPanel when Search button clicked', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      fireEvent.click(screen.getByTestId('search-toggle'))
      expect(mockToggleSearch).toHaveBeenCalledTimes(1)
    })

    it('should handle rapid toggle clicks without errors', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')

      // Rapid clicks
      fireEvent.click(filesCategoriesButton)
      fireEvent.click(filesCategoriesButton)
      fireEvent.click(filesCategoriesButton)

      expect(mockToggleFilesCategories).toHaveBeenCalledTimes(3)
    })
  })

  describe('Mutually Exclusive Behavior Indication', () => {
    it('should ensure only one toggle can be active at a time', () => {
      // Test that the UI correctly reflects the mutually exclusive state
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false, // This should always be false when files_categories is true
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      // Only Files & Categories should be active
      expect(filesCategoriesButton).toHaveClass('active')
      expect(searchButton).not.toHaveClass('active')

      // Both buttons should be clickable for switching
      expect(filesCategoriesButton).not.toBeDisabled()
      expect(searchButton).not.toBeDisabled()
    })

    it('should provide visual feedback for toggle state changes', () => {
      let panelState = 'none'

      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: panelState,
        isFilesCategoriesPanelActive: panelState === 'files_categories',
        isSearchPanelActive: panelState === 'search',
        toggleFilesCategoriesPanel: () => { panelState = panelState === 'files_categories' ? 'none' : 'files_categories' },
        toggleSearchPanel: () => { panelState = panelState === 'search' ? 'none' : 'search' }
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      const { rerender } = render(<TopToolbar />)

      // Initially both inactive
      expect(screen.getByTestId('files-categories-toggle')).not.toHaveClass('active')
      expect(screen.getByTestId('search-toggle')).not.toHaveClass('active')

      // After state change, should show visual feedback
      panelState = 'files_categories'
      rerender(<TopToolbar />)

      expect(screen.getByTestId('files-categories-toggle')).toHaveClass('active')
      expect(screen.getByTestId('search-toggle')).not.toHaveClass('active')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for toggle buttons', () => {
      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      expect(filesCategoriesButton).toHaveAttribute('aria-label', 'Toggle Files & Categories panel')
      expect(searchButton).toHaveAttribute('aria-label', 'Toggle Search panel')
    })

    it('should indicate toggle state to screen readers', () => {
      const mockUsePanelStateMachine = vi.fn(() => ({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        toggleFilesCategoriesPanel: mockToggleFilesCategories,
        toggleSearchPanel: mockToggleSearch
      }))

      vi.mocked(require('../../src/stores/panelStateMachine')).usePanelStateMachine.mockImplementation(mockUsePanelStateMachine)

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle')
      const searchButton = screen.getByTestId('search-toggle')

      expect(filesCategoriesButton).toHaveAttribute('aria-pressed', 'true')
      expect(searchButton).toHaveAttribute('aria-pressed', 'false')
    })
  })
})