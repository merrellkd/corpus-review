import React, { useState } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export const CategoryExplorer: React.FC = () => {
  const { createDocumentCaddy } = useWorkspaceStore()
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['category-a']))

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

  return (
    <div className="h-full flex flex-col border-2 border-green-300 bg-white" data-testid="category-explorer-panel">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700">Categories</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-1">
        {/* Category A */}
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

        {/* Category B */}
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
  )
}