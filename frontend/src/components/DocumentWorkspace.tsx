import React, { useEffect } from 'react'
import { useWorkspaceStore, workspaceSelectors } from '../domains/workspace/ui/stores/workspace-store'
import { MultiDocumentWorkspace } from '../domains/workspace/ui/containers/MultiDocumentWorkspace'
import { LayoutModeType } from '../domains/workspace/domain/value-objects/layout-mode'
import { Position, Dimensions } from '../domains/workspace/domain/value-objects/geometry'

export const DocumentWorkspace: React.FC = () => {
  const {
    createWorkspace,
    loadWorkspace,
    switchLayoutMode,
    addDocument,
    removeDocument,
    removeAllDocuments,
    saveWorkspace,
    activateDocument,
    moveDocument,
    resizeDocument,
    updateDocumentTitle,
    updateWorkspaceDimensions,
  } = useWorkspaceStore()

  const currentWorkspace = useWorkspaceStore(workspaceSelectors.currentWorkspace)
  const documents = useWorkspaceStore(workspaceSelectors.documentList)
  const isLoading = useWorkspaceStore(workspaceSelectors.isLoading)
  const hasError = useWorkspaceStore(workspaceSelectors.hasError)

  // Initialize demo workspace on mount
  useEffect(() => {
    if (!currentWorkspace) {
      createWorkspace('Demo Research Workspace', LayoutModeType.FREEFORM, Dimensions.fromValues(1200, 800))
        .catch(console.error)
    }
  }, [currentWorkspace, createWorkspace])

  if (hasError) {
    return (
      <div className="h-full bg-gray-50 relative overflow-hidden flex flex-col" data-testid="document-workspace-panel">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="text-lg font-medium mb-2">Error loading workspace</p>
            <p className="text-sm">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading || !currentWorkspace) {
    return (
      <div className="h-full bg-gray-50 relative overflow-hidden flex flex-col" data-testid="document-workspace-panel">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm">Loading workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  // Convert documents to UI format
  const documentsUIData = documents.map(doc => ({
    id: doc.id,
    title: doc.title,
    filePath: doc.filePath,
    position: doc.position,
    dimensions: doc.dimensions,
    zIndex: doc.zIndex,
    isActive: doc.isActive,
    isVisible: doc.isVisible,
    state: doc.state,
    errorMessage: doc.errorMessage,
    isDraggable: doc.isDraggable,
    isResizable: doc.isResizable,
  }))

  const handleAddDocument = async () => {
    try {
      // Demo: Add a sample document
      const samplePaths = [
        '/Users/demo/Documents/Research/research-notes.md',
        '/Users/demo/Documents/Research/data-collection.pdf',
        '/Users/demo/Documents/Research/interview-transcripts.docx',
        '/Users/demo/Documents/Research/survey-results.xlsx',
        '/Users/demo/Documents/Research/literature-review.md'
      ]

      const randomPath = samplePaths[Math.floor(Math.random() * samplePaths.length)]
      await addDocument(randomPath)
    } catch (error) {
      console.error('Failed to add document:', error)
    }
  }

  const handleMoveDocument = async (documentId: string, position: Position) => {
    try {
      await moveDocument(documentId, position)
    } catch (error) {
      console.error('Failed to move document:', error)
    }
  }

  const handleResizeDocument = async (documentId: string, dimensions: Dimensions) => {
    try {
      await resizeDocument(documentId, dimensions)
    } catch (error) {
      console.error('Failed to resize document:', error)
    }
  }

  const handleActivateDocument = async (documentId: string) => {
    try {
      await activateDocument(documentId)
    } catch (error) {
      console.error('Failed to activate document:', error)
    }
  }

  const handleRemoveDocument = async (documentId: string) => {
    try {
      await removeDocument(documentId)
    } catch (error) {
      console.error('Failed to remove document:', error)
    }
  }

  const handleRemoveAllDocuments = async () => {
    try {
      await removeAllDocuments()
    } catch (error) {
      console.error('Failed to remove all documents:', error)
    }
  }

  const handleLayoutModeChange = async (mode: LayoutModeType) => {
    try {
      await switchLayoutMode(mode)
    } catch (error) {
      console.error('Failed to switch layout mode:', error)
    }
  }

  const handleSaveWorkspace = async () => {
    try {
      await saveWorkspace()
    } catch (error) {
      console.error('Failed to save workspace:', error)
    }
  }

  const handleLoadWorkspace = async () => {
    try {
      if (currentWorkspace) {
        await loadWorkspace(currentWorkspace.id)
      }
    } catch (error) {
      console.error('Failed to load workspace:', error)
    }
  }

  const handleTitleChange = async (documentId: string, newTitle: string) => {
    try {
      await updateDocumentTitle(documentId, newTitle)
    } catch (error) {
      console.error('Failed to update document title:', error)
    }
  }

  const handleWorkspaceResize = async (dimensions: Dimensions) => {
    try {
      await updateWorkspaceDimensions(dimensions)
    } catch (error) {
      console.error('Failed to update workspace dimensions:', error)
    }
  }

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden" data-testid="document-workspace-panel">
      <MultiDocumentWorkspace
        workspaceId={currentWorkspace.id}
        workspaceName={currentWorkspace.name}
        currentLayoutMode={currentWorkspace.layoutMode}
        documents={documentsUIData}
        workspaceDimensions={currentWorkspace.workspaceDimensions}
        isLoading={isLoading}
        disabled={false}
        onLayoutModeChange={handleLayoutModeChange}
        onAddDocument={handleAddDocument}
        onRemoveDocument={handleRemoveDocument}
        onRemoveAllDocuments={handleRemoveAllDocuments}
        onSaveWorkspace={handleSaveWorkspace}
        onLoadWorkspace={handleLoadWorkspace}
        onActivateDocument={handleActivateDocument}
        onMoveDocument={handleMoveDocument}
        onResizeDocument={handleResizeDocument}
        onTitleChange={handleTitleChange}
        onWorkspaceResize={handleWorkspaceResize}
      />
    </div>
  )
}