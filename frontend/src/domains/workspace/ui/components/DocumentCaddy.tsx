import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentCaddyId } from '../../domain/value-objects/identifiers';
import { Position, Dimensions } from '../../domain/value-objects/geometry';
import { DocumentCaddyState } from '../../domain/entities/document-caddy';

/**
 * Props for the DocumentCaddy component
 */
export interface DocumentCaddyProps {
  id: string;
  title: string;
  filePath: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  z_index?: number;
  isActive: boolean;
  isVisible: boolean;
  state: DocumentCaddyState;
  errorMessage?: string;
  isDraggable: boolean;
  isResizable: boolean;
  onActivate: (id: string) => void;
  onMove: (id: string, position: Position) => void;
  onResize: (id: string, dimensions: Dimensions) => void;
  onClose: (id: string) => void;
  onTitleChange?: (id: string, newTitle: string) => void;
  className?: string;
}

/**
 * DocumentCaddy component represents a document container in the workspace
 * Supports dragging, resizing, and document content display
 */
export const DocumentCaddy: React.FC<DocumentCaddyProps> = ({
  id,
  title,
  filePath,
  position_x = 0,
  position_y = 0,
  width = 300,
  height = 200,
  z_index = 1,
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
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  // Local state for immediate visual feedback during drag/resize
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const [localDimensions, setLocalDimensions] = useState<{ width: number; height: number } | null>(null);

  const caddyRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; startWidth: number; startHeight: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const visualUpdateRef = useRef<number | null>(null);

  // Update edited title when title prop changes
  useEffect(() => {
    setEditedTitle(title);
  }, [title]);


  // Focus title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable || isEditingTitle || state !== DocumentCaddyState.READY) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Activate this caddy
    onActivate(id);

    // Start dragging - capture current position at the moment of mouse down
    const dragData = {
      x: e.clientX,
      y: e.clientY,
      startX: position_x,
      startY: position_y,
    };

    dragStartRef.current = dragData;
    setIsDragging(true);

    // Attach event listeners immediately
    const handleMouseMove = (e: MouseEvent) => {
      if (dragStartRef.current) {
        const dragStart = dragStartRef.current;
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        const newX = Math.max(0, dragStart.startX + deltaX);
        const newY = Math.max(0, dragStart.startY + deltaY);

        // Throttle visual feedback to reduce re-renders
        if (visualUpdateRef.current) {
          cancelAnimationFrame(visualUpdateRef.current);
        }
        visualUpdateRef.current = requestAnimationFrame(() => {
          setLocalPosition({ x: newX, y: newY });
        });

        // Throttle parent callbacks at lower frequency
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          try {
            const newPosition = Position.fromCoordinates(newX, newY);
            onMove(id, newPosition);
          } catch (error) {
            console.warn('Invalid position during drag:', error);
          }
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
        visualUpdateRef.current = null;
      }
      setIsDragging(false);
      dragStartRef.current = null;
      setLocalPosition(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDraggable, isEditingTitle, state, onActivate, id, position_x, position_y, onMove]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isResizable || state !== DocumentCaddyState.READY) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const resizeData = {
      x: e.clientX,
      y: e.clientY,
      startWidth: width,
      startHeight: height,
    };

    resizeStartRef.current = resizeData;
    setIsResizing(true);

    // Attach event listeners immediately
    const handleMouseMove = (e: MouseEvent) => {
      if (resizeStartRef.current) {
        const resizeStart = resizeStartRef.current;
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(200, resizeStart.startWidth + deltaX);
        const newHeight = Math.max(150, resizeStart.startHeight + deltaY);

        // Throttle visual feedback to reduce re-renders
        if (visualUpdateRef.current) {
          cancelAnimationFrame(visualUpdateRef.current);
        }
        visualUpdateRef.current = requestAnimationFrame(() => {
          setLocalDimensions({ width: newWidth, height: newHeight });
        });

        // Throttle parent callbacks at lower frequency
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          try {
            const newDimensions = Dimensions.fromValues(newWidth, newHeight);
            onResize(id, newDimensions);
          } catch (error) {
            console.warn('Invalid dimensions during resize:', error);
          }
        });
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (visualUpdateRef.current) {
        cancelAnimationFrame(visualUpdateRef.current);
        visualUpdateRef.current = null;
      }
      setIsResizing(false);
      resizeStartRef.current = null;
      setLocalDimensions(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isResizable, state, width, height, onResize, id]);

  // Old useEffect-based mouse handling removed - now handled directly in mouse down events

  const handleTitleDoubleClick = useCallback(() => {
    if (onTitleChange && state === DocumentCaddyState.READY) {
      setIsEditingTitle(true);
    }
  }, [onTitleChange, state]);

  const handleTitleSubmit = useCallback(() => {
    if (onTitleChange && editedTitle.trim() && editedTitle.trim() !== title) {
      onTitleChange(id, editedTitle.trim());
    }
    setIsEditingTitle(false);
  }, [onTitleChange, editedTitle, title, id]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditedTitle(title);
      setIsEditingTitle(false);
    }
  }, [handleTitleSubmit, title]);

  const handleActivateClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onActivate(id);
  }, [onActivate, id]);

  const handleCloseClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose(id);
  }, [onClose, id]);

  const getStateIndicator = () => {
    switch (state) {
      case DocumentCaddyState.LOADING:
        return (
          <div className="flex items-center space-x-2 text-blue-600">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Loading...</span>
          </div>
        );
      case DocumentCaddyState.ERROR:
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Error</span>
          </div>
        );
      case DocumentCaddyState.CLOSING:
        return (
          <div className="flex items-center space-x-2 text-gray-600">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm">Closing...</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getCaddyClasses = () => {
    const baseClasses = `document-caddy absolute bg-white border border-gray-300 rounded-lg shadow-lg ${className}`;
    const stateClasses = {
      [DocumentCaddyState.READY]: isActive ? 'border-blue-500 shadow-xl' : 'hover:border-gray-400',
      [DocumentCaddyState.LOADING]: 'border-blue-300 bg-blue-50',
      [DocumentCaddyState.ERROR]: 'border-red-300 bg-red-50',
      [DocumentCaddyState.CLOSING]: 'border-gray-200 bg-gray-50 opacity-75',
    };

    const interactionClasses = [];
    if (isDraggable && state === DocumentCaddyState.READY) {
      interactionClasses.push('draggable');
    }
    if (isResizable && state === DocumentCaddyState.READY) {
      interactionClasses.push('resizable');
    }
    if (isDragging) {
      interactionClasses.push('cursor-grabbing');
    } else if (isDraggable && state === DocumentCaddyState.READY) {
      interactionClasses.push('cursor-grab');
    }

    return `${baseClasses} ${stateClasses[state]} ${interactionClasses.join(' ')}`;
  };

  const style: React.CSSProperties = {
    left: localPosition?.x ?? position_x,
    top: localPosition?.y ?? position_y,
    width: localDimensions?.width ?? width,
    height: localDimensions?.height ?? height,
    zIndex: z_index,
    display: isVisible ? 'block' : 'none',
  };


  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={caddyRef}
      className={getCaddyClasses()}
      style={style}
      onMouseDown={handleMouseDown}
      onClick={handleActivateClick}
      data-testid={`document-${id}`}
      role="document"
      aria-label={`Document: ${title}`}
      tabIndex={isActive ? 0 : -1}
    >
      {/* Title Bar */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <div className="flex-shrink-0">
            <svg className="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={handleTitleKeyDown}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Edit document title"
              />
            ) : (
              <h3
                className="text-sm font-medium text-gray-900 truncate cursor-pointer"
                onDoubleClick={handleTitleDoubleClick}
                title={`${title} - ${filePath}`}
              >
                {title}
              </h3>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {getStateIndicator()}

          <button
            onClick={handleCloseClick}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
            aria-label="Close document"
            title="Close document"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 overflow-hidden">
        {state === DocumentCaddyState.ERROR && errorMessage ? (
          <div className="text-red-600 text-sm">
            <p className="font-medium">Error loading document:</p>
            <p className="mt-1">{errorMessage}</p>
          </div>
        ) : state === DocumentCaddyState.READY ? (
          <div className="text-gray-600 text-sm">
            <p className="mb-2">Document: {filePath}</p>
            <div className="bg-gray-100 p-3 rounded text-xs">
              <p>Document content would be rendered here</p>
              <p className="mt-1 text-gray-500">
                Implementation would include PDF viewer, text editor, or other document-specific rendering
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <span>Loading document content...</span>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      {isResizable && state === DocumentCaddyState.READY && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-gray-300 hover:bg-gray-400 cursor-se-resize rounded-tl-lg"
          onMouseDown={handleResizeMouseDown}
          title="Resize document"
          aria-label="Resize document"
        >
          <svg className="w-3 h-3 text-gray-600 absolute bottom-0.5 right-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6L6 10l4 4 4-4-4-4z" />
          </svg>
        </div>
      )}

      {/* Active Document Indicator */}
      {isActive && (
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg animate-pulse" />
      )}
    </div>
  );
};

export default DocumentCaddy;