import React, { useState, useEffect } from 'react';
import {
  isWorkspaceDomainError,
  isRecoverableError,
  getUserMessage,
  getErrorCode
} from '../../domain/errors/workspace-errors';
import { TauriErrorHandler } from '../../application/tauri-workspace-adapter';

export interface ErrorFeedbackProps {
  error: unknown;
  operation?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  onConfirm?: (data: any) => void;
  className?: string;
  showDetails?: boolean;
}

/**
 * Error feedback component for displaying user-friendly error messages
 */
export const ErrorFeedback: React.FC<ErrorFeedbackProps> = ({
  error,
  operation = 'operation',
  onRetry,
  onDismiss,
  onConfirm,
  className = '',
  showDetails = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(null);

  const errorSummary = TauriErrorHandler.createErrorSummary(error, operation);
  const isRetryable = TauriErrorHandler.isRetryableError(error);
  const requiresConfirmation = TauriErrorHandler.requiresConfirmation(error);

  // Auto-hide non-critical errors after 5 seconds
  useEffect(() => {
    if (errorSummary.recoverable && !requiresConfirmation && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      setAutoHideTimer(timer);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [errorSummary.recoverable, requiresConfirmation, onDismiss]);

  // Clear auto-hide timer if user interacts
  const handleUserInteraction = () => {
    if (autoHideTimer) {
      clearTimeout(autoHideTimer);
      setAutoHideTimer(null);
    }
  };

  const getErrorIcon = () => {
    switch (errorSummary.code) {
      case 'WORKSPACE_NOT_FOUND':
      case 'DOCUMENT_NOT_FOUND':
      case 'DOCUMENT_PATH_NOT_FOUND':
        return '🔍';
      case 'PERMISSION_DENIED':
      case 'FILE_ACCESS_ERROR':
        return '🔒';
      case 'DOCUMENT_ALREADY_OPEN':
      case 'WORKSPACE_NAME_EXISTS':
        return '⚠️';
      case 'INVALID_LAYOUT_MODE':
      case 'INVALID_POSITION':
      case 'INVALID_DIMENSIONS':
        return '📐';
      case 'CONFIRMATION_REQUIRED':
        return '❓';
      case 'PERSISTENCE_ERROR':
        return '💾';
      default:
        return errorSummary.recoverable ? '⚠️' : '❌';
    }
  };

  const getErrorSeverity = () => {
    if (requiresConfirmation) return 'info';
    if (errorSummary.recoverable) return 'warning';
    return 'error';
  };

  const getSeverityStyles = () => {
    const severity = getErrorSeverity();

    switch (severity) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const handleRetry = () => {
    handleUserInteraction();
    if (onRetry) {
      onRetry();
    }
  };

  const handleDismiss = () => {
    handleUserInteraction();
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleConfirm = () => {
    handleUserInteraction();
    if (onConfirm && isWorkspaceDomainError(error) && error.code === 'CONFIRMATION_REQUIRED') {
      onConfirm((error as any).confirmationData);
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 ${getSeverityStyles()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg" role="img" aria-label="Error icon">
            {getErrorIcon()}
          </span>
        </div>

        <div className="ml-3 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">
              {requiresConfirmation ? 'Confirmation Required' : 'Error'}
            </h3>

            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="ml-4 text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            )}
          </div>

          <div className="mt-2 text-sm">
            <p>{errorSummary.userMessage}</p>
          </div>

          {showDetails && (
            <div className="mt-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </button>

              {isExpanded && (
                <div className="mt-2 p-3 bg-white bg-opacity-50 rounded border">
                  <dl className="space-y-1 text-xs">
                    <div>
                      <dt className="font-medium">Error Code:</dt>
                      <dd className="font-mono">{errorSummary.code}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Operation:</dt>
                      <dd>{errorSummary.operation}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Timestamp:</dt>
                      <dd>{errorSummary.timestamp.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Technical Details:</dt>
                      <dd className="font-mono text-gray-600">{errorSummary.message}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex space-x-2">
            {requiresConfirmation && onConfirm && (
              <button
                onClick={handleConfirm}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Confirm
              </button>
            )}

            {isRetryable && onRetry && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Retry
              </button>
            )}

            {onDismiss && !requiresConfirmation && (
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Toast notification component for brief error messages
 */
export interface ErrorToastProps {
  error: unknown;
  duration?: number;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  duration = 3000,
  onClose,
  position = 'top-right'
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const userMessage = getUserMessage(error);
  const errorCode = getErrorCode(error);
  const isRetryable = isRecoverableError(error);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // Allow animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };


  return (
    <div
      className={`fixed z-50 ${getPositionStyles()} transition-all duration-300 ${
        isLeaving ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'
      }`}
    >
      <div className={`max-w-sm rounded-lg shadow-lg border p-4 ${
        isRetryable ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-lg" role="img" aria-label="Error">
              {isRetryable ? '⚠️' : '❌'}
            </span>
          </div>

          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${
              isRetryable ? 'text-yellow-800' : 'text-red-800'
            }`}>
              {userMessage}
            </p>

            {errorCode !== 'UNKNOWN_ERROR' && (
              <p className={`text-xs mt-1 font-mono ${
                isRetryable ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {errorCode}
              </p>
            )}
          </div>

          <button
            onClick={() => {
              setIsLeaving(true);
              setTimeout(onClose, 300);
            }}
            className={`ml-4 text-sm ${
              isRetryable ? 'text-yellow-600 hover:text-yellow-800' : 'text-red-600 hover:text-red-800'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Inline error component for form fields and small spaces
 */
export interface InlineErrorProps {
  error: unknown;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  className = ''
}) => {
  const userMessage = getUserMessage(error);
  const isRetryable = isRecoverableError(error);

  return (
    <div className={`flex items-center text-sm ${
      isRetryable ? 'text-yellow-600' : 'text-red-600'
    } ${className}`}>
      <span className="mr-1" role="img" aria-label="Error">
        {isRetryable ? '⚠️' : '❌'}
      </span>
      <span>{userMessage}</span>
    </div>
  );
};

export default ErrorFeedback;