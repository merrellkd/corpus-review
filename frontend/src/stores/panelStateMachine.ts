import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types for panel state machine
export type ActivePanelType = 'none' | 'files_categories' | 'search'
export type LayoutMode = 'full-width' | 'two-column'

interface PanelState {
  activePanel: ActivePanelType
  fileExplorerSectionVisible: boolean
  categoryExplorerSectionVisible: boolean
}

interface PanelStateMachineState {
  // Core state
  activePanel: ActivePanelType

  // Computed properties
  isFilesCategoriesPanelActive: boolean
  isSearchPanelActive: boolean
  layoutMode: LayoutMode

  // State tracking
  hasUnsyncedChanges: boolean

  // Actions
  toggleFilesCategoriesPanel: () => void
  toggleSearchPanel: () => void
  retryPersistence: () => void

  // Callbacks (can be set by consumers)
  onStateChange?: (from: ActivePanelType, to: ActivePanelType) => void
  onPersistState?: (state: { activePanel: ActivePanelType; timestamp: number }) => void

  // Internal methods
  forceState?: (panel: string) => void
}

interface PanelStateMachineOptions {
  initialState?: Partial<PanelState>
}

const computePanelProperties = (activePanel: ActivePanelType) => ({
  isFilesCategoriesPanelActive: activePanel === 'files_categories',
  isSearchPanelActive: activePanel === 'search',
  layoutMode: activePanel === 'none' ? 'full-width' as LayoutMode : 'two-column' as LayoutMode
})

export const usePanelStateMachine = create<PanelStateMachineState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activePanel: 'none',
      hasUnsyncedChanges: false,
      ...computePanelProperties('none'),

      // Actions
      toggleFilesCategoriesPanel: () => {
        const current = get()
        const newPanel: ActivePanelType =
          current.activePanel === 'files_categories' ? 'none' : 'files_categories'

        // Call state change callback
        current.onStateChange?.(current.activePanel, newPanel)

        // Update state
        set({ activePanel: newPanel, ...computePanelProperties(newPanel) })

        // Persist state
        try {
          current.onPersistState?.({
            activePanel: newPanel,
            timestamp: Date.now()
          })
          set({ hasUnsyncedChanges: false })
        } catch (error) {
          set({ hasUnsyncedChanges: true })
        }
      },

      toggleSearchPanel: () => {
        const current = get()
        const newPanel: ActivePanelType =
          current.activePanel === 'search' ? 'none' : 'search'

        // Call state change callback
        current.onStateChange?.(current.activePanel, newPanel)

        // Update state
        set({ activePanel: newPanel, ...computePanelProperties(newPanel) })

        // Persist state
        try {
          current.onPersistState?.({
            activePanel: newPanel,
            timestamp: Date.now()
          })
          set({ hasUnsyncedChanges: false })
        } catch (error) {
          set({ hasUnsyncedChanges: true })
        }
      },

      retryPersistence: () => {
        const current = get()
        try {
          current.onPersistState?.({
            activePanel: current.activePanel,
            timestamp: Date.now()
          })
          set({ hasUnsyncedChanges: false })
        } catch (error) {
          // Keep hasUnsyncedChanges as true
        }
      },

      // Internal method for testing invalid states
      forceState: (panel: string) => {
        // Validate panel value
        const validPanels: ActivePanelType[] = ['none', 'files_categories', 'search']
        if (!validPanels.includes(panel as ActivePanelType)) {
          // Invalid state - don't update
          return
        }
        set({ activePanel: panel as ActivePanelType, ...computePanelProperties(panel as ActivePanelType) })
      }
    }),
    {
      name: 'panel-state-machine'
    }
  )
)

// Factory function with options support
export const createPanelStateMachine = (options?: PanelStateMachineOptions) => {
  const store = usePanelStateMachine.getState()

  if (options?.initialState) {
    const { activePanel } = options.initialState
    if (activePanel && ['none', 'files_categories', 'search'].includes(activePanel)) {
      usePanelStateMachine.setState({ activePanel })
    }
  }

  return store
}

// Hook factory with options
export const usePanelStateMachineWithOptions = (options?: PanelStateMachineOptions) => {
  const store = usePanelStateMachine()

  // Initialize with options on first render
  React.useEffect(() => {
    if (options?.initialState) {
      const { activePanel } = options.initialState
      if (activePanel && ['none', 'files_categories', 'search'].includes(activePanel)) {
        usePanelStateMachine.setState({ activePanel })
      }
    }
  }, [])

  return store
}

// Export store instance for external access
export const panelStateMachineStore = usePanelStateMachine