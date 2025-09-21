import React, { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { usePanelStateMachine } from '../stores/panelStateMachine'

// New architecture components
import { TopToolbar } from './TopToolbar'
import { FilesCategoriesPanel } from './FilesCategoriesPanel'
import { SearchPanel } from './SearchPanel'
import { DocumentWorkspace } from './DocumentWorkspace'

export interface ProjectWorkspaceProps {
  projectId: string
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  const {
    currentProject,
    workspaceLayout,
    isLoading,
    error,
    loadProject,
    updatePanelSizes,
  } = useWorkspaceStore()

  const {
    isFilesCategoriesPanelActive,
    isSearchPanelActive,
  } = usePanelStateMachine()

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    }
  }, [projectId, loadProject])

  // Handle panel resize
  const handlePanelResize = (panelType: string, sizes: number[]) => {
    if (!workspaceLayout) return

    // Convert percentage to pixel approximation (assuming 1200px total width)
    const explorerWidth = Math.round((sizes[0] / 100) * 1200)
    updatePanelSizes(panelType, explorerWidth)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50" data-testid="workspace-container">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace</p>
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

  if (!currentProject || !workspaceLayout) {
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
      {/* Top Toolbar with panel toggles */}
      <TopToolbar projectTitle={currentProject.name} />

      {/* Main workspace area */}
      <div className="h-[calc(100vh-57px)]">
        {hasSidePanel ? (
          <PanelGroup
            direction="horizontal"
            onLayout={(sizes) => handlePanelResize('panel', sizes)}
          >
            {/* Side Panel - Files & Categories OR Search (mutually exclusive) */}
            <Panel
              id="side-panel"
              defaultSize={workspaceLayout.explorer_width || 30}
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
              defaultSize={workspaceLayout.workspace_width || 70}
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

