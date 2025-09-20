import React from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { DocumentCaddy } from './DocumentCaddy'

export const DocumentWorkspace: React.FC = () => {
  const { documentCaddies } = useWorkspaceStore()

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden flex flex-col border-2 border-red-300" data-testid="document-workspace-panel">
      {/* Document workspace header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-center">
        <h2 className="text-lg font-medium text-gray-900">Multi-Document Workspace</h2>
      </div>

      {/* Document workspace content */}
      <div className="flex-1 relative">
        {documentCaddies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium mb-2">Document Workspace</p>
              <p className="text-sm">Open files from the explorer to start working</p>
            </div>
          </div>
        ) : (
          <>
            {documentCaddies.map((caddy: any) => (
              <DocumentCaddy key={caddy.id} caddy={caddy} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}