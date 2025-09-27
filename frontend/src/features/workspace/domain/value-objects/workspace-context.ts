import { ProjectId } from "@/features/project-management/types/value-objects";

/**
 * WorkspaceContext represents the context and state of an active project workspace
 *
 * This value object contains immutable information about a workspace session,
 * including the project being worked on and the current navigation state.
 *
 * Business Rules:
 * - Project ID must be valid
 * - Project name cannot be empty
 * - Source folder must be a valid path
 * - Current path must be within source folder boundary
 * - Context is immutable - changes create new instances
 */
export class WorkspaceContext {
  private constructor(
    private readonly _projectId: ProjectId,
    private readonly _projectName: string,
    private readonly _sourceFolder: string,
    private readonly _currentPath: string
  ) {
    this.validateProjectName(_projectName);
    this.validateSourceFolder(_sourceFolder);
    this.validateCurrentPath(_currentPath, _sourceFolder);
  }

  /**
   * Create a new WorkspaceContext
   *
   * @param projectId - The unique identifier of the project
   * @param projectName - The human-readable name of the project
   * @param sourceFolder - The root source folder path
   * @param currentPath - The current navigation path (defaults to source folder if not provided)
   * @returns New WorkspaceContext instance
   * @throws WorkspaceContextError if validation fails
   */
  static create(
    projectId: ProjectId,
    projectName: string,
    sourceFolder: string,
    currentPath?: string
  ): WorkspaceContext {
    const contextCurrentPath = currentPath || sourceFolder;
    return new WorkspaceContext(
      projectId,
      projectName,
      sourceFolder,
      contextCurrentPath
    );
  }

  /**
   * Create WorkspaceContext from plain object (for serialization/deserialization)
   */
  static fromPlainObject(data: {
    projectId: string;
    projectName: string;
    sourceFolder: string;
    currentPath: string;
  }): WorkspaceContext {
    const projectId = ProjectId.fromString(data.projectId);
    return new WorkspaceContext(
      projectId,
      data.projectName,
      data.sourceFolder,
      data.currentPath
    );
  }

  /**
   * Get the project ID
   */
  get projectId(): ProjectId {
    return this._projectId;
  }

  /**
   * Get the project name
   */
  get projectName(): string {
    return this._projectName;
  }

  /**
   * Get the source folder path
   */
  get sourceFolder(): string {
    return this._sourceFolder;
  }

  /**
   * Get the current path
   */
  get currentPath(): string {
    return this._currentPath;
  }

  /**
   * Check if the current path is at the workspace root
   */
  get isAtRoot(): boolean {
    return this.normalizedCurrentPath === this.normalizedSourceFolder;
  }

  /**
   * Get the parent path if navigation up is possible
   * Returns null if already at the workspace root
   */
  get parentPath(): string | null {
    if (this.isAtRoot) {
      return null;
    }

    // Get parent directory
    const pathParts = this._currentPath.replace(/\/+$/, "").split("/");
    if (pathParts.length <= 1) {
      return null;
    }

    const parentPath = pathParts.slice(0, -1).join("/") || "/";

    // Ensure parent is still within workspace
    if (!this.isPathWithinWorkspace(parentPath)) {
      return null;
    }

    return parentPath;
  }

  /**
   * Create a new WorkspaceContext with updated current path
   *
   * @param newPath - The new current path
   * @returns New WorkspaceContext instance with updated path
   * @throws WorkspaceContextError if the new path is outside workspace boundaries
   */
  withCurrentPath(newPath: string): WorkspaceContext {
    return new WorkspaceContext(
      this._projectId,
      this._projectName,
      this._sourceFolder,
      newPath
    );
  }

  /**
   * Navigate to a child folder
   *
   * @param folderName - Name of the folder to navigate to (relative to current path)
   * @returns New WorkspaceContext instance with updated path
   * @throws WorkspaceContextError if folder name is invalid or navigation would exceed boundaries
   */
  navigateToFolder(folderName: string): WorkspaceContext {
    this.validateFolderName(folderName);

    const newPath = this.joinPaths(this._currentPath, folderName);
    return this.withCurrentPath(newPath);
  }

  /**
   * Navigate to parent directory
   *
   * @returns New WorkspaceContext instance with parent path
   * @throws WorkspaceContextError if already at workspace root
   */
  navigateToParent(): WorkspaceContext {
    const parent = this.parentPath;
    if (parent === null) {
      throw new WorkspaceContextError(
        "Already at workspace root, cannot navigate up",
        "current_path"
      );
    }

    return this.withCurrentPath(parent);
  }

  /**
   * Get relative path from workspace root
   */
  get relativePath(): string {
    if (this.isAtRoot) {
      return "";
    }

    const normalizedSource = this.normalizedSourceFolder;
    const normalizedCurrent = this.normalizedCurrentPath;

    if (normalizedCurrent.startsWith(normalizedSource)) {
      const relative = normalizedCurrent.substring(normalizedSource.length);
      return relative.startsWith("/") ? relative.substring(1) : relative;
    }

    return "";
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): {
    projectId: string;
    projectName: string;
    sourceFolder: string;
    currentPath: string;
  } {
    return {
      projectId: this._projectId.value,
      projectName: this._projectName,
      sourceFolder: this._sourceFolder,
      currentPath: this._currentPath,
    };
  }

  /**
   * Check equality with another WorkspaceContext
   */
  equals(other: WorkspaceContext): boolean {
    return (
      this._projectId.equals(other._projectId) &&
      this._projectName === other._projectName &&
      this._sourceFolder === other._sourceFolder &&
      this._currentPath === other._currentPath
    );
  }

  // Private validation and utility methods

  private validateProjectName(projectName: string): void {
    if (!projectName || projectName.trim().length === 0) {
      throw new WorkspaceContextError(
        "Project name cannot be empty",
        "project_name"
      );
    }
  }

  private validateSourceFolder(sourceFolder: string): void {
    if (!sourceFolder || sourceFolder.trim().length === 0) {
      throw new WorkspaceContextError(
        "Source folder cannot be empty",
        "source_folder"
      );
    }

    // Basic path validation - should be absolute
    if (!sourceFolder.startsWith("/")) {
      throw new WorkspaceContextError(
        "Source folder must be an absolute path",
        "source_folder"
      );
    }
  }

  private validateCurrentPath(currentPath: string, sourceFolder: string): void {
    if (!currentPath || currentPath.trim().length === 0) {
      throw new WorkspaceContextError(
        "Current path cannot be empty",
        "current_path"
      );
    }

    if (!this.isPathWithinWorkspace(currentPath)) {
      throw new WorkspaceContextError(
        `Navigation boundary violation: path '${currentPath}' is outside workspace root '${sourceFolder}'`,
        "current_path"
      );
    }
  }

  private validateFolderName(folderName: string): void {
    if (!folderName || folderName.trim().length === 0) {
      throw new WorkspaceContextError(
        "Folder name cannot be empty",
        "folder_name"
      );
    }

    // Check for path traversal attempts
    if (
      folderName.includes("..") ||
      folderName.includes("/") ||
      folderName.includes("\\")
    ) {
      throw new WorkspaceContextError(
        "Folder name contains invalid characters or path traversal",
        "folder_name"
      );
    }
  }

  private isPathWithinWorkspace(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const normalizedSource = this.normalizedSourceFolder;

    return (
      normalizedPath === normalizedSource ||
      normalizedPath.startsWith(normalizedSource + "/")
    );
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  }

  private get normalizedSourceFolder(): string {
    return this.normalizePath(this._sourceFolder);
  }

  private get normalizedCurrentPath(): string {
    return this.normalizePath(this._currentPath);
  }

  private joinPaths(basePath: string, childPath: string): string {
    const normalizedBase = this.normalizePath(basePath);
    const normalizedChild = childPath.trim();

    if (normalizedBase === "/") {
      return `/${normalizedChild}`;
    }

    return `${normalizedBase}/${normalizedChild}`;
  }
}

/**
 * Error class for WorkspaceContext validation failures
 */
export class WorkspaceContextError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = "WorkspaceContextError";
  }
}

// Type alias for external API consistency
export interface WorkspaceContextData {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
}

// Utility functions for working with WorkspaceContext

/**
 * Type guard to check if an object is a valid WorkspaceContextData
 */
export function isWorkspaceContextData(obj: any): obj is WorkspaceContextData {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.projectId === "string" &&
    typeof obj.projectName === "string" &&
    typeof obj.sourceFolder === "string" &&
    typeof obj.currentPath === "string"
  );
}

/**
 * Create WorkspaceContext from unknown data with validation
 */
export function createWorkspaceContextFromData(
  data: unknown
): WorkspaceContext {
  if (!isWorkspaceContextData(data)) {
    throw new WorkspaceContextError(
      "Invalid workspace context data format",
      "data"
    );
  }

  return WorkspaceContext.fromPlainObject(data);
}
