import React, { useEffect, useCallback, useRef, useMemo } from 'react'
import { useWorkspaceStore } from '../../../stores/workspace'
import { LayoutModeType } from '../../../domains/workspace/domain/value-objects/layout-mode'
import { Position, Dimensions } from '../../../domains/workspace/domain/value-objects/geometry'
import { DocumentCaddyState } from '../../../domains/workspace/domain/entities/document-caddy'
import { WorkspaceCommandBar } from '../../../domains/workspace/ui/components/WorkspaceCommandBar'
import { DocumentCaddy } from '../../../domains/workspace/ui/components/DocumentCaddy'

export const DocumentWorkspace: React.FC = () => {
  // Get state and actions from store
  const currentProject = useWorkspaceStore(state => state.currentProject)
  const documents = useWorkspaceStore(state => state.openDocuments)
  const isLoading = useWorkspaceStore(state => state.isLoading)
  const hasError = useWorkspaceStore(state => state.error !== null)

  // Build currentWorkspace object from currentProject
  const currentWorkspace = currentProject ? {
    id: currentProject.id,
    name: currentProject.name,
    documents: Object.fromEntries(documents.map(doc => [doc.id, doc])),
    workspaceDimensions: {
      width: 1200,
      height: 800
    },
    layoutMode: LayoutModeType.FREEFORM
  } : null


  const {
    loadWorkspace,
    closeDocument,
    setActiveDocument,
    updateDocumentPosition,
    updateDocumentSize,
  } = useWorkspaceStore()

  const workspaceRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastResizeRef = useRef<{ width: number; height: number } | null>(null)

  // Handle document activation
  const handleDocumentActivate = useCallback((documentId: string) => {
    setActiveDocument(documentId)
  }, [setActiveDocument])

  // Handle document movement - allow positioning anywhere
  const handleDocumentMove = useCallback((documentId: string, position: Position) => {
    if (!currentWorkspace) return

    try {
      // Allow documents to be positioned anywhere - scrollbars will handle overflow
      updateDocumentPosition(documentId, position.getX(), position.getY())
    } catch (error) {
      console.warn('Invalid position during document move:', error)
    }
  }, [updateDocumentPosition, currentWorkspace])

  // Handle document resizing with minimum size validation
  const handleDocumentResize = useCallback((documentId: string, dimensions: Dimensions) => {
    if (!currentWorkspace) return

    // Only enforce minimum dimensions - allow documents to be larger than workspace
    const minWidth = 200
    const minHeight = 150

    const boundedWidth = Math.max(minWidth, dimensions.getWidth())
    const boundedHeight = Math.max(minHeight, dimensions.getHeight())

    try {
      updateDocumentSize(documentId, boundedWidth, boundedHeight)
    } catch (error) {
      console.warn('Invalid dimensions during document resize:', error)
    }
  }, [updateDocumentSize, currentWorkspace])

  // Handle document close
  const handleDocumentClose = useCallback((documentId: string) => {
    closeDocument(documentId)
  }, [closeDocument])

  // Handle document title change (placeholder - not implemented in store)
  const handleDocumentTitleChange = useCallback((documentId: string, newTitle: string) => {
    console.log('Document title change not implemented:', documentId, newTitle)
  }, [])

  const handleLayoutModeChange = useCallback(async (mode: LayoutModeType) => {
    try {
      console.log('Layout mode change not implemented:', mode)
    } catch (error) {
      console.error('Failed to switch layout mode:', error)
    }
  }, [])

  const handleRemoveAllDocuments = useCallback(async () => {
    try {
      // Close all documents one by one
      documents.forEach(doc => closeDocument(doc.id))
    } catch (error) {
      console.error('Failed to remove all documents:', error)
    }
  }, [documents, closeDocument])

  const handleSaveWorkspace = useCallback(async () => {
    try {
      console.log('Save workspace not implemented')
    } catch (error) {
      console.error('Failed to save workspace:', error)
    }
  }, [])

  const handleLoadWorkspace = useCallback(async () => {
    try {
      if (currentWorkspace) {
        await loadWorkspace(currentWorkspace.id)
      }
    } catch (error) {
      console.error('Failed to load workspace:', error)
    }
  }, [loadWorkspace, currentWorkspace])

  // Extract only position/dimension data to minimize recalculations
  const documentBounds = useMemo(() => {
    return documents.map(doc => ({
      id: doc.id,
      x: doc.position_x || 0,
      y: doc.position_y || 0,
      width: doc.width || 300,
      height: doc.height || 200,
    }))
  }, [documents])

  // Calculate container dimensions based on document positions
  const containerDimensions = useMemo(() => {
    // Handle case when workspace doesn't exist yet
    if (!currentWorkspace) {
      return { width: 1200, height: 800 }
    }

    // Calculate the actual space needed based on document positions
    let maxX = currentWorkspace.workspaceDimensions.width
    let maxY = currentWorkspace.workspaceDimensions.height

    // Find the furthest document edges
    documentBounds.forEach(doc => {
      const rightEdge = doc.x + doc.width
      const bottomEdge = doc.y + doc.height
      maxX = Math.max(maxX, rightEdge + 50) // Add some padding
      maxY = Math.max(maxY, bottomEdge + 50)
    })

    return {
      width: Math.max(maxX, currentWorkspace.workspaceDimensions.width),
      height: Math.max(maxY, currentWorkspace.workspaceDimensions.height),
    }
  }, [documentBounds, currentWorkspace?.workspaceDimensions])

  // Get document container styles - memoized
  const documentContainerStyle = useMemo((): React.CSSProperties => {
    if (!currentWorkspace) {
      return { width: 1200, height: 800, position: 'relative' as const }
    }
    return {
      // Set size large enough to contain all documents
      width: containerDimensions.width,
      height: containerDimensions.height,
      position: 'relative' as const,
    }
  }, [containerDimensions, currentWorkspace])

  // Render empty state - memoized
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

  // Workspace state tracking
  useEffect(() => {
    // Workspace initialization handled by ProjectWorkspace component
    // This effect is kept for potential future workspace state tracking
  }, [currentWorkspace])

  // Handle workspace resize observation with debouncing
  useEffect(() => {
    if (!workspaceRef.current || !currentWorkspace) {
      return
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (width > 0 && height > 0) {
          // Check if dimensions actually changed significantly
          const tolerance = 1 // 1px tolerance
          const lastResize = lastResizeRef.current

          if (lastResize) {
            const widthChanged = Math.abs(lastResize.width - width) > tolerance
            const heightChanged = Math.abs(lastResize.height - height) > tolerance

            if (!widthChanged && !heightChanged) {
              return // Skip if no significant change
            }
          }

          // Debounce the resize calls
          if (resizeTimeoutRef.current) {
            clearTimeout(resizeTimeoutRef.current)
          }

          resizeTimeoutRef.current = setTimeout(() => {
            try {
              const newDimensions = Dimensions.fromValues(width, height)
              lastResizeRef.current = { width, height }
              console.log('Update workspace dimensions not implemented:', newDimensions)
            } catch (error) {
              console.warn('Invalid workspace dimensions during resize:', error)
            }
          }, 100) // 100ms debounce
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
  }, [currentWorkspace])

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

  // Get workspace container classes based on layout mode (for inner document container)
  const getWorkspaceClasses = () => {
    const baseClasses = 'relative'

    let workspaceClasses
    switch (currentWorkspace.layoutMode) {
      case LayoutModeType.STACKED:
        workspaceClasses = `${baseClasses} workspace-stacked`
        break
      case LayoutModeType.GRID:
        workspaceClasses = `${baseClasses} workspace-grid`
        break
      case LayoutModeType.FREEFORM:
        workspaceClasses = `${baseClasses} workspace-freeform`
        break
      default:
        workspaceClasses = baseClasses
    }

    return workspaceClasses
  }

  // Render layout mode indicator
  const renderLayoutModeIndicator = () => (
    <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span className="font-medium">Layout:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          currentWorkspace.layoutMode === LayoutModeType.STACKED ? 'bg-blue-100 text-blue-800' :
          currentWorkspace.layoutMode === LayoutModeType.GRID ? 'bg-green-100 text-green-800' :
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

  // Render workspace statistics
  const renderWorkspaceStats = () => {
    const activeDocument = documents.find(doc => doc.isActive)
    const visibleDocuments = documents.filter(doc => doc.isVisible ?? true)

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
            <span className="font-medium">Workspace:</span> {currentWorkspace.workspaceDimensions.width}×{currentWorkspace.workspaceDimensions.height}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="multi-document-workspace flex flex-col h-full" data-testid="document-workspace-panel">
      {/* Command Bar */}
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

      {/* Workspace Area */}
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
              {/* Document Caddies */}
              {documents.map((document) => (
                <DocumentCaddy
                  key={document.id}
                  id={document.id}
                  title={document.title}
                  filePath={document.filePath}
                  position_x={document.position_x}
                  position_y={document.position_y}
                  width={document.width}
                  height={document.height}
                  z_index={document.z_index}
                  isActive={document.isActive}
                  isVisible={document.isVisible ?? true}
                  state={document.state ?? DocumentCaddyState.READY}
                  errorMessage={document.errorMessage}
                  isDraggable={document.isDraggable ?? true}
                  isResizable={document.isResizable ?? true}
                  onActivate={handleDocumentActivate}
                  onMove={handleDocumentMove}
                  onResize={handleDocumentResize}
                  onClose={handleDocumentClose}
                  onTitleChange={handleDocumentTitleChange}
                />
              ))}

              {/* Layout Mode Indicator */}
              {renderLayoutModeIndicator()}

              {/* Workspace Statistics */}
              {renderWorkspaceStats()}
            </>
          )}

          {/* Loading Overlay */}
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