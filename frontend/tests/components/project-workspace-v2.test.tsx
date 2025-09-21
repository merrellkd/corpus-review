import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectWorkspace } from '../../src/components/ProjectWorkspace'

// Import the mocked stores to access them for per-test configuration
import { usePanelStateMachine } from '../../src/stores/panelStateMachine'

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PanelGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PanelResizeHandle: ({ ...props }: any) => <div {...props} />
}))

// Mock the components
// Create a simple mock for TopToolbar that we can control
let mockToggleFilesCategoriesPanel = vi.fn()
let mockToggleSearchPanel = vi.fn()

vi.mock('../../src/components/TopToolbar', () => ({
  TopToolbar: ({ projectTitle }: { projectTitle: string }) => (
    <div data-testid="top-toolbar">
      <button
        data-testid="files-categories-toggle-button"
        onClick={mockToggleFilesCategoriesPanel}
      >
        Files & Categories
      </button>
      <button
        data-testid="search-toggle-button"
        onClick={mockToggleSearchPanel}
      >
        Search
      </button>
      <h1>{projectTitle}</h1>
    </div>
  )
}))

vi.mock('../../src/components/FilesCategoriesPanel', () => ({
  FilesCategoriesPanel: () => <div data-testid="files-categories-panel">Files & Categories Panel</div>
}))

vi.mock('../../src/components/SearchPanel', () => ({
  SearchPanel: () => <div data-testid="search-panel">Search Panel</div>
}))

vi.mock('../../src/components/DocumentWorkspace', () => ({
  DocumentWorkspace: () => (
    <div data-testid="document-workspace">
      <div data-testid="multi-document-workspace">Document Workspace</div>
    </div>
  )
}))

// Mock the stores
vi.mock('../../src/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentProject: { id: 'test-project', name: 'Test Project' },
    workspaceLayout: {
      explorer_width: 30,
      workspace_width: 70,
      file_explorer_visible: true,
      category_explorer_visible: true,
      search_panel_visible: false
    },
    isLoading: false,
    error: null,
    loadProject: vi.fn(),
    updatePanelSizes: vi.fn()
  }))
}))

vi.mock('../../src/stores/panelStateMachine', () => ({
  usePanelStateMachine: vi.fn(() => ({
    activePanel: 'none',
    isFilesCategoriesPanelActive: false,
    isSearchPanelActive: false,
    layoutMode: 'full-width',
    toggleFilesCategoriesPanel: vi.fn(),
    toggleSearchPanel: vi.fn()
  }))
}))

vi.mock('../../src/stores/sectionVisibilityStore', () => ({
  useSectionVisibility: vi.fn(() => ({
    fileExplorerSectionVisible: true,
    categoryExplorerSectionVisible: true,
    shouldShowPanel: true,
    toggleFileExplorerSection: vi.fn(),
    toggleCategoryExplorerSection: vi.fn()
  }))
}))

describe('ProjectWorkspace V2 - Mutually Exclusive Panel Architecture', () => {
  const mockUsePanelStateMachine = vi.mocked(usePanelStateMachine)

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock functions
    mockToggleFilesCategoriesPanel = vi.fn()
    mockToggleSearchPanel = vi.fn()
  })

  describe('Panel Layout Architecture', () => {
    it('should render in two-column layout when Files & Categories panel is active', () => {
      // Mock Files & Categories panel active
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should show two-column layout with Files & Categories panel
      expect(screen.getByTestId('workspace-container')).toHaveClass('two-column-layout')
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('multi-document-workspace')).toBeInTheDocument()
    })

    it('should render in two-column layout when Search panel is active', () => {
      // Mock Search panel active
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'search',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: true,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should show two-column layout with Search panel
      expect(screen.getByTestId('workspace-container')).toHaveClass('two-column-layout')
      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('search-panel')).toBeInTheDocument()
      expect(screen.getByTestId('multi-document-workspace')).toBeInTheDocument()
    })

    it('should render in full-width layout when no panels are active', () => {
      // Mock no panels active
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        layoutMode: 'full-width',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should show full-width layout with only MDW
      expect(screen.getByTestId('workspace-container')).toHaveClass('full-width-layout')
      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('multi-document-workspace')).toBeInTheDocument()
    })

    it('should enforce mutually exclusive panel behavior', () => {
      // Start with Files & Categories active
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: mockToggleFilesCategoriesPanel,
        toggleSearchPanel: mockToggleSearchPanel
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should only show Files & Categories panel
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()

      // Activating Search should call toggle
      fireEvent.click(screen.getByTestId('search-toggle-button'))
      expect(mockToggleSearchPanel).toHaveBeenCalled()
    })
  })

  describe('Panel Visibility Integration', () => {
    it('should integrate with panel state machine for panel switching', () => {
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        layoutMode: 'full-width',
        toggleFilesCategoriesPanel: mockToggleFilesCategoriesPanel,
        toggleSearchPanel: mockToggleSearchPanel
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Toggle Files & Categories
      fireEvent.click(screen.getByTestId('files-categories-toggle-button'))
      expect(mockToggleFilesCategoriesPanel).toHaveBeenCalled()

      // Toggle Search
      fireEvent.click(screen.getByTestId('search-toggle-button'))
      expect(mockToggleSearchPanel).toHaveBeenCalled()
    })

    it('should hide Files & Categories panel when both sections are hidden', () => {
      // Mock Files & Categories panel active but both sections hidden
      const mockUseSectionVisibility = vi.fn(() => ({
        fileExplorerSectionVisible: false,
        categoryExplorerSectionVisible: false,
        shouldShowPanel: false,
        toggleFileExplorerSection: vi.fn(),
        toggleCategoryExplorerSection: vi.fn()
      }))

      vi.mocked(require('../../src/stores/sectionVisibilityStore')).useSectionVisibility.mockImplementation(mockUseSectionVisibility)

      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Panel should be hidden when both sections are hidden
      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Layout Behavior', () => {
    it('should apply correct CSS classes for layout modes', () => {
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      const container = screen.getByTestId('workspace-container')
      expect(container).toHaveClass('two-column-layout')
      expect(container).not.toHaveClass('full-width-layout')
    })

    it('should render resize handles between panels in two-column mode', () => {
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'files_categories',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        layoutMode: 'two-column',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should have resize handle between panel and MDW
      expect(screen.getByTestId('panel-resize-handle')).toBeInTheDocument()
    })

    it('should not render resize handles in full-width mode', () => {
      mockUsePanelStateMachine.mockReturnValue({
        activePanel: 'none',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: false,
        layoutMode: 'full-width',
        toggleFilesCategoriesPanel: vi.fn(),
        toggleSearchPanel: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)

      // Should not have resize handle in full-width mode
      expect(screen.queryByTestId('panel-resize-handle')).not.toBeInTheDocument()
    })
  })
})