import React from 'react'

export const CategoryExplorer: React.FC = () => {
  return (
    <div className="h-full p-3" data-testid="category-explorer-panel">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Categories</h3>
      <div className="text-xs text-gray-500">
        Category-based file organization coming soon...
      </div>
    </div>
  )
}