import { useCallback } from 'react';
import { useWorkspaceStore } from './useWorkspaceStore';
import {
  WorkspaceDomainError,
  isWorkspaceDomainError,
  getUserMessage,
  getErrorCode,
  isRecoverableError
} from '../../domain/errors/workspace-errors';

/**
 * Hook for handling workspace errors in components
 */
export const useWorkspaceErrors = () => {
  const errorState = useWorkspaceStore((state) => state.errorState);
  const clearError = useWorkspaceStore((state) => state.clearError);
  const retryLastOperation = useWorkspaceStore((state) => state.retryLastOperation);
  const isErrorRecoverable = useWorkspaceStore((state) => state.isErrorRecoverable);

  /**
   * Check if there's currently an error
   */
  const hasError = errorState !== null;

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback(() => {
    if (!errorState) return null;
    return errorState.userMessage;
  }, [errorState]);

  /**
   * Get error code for debugging/logging
   */
  const getErrorCodeValue = useCallback(() => {
    if (!errorState) return null;
    return errorState.code;
  }, [errorState]);

  /**
   * Check if current error is recoverable
   */
  const canRetry = useCallback(() => {
    if (!errorState?.error) return false;
    return isErrorRecoverable(errorState.error);
  }, [isErrorRecoverable, errorState]);

  /**
   * Retry the last failed operation
   */
  const handleRetry = useCallback(async () => {
    try {
      retryLastOperation();
      return true;
    } catch (error) {
      console.error('Retry failed:', error);
      return false;
    }
  }, [retryLastOperation]);

  /**
   * Dismiss the current error
   */
  const handleDismiss = useCallback(() => {
    clearError();
  }, [clearError]);

  /**
   * Get detailed error information
   */
  const getErrorDetails = useCallback(() => {
    if (!errorState) return null;

    return {
      operation: errorState.operation,
      timestamp: errorState.timestamp,
      recoverable: errorState.recoverable,
      code: errorState.code,
      context: errorState.context,
    };
  }, [errorState]);

  /**
   * Check if error is of a specific type
   */
  const isErrorType = useCallback((errorCode: string) => {
    return errorState?.code === errorCode;
  }, [errorState]);

  /**
   * Check if error is related to a specific operation
   */
  const isOperationError = useCallback((operation: string) => {
    return errorState?.operation === operation;
  }, [errorState]);

  return {
    // State
    hasError,
    errorState,

    // Getters
    getErrorMessage,
    getErrorCode: getErrorCodeValue,
    getErrorDetails,

    // Checks
    canRetry,
    isErrorType,
    isOperationError,

    // Actions
    handleRetry,
    handleDismiss,
    clearError,
  };
};

/**
 * Hook for showing error notifications/toasts
 */
export const useErrorNotification = () => {
  const { hasError, errorState, handleDismiss } = useWorkspaceErrors();

  /**
   * Show error as toast notification
   */
  const showErrorToast = useCallback((
    error: unknown,
    operation: string,
    options: {
      duration?: number;
      position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
      autoHide?: boolean;
    } = {}
  ) => {
    const {
      duration = 5000,
      position = 'top-right',
      autoHide = true
    } = options;

    // Create a custom event for the toast system
    const toastEvent = new CustomEvent('workspace-error-toast', {
      detail: {
        error,
        operation,
        duration,
        position,
        autoHide,
        userMessage: getUserMessage(error),
        code: getErrorCode(error),
        recoverable: isRecoverableError(error),
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(toastEvent);
    }
  }, []);

  /**
   * Show current error state as toast
   */
  const showCurrentErrorToast = useCallback((options?: Parameters<typeof showErrorToast>[2]) => {
    if (hasError && errorState) {
      showErrorToast(errorState.error, errorState.operation, options);
    }
  }, [hasError, errorState, showErrorToast]);

  return {
    showErrorToast,
    showCurrentErrorToast,
    hasError,
    errorState,
    dismissError: handleDismiss,
  };
};

/**
 * Hook for handling async operations with error handling
 */
export const useAsyncOperation = () => {
  const setError = useWorkspaceStore((state) => state.setError);

  /**
   * Execute an async operation with automatic error handling
   */
  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: any
  ): Promise<T | null> => {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
      return null;
    }
  }, [setError]);

  /**
   * Execute operation with retry logic
   */
  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      context?: any;
    } = {}
  ): Promise<T | null> => {
    const { maxRetries = 3, retryDelay = 1000, context } = options;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // If it's the last attempt or error is not recoverable, give up
        if (attempt === maxRetries || !isRecoverableError(error)) {
          break;
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    // Set error and return null
    setError(lastError instanceof Error ? lastError.message : String(lastError));
    return null;
  }, [setError]);

  return {
    executeWithErrorHandling,
    executeWithRetry,
  };
};

export default useWorkspaceErrors;