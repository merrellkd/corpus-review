/**
 * Project domain error types - mirrors Rust backend error structure
 */

export class ProjectIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectIdError';
  }

  static invalid(value: string): ProjectIdError {
    return new ProjectIdError(`Invalid project ID format: ${value}`);
  }

  static required(): ProjectIdError {
    return new ProjectIdError('Project ID is required');
  }
}

export class ProjectNameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectNameError';
  }

  static required(): ProjectNameError {
    return new ProjectNameError('Project name is required');
  }

  static tooLong(): ProjectNameError {
    return new ProjectNameError('Project name must be 255 characters or less');
  }
}

export class FolderPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FolderPathError';
  }

  static required(): FolderPathError {
    return new FolderPathError('Source folder path is required');
  }

  static notFound(path: string): FolderPathError {
    return new FolderPathError(`Source folder not found: ${path}`);
  }

  static notAccessible(path: string): FolderPathError {
    return new FolderPathError(`Source folder is not accessible: ${path}`);
  }
}

export class ProjectNoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectNoteError';
  }

  static tooLong(): ProjectNoteError {
    return new ProjectNoteError('Project note must be 1000 characters or less');
  }
}

export class CreatedAtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CreatedAtError';
  }

  static invalid(value: string): CreatedAtError {
    return new CreatedAtError(`Invalid timestamp format: ${value}`);
  }
}

export class ProjectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectError';
  }

  static invalidId(): ProjectError {
    return new ProjectError('Invalid project ID');
  }

  static invalidName(error: ProjectNameError): ProjectError {
    return new ProjectError(`Invalid project name: ${error.message}`);
  }

  static invalidPath(error: FolderPathError): ProjectError {
    return new ProjectError(`Invalid source folder: ${error.message}`);
  }

  static invalidNote(error: ProjectNoteError): ProjectError {
    return new ProjectError(`Invalid project note: ${error.message}`);
  }

  static invalidTimestamp(error: CreatedAtError): ProjectError {
    return new ProjectError(`Invalid creation timestamp: ${error.message}`);
  }

  static sourceNotAccessible(): ProjectError {
    return new ProjectError('Source folder is no longer accessible');
  }
}