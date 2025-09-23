import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceId, DocumentCaddyId } from '../../domain/value-objects/identifiers';
import { Position, Dimensions } from '../../domain/value-objects/geometry';
import { LayoutModeType, DocumentLayoutResult } from '../../domain/value-objects/layout-mode';
import { DocumentCaddyState } from '../../domain/entities/document-caddy';
import { WorkspaceCommandBar } from '../components/WorkspaceCommandBar';
import { DocumentCaddy } from '../components/DocumentCaddy';

/**
 * Document caddy data for UI rendering
 */
export interface DocumentCaddyUIData {
  id: string;
  title: string;
  filePath: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  zIndex: number;
  isActive: boolean;
  isVisible: boolean;
  state: DocumentCaddyState;
  errorMessage?: string;
  isDraggable: boolean;
  isResizable: boolean;
}

/**
 * Props for the MultiDocumentWorkspace component
 */
export interface MultiDocumentWorkspaceProps {
  workspaceId: string;
  workspaceName: string;
  currentLayoutMode: LayoutModeType;
  documents: DocumentCaddyUIData[];
  workspaceDimensions: { width: number; height: number };
  isLoading?: boolean;
  disabled?: boolean;
  onLayoutModeChange: (mode: LayoutModeType) => void;
  onAddDocument: () => void;
  onRemoveDocument: (documentId: string) => void;
  onRemoveAllDocuments: () => void;
  onSaveWorkspace: () => void;
  onLoadWorkspace: () => void;
  onActivateDocument: (documentId: string) => void;
  onMoveDocument: (documentId: string, position: Position) => void;
  onResizeDocument: (documentId: string, dimensions: Dimensions) => void;
  onTitleChange?: (documentId: string, newTitle: string) => void;
  onWorkspaceResize?: (dimensions: Dimensions) => void;
  className?: string;
}

/**
 * Container component for the Multi-Document Workspace
 * Orchestrates the workspace UI and manages document layout
 */
export const MultiDocumentWorkspace: React.FC<MultiDocumentWorkspaceProps> = ({
  workspaceId,
  workspaceName,
  currentLayoutMode,
  documents,
  workspaceDimensions,
  isLoading = false,
  disabled = false,
  onLayoutModeChange,
  onAddDocument,
  onRemoveDocument,
  onRemoveAllDocuments,
  onSaveWorkspace,
  onLoadWorkspace,
  onActivateDocument,
  onMoveDocument,
  onResizeDocument,
  onTitleChange,
  onWorkspaceResize,
  className = '',
}) => {
  const [isWorkspaceResizing, setIsWorkspaceResizing] = useState(false);
  const [dragPreview, setDragPreview] = useState<{
    documentId: string;
    position: { x: number; y: number };
  } | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Handle workspace resize observation
  useEffect(() => {
    if (!workspaceRef.current || !onWorkspaceResize) {
      return;
    }

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          try {
            const newDimensions = Dimensions.fromValues(width, height);
            onWorkspaceResize(newDimensions);
          } catch (error) {
            console.warn('Invalid workspace dimensions during resize:', error);
          }
        }
      }
    });

    resizeObserverRef.current.observe(workspaceRef.current);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [onWorkspaceResize]);

  // Handle document activation
  const handleDocumentActivate = useCallback((documentId: string) => {
    onActivateDocument(documentId);
  }, [onActivateDocument]);

  // Handle document movement with validation
  const handleDocumentMove = useCallback((documentId: string, position: Position) => {
    // Validate position is within workspace bounds
    const maxX = Math.max(0, workspaceDimensions.width - 200); // Minimum visible width
    const maxY = Math.max(0, workspaceDimensions.height - 100); // Minimum visible height

    const boundedX = Math.max(0, Math.min(position.getX(), maxX));
    const boundedY = Math.max(0, Math.min(position.getY(), maxY));

    try {
      const boundedPosition = Position.fromCoordinates(boundedX, boundedY);
      onMoveDocument(documentId, boundedPosition);
    } catch (error) {
      console.warn('Invalid position during document move:', error);
    }
  }, [onMoveDocument, workspaceDimensions]);

  // Handle document resizing with validation
  const handleDocumentResize = useCallback((documentId: string, dimensions: Dimensions) => {
    // Validate minimum and maximum dimensions
    const minWidth = 200;
    const minHeight = 150;
    const maxWidth = workspaceDimensions.width;
    const maxHeight = workspaceDimensions.height;

    const boundedWidth = Math.max(minWidth, Math.min(dimensions.getWidth(), maxWidth));
    const boundedHeight = Math.max(minHeight, Math.min(dimensions.getHeight(), maxHeight));

    try {
      const boundedDimensions = Dimensions.fromValues(boundedWidth, boundedHeight);
      onResizeDocument(documentId, boundedDimensions);
    } catch (error) {
      console.warn('Invalid dimensions during document resize:', error);
    }
  }, [onResizeDocument, workspaceDimensions]);

  // Handle document close
  const handleDocumentClose = useCallback((documentId: string) => {
    onRemoveDocument(documentId);
  }, [onRemoveDocument]);

  // Handle document title change
  const handleDocumentTitleChange = useCallback((documentId: string, newTitle: string) => {
    if (onTitleChange) {
      onTitleChange(documentId, newTitle);
    }
  }, [onTitleChange]);

  // Get workspace container classes based on layout mode
  const getWorkspaceClasses = () => {
    const baseClasses = 'relative w-full h-full overflow-hidden bg-gray-50';

    switch (currentLayoutMode) {
      case LayoutModeType.STACKED:
        return `${baseClasses} workspace-stacked`;
      case LayoutModeType.GRID:
        return `${baseClasses} workspace-grid`;
      case LayoutModeType.FREEFORM:
        return `${baseClasses} workspace-freeform`;
      default:
        return baseClasses;
    }
  };

  // Get document container styles
  const getDocumentContainerStyle = (): React.CSSProperties => {
    return {
      width: workspaceDimensions.width,
      height: workspaceDimensions.height,
      position: 'relative',
    };
  };

  // Render empty state
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <div className="text-center max-w-md">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No documents</h3>
        <p className="mt-2 text-sm text-gray-600">
          Add documents to get started with your multi-document workspace.
        </p>
        <button
          type="button"
          onClick={onAddDocument}
          disabled={disabled || isLoading}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Document
        </button>
      </div>
    </div>
  );

  // Render layout mode indicator
  const renderLayoutModeIndicator = () => (
    <div className="absolute top-4 right-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span className="font-medium">Layout:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          currentLayoutMode === LayoutModeType.STACKED ? 'bg-blue-100 text-blue-800' :
          currentLayoutMode === LayoutModeType.GRID ? 'bg-green-100 text-green-800' :
          'bg-purple-100 text-purple-800'
        }`}>
          {currentLayoutMode}
        </span>
        {documents.length > 0 && (
          <>
            <span className="text-gray-400">•</span>
            <span>{documents.length} {documents.length === 1 ? 'document' : 'documents'}</span>
          </>
        )}
      </div>
    </div>
  );

  // Render workspace statistics
  const renderWorkspaceStats = () => {
    const activeDocument = documents.find(doc => doc.isActive);
    const visibleDocuments = documents.filter(doc => doc.isVisible);

    return (
      <div className="absolute bottom-4 left-4 z-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span>
            <span className="font-medium">Visible:</span> {visibleDocuments.length}/{documents.length}
          </span>
          {activeDocument && (
            <span>
              <span className="font-medium">Active:</span> {activeDocument.title}
            </span>
          )}
          <span>
            <span className="font-medium">Workspace:</span> {workspaceDimensions.width}×{workspaceDimensions.height}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`multi-document-workspace flex flex-col h-full ${className}`}>
      {/* Command Bar */}
      <WorkspaceCommandBar
        currentLayoutMode={currentLayoutMode}
        documentCount={documents.length}
        onLayoutModeChange={onLayoutModeChange}
        onAddDocument={onAddDocument}
        onRemoveAllDocuments={onRemoveAllDocuments}
        onSaveWorkspace={onSaveWorkspace}
        onLoadWorkspace={onLoadWorkspace}
        isLoading={isLoading}
        disabled={disabled}
      />

      {/* Workspace Area */}
      <div className="flex-1 relative">
        <div
          ref={workspaceRef}
          className={getWorkspaceClasses()}
          style={getDocumentContainerStyle()}
          data-testid={`workspace-${workspaceId}`}
          role="application"
          aria-label={`Multi-document workspace: ${workspaceName}`}
          tabIndex={-1}
        >
          {documents.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Document Caddies */}
              {documents.map((document) => (
                <DocumentCaddy
                  key={document.id}
                  id={document.id}
                  title={document.title}
                  filePath={document.filePath}
                  position={document.position}
                  dimensions={document.dimensions}
                  zIndex={document.zIndex}
                  isActive={document.isActive}
                  isVisible={document.isVisible}
                  state={document.state}
                  errorMessage={document.errorMessage}
                  isDraggable={document.isDraggable}
                  isResizable={document.isResizable}
                  onActivate={handleDocumentActivate}
                  onMove={handleDocumentMove}
                  onResize={handleDocumentResize}
                  onClose={handleDocumentClose}
                  onTitleChange={handleDocumentTitleChange}
                />
              ))}

              {/* Layout Mode Indicator */}
              {renderLayoutModeIndicator()}

              {/* Workspace Statistics */}
              {renderWorkspaceStats()}
            </>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
              <div className="flex flex-col items-center space-y-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Loading workspace...</span>
              </div>
            </div>
          )}

          {/* Disabled Overlay */}
          {disabled && !isLoading && (
            <div className="absolute inset-0 bg-gray-100 bg-opacity-50 z-40" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiDocumentWorkspace;