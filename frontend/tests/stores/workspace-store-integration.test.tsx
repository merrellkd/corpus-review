import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useWorkspaceNavigationStore } from '../../src/features/workspace-navigation/store'

const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

const resetWorkspaceStore = () => {
  useWorkspaceNavigationStore.setState({
    currentProject: null,
    currentWorkspace: null,
    currentPath: '',
    fileExplorerItems: [],
    isLoading: false,
    error: null,
    navigationHistory: [],
    currentHistoryIndex: -1,
    searchQuery: '',
    searchResults: [],
  })
}

describe('WorkspaceNavigationStore Tauri Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetWorkspaceStore()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('opens workspace via open_workspace_navigation', async () => {
    const project = { id: 'proj_123', name: 'Test Project', sourceFolder: '/test/path' }
    const mockResponse = {
      projectId: project.id,
      projectName: project.name,
      sourceFolder: project.sourceFolder,
      currentPath: project.sourceFolder,
      directoryListing: {
        entries: [
          { name: 'src', path: '/test/path/src', entryType: 'directory', size: null, modified: '2024-09-25T10:00:00Z' }
        ],
        canNavigateUp: false,
        isRoot: true,
        parentPath: null,
      },
    }

    mockInvoke.mockImplementation((command: string) => {
      if (command === 'open_workspace_navigation') {
        return Promise.resolve(mockResponse)
      }
      throw new Error(`Unexpected command ${command}`)
    })

    const { result } = renderHook(() => useWorkspaceNavigationStore())

    await act(async () => {
      await result.current.openWorkspaceFromProject(project)
    })

    expect(mockInvoke).toHaveBeenCalledWith('open_workspace_navigation', {
      projectId: project.id,
      projectName: project.name,
      sourceFolder: project.sourceFolder,
    })

    expect(result.current.currentWorkspace?.currentPath).toBe(project.sourceFolder)
    expect(result.current.fileExplorerItems).toHaveLength(1)
  })

  it('handles open workspace errors', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Permission denied'))

    const { result } = renderHook(() => useWorkspaceNavigationStore())

    await act(async () => {
      await result.current.openWorkspaceFromProject({ id: 'proj_err', name: 'Error Project', sourceFolder: '/err' })
    })

    expect(result.current.error).toBe('Permission denied')
    expect(result.current.fileExplorerItems).toHaveLength(0)
  })

  it('navigates to folder using navigate_to_folder', async () => {
    useWorkspaceNavigationStore.setState({
      currentProject: { id: 'proj_1', name: 'Test', sourceFolder: '/test/path' },
      currentWorkspace: {
        projectId: 'proj_1',
        projectName: 'Test',
        sourceFolder: '/test/path',
        currentPath: '/test/path',
        directoryListing: {
          entries: [],
          canNavigateUp: false,
          isRoot: true,
          parentPath: null,
        },
      },
      currentPath: '/test/path',
    })

    const folderResponse = {
      projectId: 'proj_1',
      projectName: 'Test',
      sourceFolder: '/test/path',
      currentPath: '/test/path/src',
      directoryListing: {
        entries: [
          { name: 'main.ts', path: '/test/path/src/main.ts', entryType: 'file', size: 512, modified: '2024-09-25T11:00:00Z' }
        ],
        canNavigateUp: true,
        isRoot: false,
        parentPath: '/test/path',
      },
    }

    mockInvoke.mockImplementation((command: string) => {
      if (command === 'navigate_to_folder') {
        return Promise.resolve(folderResponse)
      }
      throw new Error(`Unexpected command ${command}`)
    })

    const { result } = renderHook(() => useWorkspaceNavigationStore())

    await act(async () => {
      await result.current.navigateToFolder('src')
    })

    expect(mockInvoke).toHaveBeenCalledWith('navigate_to_folder', {
      projectId: 'proj_1',
      projectName: 'Test',
      sourceFolder: '/test/path',
      currentPath: '/test/path',
      folderName: 'src',
    })

    expect(result.current.currentWorkspace?.currentPath).toBe('/test/path/src')
    expect(result.current.fileExplorerItems).toHaveLength(1)
  })

  it('refreshes directory listing via list_directory', async () => {
    useWorkspaceNavigationStore.setState({
      currentProject: { id: 'proj_1', name: 'Test', sourceFolder: '/test/path' },
      currentWorkspace: {
        projectId: 'proj_1',
        projectName: 'Test',
        sourceFolder: '/test/path',
        currentPath: '/test/path',
        directoryListing: {
          entries: [],
          canNavigateUp: false,
          isRoot: true,
          parentPath: null,
        },
      },
      currentPath: '/test/path',
    })

    mockInvoke.mockImplementation((command: string) => {
      if (command === 'list_directory') {
        return Promise.resolve({
          entries: [
            { name: 'docs', path: '/test/path/docs', entryType: 'directory', size: null, modified: '2024-09-25T12:00:00Z' },
          ],
          canNavigateUp: false,
          isRoot: true,
          parentPath: null,
        })
      }
      throw new Error(`Unexpected command ${command}`)
    })

    const { result } = renderHook(() => useWorkspaceNavigationStore())

    await act(async () => {
      await result.current.refreshCurrentDirectory()
    })

    expect(mockInvoke).toHaveBeenCalledWith('list_directory', {
      projectId: 'proj_1',
      projectName: 'Test',
      sourceFolder: '/test/path',
      currentPath: '/test/path',
    })

    expect(result.current.fileExplorerItems).toHaveLength(1)
    expect(result.current.fileExplorerItems[0].name).toBe('docs')
  })
})
