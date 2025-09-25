import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { act, renderHook } from '@testing-library/react'

// Mock Tauri invoke function
const mockInvoke = vi.fn()
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockInvoke,
}))

describe('WorkspaceStore Tauri Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useWorkspaceStore.setState({
      currentProject: null,
      fileExplorerItems: [],
      isLoading: false,
      error: null,
      currentPath: '',
      navigationHistory: [],
      workspaceLayout: null,
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('loadProject with real backend integration', () => {
    it('should load project using open_workspace_navigation Tauri command', async () => {
      // Mock successful Tauri command response
      const mockWorkspaceResponse = {
        projectId: 'proj_12345',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path',
        directoryListing: {
          entries: [
            {
              name: 'src',
              path: '/test/project/path/src',
              entryType: 'directory',
              size: null,
              modified: '2024-09-25T10:00:00Z'
            },
            {
              name: 'README.md',
              path: '/test/project/path/README.md',
              entryType: 'file',
              size: 1024,
              modified: '2024-09-25T09:30:00Z'
            }
          ],
          canNavigateUp: false,
          isRoot: true,
          parentPath: null
        }
      }

      mockInvoke.mockResolvedValueOnce(mockWorkspaceResponse)

      const { result } = renderHook(() => useWorkspaceStore())

      // Load project
      await act(async () => {
        await result.current.loadProject('proj_12345')
      })

      // Verify Tauri command was called correctly
      expect(mockInvoke).toHaveBeenCalledWith('open_workspace_navigation', {
        projectId: 'proj_12345',
        projectName: expect.any(String),
        sourceFolder: expect.any(String)
      })

      // Verify store state was updated
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.fileExplorerItems).toHaveLength(2)
      expect(result.current.currentPath).toBe('/test/project/path')

      // Verify file items are correctly mapped
      const fileItems = result.current.fileExplorerItems
      expect(fileItems[0].name).toBe('src')
      expect(fileItems[0].type).toBe('directory')
      expect(fileItems[1].name).toBe('README.md')
      expect(fileItems[1].type).toBe('file')
      expect(fileItems[1].size).toBe(1024)
    })

    it('should handle Tauri command errors gracefully', async () => {
      // Mock Tauri command error
      mockInvoke.mockRejectedValueOnce(new Error('Permission denied: Cannot access /restricted/path'))

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.loadProject('proj_restricted')
      })

      // Verify error handling
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Permission denied: Cannot access /restricted/path')
      expect(result.current.fileExplorerItems).toHaveLength(0)
      expect(result.current.currentProject).toBeNull()
    })

    it('should show loading state during Tauri command execution', async () => {
      // Mock slow Tauri command
      let resolveCommand: (value: any) => void
      const slowPromise = new Promise(resolve => {
        resolveCommand = resolve
      })
      mockInvoke.mockReturnValueOnce(slowPromise)

      const { result } = renderHook(() => useWorkspaceStore())

      // Start loading
      act(() => {
        result.current.loadProject('proj_slow')
      })

      // Should be in loading state
      expect(result.current.isLoading).toBe(true)
      expect(result.current.error).toBeNull()

      // Complete the command
      await act(async () => {
        resolveCommand!({
          projectId: 'proj_slow',
          projectName: 'Slow Project',
          sourceFolder: '/slow/path',
          currentPath: '/slow/path',
          directoryListing: { entries: [], canNavigateUp: false, isRoot: true, parentPath: null }
        })
        await slowPromise
      })

      // Should no longer be loading
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('navigateToFolder with real backend integration', () => {
    it('should navigate using navigate_to_folder Tauri command', async () => {
      // Setup initial state
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path',
        fileExplorerItems: [
          { name: 'src', type: 'directory', path: '/test/project/path/src' } as any
        ]
      })

      // Mock navigation response
      const mockNavigationResponse = {
        projectId: 'proj_123',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path/src',
        directoryListing: {
          entries: [
            {
              name: 'main.ts',
              path: '/test/project/path/src/main.ts',
              entryType: 'file',
              size: 512,
              modified: '2024-09-25T11:00:00Z'
            }
          ],
          canNavigateUp: true,
          isRoot: false,
          parentPath: '/test/project/path'
        }
      }

      mockInvoke.mockResolvedValueOnce(mockNavigationResponse)

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.navigateToFolder('src')
      })

      // Verify Tauri command called correctly
      expect(mockInvoke).toHaveBeenCalledWith('navigate_to_folder', {
        projectId: 'proj_123',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path',
        folderName: 'src'
      })

      // Verify state updated
      expect(result.current.currentPath).toBe('/test/project/path/src')
      expect(result.current.fileExplorerItems).toHaveLength(1)
      expect(result.current.fileExplorerItems[0].name).toBe('main.ts')
    })

    it('should handle navigation errors', async () => {
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path'
      })

      mockInvoke.mockRejectedValueOnce(new Error('Folder not found: nonexistent'))

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.navigateToFolder('nonexistent')
      })

      expect(result.current.error).toBe('Folder not found: nonexistent')
    })
  })

  describe('navigateToParent with real backend integration', () => {
    it('should navigate to parent using navigate_to_parent Tauri command', async () => {
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path/src',
        fileExplorerItems: []
      })

      const mockParentResponse = {
        projectId: 'proj_123',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path',
        directoryListing: {
          entries: [
            {
              name: 'src',
              path: '/test/project/path/src',
              entryType: 'directory',
              size: null,
              modified: '2024-09-25T10:00:00Z'
            }
          ],
          canNavigateUp: false,
          isRoot: true,
          parentPath: null
        }
      }

      mockInvoke.mockResolvedValueOnce(mockParentResponse)

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.navigateToParent()
      })

      expect(mockInvoke).toHaveBeenCalledWith('navigate_to_parent', {
        projectId: 'proj_123',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path/src'
      })

      expect(result.current.currentPath).toBe('/test/project/path')
    })

    it('should handle boundary violations', async () => {
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path'
      })

      mockInvoke.mockRejectedValueOnce(new Error('Cannot navigate above workspace root'))

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.navigateToParent()
      })

      expect(result.current.error).toBe('Cannot navigate above workspace root')
    })
  })

  describe('refreshFiles with real backend integration', () => {
    it('should refresh directory using list_directory Tauri command', async () => {
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path',
        fileExplorerItems: []
      })

      const mockRefreshResponse = {
        entries: [
          {
            name: 'new-file.txt',
            path: '/test/project/path/new-file.txt',
            entryType: 'file',
            size: 256,
            modified: '2024-09-25T12:00:00Z'
          }
        ],
        canNavigateUp: false,
        isRoot: true,
        parentPath: null
      }

      mockInvoke.mockResolvedValueOnce(mockRefreshResponse)

      const { result } = renderHook(() => useWorkspaceStore())

      await act(async () => {
        await result.current.refreshFiles()
      })

      expect(mockInvoke).toHaveBeenCalledWith('list_directory', {
        projectId: 'proj_123',
        projectName: 'Test Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path'
      })

      expect(result.current.fileExplorerItems).toHaveLength(1)
      expect(result.current.fileExplorerItems[0].name).toBe('new-file.txt')
    })
  })

  describe('error handling integration', () => {
    it('should provide user-friendly error messages for common file system errors', async () => {
      const testCases = [
        {
          backendError: 'Permission denied accessing /restricted',
          expectedMessage: 'Permission denied. Check folder access rights.'
        },
        {
          backendError: 'Directory not found: /missing/path',
          expectedMessage: 'Folder not found. The project source may have been moved.'
        },
        {
          backendError: 'Network timeout',
          expectedMessage: 'File system error: Network timeout'
        }
      ]

      const { result } = renderHook(() => useWorkspaceStore())

      for (const testCase of testCases) {
        mockInvoke.mockRejectedValueOnce(new Error(testCase.backendError))

        await act(async () => {
          await result.current.loadProject('proj_error_test')
        })

        expect(result.current.error).toContain(testCase.expectedMessage)
      }
    })

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useWorkspaceStore())

      // Set error state
      useWorkspaceStore.setState({ error: 'Previous error' })

      // Mock successful operation
      mockInvoke.mockResolvedValueOnce({
        projectId: 'proj_success',
        projectName: 'Success Project',
        sourceFolder: '/success/path',
        currentPath: '/success/path',
        directoryListing: { entries: [], canNavigateUp: false, isRoot: true, parentPath: null }
      })

      await act(async () => {
        await result.current.loadProject('proj_success')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('performance integration', () => {
    it('should handle large directory listings efficiently', async () => {
      // Create mock response with many files
      const manyFiles = Array.from({ length: 100 }, (_, i) => ({
        name: `file-${i}.txt`,
        path: `/test/project/path/file-${i}.txt`,
        entryType: 'file',
        size: 1024,
        modified: '2024-09-25T10:00:00Z'
      }))

      const largeResponse = {
        projectId: 'proj_large',
        projectName: 'Large Project',
        sourceFolder: '/test/project/path',
        currentPath: '/test/project/path',
        directoryListing: {
          entries: manyFiles,
          canNavigateUp: false,
          isRoot: true,
          parentPath: null
        }
      }

      mockInvoke.mockResolvedValueOnce(largeResponse)

      const { result } = renderHook(() => useWorkspaceStore())

      const startTime = performance.now()

      await act(async () => {
        await result.current.loadProject('proj_large')
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should handle large datasets within reasonable time
      expect(duration).toBeLessThan(100) // 100ms for store operations
      expect(result.current.fileExplorerItems).toHaveLength(100)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('navigation history integration', () => {
    it('should track navigation history with real paths', async () => {
      useWorkspaceStore.setState({
        currentProject: { id: 'proj_123', name: 'Test Project' } as any,
        currentPath: '/test/project/path',
        navigationHistory: []
      })

      // Mock navigation responses
      mockInvoke
        .mockResolvedValueOnce({
          projectId: 'proj_123',
          projectName: 'Test Project',
          sourceFolder: '/test/project/path',
          currentPath: '/test/project/path/src',
          directoryListing: { entries: [], canNavigateUp: true, isRoot: false, parentPath: '/test/project/path' }
        })
        .mockResolvedValueOnce({
          projectId: 'proj_123',
          projectName: 'Test Project',
          sourceFolder: '/test/project/path',
          currentPath: '/test/project/path/src/components',
          directoryListing: { entries: [], canNavigateUp: true, isRoot: false, parentPath: '/test/project/path/src' }
        })

      const { result } = renderHook(() => useWorkspaceStore())

      // Navigate to src
      await act(async () => {
        await result.current.navigateToFolder('src')
      })

      // Navigate to components
      await act(async () => {
        await result.current.navigateToFolder('components')
      })

      // Should have navigation history
      expect(result.current.navigationHistory).toHaveLength(2)
      expect(result.current.navigationHistory[0].path).toBe('/test/project/path/src')
      expect(result.current.navigationHistory[1].path).toBe('/test/project/path/src/components')
    })
  })
})