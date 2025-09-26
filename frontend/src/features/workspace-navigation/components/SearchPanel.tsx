import React, { useState } from 'react'
import { useWorkspaceNavigationStore } from '../store'
import { useWorkspaceStore as useDocumentWorkspaceStore } from '../../../domains/workspace/ui/stores/workspace-store'
import { useUiStore, uiSelectors } from '../../../stores/ui-store'

export const SearchPanel: React.FC = () => {
  const {
    searchResults,
    searchFiles,
    searchQuery,
  } = useWorkspaceNavigationStore()

  const { addDocument } = useDocumentWorkspaceStore()

  const isSearchPanelActive = useUiStore(uiSelectors.isSearchPanelActive)

  const [query, setQuery] = useState('')

  const handleSearch = () => {
    if (query.trim()) {
      searchFiles(query.trim())
    }
  }

  const handleFileClick = (filePath: string) => {
    addDocument(filePath)
  }

  // Don't render if this panel is not active due to mutually exclusive behavior
  if (!isSearchPanelActive) {
    return null
  }

  return (
    <div className="h-full flex flex-col border-2 border-purple-300 bg-white" data-testid="search-panel">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Search</h3>

        {/* Search input */}
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={!query.trim()}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            Search
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 ? (
          <div className="p-3 text-xs text-gray-500">
            {searchQuery ? 'No results found' : 'Enter a search term to find files'}
          </div>
        ) : (
          <div className="p-1">
            {searchResults.map((item: any) => (
              <div
                key={item.path}
                onClick={() => handleFileClick(item.path)}
                className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer rounded text-xs"
                data-testid={`search-result-${item.name}`}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <span className="w-4 h-4 flex-shrink-0 text-gray-600">📄</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{item.name}</div>
                    <div className="truncate text-gray-500 text-xs">{item.path}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 ml-2 flex-shrink-0">
                  {item.formatted_size}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with search stats */}
      <div className="px-3 py-2 bg-purple-50 border-t border-purple-200">
        <div className="text-xs text-purple-700">
          {searchResults.length > 0
            ? `Found ${searchResults.length} results`
            : query
            ? 'No results found'
            : 'Search across project files'
          }
        </div>
      </div>
    </div>
  )
}
