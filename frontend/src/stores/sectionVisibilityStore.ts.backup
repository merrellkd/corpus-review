import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types for section visibility
export type LayoutType = 'split' | 'file-only' | 'category-only'

interface SectionLayout {
  fileExplorerHeight: number
  categoryExplorerHeight: number
  layout: LayoutType
}

interface SectionHeights {
  fileExplorer: number
  categoryExplorer: number
}

interface SectionVisibilityState {
  // Core visibility state
  fileExplorerSectionVisible: boolean
  categoryExplorerSectionVisible: boolean

  // Section heights
  sectionHeights: SectionHeights

  // Computed properties
  shouldShowPanel?: boolean
  isDragDropAvailable?: boolean
  dragDropStatusMessage?: string
  sectionLayout?: SectionLayout

  // Actions
  toggleFileExplorerSection: () => void
  toggleCategoryExplorerSection: () => void
  hideAllSections: () => void
  resizeSections: (heights: Partial<SectionHeights>) => void

  // Callbacks
  onSectionChange?: (state: {
    fileExplorerSectionVisible: boolean
    categoryExplorerSectionVisible: boolean
    sectionHeights: SectionHeights
  }) => void
  onAutoHidePanel?: (shouldHide: boolean) => void
}

interface SectionVisibilityOptions {
  initialState?: {
    fileExplorerSectionVisible?: boolean
    categoryExplorerSectionVisible?: boolean
    sectionHeights?: SectionHeights
  }
  initialRatio?: SectionHeights
  onAutoHidePanel?: (shouldHide: boolean) => void
}

const computeComputedProperties = (state: Partial<SectionVisibilityState>): Partial<SectionVisibilityState> => {
  const shouldShowPanel: boolean = !!(state.fileExplorerSectionVisible || state.categoryExplorerSectionVisible)
  const isDragDropAvailable: boolean = !!(state.fileExplorerSectionVisible && state.categoryExplorerSectionVisible)

  let dragDropStatusMessage = ''
  if (isDragDropAvailable) {
    dragDropStatusMessage = 'Drag files from File Explorer to Category Explorer to assign categories'
  } else if (!state.fileExplorerSectionVisible) {
    dragDropStatusMessage = 'Show File Explorer section to enable file categorization'
  } else if (!state.categoryExplorerSectionVisible) {
    dragDropStatusMessage = 'Show Category Explorer section to enable file categorization'
  } else {
    dragDropStatusMessage = 'Both sections must be visible for file categorization'
  }

  let sectionLayout: SectionLayout
  if (!state.fileExplorerSectionVisible && !state.categoryExplorerSectionVisible) {
    sectionLayout = {
      fileExplorerHeight: 0,
      categoryExplorerHeight: 0,
      layout: 'split'
    }
  } else if (!state.fileExplorerSectionVisible) {
    sectionLayout = {
      fileExplorerHeight: 0,
      categoryExplorerHeight: 100,
      layout: 'category-only'
    }
  } else if (!state.categoryExplorerSectionVisible) {
    sectionLayout = {
      fileExplorerHeight: 100,
      categoryExplorerHeight: 0,
      layout: 'file-only'
    }
  } else {
    sectionLayout = {
      fileExplorerHeight: state.sectionHeights?.fileExplorer || 50,
      categoryExplorerHeight: state.sectionHeights?.categoryExplorer || 50,
      layout: 'split'
    }
  }

  return {
    shouldShowPanel,
    isDragDropAvailable,
    dragDropStatusMessage,
    sectionLayout
  }
}

const useSectionVisibilityBase = create<SectionVisibilityState>()(
  devtools(
    (set, get) => {
      const initialState = {
        fileExplorerSectionVisible: true,
        categoryExplorerSectionVisible: true,
        sectionHeights: { fileExplorer: 50, categoryExplorer: 50 }
      }

      const computedProps = computeComputedProperties(initialState)

      return {
        // Initial state
        ...initialState,
        ...computedProps,

        // Actions
        toggleFileExplorerSection: () => {
          const current = get()
          const newVisible = !current.fileExplorerSectionVisible
          const newState = {
            ...current,
            fileExplorerSectionVisible: newVisible
          }
          const computedProps = computeComputedProperties(newState)

          set({ ...newState, ...computedProps })

          // Check if panel should auto-hide
          const shouldShow = newVisible || current.categoryExplorerSectionVisible
          if (!shouldShow) {
            current.onAutoHidePanel?.(true)
          } else if (!current.shouldShowPanel && shouldShow) {
            current.onAutoHidePanel?.(false)
          }

          // Persist changes
          current.onSectionChange?.({
            fileExplorerSectionVisible: newVisible,
            categoryExplorerSectionVisible: current.categoryExplorerSectionVisible,
            sectionHeights: current.sectionHeights
          })
        },

        toggleCategoryExplorerSection: () => {
          const current = get()
          const newVisible = !current.categoryExplorerSectionVisible
          const newState = {
            ...current,
            categoryExplorerSectionVisible: newVisible
          }
          const computedProps = computeComputedProperties(newState)

          set({ ...newState, ...computedProps })

          // Check if panel should auto-hide
          const shouldShow = newVisible || current.fileExplorerSectionVisible
          if (!shouldShow) {
            current.onAutoHidePanel?.(true)
          } else if (!current.shouldShowPanel && shouldShow) {
            current.onAutoHidePanel?.(false)
          }

          // Persist changes
          current.onSectionChange?.({
            fileExplorerSectionVisible: current.fileExplorerSectionVisible,
            categoryExplorerSectionVisible: newVisible,
            sectionHeights: current.sectionHeights
          })
        },

        hideAllSections: () => {
          const current = get()
          const newState = {
            ...current,
            fileExplorerSectionVisible: false,
            categoryExplorerSectionVisible: false
          }
          const computedProps = computeComputedProperties(newState)

          set({ ...newState, ...computedProps })

          current.onAutoHidePanel?.(true)

          current.onSectionChange?.({
            fileExplorerSectionVisible: false,
            categoryExplorerSectionVisible: false,
            sectionHeights: current.sectionHeights
          })
        },

        resizeSections: (heights: Partial<SectionHeights>) => {
          const current = get()
          const newHeights = { ...current.sectionHeights, ...heights }

          // Ensure heights sum to 100
          if (heights.fileExplorer !== undefined) {
            newHeights.categoryExplorer = 100 - newHeights.fileExplorer
          }

          const newState = {
            ...current,
            sectionHeights: newHeights
          }
          const computedProps = computeComputedProperties(newState)

          set({ ...newState, ...computedProps })

          current.onSectionChange?.({
            fileExplorerSectionVisible: current.fileExplorerSectionVisible,
            categoryExplorerSectionVisible: current.categoryExplorerSectionVisible,
            sectionHeights: newHeights
          })
        }
      }
    },
    {
      name: 'section-visibility'
    })
  )

// Default hook without options
export const useSectionVisibility = (options?: SectionVisibilityOptions) => {
  if (options) {
    return useSectionVisibilityWithOptions(options)
  }
  return useSectionVisibilityBase()
}

// Hook factory with options
export const useSectionVisibilityWithOptions = (options?: SectionVisibilityOptions) => {
  const store = useSectionVisibilityBase()

  // Initialize with options
  React.useEffect(() => {
    if (options?.initialState) {
      const updates: Partial<SectionVisibilityState> = {}

      if (options.initialState.fileExplorerSectionVisible !== undefined) {
        updates.fileExplorerSectionVisible = options.initialState.fileExplorerSectionVisible
      }

      if (options.initialState.categoryExplorerSectionVisible !== undefined) {
        updates.categoryExplorerSectionVisible = options.initialState.categoryExplorerSectionVisible
      }

      if (options.initialState.sectionHeights) {
        updates.sectionHeights = options.initialState.sectionHeights
      }

      if (Object.keys(updates).length > 0) {
        useSectionVisibilityBase.setState(updates)
      }
    }

    if (options?.initialRatio) {
      useSectionVisibilityBase.setState({ sectionHeights: options.initialRatio })
    }

    if (options?.onAutoHidePanel) {
      useSectionVisibilityBase.setState({ onAutoHidePanel: options.onAutoHidePanel })
    }
  }, [])

  return store
}

// Standalone hook factory for external consumption
export const createSectionVisibilityHook = (options?: SectionVisibilityOptions) => {
  return () => useSectionVisibilityWithOptions(options)
}

// Export store instance
export const sectionVisibilityStore = useSectionVisibilityBase