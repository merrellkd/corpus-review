import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Unified Panel State Types
export type PanelStateType = 'none' | 'files-only' | 'categories-only' | 'files-and-categories' | 'search'

export interface LastValidState {
  fileExplorerVisible: boolean
  categoryExplorerVisible: boolean
}

export interface UnifiedPanelState {
  // Core state
  currentState: PanelStateType
  lastValidFilesCategories: LastValidState
  timestamp: number

  // Computed properties
  isFilesCategoriesPanelActive: boolean
  isSearchPanelActive: boolean
  isDragDropAvailable: boolean
  fileExplorerVisible: boolean
  categoryExplorerVisible: boolean

  // Actions
  setState: (state: PanelStateType) => void
  setLastValidState: (state: LastValidState) => void
  toggleFilesCategories: () => void
  toggleSearch: () => void
  toggleFileExplorer: () => void
  toggleCategoryExplorer: () => void

  // Callbacks
  onStateChange?: (state: { currentState: PanelStateType; lastValidFilesCategories: LastValidState; timestamp: number }) => void
}

export interface UnifiedPanelStateOptions {
  initialState?: {
    currentState?: PanelStateType
    lastValidFilesCategories?: LastValidState
  }
  onStateChange?: (state: { currentState: PanelStateType; lastValidFilesCategories: LastValidState; timestamp: number }) => void
}

// Helper function to compute properties from state
const computePropertiesFromState = (currentState: PanelStateType) => {
  const isFilesCategoriesPanelActive = ['files-only', 'categories-only', 'files-and-categories'].includes(currentState)
  const isSearchPanelActive = currentState === 'search'
  const isDragDropAvailable = currentState === 'files-and-categories'

  const fileExplorerVisible = ['files-only', 'files-and-categories'].includes(currentState)
  const categoryExplorerVisible = ['categories-only', 'files-and-categories'].includes(currentState)

  return {
    isFilesCategoriesPanelActive,
    isSearchPanelActive,
    isDragDropAvailable,
    fileExplorerVisible,
    categoryExplorerVisible
  }
}

// Helper function to determine state from section visibility
const stateFromSectionVisibility = (fileExplorerVisible: boolean, categoryExplorerVisible: boolean): PanelStateType => {
  if (fileExplorerVisible && categoryExplorerVisible) return 'files-and-categories'
  if (fileExplorerVisible && !categoryExplorerVisible) return 'files-only'
  if (!fileExplorerVisible && categoryExplorerVisible) return 'categories-only'
  return 'none' // Both false
}

// Main store implementation
export const useUnifiedPanelState = create<UnifiedPanelState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentState: 'none',
      lastValidFilesCategories: {
        fileExplorerVisible: true,
        categoryExplorerVisible: false
      },
      timestamp: Date.now(),
      ...computePropertiesFromState('none'),

      // Actions
      setState: (newState: PanelStateType) => {
        // Validate state
        const validStates: PanelStateType[] = ['none', 'files-only', 'categories-only', 'files-and-categories', 'search']
        if (!validStates.includes(newState)) {
          console.warn(`Invalid panel state: ${newState}`)
          return
        }

        const timestamp = Date.now()
        const computedProps = computePropertiesFromState(newState)

        set({
          currentState: newState,
          timestamp,
          ...computedProps
        })

        // Call persistence callback
        const current = get()
        current.onStateChange?.({
          currentState: newState,
          lastValidFilesCategories: current.lastValidFilesCategories,
          timestamp
        })
      },

      setLastValidState: (newLastValidState: LastValidState) => {
        set({ lastValidFilesCategories: newLastValidState })
      },

      toggleFilesCategories: () => {
        const current = get()

        if (current.currentState === 'search' || current.currentState === 'none') {
          // Restore to last valid Files & Categories state
          const targetState = stateFromSectionVisibility(
            current.lastValidFilesCategories.fileExplorerVisible,
            current.lastValidFilesCategories.categoryExplorerVisible
          )

          // If lastValidState would result in 'none', default to 'files-only'
          const finalState = targetState === 'none' ? 'files-only' : targetState
          current.setState(finalState)
        } else {
          // Currently in a Files & Categories state, save it and turn off
          const currentLastValid = {
            fileExplorerVisible: current.fileExplorerVisible,
            categoryExplorerVisible: current.categoryExplorerVisible
          }

          set({ lastValidFilesCategories: currentLastValid })
          current.setState('none')
        }
      },

      toggleSearch: () => {
        const current = get()

        if (current.currentState === 'search') {
          // Turn off search
          current.setState('none')
        } else {
          // Save current Files & Categories state if applicable
          if (current.isFilesCategoriesPanelActive) {
            const currentLastValid = {
              fileExplorerVisible: current.fileExplorerVisible,
              categoryExplorerVisible: current.categoryExplorerVisible
            }
            set({ lastValidFilesCategories: currentLastValid })
          }

          // Turn on search
          current.setState('search')
        }
      },

      toggleFileExplorer: () => {
        const current = get()

        // Only works when Files & Categories panel is active
        if (!current.isFilesCategoriesPanelActive) return

        const newFileExplorerVisible = !current.fileExplorerVisible
        const currentCategoryExplorerVisible = current.categoryExplorerVisible

        // Determine new state
        const newState = stateFromSectionVisibility(newFileExplorerVisible, currentCategoryExplorerVisible)

        if (newState === 'none') {
          // Auto-close: save state and close panel
          const lastValid = {
            fileExplorerVisible: current.fileExplorerVisible,
            categoryExplorerVisible: current.categoryExplorerVisible
          }
          set({ lastValidFilesCategories: lastValid })
        }

        current.setState(newState)
      },

      toggleCategoryExplorer: () => {
        const current = get()

        // Only works when Files & Categories panel is active
        if (!current.isFilesCategoriesPanelActive) return

        const currentFileExplorerVisible = current.fileExplorerVisible
        const newCategoryExplorerVisible = !current.categoryExplorerVisible

        // Determine new state
        const newState = stateFromSectionVisibility(currentFileExplorerVisible, newCategoryExplorerVisible)

        if (newState === 'none') {
          // Auto-close: save state and close panel
          const lastValid = {
            fileExplorerVisible: current.fileExplorerVisible,
            categoryExplorerVisible: current.categoryExplorerVisible
          }
          set({ lastValidFilesCategories: lastValid })
        }

        current.setState(newState)
      }
    }),
    {
      name: 'unified-panel-state'
    }
  )
)

// Factory function with options support
export const createUnifiedPanelState = (options?: UnifiedPanelStateOptions) => {
  const store = useUnifiedPanelState.getState()

  if (options?.initialState) {
    const { currentState, lastValidFilesCategories } = options.initialState

    if (lastValidFilesCategories) {
      store.setLastValidState(lastValidFilesCategories)
    }

    if (currentState) {
      store.setState(currentState)
    }
  }

  if (options?.onStateChange) {
    useUnifiedPanelState.setState({ onStateChange: options.onStateChange })
  }

  return store
}

// Hook factory with options
export const useUnifiedPanelStateWithOptions = (options?: UnifiedPanelStateOptions) => {
  const store = useUnifiedPanelState()

  // Initialize with options on first render
  React.useEffect(() => {
    if (options?.initialState) {
      const { currentState, lastValidFilesCategories } = options.initialState

      if (currentState) {
        store.setState(currentState)
      }

      if (lastValidFilesCategories) {
        store.setLastValidState(lastValidFilesCategories)
      }
    }

    if (options?.onStateChange) {
      useUnifiedPanelState.setState({ onStateChange: options.onStateChange })
    }
  }, [])

  return store
}

// Export store instance for external access
export const unifiedPanelStateStore = useUnifiedPanelState