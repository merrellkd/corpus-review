import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectWorkspace } from '../../../components/ProjectWorkspace'

// Mock react-resizable-panels
vi.mock('react-resizable-panels', () => ({
  Panel: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PanelGroup: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  PanelResizeHandle: ({ ...props }: any) => <div {...props} />
}))

// Mock the components
vi.mock('../../src/components/TopToolbar', () => ({
  TopToolbar: () => <div data-testid="top-toolbar">Toolbar</div>
}))

vi.mock('../../document-workspace/components/FilesCategoriesPanel', () => ({
  FilesCategoriesPanel: () => <div data-testid="files-categories-panel">Files & Categories</div>
}))

vi.mock('../../document-workspace/components/SearchPanel', () => ({
  SearchPanel: () => <div data-testid="search-panel">Search</div>
}))

vi.mock('../../document-workspace/components/DocumentWorkspace', () => ({
  DocumentWorkspace: () => <div data-testid="document-workspace">Documents</div>
}))

// Mock workspace store
vi.mock('../../src/stores/workspace', () => ({
  useWorkspaceStore: vi.fn(() => ({
    currentProject: {
      id: 'test-project',
      name: 'Test Project',
      sourceFolderPath: '/test/source',
      reportsFolderPath: '/test/reports'
    },
    workspaceLayout: null,
    isLoading: false,
    loadProject: vi.fn(),
    updatePanelSizes: vi.fn()
  }))
}))

// Mock unified panel state
vi.mock('../../src/stores/ui', () => ({
  useUnifiedPanelState: vi.fn(() => ({
    currentState: 'none',
    isFilesCategoriesPanelActive: false,
    isSearchPanelActive: false,
    fileExplorerVisible: true,
    categoryExplorerVisible: true,
    isDragDropAvailable: false,
    toggleFilesCategories: vi.fn(),
    toggleSearch: vi.fn(),
    toggleFileExplorer: vi.fn(),
    toggleCategoryExplorer: vi.fn()
  }))
}))

describe('ProjectWorkspace V2 - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with toolbar and document workspace', () => {
      render(<ProjectWorkspace projectId="test-project" />)

      expect(screen.getByTestId('top-toolbar')).toBeInTheDocument()
      expect(screen.getByTestId('document-workspace')).toBeInTheDocument()
    })

    it('should have correct layout classes based on panel state', () => {
      const { container } = render(<ProjectWorkspace projectId="test-project" />)

      // Should have full-width layout when no panels are active
      const workspaceDiv = container.querySelector('div')
      expect(workspaceDiv).toHaveClass('h-screen', 'bg-gray-100', 'full-width-layout')
    })
  })

  describe('Panel Visibility Integration', () => {
    it('should show files-categories panel when active', () => {
      const { useUnifiedPanelState } = require('../../src/stores/ui')
      useUnifiedPanelState.mockReturnValue({
        currentState: 'files-only',
        isFilesCategoriesPanelActive: true,
        isSearchPanelActive: false,
        fileExplorerVisible: true,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFilesCategories: vi.fn(),
        toggleSearch: vi.fn(),
        toggleFileExplorer: vi.fn(),
        toggleCategoryExplorer: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
    })

    it('should show search panel when active', () => {
      const { useUnifiedPanelState } = require('../../src/stores/ui')
      useUnifiedPanelState.mockReturnValue({
        currentState: 'search',
        isFilesCategoriesPanelActive: false,
        isSearchPanelActive: true,
        fileExplorerVisible: false,
        categoryExplorerVisible: false,
        isDragDropAvailable: false,
        toggleFilesCategories: vi.fn(),
        toggleSearch: vi.fn(),
        toggleFileExplorer: vi.fn(),
        toggleCategoryExplorer: vi.fn()
      })

      render(<ProjectWorkspace projectId="test-project" />)
      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('search-panel')).toBeInTheDocument()
    })

    it('should show neither panel when in none state', () => {
      render(<ProjectWorkspace projectId="test-project" />)
      expect(screen.queryByTestId('files-categories-panel')).not.toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
      expect(screen.getByTestId('document-workspace')).toBeInTheDocument()
    })
  })
})