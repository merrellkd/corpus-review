import React from 'react'
import { useSectionVisibility } from '../stores/sectionVisibilityStore'

export const FilesCategoriesPanel: React.FC = () => {
  const {
    fileExplorerSectionVisible,
    categoryExplorerSectionVisible,
    shouldShowPanel,
    dragDropStatusMessage,
    sectionLayout,
    toggleFileExplorerSection,
    toggleCategoryExplorerSection,
    resizeSections
  } = useSectionVisibility()

  // Don't render if both sections are hidden
  if (!shouldShowPanel) {
    return null
  }

  const layoutClass = {
    'split': 'split-layout',
    'file-only': 'file-only-layout',
    'category-only': 'category-only-layout'
  }[sectionLayout?.layout || 'split']

  const showResizeHandle = fileExplorerSectionVisible && categoryExplorerSectionVisible

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
              fileExplorerSectionVisible
                ? 'active bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={toggleFileExplorerSection}
            aria-label="Toggle File Explorer section"
            aria-pressed={fileExplorerSectionVisible}
          >
            File Explorer
          </button>

          <button
            data-testid="category-explorer-toggle"
            className={`section-toggle px-3 py-1 text-sm rounded ${
              categoryExplorerSectionVisible
                ? 'active bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={toggleCategoryExplorerSection}
            aria-label="Toggle Category Explorer section"
            aria-pressed={categoryExplorerSectionVisible}
          >
            Category Explorer
          </button>
        </div>
      </div>

      {/* Sections Container */}
      <div className="sections-container flex-1 flex flex-col">
        {/* File Explorer Section */}
        {fileExplorerSectionVisible && (
          <div
            data-testid="file-explorer-section"
            className="file-explorer-section bg-white overflow-hidden"
            style={{ height: `${sectionLayout?.fileExplorerHeight || 50}%` }}
          >
            <div className="section-header p-2 bg-gray-50 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">File Explorer</h3>
            </div>
            <div className="section-content p-2">
              {/* File Explorer content will be implemented later */}
              <div className="text-gray-500 text-sm">
                File tree view will be displayed here
              </div>
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
              const startHeight = sectionLayout?.fileExplorerHeight || 50

              const handleMouseMove = (e: MouseEvent) => {
                const deltaY = e.clientY - startY
                const target = e.currentTarget as HTMLElement
                const containerHeight = target?.parentElement?.clientHeight || 300
                const deltaPercent = (deltaY / containerHeight) * 100
                const newHeight = Math.max(10, Math.min(90, startHeight + deltaPercent))

                resizeSections?.({ fileExplorer: newHeight })
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
        {categoryExplorerSectionVisible && (
          <div
            data-testid="category-explorer-section"
            className="category-explorer-section bg-white overflow-hidden"
            style={{ height: `${sectionLayout?.categoryExplorerHeight || 50}%` }}
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
          {dragDropStatusMessage}
        </div>
      </div>
    </div>
  )
}