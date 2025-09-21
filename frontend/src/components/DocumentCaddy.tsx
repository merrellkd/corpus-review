import React, { useState, useRef, useCallback } from 'react'
import { useWorkspaceStore } from '../stores/workspaceStore'

interface DocumentCaddyDto {
  id: string
  title: string
  filePath: string
  content?: string
  isActive: boolean
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  z_index?: number
}

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
    updateDocumentCaddy(caddy.id, { position_x: newX, position_y: newY })
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
      className={`absolute bg-white border-2 border-dashed border-gray-400 rounded-lg shadow-lg ${
        isDragging ? 'shadow-xl border-blue-500' : ''
      } ${caddy.isActive ? 'border-blue-500' : ''}`}
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
      <div className="p-4 h-[calc(100%-41px)] overflow-auto bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">
          <div className="text-lg mb-2">📄</div>
          <div className="text-sm font-medium">{caddy.title}</div>
        </div>
      </div>
    </div>
  )
}