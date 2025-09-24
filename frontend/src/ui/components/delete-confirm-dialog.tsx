/**
 * DeleteConfirmDialog Component
 *
 * Modal dialog for confirming project deletion with detailed information
 * about what will be deleted and safety warnings.
 */

import React, { useState, useEffect } from 'react';
import { Project } from '../../domains/project';

// ====================
// Types
// ====================

export interface DeleteConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** The project(s) to be deleted */
  projects: Project | Project[];

  /** Whether the deletion is in progress */
  isDeleting?: boolean;

  /** Error message if deletion failed */
  error?: string;

  /** Custom title for the dialog */
  title?: string;

  /** Custom message for the dialog */
  message?: string;

  /** Whether to show detailed project information */
  showDetails?: boolean;

  /** Whether to require typing confirmation */
  requireConfirmation?: boolean;

  /** Custom confirmation text to type */
  confirmationText?: string;

  /** Event handlers */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  onClose: () => void;

  /** Custom styling */
  className?: string;
}

// ====================
// Component
// ====================

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  projects,
  isDeleting = false,
  error,
  title,
  message,
  showDetails = true,
  requireConfirmation = false,
  confirmationText = 'DELETE',
  onConfirm,
  onCancel,
  onClose,
  className = '',
}) => {
  // ====================
  // State
  // ====================

  const [confirmInput, setConfirmInput] = useState('');
  const [isConfirmValid, setIsConfirmValid] = useState(false);

  // ====================
  // Computed Properties
  // ====================

  const projectList = Array.isArray(projects) ? projects : [projects];
  const isMultipleProjects = projectList.length > 1;
  const projectCount = projectList.length;

  const defaultTitle = isMultipleProjects
    ? `Delete ${projectCount} Projects`
    : `Delete Project`;

  const defaultMessage = isMultipleProjects
    ? `Are you sure you want to delete ${projectCount} projects? This action cannot be undone.`
    : `Are you sure you want to delete "${projectList[0]?.name.value}"? This action cannot be undone.`;

  // ====================
  // Effects
  // ====================

  useEffect(() => {
    if (requireConfirmation) {
      setIsConfirmValid(confirmInput.trim() === confirmationText);
    } else {
      setIsConfirmValid(true);
    }
  }, [confirmInput, confirmationText, requireConfirmation]);

  // Reset confirmation input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmInput('');
    }
  }, [isOpen]);

  // ====================
  // Event Handlers
  // ====================

  const handleConfirm = async () => {
    if (isConfirmValid && !isDeleting) {
      try {
        await onConfirm();
      } catch (error) {
        // Error handling is done by parent component
        console.error('Delete confirmation error:', error);
      }
    }
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleConfirmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmInput(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && isConfirmValid) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // ====================
  // Render
  // ====================

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
    >
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full max-h-full overflow-auto ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {/* Warning Icon */}
            <div className="mr-3 text-red-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-gray-900">
              {title || defaultTitle}
            </h2>
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Main Message */}
          <p id="delete-dialog-description" className="text-gray-700 mb-4">
            {message || defaultMessage}
          </p>

          {/* Project Details */}
          {showDetails && (
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                {isMultipleProjects ? 'Projects to be deleted:' : 'Project details:'}
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {projectList.map((project) => (
                  <div key={project.id.value} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{project.name.value}</span>
                      <span className="text-gray-500 text-xs">
                        {project.createdAt.formatDate()}
                      </span>
                    </div>
                    <div className="text-gray-600 text-xs truncate" title={project.sourceFolder.value}>
                      📁 {project.sourceFolder.display(50)}
                    </div>
                    {project.note && (
                      <div className="text-gray-500 text-xs mt-1">
                        📝 {project.note.preview(60)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confirmation Input */}
          {requireConfirmation && (
            <div className="mb-4">
              <label htmlFor="confirm-input" className="block text-sm font-medium text-gray-700 mb-2">
                Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono text-xs">
                  {confirmationText}
                </code> to confirm deletion:
              </label>
              <input
                id="confirm-input"
                type="text"
                value={confirmInput}
                onChange={handleConfirmInputChange}
                disabled={isDeleting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={`Type "${confirmationText}" here`}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <div className="text-red-500 mr-2">
                  <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-800">Deletion Failed</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <div className="flex items-start">
              <div className="text-yellow-500 mr-2">
                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Warning</p>
                <p className="text-yellow-700 mt-1">
                  This will permanently delete {isMultipleProjects ? 'these projects' : 'this project'} from the database.
                  The actual files and folders will remain untouched.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
          {/* Cancel Button */}
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {/* Delete Button */}
          <button
            onClick={handleConfirm}
            disabled={isDeleting || !isConfirmValid}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete {isMultipleProjects ? `${projectCount} Projects` : 'Project'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ====================
// Variants
// ====================

/**
 * Simple delete confirmation dialog without detailed information
 */
export const SimpleDeleteConfirmDialog: React.FC<Omit<DeleteConfirmDialogProps, 'showDetails' | 'requireConfirmation'>> = (props) => {
  return (
    <DeleteConfirmDialog
      {...props}
      showDetails={false}
      requireConfirmation={false}
    />
  );
};

/**
 * Strict delete confirmation dialog that requires typing confirmation
 */
export const StrictDeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = (props) => {
  return (
    <DeleteConfirmDialog
      {...props}
      requireConfirmation={true}
    />
  );
};

// ====================
// Default Export
// ====================

export default DeleteConfirmDialog;