import React, { useState, useRef, useCallback } from 'react'
import { useWorkspaceStore, DocumentCaddyDto } from '@/stores/workspaceStore'

interface DocumentCaddyProps {
  caddy: DocumentCaddyDto
}

export const DocumentCaddy: React.FC<DocumentCaddyProps> = ({ caddy }) => {
  const { updateDocumentCaddy } = useWorkspaceStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const caddyRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!caddyRef.current) return

    setIsDragging(true)
    const rect = caddyRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !caddyRef.current) return

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Update position immediately for smooth dragging
    caddyRef.current.style.left = `${newX}px`
    caddyRef.current.style.top = `${newY}px`
  }, [isDragging, dragOffset])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return

    setIsDragging(false)

    const newX = e.clientX - dragOffset.x
    const newY = e.clientY - dragOffset.y

    // Update position in store
    updateDocumentCaddy(caddy.id, newX, newY)
  }, [isDragging, dragOffset, caddy.id, updateDocumentCaddy])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
    return undefined
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={caddyRef}
      className={`absolute bg-white border border-gray-300 rounded-lg shadow-lg ${
        isDragging ? 'shadow-xl' : ''
      } ${caddy.is_active ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        left: `${caddy.position_x}px`,
        top: `${caddy.position_y}px`,
        width: `${caddy.width}px`,
        height: `${caddy.height}px`,
        zIndex: caddy.z_index,
      }}
      data-testid={`document-caddy-${caddy.id}`}
    >
      {/* Header with drag handle */}
      <div
        className="bg-gray-100 border-b border-gray-200 px-3 py-2 rounded-t-lg cursor-move flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 truncate">
            {caddy.title}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button className="text-gray-400 hover:text-gray-600 text-xs">
            —
          </button>
          <button className="text-gray-400 hover:text-gray-600 text-xs">
            ✕
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-3 h-[calc(100%-41px)] overflow-auto">
        <div className="text-xs text-gray-600 mb-2">
          {caddy.file_path}
        </div>
        <div className="text-sm text-gray-900">
          {/* Placeholder content - in a real implementation, this would load and display the file */}
          <p>Document content for {caddy.title} would be displayed here.</p>
          <p className="mt-2 text-xs text-gray-500">
            File: {caddy.file_path}
          </p>
        </div>
      </div>
    </div>
  )
}