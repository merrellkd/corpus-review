import React, { useEffect } from 'react'
import { useFileCategorization } from '../stores/fileCategorization'
import { useUnifiedPanelState } from '../stores/unifiedPanelState'

export const DragDropCategorizationWorkflow: React.FC = () => {
  const {
    isDragging,
    draggedFile,
    dropTarget,
    isValidDrop,
    dropError,
    dragPreview,
    dropZoneStates,
    lastOperation,
    startDrag,
    setDropTarget,
    completeDrop,
    cancelDrag,
    setDropZoneHover
  } = useFileCategorization()

  const { isDragDropAvailable } = useUnifiedPanelState()

  // Sample file data - in real implementation this would come from file explorer
  const sampleFiles = [
    { path: '/project/source/document.pdf', name: 'document.pdf', type: 'file' as const, size: 1024 }
  ]

  // Sample categories - in real implementation this would come from category store
  const sampleCategories = [
    { id: 'category-research', name: 'Research' },
    { id: 'category-documentation', name: 'Documentation' },
    { id: 'invalid-target', name: 'Invalid' }
  ]

  // Handle ESC key to cancel drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        cancelDrag()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDragging, cancelDrag])

  // Handle drag end outside valid drop zones
  useEffect(() => {
    const handleDragEnd = () => {
      if (isDragging && !isValidDrop) {
        cancelDrag()
      }
    }

    document.addEventListener('dragend', handleDragEnd)
    return () => document.removeEventListener('dragend', handleDragEnd)
  }, [isDragging, isValidDrop, cancelDrag])

  const handleDragStart = (file: any) => {
    if (!isDragDropAvailable) return

    startDrag(file)
  }

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault()
    setDropTarget(categoryId)
  }

  const handleDragEnter = (categoryId: string) => {
    setDropZoneHover(categoryId, true)
  }

  const handleDragLeave = (categoryId: string) => {
    setDropZoneHover(categoryId, false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (isValidDrop) {
      completeDrop()
    }
  }

  return (
    <div className="drag-drop-workflow">
      {/* ARIA Live Region for Announcements */}
      <div
        data-testid="drag-announcements"
        className="sr-only"
        aria-live="polite"
      >
        {isDragging && draggedFile && `Dragging ${draggedFile.name}`}
      </div>

      {/* Sample File Items */}
      <div className="file-items mb-4">
        <h4 className="font-medium mb-2">Files</h4>
        {sampleFiles.map((file) => (
          <div
            key={file.path}
            data-testid={`file-item-${file.name}`}
            className="file-item p-2 bg-gray-100 rounded cursor-move hover:bg-gray-200"
            draggable={isDragDropAvailable}
            tabIndex={0}
            onDragStart={() => handleDragStart(file)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Keyboard categorization interface would open here
              }
            }}
          >
            {file.name}
          </div>
        ))}
      </div>

      {/* Sample Category Drop Zones */}
      <div className="category-drop-zones">
        <h4 className="font-medium mb-2">Categories</h4>
        {sampleCategories.map((category) => {
          const zoneState = dropZoneStates[category.id] || {}
          const isHovered = zoneState.isHovered
          const isValidTarget = zoneState.isValidTarget
          const canAcceptDrop = zoneState.canAcceptDrop

          return (
            <div
              key={category.id}
              data-testid={`drop-zone-${category.id}`}
              className={`drop-zone p-4 border-2 border-dashed rounded mb-2 ${
                isDragging && canAcceptDrop && isValidTarget
                  ? 'valid-drop-target border-blue-400 bg-blue-50'
                  : 'border-gray-300'
              } ${
                isHovered && isValidTarget ? 'hovered bg-blue-100' : ''
              } ${
                dropTarget === category.id && isValidDrop ? 'valid-drop bg-green-100 border-green-400' : ''
              }`}
              role="button"
              aria-label={`Drop files to categorize as ${category.name.toLowerCase()}`}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragEnter={() => handleDragEnter(category.id)}
              onDragLeave={() => handleDragLeave(category.id)}
              onDrop={handleDrop}
            >
              {category.name}
            </div>
          )
        })}
      </div>

      {/* Drag Preview */}
      {isDragging && dragPreview && (
        <div
          data-testid="drag-preview"
          className="drag-preview fixed pointer-events-none z-50 bg-white border border-gray-300 rounded shadow-lg p-2"
          style={{
            top: '50px',
            left: '50px'
          }}
        >
          <div className="font-medium">{dragPreview.fileName}</div>
          <div className="text-sm text-gray-600">{dragPreview.fileType}</div>
        </div>
      )}

      {/* Operation Feedback */}
      {lastOperation && lastOperation.status === 'success' && (
        <div
          data-testid="success-message"
          className="success-message p-2 bg-green-100 border border-green-400 rounded text-green-800 mt-4"
        >
          {lastOperation.file.name} categorized as {lastOperation.category}
        </div>
      )}

      {lastOperation && lastOperation.status === 'error' && (
        <div
          data-testid="error-message"
          className="error-message p-2 bg-red-100 border border-red-400 rounded text-red-800 mt-4"
        >
          Failed to categorize {lastOperation.file.name}: {lastOperation.error}
        </div>
      )}

      {/* Drop Error */}
      {dropError && (
        <div className="drop-error p-2 bg-yellow-100 border border-yellow-400 rounded text-yellow-800 mt-4">
          {dropError}
        </div>
      )}
    </div>
  )
}