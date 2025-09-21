import React, { useState } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useFileCategorization } from '../stores/fileCategorization'
import { useSectionVisibility } from '../stores/sectionVisibilityStore'

export const CategoryExplorer: React.FC = () => {
  const { createDocumentCaddy } = useWorkspaceStore()

  const {
    isDragging,
    dropTarget,
    isValidDrop,
    dropError,
    lastOperation,
    setDropTarget,
    setDropZoneHover,
    completeDrop,
    dropZoneStates
  } = useFileCategorization()

  const { isDragDropAvailable } = useSectionVisibility()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['category-a']))

  // Available categories for drop targets
  const categories = [
    { id: 'research', name: 'Research', key: 'category-research' },
    { id: 'documentation', name: 'Documentation', key: 'category-documentation' },
    { id: 'archive', name: 'Archive', key: 'category-archive' },
    { id: 'images', name: 'Images', key: 'category-images' }
  ]

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const handleFileClick = (filePath: string) => {
    createDocumentCaddy(filePath)
  }

  const handleDragEnter = (categoryKey: string) => {
    if (isDragging) {
      setDropZoneHover(categoryKey, true)
    }
  }

  const handleDragLeave = (categoryKey: string) => {
    if (isDragging) {
      setDropZoneHover(categoryKey, false)
    }
  }

  const handleDragOver = (e: React.DragEvent, categoryKey: string) => {
    e.preventDefault()
    if (isDragging) {
      setDropTarget(categoryKey)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    if (isDragging && isValidDrop) {
      await completeDrop()
    }
  }

  return (
    <div className="h-full flex flex-col border-2 border-green-300 bg-white" data-testid="category-explorer-panel">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Categories</h3>
        {isDragDropAvailable && isDragging && (
          <div className="text-xs text-blue-600 mt-1">
            Drop files here to categorize
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Dynamic Categories with Drop Target Support */}
        {categories.map((category) => {
          const dropZoneState = dropZoneStates[category.key] || {}
          const isDropTarget = dropTarget === category.key
          const canAcceptDrop = isDragDropAvailable && isDragging
          const isHovered = dropZoneState.isHovered
          const isValidTarget = dropZoneState.isValidTarget !== false

          return (
            <div key={category.id} className="mb-2">
              <div
                className={`flex items-center p-2 cursor-pointer rounded text-xs border-2 transition-all ${
                  canAcceptDrop && isValidTarget
                    ? isDropTarget && isValidDrop
                      ? 'border-green-400 bg-green-50 valid-drop'
                      : isHovered
                      ? 'border-blue-400 bg-blue-50 hovered'
                      : 'border-dashed border-gray-300 valid-drop-target'
                    : 'border-transparent hover:bg-gray-100'
                }`}
                onClick={() => toggleCategory(category.id)}
                onDragEnter={() => handleDragEnter(category.key)}
                onDragLeave={() => handleDragLeave(category.key)}
                onDragOver={(e) => handleDragOver(e, category.key)}
                onDrop={(e) => handleDrop(e)}
                data-testid={`drop-zone-${category.key}`}
                role={canAcceptDrop ? 'button' : undefined}
                aria-label={canAcceptDrop ? `Drop files to categorize as ${category.id}` : undefined}
              >
                <span className="text-blue-600 mr-2">
                  {expandedCategories.has(category.id) ? '📂' : '📁'}
                </span>
                <span className="font-medium">{category.name}</span>
                {canAcceptDrop && isValidTarget && (
                  <span className="ml-auto text-xs text-gray-500">Drop Zone</span>
                )}
              </div>

              {expandedCategories.has(category.id) && (
                <div className="ml-6 space-y-1">
                  <div className="text-xs text-gray-500 italic p-1">
                    Categorized files will appear here
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Legacy Categories for backward compatibility */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Legacy Categories</div>

          <div className="mb-2">
            <div
              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded text-xs"
              onClick={() => toggleCategory('category-a')}
            >
              <span className="text-blue-600 mr-2">
                {expandedCategories.has('category-a') ? '📂' : '📁'}
              </span>
              <span className="font-medium">Category A</span>
            </div>

            {expandedCategories.has('category-a') && (
              <div className="ml-6 space-y-1">
                <div
                  className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded text-xs"
                  onClick={() => handleFileClick('/demo/category-a/file1.md')}
                >
                  <span className="text-gray-600 mr-2">📄</span>
                  <span>File 1</span>
                </div>
                <div
                  className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded text-xs"
                  onClick={() => handleFileClick('/demo/category-a/file2.md')}
                >
                  <span className="text-gray-600 mr-2">📄</span>
                  <span>File 2</span>
                </div>
              </div>
            )}
          </div>

          <div className="mb-2">
            <div
              className="flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded text-xs"
              onClick={() => toggleCategory('category-b')}
            >
              <span className="text-blue-600 mr-2">
                {expandedCategories.has('category-b') ? '📂' : '📁'}
              </span>
              <span className="font-medium">Category B</span>
            </div>

            {expandedCategories.has('category-b') && (
              <div className="ml-6 space-y-1">
                <div
                  className="flex items-center p-1 hover:bg-gray-100 cursor-pointer rounded text-xs"
                  onClick={() => handleFileClick('/demo/category-b/file3.md')}
                >
                  <span className="text-gray-600 mr-2">📄</span>
                  <span>File 3</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        {dropError && (
          <div className="text-xs text-red-600 mb-1" data-testid="error-message">
            {dropError}
          </div>
        )}
        {lastOperation && lastOperation.status === 'success' && (
          <div className="text-xs text-green-600 mb-1" data-testid="success-message">
            {lastOperation.file.name} categorized as {lastOperation.category}
          </div>
        )}
        {lastOperation && lastOperation.status === 'error' && (
          <div className="text-xs text-red-600 mb-1" data-testid="error-message">
            Failed to categorize {lastOperation.file.name}: {lastOperation.error}
          </div>
        )}
        <div className="text-xs text-gray-600">
          {isDragDropAvailable
            ? isDragging
              ? 'Drop files on categories to assign'
              : 'Drag files from File Explorer to categorize'
            : 'Enable File Explorer to use drag-and-drop'
          }
        </div>
      </div>
    </div>
  )
}