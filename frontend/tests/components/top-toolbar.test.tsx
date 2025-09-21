import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TopToolbar } from '../../src/components/TopToolbar'

// Mock the unified panel state store
const mockToggleFilesCategories = vi.fn()
const mockToggleSearch = vi.fn()

vi.mock('../../src/stores/unifiedPanelState', () => ({
  useUnifiedPanelState: vi.fn(() => ({
    isFilesCategoriesPanelActive: false,
    isSearchPanelActive: false,
    toggleFilesCategories: mockToggleFilesCategories,
    toggleSearch: mockToggleSearch
  }))
}))

describe('TopToolbar - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render panel toggle buttons', () => {
      render(<TopToolbar />)

      expect(screen.getByTestId('files-categories-toggle-button')).toBeInTheDocument()
      expect(screen.getByTestId('search-toggle-button')).toBeInTheDocument()
      expect(screen.getByText('Files & Categories')).toBeInTheDocument()
      expect(screen.getByText('Search')).toBeInTheDocument()
    })
  })

  describe('Button States', () => {
    it('should show inactive state when no panels are active', () => {
      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle-button')
      const searchButton = screen.getByTestId('search-toggle-button')

      expect(filesCategoriesButton).toHaveClass('bg-gray-100', 'text-gray-700')
      expect(searchButton).toHaveClass('bg-gray-100', 'text-gray-700')
      expect(filesCategoriesButton).toHaveAttribute('aria-pressed', 'false')
      expect(searchButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should show active state for Files & Categories when active', () => {
      const { useUnifiedPanelState } = require('../../src/stores/unifiedPanelState')
      useUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        toggleFilesCategories: mockToggleFilesCategories,
        toggleSearch: mockToggleSearch
      })

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle-button')
      const searchButton = screen.getByTestId('search-toggle-button')

      expect(filesCategoriesButton).toHaveClass('active', 'bg-blue-600', 'text-white')
      expect(searchButton).toHaveClass('bg-gray-100', 'text-gray-700')
      expect(filesCategoriesButton).toHaveAttribute('aria-pressed', 'true')
      expect(searchButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should show active state for Search when active', () => {
      const { useUnifiedPanelState } = require('../../src/stores/unifiedPanelState')
      useUnifiedPanelState.mockReturnValue({
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: true,
        toggleFilesCategories: mockToggleFilesCategories,
        toggleSearch: mockToggleSearch
      })

      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle-button')
      const searchButton = screen.getByTestId('search-toggle-button')

      expect(filesCategoriesButton).toHaveClass('bg-gray-100', 'text-gray-700')
      expect(searchButton).toHaveClass('active', 'bg-blue-600', 'text-white')
      expect(filesCategoriesButton).toHaveAttribute('aria-pressed', 'false')
      expect(searchButton).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('Button Interactions', () => {
    it('should call toggleFilesCategories when Files & Categories button clicked', () => {
      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle-button')
      fireEvent.click(filesCategoriesButton)

      expect(mockToggleFilesCategories).toHaveBeenCalledTimes(1)
    })

    it('should call toggleSearch when Search button clicked', () => {
      render(<TopToolbar />)

      const searchButton = screen.getByTestId('search-toggle-button')
      fireEvent.click(searchButton)

      expect(mockToggleSearch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for toggle buttons', () => {
      render(<TopToolbar />)

      const filesCategoriesButton = screen.getByTestId('files-categories-toggle-button')
      const searchButton = screen.getByTestId('search-toggle-button')

      expect(filesCategoriesButton).toHaveAttribute('aria-label', 'Toggle Files & Categories panel')
      expect(searchButton).toHaveAttribute('aria-label', 'Toggle Search panel')
    })
  })
})