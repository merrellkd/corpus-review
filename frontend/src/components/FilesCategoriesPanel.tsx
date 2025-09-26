import React from 'react'
import { useUiStore, uiSelectors } from '../stores/ui-store'
import { FileExplorer } from './FileExplorer'

export const FilesCategoriesPanel: React.FC = () => {
  const isFilesCategoriesPanelActive = useUiStore(uiSelectors.isFilesCategoriesPanelActive)
  const fileExplorerVisible = useUiStore(uiSelectors.fileExplorerVisible)
  const categoryExplorerVisible = useUiStore(uiSelectors.categoryExplorerVisible)
  const isDragDropAvailable = useUiStore(uiSelectors.isDragDropAvailable)
  const toggleFileExplorer = useUiStore(state => state.toggleFileExplorer)
  const toggleCategoryExplorer = useUiStore(state => state.toggleCategoryExplorer)

  // Don't render if panel is not active
  if (!isFilesCategoriesPanelActive) {
    return null
  }

  // Determine layout based on visible sections
  const getLayoutClass = () => {
    if (fileExplorerVisible && categoryExplorerVisible) return 'split-layout'
    if (fileExplorerVisible && !categoryExplorerVisible) return 'file-only-layout'
    if (!fileExplorerVisible && categoryExplorerVisible) return 'category-only-layout'
    return 'split-layout' // fallback
  }

  const showResizeHandle = fileExplorerVisible && categoryExplorerVisible
  const layoutClass = getLayoutClass()

  return (
    <div
      data-testid="files-categories-panel"
      className={`files-categories-panel flex flex-col h-full bg-white border-r border-gray-200 ${layoutClass}`}
      role="region"
      aria-label="Files and Categories Panel"
    >
      {/* Section Toggle Controls */}
      <div className="section-controls flex items-center justify-between p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            data-testid="file-explorer-toggle"
            className={`section-toggle px-3 py-1 text-sm rounded ${
              fileExplorerVisible
                ? 'active bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={toggleFileExplorer}
            aria-label="Toggle File Explorer section"
            aria-pressed={fileExplorerVisible}
          >
            File Explorer
          </button>

          <button
            data-testid="category-explorer-toggle"
            className={`section-toggle px-3 py-1 text-sm rounded ${
              categoryExplorerVisible
                ? 'active bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={toggleCategoryExplorer}
            aria-label="Toggle Category Explorer section"
            aria-pressed={categoryExplorerVisible}
          >
            Category Explorer
          </button>
        </div>
      </div>

      {/* Sections Container */}
      <div className="sections-container flex-1 flex flex-col">
        {/* File Explorer Section */}
        {fileExplorerVisible && (
          <div
            data-testid="file-explorer-section"
            className="file-explorer-section bg-white overflow-hidden"
            style={{ height: showResizeHandle ? '50%' : '100%' }}
          >
            <div className="section-header p-2 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">File Explorer</h3>
            </div>
            <div className="section-content h-full">
              <FileExplorer />
            </div>
          </div>
        )}

        {/* Section Resize Handle */}
        {showResizeHandle && (
          <div
            data-testid="section-resize-handle"
            className="section-resize-handle h-1 bg-gray-300 hover:bg-blue-400 cursor-row-resize"
            onMouseDown={(e) => {
              // Basic resize implementation - will be enhanced later
              const startY = e.clientY
              const startHeight = 50 // Default 50/50 split

              const handleMouseMove = (e: MouseEvent) => {
                const deltaY = e.clientY - startY
                const target = e.currentTarget as HTMLElement
                const containerHeight = target?.parentElement?.clientHeight || 300
                const deltaPercent = (deltaY / containerHeight) * 100
                const newHeight = Math.max(10, Math.min(90, startHeight + deltaPercent))

                // For now, just visual feedback - could implement persistence later
                const fileSection = target.previousElementSibling as HTMLElement
                const categorySection = target.nextElementSibling as HTMLElement
                if (fileSection && categorySection) {
                  fileSection.style.height = `${newHeight}%`
                  categorySection.style.height = `${100 - newHeight}%`
                }
              }

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove)
                document.removeEventListener('mouseup', handleMouseUp)
              }

              document.addEventListener('mousemove', handleMouseMove)
              document.addEventListener('mouseup', handleMouseUp)
            }}
          />
        )}

        {/* Category Explorer Section */}
        {categoryExplorerVisible && (
          <div
            data-testid="category-explorer-section"
            className="category-explorer-section bg-white overflow-hidden"
            style={{ height: showResizeHandle ? '50%' : '100%' }}
          >
            <div className="section-header p-2 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">Category Explorer</h3>
            </div>
            <div className="section-content p-2">
              {/* Category Explorer content will be implemented later */}
              <div className="text-gray-500 text-sm">
                Category management interface will be displayed here
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drag-Drop Status */}
      <div className="drag-drop-status p-2 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600">
          {isDragDropAvailable
            ? 'Drag files from File Explorer to Category Explorer to categorize them'
            : 'Show both File Explorer and Category Explorer to enable drag-and-drop categorization'
          }
        </div>
      </div>
    </div>
  )
}
