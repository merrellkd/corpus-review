import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnifiedPanelState, usePanelStateMachine, usePanelStateMachineWithOptions } from '../../src/stores/ui'

describe('Unified Panel State Machine (T034a)', () => {
  beforeEach(() => {
    // Reset store state between tests
    vi.clearAllMocks()

    // Reset Zustand store to initial state
    useUnifiedPanelState.setState({
      currentState: 'none',
      lastValidFilesCategories: {
        fileExplorerVisible: true,
        categoryExplorerVisible: false
      },
      timestamp: Date.now(),
      isFilesCategoriesPanelActive: false,
      isSearchPanelActive: false,
      isDragDropAvailable: false,
      fileExplorerVisible: false,
      categoryExplorerVisible: false,
    })
  })

  describe('State Machine Definition', () => {
    it('should initialize with none state and default lastValidState', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      expect(result.current.currentState).toBe('none')
      expect(result.current.lastValidFilesCategories).toEqual({
        fileExplorerVisible: true,
        categoryExplorerVisible: false
      })
    })

    it('should support all 5 defined states', () => {
      const validStates = ['none', 'files-only', 'categories-only', 'files-and-categories', 'search']
      const { result } = renderHook(() => useUnifiedPanelState())

      validStates.forEach(state => {
        act(() => {
          result.current.setState(state as any)
        })
        expect(result.current.currentState).toBe(state)
      })
    })
  })

  describe('Files & Categories Button Toggle Logic', () => {
    it('should restore to lastValidState when toggling from none to Files & Categories', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Set a specific lastValidState
      act(() => {
        result.current.setLastValidState({
          fileExplorerVisible: false,
          categoryExplorerVisible: true
        })
      })

      // Toggle Files & Categories from none
      act(() => {
        result.current.toggleFilesCategories()
      })

      expect(result.current.currentState).toBe('categories-only')
    })

    it('should default to files-only when no previous lastValidState exists', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Ensure we start from none with default lastValidState
      expect(result.current.currentState).toBe('none')

      act(() => {
        result.current.toggleFilesCategories()
      })

      expect(result.current.currentState).toBe('files-only')
    })

    it('should save current state as lastValidState when toggling off', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Set to files-and-categories state
      act(() => {
        result.current.setState('files-and-categories')
      })

      // Toggle off
      act(() => {
        result.current.toggleFilesCategories()
      })

      expect(result.current.currentState).toBe('none')
      expect(result.current.lastValidFilesCategories).toEqual({
        fileExplorerVisible: true,
        categoryExplorerVisible: true
      })
    })
  })

  describe('Search Button Toggle Logic', () => {
    it('should transition to search state from any Files & Categories state', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Start from files-and-categories
      act(() => {
        result.current.setState('files-and-categories')
      })

      act(() => {
        result.current.toggleSearch()
      })

      expect(result.current.currentState).toBe('search')
    })

    it('should save Files & Categories state when switching to search', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Set to categories-only
      act(() => {
        result.current.setState('categories-only')
      })

      act(() => {
        result.current.toggleSearch()
      })

      expect(result.current.currentState).toBe('search')
      expect(result.current.lastValidFilesCategories).toEqual({
        fileExplorerVisible: false,
        categoryExplorerVisible: true
      })
    })

    it('should toggle off to none when already in search state', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Set to search state
      act(() => {
        result.current.setState('search')
      })

      act(() => {
        result.current.toggleSearch()
      })

      expect(result.current.currentState).toBe('none')
    })
  })

  describe('Section Toggle Logic (Internal to Files & Categories)', () => {
    it('should transition files-only to files-and-categories when toggling Category Explorer on', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-only')
      })

      act(() => {
        result.current.toggleCategoryExplorer()
      })

      expect(result.current.currentState).toBe('files-and-categories')
    })

    it('should transition categories-only to files-and-categories when toggling File Explorer on', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('categories-only')
      })

      act(() => {
        result.current.toggleFileExplorer()
      })

      expect(result.current.currentState).toBe('files-and-categories')
    })

    it('should transition files-and-categories to categories-only when toggling File Explorer off', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-and-categories')
      })

      act(() => {
        result.current.toggleFileExplorer()
      })

      expect(result.current.currentState).toBe('categories-only')
    })

    it('should transition files-and-categories to files-only when toggling Category Explorer off', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-and-categories')
      })

      act(() => {
        result.current.toggleCategoryExplorer()
      })

      expect(result.current.currentState).toBe('files-only')
    })
  })

  describe('Auto-Close Logic (Preventing Dead States)', () => {
    it('should auto-close to none when toggling off File Explorer in files-only state', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-only')
      })

      act(() => {
        result.current.toggleFileExplorer()
      })

      expect(result.current.currentState).toBe('none')
    })

    it('should auto-close to none when toggling off Category Explorer in categories-only state', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('categories-only')
      })

      act(() => {
        result.current.toggleCategoryExplorer()
      })

      expect(result.current.currentState).toBe('none')
    })

    it('should save lastValidState when auto-closing', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-only')
      })

      act(() => {
        result.current.toggleFileExplorer()
      })

      expect(result.current.currentState).toBe('none')
      expect(result.current.lastValidFilesCategories).toEqual({
        fileExplorerVisible: true,
        categoryExplorerVisible: false
      })
    })
  })

  describe('Computed Properties', () => {
    it('should correctly compute isFilesCategoriesPanelActive', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Test for none and search states
      act(() => {
        result.current.setState('none')
      })
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)

      act(() => {
        result.current.setState('search')
      })
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)

      // Test for Files & Categories states
      const filesCategoriesStates = ['files-only', 'categories-only', 'files-and-categories']
      filesCategoriesStates.forEach(state => {
        act(() => {
          result.current.setState(state as any)
        })
        expect(result.current.isFilesCategoriesPanelActive).toBe(true)
      })
    })

    it('should correctly compute isSearchPanelActive', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Test for non-search states
      const nonSearchStates = ['none', 'files-only', 'categories-only', 'files-and-categories']
      nonSearchStates.forEach(state => {
        act(() => {
          result.current.setState(state as any)
        })
        expect(result.current.isSearchPanelActive).toBe(false)
      })

      // Test for search state
      act(() => {
        result.current.setState('search')
      })
      expect(result.current.isSearchPanelActive).toBe(true)
    })

    it('should correctly compute isDragDropAvailable', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Should only be true for files-and-categories state
      const states = ['none', 'files-only', 'categories-only', 'search']
      states.forEach(state => {
        act(() => {
          result.current.setState(state as any)
        })
        expect(result.current.isDragDropAvailable).toBe(false)
      })

      act(() => {
        result.current.setState('files-and-categories')
      })
      expect(result.current.isDragDropAvailable).toBe(true)
    })

    it('should correctly compute section visibility', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Test files-only
      act(() => {
        result.current.setState('files-only')
      })
      expect(result.current.fileExplorerVisible).toBe(true)
      expect(result.current.categoryExplorerVisible).toBe(false)

      // Test categories-only
      act(() => {
        result.current.setState('categories-only')
      })
      expect(result.current.fileExplorerVisible).toBe(false)
      expect(result.current.categoryExplorerVisible).toBe(true)

      // Test files-and-categories
      act(() => {
        result.current.setState('files-and-categories')
      })
      expect(result.current.fileExplorerVisible).toBe(true)
      expect(result.current.categoryExplorerVisible).toBe(true)

      // Test none and search
      act(() => {
        result.current.setState('none')
      })
      expect(result.current.fileExplorerVisible).toBe(false)
      expect(result.current.categoryExplorerVisible).toBe(false)

      act(() => {
        result.current.setState('search')
      })
      expect(result.current.fileExplorerVisible).toBe(false)
      expect(result.current.categoryExplorerVisible).toBe(false)
    })
  })

  describe('Edge Cases and Rapid Interactions', () => {
    it('should handle rapid button clicking without state inconsistencies', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Rapid toggling should not cause issues
      act(() => {
        result.current.toggleFilesCategories()
        result.current.toggleFilesCategories()
        result.current.toggleFilesCategories()
      })

      // Should end up in a consistent state
      expect(['none', 'files-only'].includes(result.current.currentState)).toBe(true)
    })

    it('should handle rapid section toggling', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      act(() => {
        result.current.setState('files-and-categories')
      })

      act(() => {
        result.current.toggleFileExplorer()
        result.current.toggleCategoryExplorer()
      })

      // Should end up in none state (both sections turned off)
      expect(result.current.currentState).toBe('none')
    })

    it('should handle invalid state transitions gracefully', () => {
      const { result } = renderHook(() => useUnifiedPanelState())

      // Attempt to set invalid state
      act(() => {
        result.current.setState('invalid-state' as any)
      })

      // Should remain in valid state
      expect(['none', 'files-only', 'categories-only', 'files-and-categories', 'search'].includes(result.current.currentState)).toBe(true)
    })
  })

  describe('State Persistence', () => {
    it('should call persistence callback on state changes', () => {
      const onStateChange = vi.fn()
      const { result } = renderHook(() =>
        createUnifiedPanelState({ onStateChange })
      )

      act(() => {
        result.current.toggleFilesCategories()
      })

      expect(onStateChange).toHaveBeenCalledWith({
        currentState: 'files-only',
        lastValidFilesCategories: {
          fileExplorerVisible: true,
          categoryExplorerVisible: false
        },
        timestamp: expect.any(Number)
      })
    })

    it('should restore state from initial options', () => {
      const initialState = {
        currentState: 'categories-only' as const,
        lastValidFilesCategories: {
          fileExplorerVisible: false,
          categoryExplorerVisible: true
        }
      }

      const { result } = renderHook(() =>
        useUnifiedPanelStateWithOptions({ initialState })
      )

      expect(result.current.currentState).toBe('categories-only')
      expect(result.current.lastValidFilesCategories).toEqual({
        fileExplorerVisible: false,
        categoryExplorerVisible: true
      })
    })
  })
})