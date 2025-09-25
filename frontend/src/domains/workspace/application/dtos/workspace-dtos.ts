/**
 * TypeScript DTOs for Workspace Navigation
 *
 * These DTOs mirror the Rust backend DTOs and provide type safety
 * and utility functions for workspace navigation operations.
 */

/**
 * File entry DTO representing a file or directory
 */
export interface FileEntryDto {
  name: string;
  path: string;
  entryType: string; // "file" | "directory"
  size: number | null;
  modified: string; // ISO string
}

/**
 * Directory listing DTO with navigation metadata
 */
export interface DirectoryListingDto {
  entries: FileEntryDto[];
  isRoot: boolean;
  parentPath: string | null;
  canNavigateUp: boolean;
}

/**
 * Workspace DTO representing the current workspace state
 */
export interface WorkspaceDto {
  projectId: string;
  projectName: string;
  sourceFolder: string;
  currentPath: string;
  directoryListing: DirectoryListingDto;
}

/**
 * Breadcrumb segment for navigation
 */
export interface BreadcrumbSegment {
  name: string;
  path: string;
}

/**
 * Utility class for working with workspace DTOs
 */
export class WorkspaceDtoUtils {
  /**
   * Check if a file entry is a directory
   */
  static isDirectory(entry: FileEntryDto): boolean {
    return entry.entryType === 'directory';
  }

  /**
   * Check if a file entry is a file
   */
  static isFile(entry: FileEntryDto): boolean {
    return entry.entryType === 'file';
  }

  /**
   * Get file extension from entry
   */
  static getExtension(entry: FileEntryDto): string {
    if (this.isDirectory(entry)) {
      return '';
    }
    const lastDot = entry.name.lastIndexOf('.');
    return lastDot >= 0 ? entry.name.substring(lastDot + 1).toLowerCase() : '';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get size display for a file entry
   */
  static getSizeDisplay(entry: FileEntryDto): string {
    if (this.isDirectory(entry)) {
      return '—';
    }
    return entry.size !== null ? this.formatFileSize(entry.size) : '—';
  }

  /**
   * Sort entries for consistent listing (directories first, then files, alphabetically)
   */
  static sortEntriesForListing(entries: FileEntryDto[]): FileEntryDto[] {
    return [...entries].sort((a, b) => {
      // Directories first
      if (this.isDirectory(a) && this.isFile(b)) return -1;
      if (this.isFile(a) && this.isDirectory(b)) return 1;

      // Then alphabetically by name (case insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  /**
   * Generate breadcrumb segments from workspace
   */
  static getBreadcrumbSegments(workspace: WorkspaceDto): BreadcrumbSegment[] {
    const segments: BreadcrumbSegment[] = [];

    // Start with project root
    segments.push({
      name: workspace.projectName,
      path: workspace.sourceFolder,
    });

    // Add path segments if not at root
    if (workspace.currentPath !== workspace.sourceFolder) {
      const relativePath = workspace.currentPath.replace(workspace.sourceFolder, '');
      const pathParts = relativePath.split('/').filter(part => part.length > 0);

      let currentPath = workspace.sourceFolder;
      for (const part of pathParts) {
        currentPath = `${currentPath}/${part}`;
        segments.push({
          name: part,
          path: currentPath,
        });
      }
    }

    return segments;
  }

  /**
   * Check if workspace is at root directory
   */
  static isAtRoot(workspace: WorkspaceDto): boolean {
    return workspace.directoryListing.isRoot || workspace.currentPath === workspace.sourceFolder;
  }

  /**
   * Get parent path for navigation
   */
  static getParentPath(workspace: WorkspaceDto): string | null {
    return workspace.directoryListing.parentPath;
  }

  /**
   * Validate workspace DTO structure
   */
  static validateWorkspaceDto(workspace: any): workspace is WorkspaceDto {
    return (
      workspace &&
      typeof workspace.projectId === 'string' &&
      typeof workspace.projectName === 'string' &&
      typeof workspace.sourceFolder === 'string' &&
      typeof workspace.currentPath === 'string' &&
      workspace.directoryListing &&
      Array.isArray(workspace.directoryListing.entries) &&
      typeof workspace.directoryListing.isRoot === 'boolean' &&
      typeof workspace.directoryListing.canNavigateUp === 'boolean'
    );
  }

  /**
   * Type guard for FileEntryDto
   */
  static isFileEntryDto(entry: any): entry is FileEntryDto {
    return (
      entry &&
      typeof entry.name === 'string' &&
      typeof entry.path === 'string' &&
      typeof entry.entryType === 'string' &&
      (entry.size === null || typeof entry.size === 'number') &&
      typeof entry.modified === 'string'
    );
  }

  /**
   * Type guard for DirectoryListingDto
   */
  static isDirectoryListingDto(listing: any): listing is DirectoryListingDto {
    return (
      listing &&
      Array.isArray(listing.entries) &&
      listing.entries.every((entry: any) => this.isFileEntryDto(entry)) &&
      typeof listing.isRoot === 'boolean' &&
      (listing.parentPath === null || typeof listing.parentPath === 'string') &&
      typeof listing.canNavigateUp === 'boolean'
    );
  }
}

// Export additional types for convenience
export type FileEntryType = 'file' | 'directory';
export type ViewMode = 'list' | 'grid';