import React, { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useWorkspaceStore } from '@/stores/workspaceStore'

// Individual panel components
import { FileExplorer } from './FileExplorer'
import { CategoryExplorer } from './CategoryExplorer'
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

  // Calculate if any explorer panels are visible
  const hasExplorerPanels =
    workspaceLayout.file_explorer_visible ||
    workspaceLayout.category_explorer_visible ||
    workspaceLayout.search_panel_visible

  return (
    <div className="h-screen bg-gray-100" data-testid="workspace-container">
      {/* Project Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">{currentProject.name}</h1>
        <p className="text-sm text-gray-600">
          Source: {currentProject.source_folder} | Reports: {currentProject.reports_folder}
        </p>
      </div>

      {/* Main workspace area */}
      <div className="h-[calc(100vh-73px)]">
        {hasExplorerPanels ? (
          <PanelGroup
            direction="horizontal"
            onLayout={(sizes) => handlePanelResize('explorer', sizes)}
          >
            {/* Left panel group - Explorers */}
            <Panel
              id="explorers"
              defaultSize={workspaceLayout.explorer_width}
              minSize={15}
              maxSize={70}
              className="bg-white border-r border-gray-200"
            >
              <div className="h-full flex flex-col">
                {/* Explorer tabs */}
                <div className="flex border-b border-gray-200 bg-gray-50">
                  {workspaceLayout.file_explorer_visible && (
                    <ExplorerTab title="Files" isActive={true} />
                  )}
                  {workspaceLayout.category_explorer_visible && (
                    <ExplorerTab title="Categories" isActive={false} />
                  )}
                  {workspaceLayout.search_panel_visible && (
                    <ExplorerTab title="Search" isActive={false} />
                  )}
                </div>

                {/* Explorer content */}
                <div className="flex-1 overflow-hidden">
                  {workspaceLayout.file_explorer_visible && <FileExplorer />}
                  {workspaceLayout.category_explorer_visible && <CategoryExplorer />}
                  {workspaceLayout.search_panel_visible && <SearchPanel />}
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors" />

            {/* Right panel - Document workspace */}
            <Panel
              id="workspace"
              defaultSize={workspaceLayout.workspace_width}
              minSize={30}
            >
              <DocumentWorkspace />
            </Panel>
          </PanelGroup>
        ) : (
          /* Full-width document workspace when no explorers are visible */
          <DocumentWorkspace />
        )}
      </div>

      {/* Hidden project ID for reference (keeps existing test compatibility) */}
      <div style={{ display: 'none' }}>{projectId}</div>
    </div>
  )
}

// Explorer tab component
interface ExplorerTabProps {
  title: string
  isActive: boolean
  onClick?: () => void
}

const ExplorerTab: React.FC<ExplorerTabProps> = ({ title, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-blue-500 text-blue-600 bg-white'
        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
    }`}
  >
    {title}
  </button>
)