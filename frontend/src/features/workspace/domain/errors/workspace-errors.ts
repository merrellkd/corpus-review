/**
 * Domain-specific error types for workspace operations
 * Based on contract specifications from workspace-commands.json
 */

/**
 * Base class for all workspace domain errors
 */
export abstract class WorkspaceDomainError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    userMessage: string,
    recoverable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.userMessage = userMessage;
    this.recoverable = recoverable;
    this.timestamp = new Date();
  }
}

/**
 * Workspace-related errors
 */
export class WorkspaceNotFoundError extends WorkspaceDomainError {
  constructor(workspaceId: string) {
    super(
      'WORKSPACE_NOT_FOUND',
      `Workspace not found: ${workspaceId}`,
      'The requested workspace could not be found. It may have been deleted or moved.',
      false
    );
  }
}

export class WorkspaceNameAlreadyExistsError extends WorkspaceDomainError {
  constructor(name: string) {
    super(
      'WORKSPACE_NAME_EXISTS',
      `Workspace name already exists: ${name}`,
      `A workspace with the name "${name}" already exists. Please choose a different name.`,
      true
    );
  }
}

export class InvalidWorkspaceNameError extends WorkspaceDomainError {
  constructor(name: string, reason: string) {
    super(
      'INVALID_WORKSPACE_NAME',
      `Invalid workspace name: ${name} - ${reason}`,
      `The workspace name "${name}" is invalid. ${reason}`,
      true
    );
  }
}

/**
 * Document-related errors
 */
export class DocumentNotFoundError extends WorkspaceDomainError {
  constructor(documentId: string) {
    super(
      'DOCUMENT_NOT_FOUND',
      `Document not found: ${documentId}`,
      'The requested document could not be found in the workspace.',
      false
    );
  }
}

export class DocumentPathNotFoundError extends WorkspaceDomainError {
  constructor(filePath: string) {
    super(
      'DOCUMENT_PATH_NOT_FOUND',
      `Document path not found: ${filePath}`,
      `The file "${filePath}" could not be found. It may have been moved, deleted, or the path is incorrect.`,
      true
    );
  }
}

export class DocumentAlreadyOpenError extends WorkspaceDomainError {
  constructor(filePath: string) {
    super(
      'DOCUMENT_ALREADY_OPEN',
      `Document already open: ${filePath}`,
      `The document "${filePath}" is already open in the workspace.`,
      true
    );
  }
}

export class InvalidDocumentPathError extends WorkspaceDomainError {
  constructor(filePath: string, reason: string) {
    super(
      'INVALID_DOCUMENT_PATH',
      `Invalid document path: ${filePath} - ${reason}`,
      `The document path "${filePath}" is invalid. ${reason}`,
      true
    );
  }
}

/**
 * Layout-related errors
 */
export class InvalidLayoutModeError extends WorkspaceDomainError {
  constructor(layoutMode: string) {
    super(
      'INVALID_LAYOUT_MODE',
      `Invalid layout mode: ${layoutMode}`,
      `The layout mode "${layoutMode}" is not supported. Please choose from: stacked, grid, or freeform.`,
      true
    );
  }
}

export class InvalidPositionError extends WorkspaceDomainError {
  constructor(x: number, y: number, reason: string) {
    super(
      'INVALID_POSITION',
      `Invalid position: (${x}, ${y}) - ${reason}`,
      `The position (${x}, ${y}) is invalid. ${reason}`,
      true
    );
  }
}

export class InvalidDimensionsError extends WorkspaceDomainError {
  constructor(width: number, height: number, reason: string) {
    super(
      'INVALID_DIMENSIONS',
      `Invalid dimensions: ${width}x${height} - ${reason}`,
      `The dimensions ${width}x${height} are invalid. ${reason}`,
      true
    );
  }
}

/**
 * Operation-specific errors
 */
export class ConfirmationRequiredError extends WorkspaceDomainError {
  public readonly confirmationData: any;

  constructor(operation: string, confirmationData: any) {
    super(
      'CONFIRMATION_REQUIRED',
      `Confirmation required for operation: ${operation}`,
      `This operation requires confirmation. Please confirm to proceed.`,
      true
    );
    this.confirmationData = confirmationData;
  }
}

export class WorkspaceOperationError extends WorkspaceDomainError {
  public readonly operation: string;
  public readonly context: any;

  constructor(operation: string, message: string, userMessage: string, context?: any) {
    super(
      'WORKSPACE_OPERATION_ERROR',
      `Operation failed: ${operation} - ${message}`,
      userMessage,
      false
    );
    this.operation = operation;
    this.context = context;
  }
}

/**
 * File system errors
 */
export class FileAccessError extends WorkspaceDomainError {
  constructor(filePath: string, reason: string) {
    super(
      'FILE_ACCESS_ERROR',
      `File access error: ${filePath} - ${reason}`,
      `Unable to access the file "${filePath}". ${reason}`,
      true
    );
  }
}

export class PermissionDeniedError extends WorkspaceDomainError {
  constructor(filePath: string) {
    super(
      'PERMISSION_DENIED',
      `Permission denied: ${filePath}`,
      `You don't have permission to access "${filePath}". Please check file permissions.`,
      false
    );
  }
}

/**
 * Network and persistence errors
 */
export class PersistenceError extends WorkspaceDomainError {
  constructor(operation: string, reason: string) {
    super(
      'PERSISTENCE_ERROR',
      `Persistence error during ${operation}: ${reason}`,
      `Failed to save your changes. ${reason} Please try again.`,
      true
    );
  }
}

/**
 * Error factory for creating domain errors from different sources
 */
export class WorkspaceErrorFactory {
  /**
   * Create a domain error from a Tauri error
   */
  static fromTauriError(error: any): WorkspaceDomainError {
    if (typeof error === 'string') {
      return this.fromErrorString(error);
    }

    if (error.code) {
      switch (error.code) {
        case 'WORKSPACE_NOT_FOUND':
          return new WorkspaceNotFoundError(error.workspaceId || 'unknown');
        case 'DOCUMENT_NOT_FOUND':
          return new DocumentNotFoundError(error.documentId || 'unknown');
        case 'DOCUMENT_PATH_NOT_FOUND':
          return new DocumentPathNotFoundError(error.filePath || 'unknown');
        case 'DOCUMENT_ALREADY_OPEN':
          return new DocumentAlreadyOpenError(error.filePath || 'unknown');
        case 'INVALID_LAYOUT_MODE':
          return new InvalidLayoutModeError(error.layoutMode || 'unknown');
        case 'PERMISSION_DENIED':
          return new PermissionDeniedError(error.filePath || 'unknown');
        default:
          return new WorkspaceOperationError(
            'unknown',
            error.message || 'Unknown error',
            'An unexpected error occurred. Please try again.'
          );
      }
    }

    return new WorkspaceOperationError(
      'unknown',
      error.message || 'Unknown error',
      'An unexpected error occurred. Please try again.'
    );
  }

  /**
   * Create a domain error from an error string
   */
  static fromErrorString(errorString: string): WorkspaceDomainError {
    if (errorString.includes('not found')) {
      if (errorString.includes('workspace')) {
        return new WorkspaceNotFoundError('unknown');
      }
      if (errorString.includes('document') || errorString.includes('file')) {
        return new DocumentPathNotFoundError('unknown');
      }
    }

    if (errorString.includes('permission denied') || errorString.includes('access denied')) {
      return new PermissionDeniedError('unknown');
    }

    if (errorString.includes('already exists') || errorString.includes('already open')) {
      return new DocumentAlreadyOpenError('unknown');
    }

    if (errorString.includes('invalid') && errorString.includes('name')) {
      return new InvalidWorkspaceNameError('unknown', 'Invalid format');
    }

    return new WorkspaceOperationError(
      'unknown',
      errorString,
      'An error occurred while processing your request. Please try again.'
    );
  }

  /**
   * Create a validation error for position
   */
  static createPositionError(x: number, y: number, reason: string): InvalidPositionError {
    return new InvalidPositionError(x, y, reason);
  }

  /**
   * Create a validation error for dimensions
   */
  static createDimensionsError(width: number, height: number, reason: string): InvalidDimensionsError {
    return new InvalidDimensionsError(width, height, reason);
  }

  /**
   * Create a confirmation required error
   */
  static createConfirmationError(operation: string, data: any): ConfirmationRequiredError {
    return new ConfirmationRequiredError(operation, data);
  }
}

/**
 * Type guard to check if an error is a workspace domain error
 */
export function isWorkspaceDomainError(error: any): error is WorkspaceDomainError {
  return error instanceof WorkspaceDomainError;
}

/**
 * Type guard to check if an error is recoverable
 */
export function isRecoverableError(error: any): boolean {
  return isWorkspaceDomainError(error) && error.recoverable;
}

/**
 * Extract user-friendly message from any error
 */
export function getUserMessage(error: any): string {
  if (isWorkspaceDomainError(error)) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: any): string {
  if (isWorkspaceDomainError(error)) {
    return error.code;
  }

  return 'UNKNOWN_ERROR';
}