import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Position, Dimensions, DocumentState } from '../types'

export interface DocumentCaddyProps {
  id: string
  title: string
  filePath: string
  position: Position
  dimensions: Dimensions
  zIndex: number
  isActive: boolean
  isVisible: boolean
  state: DocumentState
  errorMessage?: string
  isDraggable: boolean
  isResizable: boolean
  onActivate: (id: string) => void
  onMove: (id: string, position: Position) => void
  onResize: (id: string, dimensions: Dimensions) => void
  onClose: (id: string) => void
  onTitleChange?: (id: string, newTitle: string) => void
  className?: string
}

export const DocumentCaddy: React.FC<DocumentCaddyProps> = ({
  id,
  title,
  filePath,
  position,
  dimensions,
  zIndex,
  isActive,
  isVisible,
  state,
  errorMessage,
  isDraggable,
  isResizable,
  onActivate,
  onMove,
  onResize,
  onClose,
  onTitleChange,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)

  const [localPosition, setLocalPosition] = useState<Position | null>(null)
  const [localDimensions, setLocalDimensions] = useState<Dimensions | null>(null)

  const caddyRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dragStartRef = useRef<{ clientX: number; clientY: number; originX: number; originY: number } | null>(null)
  const resizeStartRef = useRef<{ clientX: number; clientY: number; width: number; height: number } | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const visualUpdateRef = useRef<number | null>(null)

  useEffect(() => {
    setEditedTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const commitPosition = useCallback((newPosition: Position) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }
    rafIdRef.current = requestAnimationFrame(() => {
      onMove(id, newPosition)
    })
  }, [id, onMove])

  const commitDimensions = useCallback((newDimensions: Dimensions) => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }
    rafIdRef.current = requestAnimationFrame(() => {
      onResize(id, newDimensions)
    })
  }, [id, onResize])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isDraggable || isEditingTitle || state !== 'ready') {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    onActivate(id)

    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      originX: position.x,
      originY: position.y,
    }

    setIsDragging(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) {
        return
      }

      const deltaX = moveEvent.clientX - dragStartRef.current.clientX
      const deltaY = moveEvent.clientY - dragStartRef.current.clientY
      const nextPosition: Position = {
        x: Math.max(0, dragStartRef.current.originX + deltaX),
        y: Math.max(0, dragStartRef.current.originY + deltaY),
      }

      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current)
      }
      visualUpdateRef.current = requestAnimationFrame(() => {
        setLocalPosition(nextPosition)
      })

      commitPosition(nextPosition)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current)
        visualUpdateRef.current = null
      }

      setIsDragging(false)
      dragStartRef.current = null
      setLocalPosition(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [commitPosition, id, isDraggable, isEditingTitle, position.x, position.y, state, onActivate])

  const handleResizeMouseDown = useCallback((event: React.MouseEvent) => {
    if (!isResizable || state !== 'ready') {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    resizeStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      width: dimensions.width,
      height: dimensions.height,
    }

    setIsResizing(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeStartRef.current) {
        return
      }

      const deltaX = moveEvent.clientX - resizeStartRef.current.clientX
      const deltaY = moveEvent.clientY - resizeStartRef.current.clientY
      const nextDimensions: Dimensions = {
        width: Math.max(200, resizeStartRef.current.width + deltaX),
        height: Math.max(150, resizeStartRef.current.height + deltaY),
      }

      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current)
      }
      visualUpdateRef.current = requestAnimationFrame(() => {
        setLocalDimensions(nextDimensions)
      })

      commitDimensions(nextDimensions)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current)
        visualUpdateRef.current = null
      }

      setIsResizing(false)
      resizeStartRef.current = null
      setLocalDimensions(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [commitDimensions, dimensions.height, dimensions.width, isResizable, state])

  const handleTitleDoubleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    if (onTitleChange) {
      setIsEditingTitle(true)
    }
  }, [onTitleChange])

  const handleTitleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    if (onTitleChange) {
      onTitleChange(id, editedTitle.trim())
    }
    setIsEditingTitle(false)
  }, [editedTitle, id, onTitleChange])

  const handleTitleBlur = useCallback(() => {
    if (onTitleChange) {
      onTitleChange(id, editedTitle.trim())
    }
    setIsEditingTitle(false)
  }, [editedTitle, id, onTitleChange])

  const inlinePosition = localPosition ?? position
  const inlineDimensions = localDimensions ?? dimensions

  const caddyClasses = [
    'document-caddy absolute bg-white shadow-lg rounded-md border border-gray-200 overflow-hidden',
    isActive ? 'ring-2 ring-blue-500' : 'ring-1 ring-transparent',
    state === 'loading' ? 'opacity-75 pointer-events-none' : '',
    isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={caddyRef}
      className={caddyClasses}
      style={{
        left: inlinePosition.x,
        top: inlinePosition.y,
        width: inlineDimensions.width,
        height: inlineDimensions.height,
        zIndex,
      }}
      data-document-id={id}
      data-testid={`document-caddy-${id}`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 text-white cursor-move" onDoubleClick={handleTitleDoubleClick}>
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit} className="flex-1">
            <input
              ref={titleInputRef}
              className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 focus:outline-none"
              value={editedTitle}
              onChange={(event) => setEditedTitle(event.target.value)}
              onBlur={handleTitleBlur}
            />
          </form>
        ) : (
          <div className="flex flex-col">
            <span className="font-medium text-sm">{title}</span>
            <span className="text-xs text-gray-300 truncate" title={filePath}>{filePath}</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="text-gray-300 hover:text-white"
            onClick={(event) => {
              event.stopPropagation()
              onClose(id)
            }}
            aria-label="Close document"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100%-40px)] bg-white">
        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-xs text-gray-500">Loading document...</span>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm px-4 text-center">
            {errorMessage || 'Unable to load document'}
          </div>
        )}

        {state === 'ready' && (
          <div className="h-full bg-gray-50 flex items-center justify-center text-gray-400 text-xs">
            Document preview unavailable
          </div>
        )}
      </div>

      {isResizable && state === 'ready' && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-200 hover:bg-gray-300"
          data-testid="resize-handle-se"
          onMouseDown={handleResizeMouseDown}
        />
      )}
    </div>
  )
}
