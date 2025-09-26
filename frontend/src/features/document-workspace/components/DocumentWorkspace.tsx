import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { useDocumentWorkspaceStore, documentWorkspaceSelectors } from '../store'
import { layoutModes } from '../types'
import type { LayoutModeType, Position, Dimensions } from '../types'
import { WorkspaceCommandBar } from './WorkspaceCommandBar'
import { DocumentCaddy } from './DocumentCaddy'

const MIN_DOCUMENT_WIDTH = 200
const MIN_DOCUMENT_HEIGHT = 150

export const DocumentWorkspace: React.FC = () => {
  const currentWorkspace = useDocumentWorkspaceStore(documentWorkspaceSelectors.workspace)
  const documents = useDocumentWorkspaceStore(documentWorkspaceSelectors.documentList)
  const isLoading = useDocumentWorkspaceStore(documentWorkspaceSelectors.isLoading)
  const hasError = useDocumentWorkspaceStore(documentWorkspaceSelectors.hasError)
  const errorMessage = useDocumentWorkspaceStore(documentWorkspaceSelectors.error)

  const {
    createWorkspace,
    loadWorkspace,
    switchLayoutMode,
    removeDocument,
    removeAllDocuments,
    saveWorkspace,
    activateDocument,
    moveDocument,
    resizeDocument,
    updateDocumentTitle,
    updateWorkspaceDimensions,
  } = useDocumentWorkspaceStore((state) => ({
    createWorkspace: state.createWorkspace,
    loadWorkspace: state.loadWorkspace,
    switchLayoutMode: state.switchLayoutMode,
    removeDocument: state.removeDocument,
    removeAllDocuments: state.removeAllDocuments,
    saveWorkspace: state.saveWorkspace,
    activateDocument: state.activateDocument,
    moveDocument: state.moveDocument,
    resizeDocument: state.resizeDocument,
    updateDocumentTitle: state.updateDocumentTitle,
    updateWorkspaceDimensions: state.updateWorkspaceDimensions,
  }))

  const workspaceRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastResizeRef = useRef<{ width: number; height: number } | null>(null)

  const handleDocumentActivate = useCallback((documentId: string) => {
    void activateDocument(documentId)
  }, [activateDocument])

  const handleDocumentMove = useCallback((documentId: string, position: Position) => {
    if (!currentWorkspace) return
    void moveDocument(documentId, position)
  }, [moveDocument, currentWorkspace])

  const handleDocumentResize = useCallback((documentId: string, dimensions: Dimensions) => {
    if (!currentWorkspace) return

    const boundedWidth = Math.max(MIN_DOCUMENT_WIDTH, dimensions.width)
    const boundedHeight = Math.max(MIN_DOCUMENT_HEIGHT, dimensions.height)

    void resizeDocument(documentId, { width: boundedWidth, height: boundedHeight })
  }, [resizeDocument, currentWorkspace])

  const handleDocumentClose = useCallback((documentId: string) => {
    void removeDocument(documentId)
  }, [removeDocument])

  const handleDocumentTitleChange = useCallback((documentId: string, newTitle: string) => {
    updateDocumentTitle(documentId, newTitle)
  }, [updateDocumentTitle])

  const handleLayoutModeChange = useCallback((mode: LayoutModeType) => {
    void switchLayoutMode(mode)
  }, [switchLayoutMode])

  const handleRemoveAllDocuments = useCallback(() => {
    void removeAllDocuments()
  }, [removeAllDocuments])

  const handleSaveWorkspace = useCallback(() => {
    void saveWorkspace()
  }, [saveWorkspace])

  const handleLoadWorkspace = useCallback(() => {
    if (currentWorkspace) {
      void loadWorkspace(currentWorkspace.id)
    }
  }, [loadWorkspace, currentWorkspace])

  const documentBounds = useMemo(() => {
    return documents.map(doc => ({
      id: doc.id,
      x: doc.position.x,
      y: doc.position.y,
      width: doc.dimensions.width,
      height: doc.dimensions.height,
    }))
  }, [documents])

  const containerDimensions = useMemo(() => {
    if (!currentWorkspace) {
      return { width: 1200, height: 800 }
    }

    let maxX = currentWorkspace.size.width
    let maxY = currentWorkspace.size.height

    documentBounds.forEach(doc => {
      const rightEdge = doc.x + doc.width
      const bottomEdge = doc.y + doc.height
      maxX = Math.max(maxX, rightEdge + 50)
      maxY = Math.max(maxY, bottomEdge + 50)
    })

    return {
      width: Math.max(maxX, currentWorkspace.size.width),
      height: Math.max(maxY, currentWorkspace.size.height),
    }
  }, [documentBounds, currentWorkspace?.size])

  const documentContainerStyle = useMemo((): React.CSSProperties => {
    if (!currentWorkspace) {
      return { width: 1200, height: 800, position: 'relative' as const }
    }
    return {
      width: containerDimensions.width,
      height: containerDimensions.height,
      position: 'relative' as const,
    }
  }, [containerDimensions, currentWorkspace])

  const renderEmptyState = useMemo(() => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <div className="text-center max-w-md">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No documents</h3>
        <p className="mt-2 text-sm text-gray-600">
          Your workspace is ready. Documents can be added through other parts of the application.
        </p>
      </div>
    </div>
  ), [])

  useEffect(() => {
    if (!currentWorkspace) {
      void createWorkspace('Demo Research Workspace', layoutModes.FREEFORM, { width: 2000, height: 1500 })
    }
  }, [currentWorkspace, createWorkspace])

  useEffect(() => {
    if (!workspaceRef.current || !currentWorkspace) {
      return
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          const tolerance = 1
          const lastResize = lastResizeRef.current

          if (lastResize) {
            const widthChanged = Math.abs(lastResize.width - width) > tolerance
            const heightChanged = Math.abs(lastResize.height - height) > tolerance

            if (!widthChanged && !heightChanged) {
              return
            }
          }

          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current)
          }

          resizeTimeoutRef.current = setTimeout(() => {
            lastResizeRef.current = { width, height }
            void updateWorkspaceDimensions({ width, height })
          }, 100)
        }
      }
    })

    resizeObserverRef.current.observe(workspaceRef.current)

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [updateWorkspaceDimensions, currentWorkspace])

  if (hasError) {
    return (
      <div className="h-full bg-gray-50 relative overflow-hidden flex flex-col" data-testid="document-workspace-panel">
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p className="text-lg font-medium mb-2">Error loading workspace</p>
            <p className="text-sm">{errorMessage ?? 'Please try refreshing the page'}</p>
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

  const getWorkspaceClasses = () => {
    const baseClasses = 'relative'

    switch (currentWorkspace.layoutMode) {
      case layoutModes.STACKED:
        return `${baseClasses} workspace-stacked`
      case layoutModes.GRID:
        return `${baseClasses} workspace-grid`
      case layoutModes.FREEFORM:
        return `${baseClasses} workspace-freeform`
      default:
        return baseClasses
    }
  }

  const renderLayoutModeIndicator = () => (
    <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span className="font-medium">Layout:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          currentWorkspace.layoutMode === layoutModes.STACKED ? 'bg-blue-100 text-blue-800' :
          currentWorkspace.layoutMode === layoutModes.GRID ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {currentWorkspace.layoutMode}
        </span>
        {documents.length > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
          </>
        )}
      </div>
    </div>
  )

  const renderWorkspaceStats = () => {
    const activeDocument = documents.find(doc => doc.isActive)
    const visibleDocuments = documents.filter(doc => doc.isVisible)

    return (
      <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span>
            <span className="font-medium">Visible:</span> {visibleDocuments.length}/{documents.length}
          </span>
          {activeDocument && (
            <span>
              <span className="font-medium">Active:</span> {activeDocument.title}
            </span>
          )}
          <span>
            <span className="font-medium">Workspace:</span> {currentWorkspace.size.width}×{currentWorkspace.size.height}
          </span>
        </div>
      </div>
    )
  }

  const isFreeformMode = currentWorkspace.layoutMode === layoutModes.FREEFORM

  return (
    <div className="multi-document-workspace flex flex-col h-full" data-testid="document-workspace-panel">
      <WorkspaceCommandBar
        currentLayoutMode={currentWorkspace.layoutMode}
        documentCount={documents.length}
        onLayoutModeChange={handleLayoutModeChange}
        onRemoveAllDocuments={handleRemoveAllDocuments}
        onSaveWorkspace={handleSaveWorkspace}
        onLoadWorkspace={handleLoadWorkspace}
        isLoading={isLoading}
        disabled={false}
      />

      <div
        ref={workspaceRef}
        className="flex-1 relative overflow-auto bg-gray-50"
        data-testid={`workspace-${currentWorkspace.id}`}
        role="application"
        aria-label={`Multi-document workspace: ${currentWorkspace.name}`}
        tabIndex={-1}
      >
        <div
          className={getWorkspaceClasses()}
          style={documentContainerStyle}
        >
          {documents.length === 0 ? (
            renderEmptyState
          ) : (
            <>
              {documents.map((document) => (
                <DocumentCaddy
                  key={document.id}
                  id={document.id}
                  title={document.title}
                  filePath={document.filePath}
                  position={document.position}
                  dimensions={document.dimensions}
                  zIndex={document.zIndex}
                  isActive={document.isActive}
                  isVisible={document.isVisible}
                  state={document.state}
                  errorMessage={document.errorMessage}
                  isDraggable={isFreeformMode}
                  isResizable={isFreeformMode}
                  onActivate={handleDocumentActivate}
                  onMove={handleDocumentMove}
                  onResize={handleDocumentResize}
                  onClose={handleDocumentClose}
                  onTitleChange={handleDocumentTitleChange}
                />
              ))}

              {renderLayoutModeIndicator()}
              {renderWorkspaceStats()}
            </>
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
              <div className="flex flex-col items-center space-y-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Loading workspace...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
