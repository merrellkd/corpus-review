import { useCallback } from 'react';
import { useExtractionStore } from '../stores/extraction-store';
import { ExtractionError } from '../types';

/**
 * Custom hook for handling extraction-related errors
 */
export const useExtractionError = () => {
  const { error, clearError } = useExtractionStore();

  const handleError = useCallback((error: Error | ExtractionError | string) => {
    let errorMessage: string;

    if (typeof error === 'string') {
      errorMessage = error;
    } else if ('code' in error && 'message' in error) {
      // ExtractionError
      errorMessage = `${error.code}: ${error.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else {
      errorMessage = 'An unknown error occurred';
    }

    console.error('Extraction error:', errorMessage);
    // The error is already set in the store by the API calls
  }, []);

  const isExtractionError = useCallback((error: any): error is ExtractionError => {
    return error && typeof error.code === 'string' && typeof error.message === 'string';
  }, []);

  const getErrorMessage = useCallback((error: any): string => {
    if (typeof error === 'string') {
      return error;
    }

    if (isExtractionError(error)) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unknown error occurred';
  }, [isExtractionError]);

  const getErrorCode = useCallback((error: any): string | null => {
    if (isExtractionError(error)) {
      return error.code;
    }
    return null;
  }, [isExtractionError]);

  return {
    error,
    clearError,
    handleError,
    isExtractionError,
    getErrorMessage,
    getErrorCode,
    hasError: !!error
  };
};