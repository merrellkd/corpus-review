import React, { useEffect, useState } from 'react'
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

type TabType = 'file-explorer' | 'category-explorer' | 'search'

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('file-explorer')
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
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-800">
          <span className="text-sm">←</span>
          <span className="text-sm font-medium">Return to Project List</span>
        </button>

        <div className="text-center flex-1">
          <h1 className="text-lg font-semibold text-gray-900">{currentProject.name}</h1>
        </div>

        <button className="text-gray-400 hover:text-gray-600">
          <span className="text-lg">⚙️</span>
        </button>
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
              className="bg-white border-r border-gray-200 border-8 border-blue-500 bg-blue-50"
            >
              <div className="h-full flex flex-col">
                {/* Explorer content */}
                <div
                  className={`flex-1 overflow-hidden ${
                    activeTab === 'file-explorer' ? 'border-6 border-green-500 bg-green-50' :
                    activeTab === 'category-explorer' ? 'border-6 border-orange-500 bg-orange-50' :
                    'border-6 border-purple-500 bg-purple-50'
                  }`}
                >
                  {activeTab === 'file-explorer' && <FileExplorer />}
                  {activeTab === 'category-explorer' && <CategoryExplorer />}
                  {activeTab === 'search' && <SearchPanel />}
                </div>

                {/* Explorer tabs at bottom */}
                <div className="flex border-t border-gray-200 bg-gray-50">
                  <ExplorerTab
                    title="File Explorer"
                    isActive={activeTab === 'file-explorer'}
                    onClick={() => setActiveTab('file-explorer')}
                  />
                  <ExplorerTab
                    title="Category Explorer"
                    isActive={activeTab === 'category-explorer'}
                    onClick={() => setActiveTab('category-explorer')}
                  />
                  <ExplorerTab
                    title="Search"
                    isActive={activeTab === 'search'}
                    onClick={() => setActiveTab('search')}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-1 bg-gray-300 hover:bg-blue-500 transition-colors" />

            {/* Right panel - Document workspace */}
            <Panel
              id="workspace"
              defaultSize={workspaceLayout.workspace_width}
              minSize={30}
className="border-8 border-red-500 bg-red-50"
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