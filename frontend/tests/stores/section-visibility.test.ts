import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSectionVisibility, useSectionVisibilityWithOptions } from '../../src/stores/sectionVisibilityStore'

describe('Section Visibility Management', () => {
  describe('Independent Section Control within Files & Categories Panel', () => {
    it('should initialize with both sections visible by default', () => {
      const { result } = renderHook(() => useSectionVisibility())

      expect(result.current.fileExplorerSectionVisible).toBe(true)
      expect(result.current.categoryExplorerSectionVisible).toBe(true)
      expect(result.current.shouldShowPanel).toBe(true)
    })

    it('should toggle File Explorer section independently', () => {
      const { result } = renderHook(() => useSectionVisibility())

      act(() => {
        result.current.toggleFileExplorerSection()
      })

      expect(result.current.fileExplorerSectionVisible).toBe(false)
      expect(result.current.categoryExplorerSectionVisible).toBe(true)
      expect(result.current.shouldShowPanel).toBe(true) // Panel stays visible
    })

    it('should toggle Category Explorer section independently', () => {
      const { result } = renderHook(() => useSectionVisibility())

      act(() => {
        result.current.toggleCategoryExplorerSection()
      })

      expect(result.current.fileExplorerSectionVisible).toBe(true)
      expect(result.current.categoryExplorerSectionVisible).toBe(false)
      expect(result.current.shouldShowPanel).toBe(true) // Panel stays visible
    })

    it('should hide panel when both sections are hidden', () => {
      const { result } = renderHook(() => useSectionVisibility())

      // Hide both sections
      act(() => {
        result.current.toggleFileExplorerSection()
      })
      act(() => {
        result.current.toggleCategoryExplorerSection()
      })

      expect(result.current.fileExplorerSectionVisible).toBe(false)
      expect(result.current.categoryExplorerSectionVisible).toBe(false)
      expect(result.current.shouldShowPanel).toBe(false) // Panel should auto-hide
    })

    it('should show panel when any section becomes visible', () => {
      const { result } = renderHook(() => useSectionVisibility())

      // Hide both sections first
      act(() => {
        result.current.hideAllSections()
      })
      expect(result.current.shouldShowPanel).toBe(false)

      // Show File Explorer section
      act(() => {
        result.current.toggleFileExplorerSection()
      })

      expect(result.current.fileExplorerSectionVisible).toBe(true)
      expect(result.current.categoryExplorerSectionVisible).toBe(false)
      expect(result.current.shouldShowPanel).toBe(true) // Panel should reappear
    })
  })

  describe('Drag-and-Drop Availability', () => {
    it('should enable drag-and-drop when both sections are visible', () => {
      const { result } = renderHook(() => useSectionVisibility())

      expect(result.current.isDragDropAvailable).toBe(true)
    })

    it('should disable drag-and-drop when File Explorer section is hidden', () => {
      const { result } = renderHook(() => useSectionVisibility())

      act(() => {
        result.current.toggleFileExplorerSection()
      })

      expect(result.current.isDragDropAvailable).toBe(false)
    })

    it('should disable drag-and-drop when Category Explorer section is hidden', () => {
      const { result } = renderHook(() => useSectionVisibility())

      act(() => {
        result.current.toggleCategoryExplorerSection()
      })

      expect(result.current.isDragDropAvailable).toBe(false)
    })

    it('should provide drag-drop status message', () => {
      const { result } = renderHook(() => useSectionVisibility())

      // Both visible
      expect(result.current.dragDropStatusMessage).toBe(
        'Drag files from File Explorer to Category Explorer to assign categories'
      )

      // File Explorer hidden
      act(() => {
        result.current.toggleFileExplorerSection()
      })
      expect(result.current.dragDropStatusMessage).toBe(
        'Show File Explorer section to enable file categorization'
      )

      // Category Explorer hidden (File Explorer still hidden)
      act(() => {
        result.current.toggleFileExplorerSection() // Show File Explorer
        result.current.toggleCategoryExplorerSection() // Hide Category Explorer
      })
      expect(result.current.dragDropStatusMessage).toBe(
        'Show Category Explorer section to enable file categorization'
      )
    })
  })

  describe('Section Layout Configuration', () => {
    it('should calculate section heights based on visibility', () => {
      const { result } = renderHook(() => useSectionVisibility())

      // Both visible - equal split
      expect(result.current.sectionLayout).toEqual({
        fileExplorerHeight: 50,
        categoryExplorerHeight: 50,
        layout: 'split'
      })

      // Only File Explorer visible
      act(() => {
        result.current.toggleCategoryExplorerSection()
      })
      expect(result.current.sectionLayout).toEqual({
        fileExplorerHeight: 100,
        categoryExplorerHeight: 0,
        layout: 'file-only'
      })

      // Only Category Explorer visible
      act(() => {
        result.current.toggleFileExplorerSection() // Hide File Explorer
        result.current.toggleCategoryExplorerSection() // Show Category Explorer
      })
      expect(result.current.sectionLayout).toEqual({
        fileExplorerHeight: 0,
        categoryExplorerHeight: 100,
        layout: 'category-only'
      })
    })

    it('should support custom section height ratios', () => {
      const { result } = renderHook(() =>
        useSectionVisibilityWithOptions({
          initialRatio: { fileExplorer: 70, categoryExplorer: 30 }
        })
      )

      expect(result.current.sectionLayout).toEqual({
        fileExplorerHeight: 70,
        categoryExplorerHeight: 30,
        layout: 'split'
      })
    })

    it('should resize sections proportionally', () => {
      const { result } = renderHook(() => useSectionVisibility())

      act(() => {
        result.current.resizeSections({ fileExplorerHeight: 75 })
      })

      expect(result.current.sectionLayout).toEqual({
        fileExplorerHeight: 75,
        categoryExplorerHeight: 25,
        layout: 'split'
      })
    })
  })

  describe('State Persistence', () => {
    it('should persist section visibility changes', () => {
      const { result } = renderHook(() => useSectionVisibility())

      const persistCalls: any[] = []
      result.current.onSectionChange = (state) => {
        persistCalls.push(state)
      }

      act(() => {
        result.current.toggleFileExplorerSection()
      })

      expect(persistCalls).toHaveLength(1)
      expect(persistCalls[0]).toEqual({
        fileExplorerSectionVisible: false,
        categoryExplorerSectionVisible: true,
        sectionHeights: { fileExplorer: 50, categoryExplorer: 50 }
      })
    })

    it('should restore section state from stored configuration', () => {
      const storedState = {
        fileExplorerSectionVisible: false,
        categoryExplorerSectionVisible: true,
        sectionHeights: { fileExplorer: 60, categoryExplorer: 40 }
      }

      const { result } = renderHook(() =>
        useSectionVisibilityWithOptions({ initialState: storedState })
      )

      expect(result.current.fileExplorerSectionVisible).toBe(false)
      expect(result.current.categoryExplorerSectionVisible).toBe(true)
      expect(result.current.sectionLayout.fileExplorerHeight).toBe(0) // Hidden overrides height
      expect(result.current.sectionLayout.categoryExplorerHeight).toBe(100)
    })
  })

  describe('Auto-Hide Integration', () => {
    it('should trigger panel auto-hide callback when both sections hidden', () => {
      const autoHideCalls: boolean[] = []
      const { result } = renderHook(() =>
        useSectionVisibilityWithOptions({
          onAutoHidePanel: (shouldHide) => autoHideCalls.push(shouldHide)
        })
      )

      // Hide both sections
      act(() => {
        result.current.hideAllSections()
      })

      expect(autoHideCalls).toContain(true)

      // Show a section
      act(() => {
        result.current.toggleFileExplorerSection()
      })

      expect(autoHideCalls).toContain(false)
    })

    it('should handle rapid section toggling without excessive callbacks', () => {
      const autoHideCalls: boolean[] = []
      const { result } = renderHook(() =>
        useSectionVisibilityWithOptions({
          onAutoHidePanel: (shouldHide) => autoHideCalls.push(shouldHide)
        })
      )

      // Rapid toggling
      act(() => {
        result.current.toggleFileExplorerSection() // false, true -> no auto-hide
        result.current.toggleCategoryExplorerSection() // false, false -> auto-hide
        result.current.toggleFileExplorerSection() // true, false -> no auto-hide
      })

      // Should only trigger auto-hide once
      expect(autoHideCalls.filter(Boolean)).toHaveLength(1)
    })
  })
})