import React, { useState, useCallback } from 'react'
import { layoutModes } from '../types'
import type { LayoutModeType } from '../types'

export interface WorkspaceCommandBarProps {
  currentLayoutMode: LayoutModeType
  documentCount: number
  onLayoutModeChange: (mode: LayoutModeType) => void
  onRemoveAllDocuments: () => void
  onSaveWorkspace: () => void
  onLoadWorkspace: () => void
  isLoading?: boolean
  disabled?: boolean
  className?: string
}

export const WorkspaceCommandBar: React.FC<WorkspaceCommandBarProps> = ({
  currentLayoutMode,
  documentCount,
  onLayoutModeChange,
  onRemoveAllDocuments,
  onSaveWorkspace,
  onLoadWorkspace,
  isLoading = false,
  disabled = false,
  className = '',
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState(false)

  const handleLayoutModeClick = useCallback((mode: LayoutModeType) => {
    if (!disabled && !isLoading) {
      onLayoutModeChange(mode)
    }
  }, [disabled, isLoading, onLayoutModeChange])

  const handleRemoveAllClick = useCallback(() => {
    if (documentCount > 0) {
      setShowConfirmClear(true)
    }
  }, [documentCount])

  const confirmRemoveAll = useCallback(() => {
    onRemoveAllDocuments()
    setShowConfirmClear(false)
  }, [onRemoveAllDocuments])

  const cancelRemoveAll = useCallback(() => {
    setShowConfirmClear(false)
  }, [])

  const getLayoutModeButtonClass = useCallback((mode: LayoutModeType) => {
    const baseClass = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200'
    const isActive = currentLayoutMode === mode

    if (disabled || isLoading) {
      return `${baseClass} bg-gray-100 text-gray-400 cursor-not-allowed`
    }

    if (isActive) {
      return `${baseClass} bg-blue-600 text-white shadow-sm`
    }

    return `${baseClass} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:text-gray-900`
  }, [currentLayoutMode, disabled, isLoading])

  const getActionButtonClass = useCallback((variant: 'primary' | 'secondary' | 'danger' = 'secondary') => {
    const baseClass = 'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'

    switch (variant) {
      case 'primary':
        return `${baseClass} bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600`
      case 'danger':
        return `${baseClass} bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600`
      default:
        return `${baseClass} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:hover:bg-white`
    }
  }, [])

  return (
    <div
      className={`workspace-command-bar bg-white border-b border-gray-200 p-4 ${className}`}
      data-testid="workspace-command-bar"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <span className="text-sm font-medium text-gray-700 mr-3">Layout:</span>

          <button
            type="button"
            data-testid="layout-mode-stacked"
            onClick={() => handleLayoutModeClick(layoutModes.STACKED)}
            className={getLayoutModeButtonClass(layoutModes.STACKED)}
            disabled={disabled || isLoading}
            title="Stacked Layout - Only active document visible"
            aria-label="Switch to stacked layout mode"
          >
            Stacked
          </button>

          <button
            type="button"
            data-testid="layout-mode-grid"
            onClick={() => handleLayoutModeClick(layoutModes.GRID)}
            className={getLayoutModeButtonClass(layoutModes.GRID)}
            disabled={disabled || isLoading}
            title="Grid Layout - Documents arranged in grid"
            aria-label="Switch to grid layout mode"
          >
            Grid
          </button>

          <button
            type="button"
            data-testid="layout-mode-freeform"
            onClick={() => handleLayoutModeClick(layoutModes.FREEFORM)}
            className={getLayoutModeButtonClass(layoutModes.FREEFORM)}
            disabled={disabled || isLoading}
            title="Freeform Layout - Documents positioned freely"
            aria-label="Switch to freeform layout mode"
          >
            Freeform
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {documentCount > 0 && (
              <button
                type="button"
                onClick={handleRemoveAllClick}
                className={getActionButtonClass('danger')}
                disabled={disabled || isLoading}
                title="Remove all documents from workspace"
                aria-label="Remove all documents"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
            <button
              type="button"
              onClick={onSaveWorkspace}
              className={getActionButtonClass('secondary')}
              disabled={disabled || isLoading}
              title="Save current workspace state"
              aria-label="Save workspace"
            >
              Save
            </button>

            <button
              type="button"
              onClick={onLoadWorkspace}
              className={getActionButtonClass('secondary')}
              disabled={disabled || isLoading}
              title="Load saved workspace state"
              aria-label="Load workspace"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {currentLayoutMode === layoutModes.FREEFORM && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          💡 Tip: Drag or resize documents to arrange them freely. The layout will auto-switch to freeform when you manipulate documents in other modes.
        </div>
      )}

      {showConfirmClear && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Remove All Documents?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              This will remove all {documentCount} documents from the workspace. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={cancelRemoveAll}
                className={getActionButtonClass('secondary')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveAll}
                className={getActionButtonClass('danger')}
              >
                Remove All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
