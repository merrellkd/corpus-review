import React, { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useWorkspaceNavigationStore } from '../features/workspace-navigation/store'
import { useUiStore, uiSelectors } from '../stores/ui-store'

// New architecture components
import { TopToolbar } from './TopToolbar'
import { FilesCategoriesPanel } from './FilesCategoriesPanel'
import { SearchPanel } from './SearchPanel'
import { DocumentWorkspace } from './DocumentWorkspace'

export interface ProjectWorkspaceProps {
  projectId: string
  onBackToProjects?: () => void
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId, onBackToProjects }) => {
  const {
    currentProject,
    isLoading,
    error,
    loadWorkspaceById,
  } = useWorkspaceNavigationStore()

  const workspaceLayout = useUiStore(uiSelectors.workspaceLayout)
  const isFilesCategoriesPanelActive = useUiStore(uiSelectors.isFilesCategoriesPanelActive)
  const isSearchPanelActive = useUiStore(uiSelectors.isSearchPanelActive)
  const setExplorerWidth = useUiStore(state => state.setExplorerWidth)

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadWorkspaceById(projectId)
    }
  }, [projectId, loadWorkspaceById])

  // Handle panel resize
  const handlePanelResize = (sizes: number[]) => {
    if (!workspaceLayout) return

    const explorerWidthPercent = sizes[0]
    setExplorerWidth(explorerWidthPercent)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" data-testid="workspace-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project files...</p>
          <p className="text-sm text-gray-500 mt-2">Accessing file system</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" data-testid="workspace-container">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error loading workspace</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" data-testid="workspace-container">
        <p className="text-gray-600">No project loaded</p>
      </div>
    )
  }

  // Check if any side panel is active (mutually exclusive)
  const hasSidePanel = isFilesCategoriesPanelActive || isSearchPanelActive

  // Determine layout class for responsive behavior
  const layoutClass = hasSidePanel ? 'two-column-layout' : 'full-width-layout'

  return (
    <div className={`h-screen bg-gray-100 ${layoutClass}`} data-testid="workspace-container">
      {/* Top Header - Project title and settings */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToProjects}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Return to Project List
          </button>
          <div className="text-gray-300">|</div>
          <h1 className="text-lg font-semibold text-gray-900">{currentProject.name}</h1>
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-700">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Toolbar - Panel toggle buttons */}
      <TopToolbar />

      {/* Main workspace area */}
      <div className="h-[calc(100vh-104px)]">
        {hasSidePanel ? (
          <PanelGroup
            direction="horizontal"
            onLayout={handlePanelResize}
          >
            {/* Side Panel - Files & Categories OR Search (mutually exclusive) */}
            <Panel
              id="side-panel"
              defaultSize={workspaceLayout.explorerWidth || 30}
              minSize={15}
              maxSize={70}
              className="bg-white border-r border-gray-200"
            >
              {isFilesCategoriesPanelActive && (
                <FilesCategoriesPanel />
              )}
              {isSearchPanelActive && (
                <SearchPanel />
              )}
            </Panel>

            <PanelResizeHandle
              className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors"
              data-testid="panel-resize-handle"
            />

            {/* Document Workspace */}
            <Panel
              id="document-workspace"
              defaultSize={workspaceLayout.workspaceWidth || 70}
              minSize={30}
            >
              <DocumentWorkspace />
            </Panel>
          </PanelGroup>
        ) : (
          /* Full-width document workspace when no side panel is active */
          <DocumentWorkspace />
        )}
      </div>

      {/* Hidden project ID for reference (keeps existing test compatibility) */}
      <div style={{ display: 'none' }}>{projectId}</div>
    </div>
  )
}
