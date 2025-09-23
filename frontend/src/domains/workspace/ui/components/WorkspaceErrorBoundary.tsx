import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFeedback } from './ErrorFeedback';
import { TauriErrorHandler } from '../../application/tauri-workspace-adapter';
import {
  WorkspaceDomainError,
  isWorkspaceDomainError,
  getUserMessage,
  getErrorCode
} from '../../domain/errors/workspace-errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Error boundary for workspace-related errors
 * Provides graceful error handling and recovery options
 */
export class WorkspaceErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error details for debugging
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorSummary = TauriErrorHandler.createErrorSummary(error, 'ui_error_boundary');

    console.group('🚨 Workspace Error Boundary');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.table({
      'Error Code': errorSummary.code,
      'User Message': errorSummary.userMessage,
      'Recoverable': errorSummary.recoverable,
      'Timestamp': errorSummary.timestamp.toISOString(),
    });
    console.groupEnd();

    // Send to analytics/monitoring service if available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('workspace_error_boundary', {
        error_code: errorSummary.code,
        error_message: errorSummary.message,
        user_message: errorSummary.userMessage,
        recoverable: errorSummary.recoverable,
        component_stack: errorInfo.componentStack,
        retry_count: this.retryCount,
      });
    }
  };

  private handleRetry = () => {
    if (this.retryCount >= this.maxRetries) {
      console.warn(`Maximum retries (${this.maxRetries}) exceeded for error boundary`);
      return;
    }

    this.retryCount++;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private canRetry = (): boolean => {
    if (!this.state.error) return false;

    // Check if it's a recoverable domain error
    if (isWorkspaceDomainError(this.state.error)) {
      return this.state.error.recoverable && this.retryCount < this.maxRetries;
    }

    // For non-domain errors, allow retry for certain types
    const retryableErrors = [
      'ChunkLoadError',
      'TypeError: Failed to fetch',
      'NetworkError',
    ];

    return (
      this.retryCount < this.maxRetries &&
      retryableErrors.some(retryableError =>
        this.state.error!.message.includes(retryableError) ||
        this.state.error!.name.includes(retryableError)
      )
    );
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.canRetry();
      const userMessage = getUserMessage(this.state.error);
      const errorCode = getErrorCode(this.state.error);

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="text-center">
              <span className="text-6xl" role="img" aria-label="Error">
                🚨
              </span>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                We apologize for the inconvenience. The workspace encountered an unexpected error.
              </p>
            </div>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <ErrorFeedback
                error={this.state.error}
                operation="workspace_operation"
                onRetry={canRetry ? this.handleRetry : undefined}
                onDismiss={this.handleDismiss}
                showDetails={this.props.showDetails}
                className="mb-6"
              />

              <div className="mt-6">
                <div className="grid grid-cols-1 gap-3">
                  {canRetry && (
                    <button
                      onClick={this.handleRetry}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Retry ({this.maxRetries - this.retryCount} attempts left)
                    </button>
                  )}

                  <button
                    onClick={this.handleReload}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleDismiss}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Continue Anyway
                  </button>
                </div>
              </div>

              {this.props.showDetails && this.state.errorInfo && (
                <details className="mt-6 text-sm text-gray-500">
                  <summary className="cursor-pointer font-medium text-gray-700">
                    Technical Details
                  </summary>
                  <div className="mt-3 space-y-2">
                    <div>
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div>
                      <strong>Error Code:</strong> {errorCode}
                    </div>
                    <div>
                      <strong>Message:</strong> {this.state.error.message}
                    </div>
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: unknown) => {
    if (error instanceof Error) {
      setError(error);
    } else {
      setError(new Error(String(error)));
    }
  }, []);

  return { handleError, resetError };
};

/**
 * Higher-order component for error boundary
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <WorkspaceErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </WorkspaceErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

export default WorkspaceErrorBoundary;