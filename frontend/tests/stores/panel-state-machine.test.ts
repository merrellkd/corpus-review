import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePanelStateMachine, usePanelStateMachineWithOptions } from '../../src/stores/panelStateMachine'

describe('Panel State Machine', () => {
  describe('Mutually Exclusive Panel Logic', () => {
    it('should initialize with no panel active by default', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      expect(result.current.activePanel).toBe('none')
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)
      expect(result.current.isSearchPanelActive).toBe(false)
    })

    it('should activate Files & Categories panel when toggled from none', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      expect(result.current.activePanel).toBe('files_categories')
      expect(result.current.isFilesCategoriesPanelActive).toBe(true)
      expect(result.current.isSearchPanelActive).toBe(false)
    })

    it('should activate Search panel when toggled from none', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      act(() => {
        result.current.toggleSearchPanel()
      })

      expect(result.current.activePanel).toBe('search')
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)
      expect(result.current.isSearchPanelActive).toBe(true)
    })

    it('should switch from Files & Categories to Search panel (mutually exclusive)', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      // First activate Files & Categories
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })
      expect(result.current.activePanel).toBe('files_categories')

      // Then activate Search - should switch panels
      act(() => {
        result.current.toggleSearchPanel()
      })

      expect(result.current.activePanel).toBe('search')
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)
      expect(result.current.isSearchPanelActive).toBe(true)
    })

    it('should switch from Search to Files & Categories panel (mutually exclusive)', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      // First activate Search
      act(() => {
        result.current.toggleSearchPanel()
      })
      expect(result.current.activePanel).toBe('search')

      // Then activate Files & Categories - should switch panels
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      expect(result.current.activePanel).toBe('files_categories')
      expect(result.current.isFilesCategoriesPanelActive).toBe(true)
      expect(result.current.isSearchPanelActive).toBe(false)
    })

    it('should deactivate panel when same panel toggled again', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      // Activate Files & Categories
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })
      expect(result.current.activePanel).toBe('files_categories')

      // Toggle same panel again - should deactivate
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      expect(result.current.activePanel).toBe('none')
      expect(result.current.isFilesCategoriesPanelActive).toBe(false)
      expect(result.current.isSearchPanelActive).toBe(false)
    })

    it('should provide layout mode based on active panel', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      // No panel active
      expect(result.current.layoutMode).toBe('full-width')

      // Files & Categories active
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })
      expect(result.current.layoutMode).toBe('two-column')

      // Search active
      act(() => {
        result.current.toggleSearchPanel()
      })
      expect(result.current.layoutMode).toBe('two-column')

      // Back to none
      act(() => {
        result.current.toggleSearchPanel()
      })
      expect(result.current.layoutMode).toBe('full-width')
    })

    it('should track state transitions for debugging', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      const transitions: string[] = []
      result.current.onStateChange = (from, to) => {
        transitions.push(`${from} -> ${to}`)
      }

      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      act(() => {
        result.current.toggleSearchPanel()
      })

      act(() => {
        result.current.toggleSearchPanel()
      })

      expect(transitions).toEqual([
        'none -> files_categories',
        'files_categories -> search',
        'search -> none'
      ])
    })
  })

  describe('Panel State Persistence', () => {
    it('should persist panel state to backend when changed', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      const persistCalls: any[] = []
      result.current.onPersistState = (state) => {
        persistCalls.push(state)
      }

      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      expect(persistCalls).toHaveLength(1)
      expect(persistCalls[0]).toEqual({
        activePanel: 'files_categories',
        timestamp: expect.any(Number)
      })
    })

    it('should restore panel state from backend on initialization', async () => {
      const mockStoredState = {
        activePanel: 'search' as const,
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: false
      }

      const { result } = renderHook(() =>
        usePanelStateMachineWithOptions({ initialState: mockStoredState })
      )

      expect(result.current.activePanel).toBe('search')
      expect(result.current.isSearchPanelActive).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid state transitions gracefully', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      // Try to force invalid state
      act(() => {
        // @ts-expect-error - testing invalid state
        result.current.forceState('invalid_panel')
      })

      // Should remain in valid state
      expect(result.current.activePanel).toBe('none')
    })

    it('should recover from persistence errors', () => {
      const { result } = renderHook(() => usePanelStateMachine())

      let shouldFail = true
      result.current.onPersistState = () => {
        if (shouldFail) {
          throw new Error('Backend unavailable')
        }
      }

      // First toggle should fail to persist but state should still update
      act(() => {
        result.current.toggleFilesCategoriesPanel()
      })

      expect(result.current.activePanel).toBe('files_categories')
      expect(result.current.hasUnsyncedChanges).toBe(true)

      // Second toggle should succeed
      shouldFail = false
      act(() => {
        result.current.retryPersistence()
      })

      expect(result.current.hasUnsyncedChanges).toBe(false)
    })
  })
})