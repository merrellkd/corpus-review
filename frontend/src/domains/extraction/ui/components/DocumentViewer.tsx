import React from 'react';
import { DocumentType, DocumentPreview } from '../../types';

interface DocumentViewerProps {
  preview: DocumentPreview;
  className?: string;
  onError?: (error: string) => void;
}

/**
 * Read-only document viewer for original files (PDF, DOCX, Markdown)
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  preview,
  className = '',
  onError
}) => {
  const handleError = (error: string) => {
    console.error('Document viewer error:', error);
    if (onError) {
      onError(error);
    }
  };

  const renderContent = () => {
    try {
      switch (preview.fileType) {
        case DocumentType.PDF:
          return <PDFViewer preview={preview} onError={handleError} />;
        case DocumentType.DOCX:
          return <DOCXViewer preview={preview} onError={handleError} />;
        case DocumentType.Markdown:
          return <MarkdownViewer preview={preview} onError={handleError} />;
        default:
          return (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <div className="text-4xl mb-2">📄</div>
                <p>Unsupported file type: {preview.fileType}</p>
              </div>
            </div>
          );
      }
    } catch (error) {
      handleError(error instanceof Error ? error.message : 'Unknown error');
      return (
        <div className="flex items-center justify-center h-64 text-red-500">
          <div className="text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <p>Failed to display document</p>
            <p className="text-sm text-gray-500 mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`document-viewer ${className}`}>
      {/* Document Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getFileTypeIcon(preview.fileType)}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{preview.fileName}</h3>
              <p className="text-xs text-gray-500">
                {formatFileSize(preview.fileSizeBytes)} • {preview.fileType}
                {preview.pageCount && ` • ${preview.pageCount} pages`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
              Read-only
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Document Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

/**
 * PDF document viewer component
 */
const PDFViewer: React.FC<{ preview: DocumentPreview; onError: (error: string) => void }> = ({
  preview,
  onError
}) => {
  return (
    <div className="pdf-viewer p-4">
      <div className="bg-white border border-gray-200 rounded-lg">
        {preview.previewContent ? (
          <div className="p-6">
            <div className="text-sm text-gray-600 mb-4">PDF Preview:</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.previewContent }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📕</div>
              <p>PDF preview not available</p>
              <p className="text-sm mt-1">Extract the document to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * DOCX document viewer component
 */
const DOCXViewer: React.FC<{ preview: DocumentPreview; onError: (error: string) => void }> = ({
  preview,
  onError
}) => {
  return (
    <div className="docx-viewer p-4">
      <div className="bg-white border border-gray-200 rounded-lg">
        {preview.previewContent ? (
          <div className="p-6">
            <div className="text-sm text-gray-600 mb-4">Word Document Preview:</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.previewContent }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <div className="text-4xl mb-2">📘</div>
              <p>Word document preview not available</p>
              <p className="text-sm mt-1">Extract the document to view its content</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Markdown document viewer component
 */
const MarkdownViewer: React.FC<{ preview: DocumentPreview; onError: (error: string) => void }> = ({
  preview,
  onError
}) => {
  return (
    <div className="markdown-viewer p-4">
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          <div className="text-sm text-gray-600 mb-4">Markdown Preview:</div>
          {preview.previewContent ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.previewContent }}
            />
          ) : (
            <div className="text-gray-500 text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p>Markdown preview not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Get appropriate icon for file type
 */
const getFileTypeIcon = (fileType: DocumentType) => {
  const iconClass = "w-6 h-6";

  switch (fileType) {
    case DocumentType.PDF:
      return (
        <svg className={`${iconClass} text-red-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          <path d="M8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1z" />
        </svg>
      );
    case DocumentType.DOCX:
      return (
        <svg className={`${iconClass} text-blue-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          <path d="M8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1z" />
        </svg>
      );
    case DocumentType.Markdown:
      return (
        <svg className={`${iconClass} text-green-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          <path d="M8 8a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm0 3a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1z" />
        </svg>
      );
    default:
      return (
        <svg className={`${iconClass} text-gray-600`} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
  }
};

/**
 * Format file size helper
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};