import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProjectWorkspace } from '../../src/components/ProjectWorkspace'
import { useUiStore } from '../../src/stores/ui-store'

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

vi.mock('../../src/components/FilesCategoriesPanel', () => ({
  FilesCategoriesPanel: () => <div data-testid="files-categories-panel">Files & Categories</div>
}))

vi.mock('../../src/components/SearchPanel', () => ({
  SearchPanel: () => <div data-testid="search-panel">Search</div>
}))

vi.mock('../../src/components/DocumentWorkspace', () => ({
  DocumentWorkspace: () => <div data-testid="document-workspace">Documents</div>
}))

// Mock workspace navigation store
vi.mock('../../src/features/workspace-navigation/store', () => ({
  useWorkspaceNavigationStore: vi.fn(() => ({
    currentProject: {
      id: 'test-project',
      name: 'Test Project',
      sourceFolder: '/test/source'
    },
    isLoading: false,
    error: null,
    loadWorkspaceById: vi.fn(),
  }))
}))

const setUiState = (overrides: Partial<ReturnType<typeof useUiStore.getState>>) => {
  useUiStore.setState({
    filesPanelOpen: true,
    categoriesPanelOpen: false,
    searchPanelOpen: false,
    lastFilesCategories: { filesPanelOpen: true, categoriesPanelOpen: false },
    workspaceLayout: { explorerWidth: 30, workspaceWidth: 70 },
    ...overrides,
  })
}

describe('ProjectWorkspace V2 - Unified State Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUiState({})
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
      setUiState({ filesPanelOpen: true, categoriesPanelOpen: true })

      render(<ProjectWorkspace projectId="test-project" />)
      expect(screen.getByTestId('files-categories-panel')).toBeInTheDocument()
      expect(screen.queryByTestId('search-panel')).not.toBeInTheDocument()
    })

    it('should show search panel when active', () => {
      setUiState({
        filesPanelOpen: false,
        categoriesPanelOpen: false,
        searchPanelOpen: true,
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
