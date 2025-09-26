import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUiStore } from '../../src/stores/ui-store'

const resetUiStore = () => {
  useUiStore.setState({
    filesPanelOpen: true,
    categoriesPanelOpen: false,
    searchPanelOpen: false,
    lastFilesCategories: { filesPanelOpen: true, categoriesPanelOpen: false },
    workspaceLayout: { explorerWidth: 30, workspaceWidth: 70 },
  })
}

describe('UI Store Panel State (Phase 1)', () => {
  beforeEach(() => {
    resetUiStore()
  })

  it('initializes with files panel open and categories closed', () => {
    const { result } = renderHook(() => useUiStore())

    expect(result.current.filesPanelOpen).toBe(true)
    expect(result.current.categoriesPanelOpen).toBe(false)
    expect(result.current.searchPanelOpen).toBe(false)
    expect(result.current.workspaceLayout).toEqual({ explorerWidth: 30, workspaceWidth: 70 })
  })

  it('toggles files & categories panels off and restores last combination', () => {
    const { result } = renderHook(() => useUiStore())

    act(() => {
      result.current.toggleCategoryExplorer()
    })

    act(() => {
      result.current.toggleFilesCategories()
    })

    expect(result.current.filesPanelOpen).toBe(false)
    expect(result.current.categoriesPanelOpen).toBe(false)

    act(() => {
      result.current.toggleFilesCategories()
    })

    expect(result.current.filesPanelOpen).toBe(true)
    expect(result.current.categoriesPanelOpen).toBe(true)
  })

  it('activates search panel and restores previous panels when toggled off', () => {
    const { result } = renderHook(() => useUiStore())

    act(() => {
      result.current.toggleCategoryExplorer()
    })

    act(() => {
      result.current.toggleSearchPanel()
    })

    expect(result.current.searchPanelOpen).toBe(true)
    expect(result.current.filesPanelOpen).toBe(false)
    expect(result.current.categoriesPanelOpen).toBe(false)

    act(() => {
      result.current.toggleSearchPanel()
    })

    expect(result.current.searchPanelOpen).toBe(false)
    expect(result.current.filesPanelOpen).toBe(true)
    expect(result.current.categoriesPanelOpen).toBe(true)
  })

  it('toggleFileExplorer only affects file panel and clears search', () => {
    const { result } = renderHook(() => useUiStore())

    act(() => {
      result.current.toggleSearchPanel()
    })

    act(() => {
      result.current.toggleFileExplorer()
    })

    expect(result.current.searchPanelOpen).toBe(false)
    expect(result.current.filesPanelOpen).toBe(true)
  })

  it('setExplorerWidth updates layout ratios', () => {
    const { result } = renderHook(() => useUiStore())

    act(() => {
      result.current.setExplorerWidth(40)
    })

    expect(result.current.workspaceLayout).toEqual({ explorerWidth: 40, workspaceWidth: 60 })
  })
})
