import React from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { DocumentCaddy } from './DocumentCaddy'

export const DocumentWorkspace: React.FC = () => {
  const { documentCaddies } = useWorkspaceStore()

  return (
    <div className="h-full bg-gray-50 relative overflow-hidden" data-testid="document-workspace-panel">
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
  )
}