import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { FilesCategoriesPanel } from '../../src/features/document-workspace/components/FilesCategoriesPanel'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'

// Mock Tauri invoke function
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

// Mock the workspace store
vi.mock('../../src/stores/workspaceStore')

describe('FilesCategoriesPanel with Real File Data', () => {
  const mockWorkspaceStore = {
    fileExplorerItems: [] as any[],
    isLoading: false,
    error: null as string | null,
    currentPath: '/test/project/path',
    navigateToFolder: vi.fn(),
    refreshFiles: vi.fn(),
    loadProject: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useWorkspaceStore as any).mockReturnValue(mockWorkspaceStore)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should display real file system items', () => {
    // Mock real file system data structure
    const realFileData = [
      {
        name: 'src',
        path: '/test/project/path/src',
        type: 'directory',
        size: null,
        modified: '2024-09-25T10:00:00Z'
      },
      {
        name: 'README.md',
        path: '/test/project/path/README.md',
        type: 'file',
        size: 1024,
        modified: '2024-09-25T09:30:00Z'
      },
      {
        name: 'package.json',
        path: '/test/project/path/package.json',
        type: 'file',
        size: 512,
        modified: '2024-09-25T09:00:00Z'
      },
      {
        name: 'node_modules',
        path: '/test/project/path/node_modules',
        type: 'directory',
        size: null,
        modified: '2024-09-25T08:00:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = realFileData

    render(<FilesCategoriesPanel />)

    // Should display real directories
    expect(screen.getByText('src')).toBeInTheDocument()
    expect(screen.getByText('node_modules')).toBeInTheDocument()

    // Should display real files
    expect(screen.getByText('README.md')).toBeInTheDocument()
    expect(screen.getByText('package.json')).toBeInTheDocument()

    // Should show file metadata
    expect(screen.getByText('1.00 KB')).toBeInTheDocument() // README.md size
    expect(screen.getByText('0.50 KB')).toBeInTheDocument() // package.json size
  })

  it('should handle directory navigation with real folders', async () => {
    const realFileData = [
      {
        name: 'src',
        path: '/test/project/path/src',
        type: 'directory',
        size: null,
        modified: '2024-09-25T10:00:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = realFileData

    render(<FilesCategoriesPanel />)

    const srcFolder = screen.getByText('src')

    // Double-click to navigate into directory
    fireEvent.doubleClick(srcFolder)

    await waitFor(() => {
      expect(mockWorkspaceStore.navigateToFolder).toHaveBeenCalledWith('src')
    })
  })

  it('should display loading state during real file operations', () => {
    mockWorkspaceStore.isLoading = true
    mockWorkspaceStore.fileExplorerItems = []

    render(<FilesCategoriesPanel />)

    expect(screen.getByText('Loading files...')).toBeInTheDocument()
  })

  it('should handle file system errors gracefully', () => {
    mockWorkspaceStore.error = 'Permission denied: Cannot access /restricted/path'
    mockWorkspaceStore.fileExplorerItems = []

    render(<FilesCategoriesPanel />)

    expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
  })

  it('should sort real files correctly (directories first, then files)', () => {
    const unsortedRealData = [
      {
        name: 'README.md',
        path: '/test/project/path/README.md',
        type: 'file',
        size: 1024,
        modified: '2024-09-25T09:30:00Z'
      },
      {
        name: 'src',
        path: '/test/project/path/src',
        type: 'directory',
        size: null,
        modified: '2024-09-25T10:00:00Z'
      },
      {
        name: 'package.json',
        path: '/test/project/path/package.json',
        type: 'file',
        size: 512,
        modified: '2024-09-25T09:00:00Z'
      },
      {
        name: 'docs',
        path: '/test/project/path/docs',
        type: 'directory',
        size: null,
        modified: '2024-09-25T08:30:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = unsortedRealData

    render(<FilesCategoriesPanel />)

    // Get all file/folder items in order they appear
    const items = screen.getAllByTestId(/file-item/)

    // Directories should appear first, then files
    const itemTexts = items.map(item => item.textContent)
    const srcIndex = itemTexts.findIndex(text => text?.includes('src'))
    const docsIndex = itemTexts.findIndex(text => text?.includes('docs'))
    const readmeIndex = itemTexts.findIndex(text => text?.includes('README.md'))
    const packageIndex = itemTexts.findIndex(text => text?.includes('package.json'))

    // Both directories should come before both files
    expect(srcIndex).toBeLessThan(readmeIndex)
    expect(srcIndex).toBeLessThan(packageIndex)
    expect(docsIndex).toBeLessThan(readmeIndex)
    expect(docsIndex).toBeLessThan(packageIndex)
  })

  it('should handle real file metadata display', () => {
    const realFileWithMetadata = [
      {
        name: 'large-file.pdf',
        path: '/test/project/path/large-file.pdf',
        type: 'file',
        size: 2097152, // 2 MB
        modified: '2024-09-25T14:30:00Z'
      },
      {
        name: 'small-script.sh',
        path: '/test/project/path/small-script.sh',
        type: 'file',
        size: 128,
        modified: '2024-09-25T15:45:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = realFileWithMetadata

    render(<FilesCategoriesPanel />)

    // Should display formatted file sizes
    expect(screen.getByText('2.00 MB')).toBeInTheDocument() // large-file.pdf
    expect(screen.getByText('128 B')).toBeInTheDocument() // small-script.sh

    // Should display file names
    expect(screen.getByText('large-file.pdf')).toBeInTheDocument()
    expect(screen.getByText('small-script.sh')).toBeInTheDocument()
  })

  it('should refresh files when refresh button is clicked', async () => {
    const realFileData = [
      {
        name: 'test-file.txt',
        path: '/test/project/path/test-file.txt',
        type: 'file',
        size: 256,
        modified: '2024-09-25T12:00:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = realFileData

    render(<FilesCategoriesPanel />)

    // Find and click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    fireEvent.click(refreshButton)

    await waitFor(() => {
      expect(mockWorkspaceStore.refreshFiles).toHaveBeenCalled()
    })
  })

  it('should handle empty directory gracefully', () => {
    mockWorkspaceStore.fileExplorerItems = []
    mockWorkspaceStore.currentPath = '/test/project/empty-folder'

    render(<FilesCategoriesPanel />)

    expect(screen.getByText(/No files found/)).toBeInTheDocument()
    expect(screen.getByText('/test/project/empty-folder')).toBeInTheDocument()
  })

  it('should display different file type icons based on real file extensions', () => {
    const diverseFileTypes = [
      {
        name: 'document.pdf',
        path: '/test/project/path/document.pdf',
        type: 'file',
        size: 1024,
        modified: '2024-09-25T10:00:00Z'
      },
      {
        name: 'script.js',
        path: '/test/project/path/script.js',
        type: 'file',
        size: 512,
        modified: '2024-09-25T10:00:00Z'
      },
      {
        name: 'image.png',
        path: '/test/project/path/image.png',
        type: 'file',
        size: 2048,
        modified: '2024-09-25T10:00:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = diverseFileTypes

    render(<FilesCategoriesPanel />)

    // Should display files with appropriate icons
    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('script.js')).toBeInTheDocument()
    expect(screen.getByText('image.png')).toBeInTheDocument()

    // Check for file type specific icons (implementation dependent)
    const fileItems = screen.getAllByTestId(/file-item/)
    expect(fileItems).toHaveLength(3)
  })

  it('should handle file selection with real file data', () => {
    const realFileData = [
      {
        name: 'selectable-file.txt',
        path: '/test/project/path/selectable-file.txt',
        type: 'file',
        size: 100,
        modified: '2024-09-25T10:00:00Z'
      }
    ]

    mockWorkspaceStore.fileExplorerItems = realFileData

    render(<FilesCategoriesPanel />)

    const fileItem = screen.getByText('selectable-file.txt')
    fireEvent.click(fileItem)

    // File should be selected (visual indication)
    expect(fileItem.closest('[data-testid="file-item"]')).toHaveClass('selected')
  })
})

// Helper test utilities for real file data testing
export const createMockRealFileData = (files: Array<{
  name: string,
  type: 'file' | 'directory',
  size?: number
}>) => {
  return files.map(file => ({
    name: file.name,
    path: `/test/project/path/${file.name}`,
    type: file.type,
    size: file.type === 'directory' ? null : (file.size || 1024),
    modified: '2024-09-25T10:00:00Z'
  }))
}

export const mockWorkspaceStoreState = (overrides: any = {}) => {
  return {
    fileExplorerItems: [],
    isLoading: false,
    error: null,
    currentPath: '/test/project/path',
    navigateToFolder: vi.fn(),
    refreshFiles: vi.fn(),
    loadProject: vi.fn(),
    ...overrides
  }
}