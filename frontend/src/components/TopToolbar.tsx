import React from 'react'
import { useUnifiedPanelState } from '../stores/ui'

export const TopToolbar: React.FC = () => {
  const {
    isFilesCategoriesPanelActive,
    isSearchPanelActive,
    toggleFilesCategories,
    toggleSearch
  } = useUnifiedPanelState()

  return (
    <div
      data-testid="top-toolbar"
      className="h-12 bg-gray-50 border-b border-gray-200 flex items-center px-4"
    >
      {/* Panel Toggle Controls */}
      <div
        data-testid="panel-toggles"
        className="flex items-center space-x-2"
      >
        <button
          data-testid="files-categories-toggle-button"
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isFilesCategoriesPanelActive
              ? 'active bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={toggleFilesCategories}
          aria-label="Toggle Files & Categories panel"
          aria-pressed={isFilesCategoriesPanelActive}
        >
          Files & Categories
        </button>

        <button
          data-testid="search-toggle-button"
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            isSearchPanelActive
              ? 'active bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={toggleSearch}
          aria-label="Toggle Search panel"
          aria-pressed={isSearchPanelActive}
        >
          Search
        </button>
      </div>
    </div>
  )
}