/**
 * FileEntry represents a file or folder within the workspace with metadata
 *
 * This entity encapsulates all information about a file system item
 * that's relevant for workspace navigation and display.
 *
 * Business Rules:
 * - Name cannot be empty
 * - Path must be absolute
 * - Directories cannot have a size
 * - Entry must be within workspace boundaries
 */
export class FileEntry {
  private constructor(
    private readonly _name: string,
    private readonly _path: string,
    private readonly _entryType: FileEntryType,
    private readonly _size: number | null,
    private readonly _modified: Date
  ) {
    this.validateName(_name);
    this.validatePath(_path);
    this.validateSizeConsistency(_entryType, _size);
  }

  /**
   * Create a new FileEntry
   *
   * @param name - The name of the file or folder
   * @param path - The full path to the file or folder
   * @param entryType - Whether this is a file or directory
   * @param size - Size in bytes (null for directories)
   * @param modified - Last modification time
   * @throws FileEntryError if validation fails
   */
  static create(
    name: string,
    path: string,
    entryType: FileEntryType,
    size: number | null,
    modified: Date
  ): FileEntry {
    return new FileEntry(name, path, entryType, size, modified);
  }

  /**
   * Create a file entry
   */
  static createFile(
    name: string,
    path: string,
    size: number | null,
    modified: Date
  ): FileEntry {
    return new FileEntry(name, path, FileEntryType.File, size, modified);
  }

  /**
   * Create a directory entry
   */
  static createDirectory(
    name: string,
    path: string,
    modified: Date
  ): FileEntry {
    return new FileEntry(name, path, FileEntryType.Directory, null, modified);
  }

  /**
   * Create FileEntry from plain object (for serialization/deserialization)
   */
  static fromPlainObject(data: {
    name: string;
    path: string;
    entryType: string;
    size: number | null;
    modified: string | Date;
  }): FileEntry {
    const entryType = FileEntryType.fromString(data.entryType);
    const modified = typeof data.modified === 'string'
      ? new Date(data.modified)
      : data.modified;

    return new FileEntry(data.name, data.path, entryType, data.size, modified);
  }

  /**
   * Get the name of the file or folder
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the full path
   */
  get path(): string {
    return this._path;
  }

  /**
   * Get the entry type
   */
  get entryType(): FileEntryType {
    return this._entryType;
  }

  /**
   * Get the size in bytes (null for directories or unknown)
   */
  get size(): number | null {
    return this._size;
  }

  /**
   * Get the last modification time
   */
  get modified(): Date {
    return new Date(this._modified);
  }

  /**
   * Check if this is a file
   */
  get isFile(): boolean {
    return this._entryType === FileEntryType.File;
  }

  /**
   * Check if this is a directory
   */
  get isDirectory(): boolean {
    return this._entryType === FileEntryType.Directory;
  }

  /**
   * Get the parent directory path
   */
  get parentPath(): string | null {
    const normalizedPath = this.normalizePath(this._path);
    const lastSlashIndex = normalizedPath.lastIndexOf('/');

    if (lastSlashIndex <= 0) {
      return null; // Root directory or invalid path
    }

    return normalizedPath.substring(0, lastSlashIndex) || '/';
  }

  /**
   * Get the file extension (for files only)
   */
  get extension(): string | null {
    if (!this.isFile) {
      return null;
    }

    const lastDotIndex = this._name.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return null;
    }

    return this._name.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * Check if the entry is within the given workspace boundary
   */
  isWithinWorkspace(workspaceRoot: string): boolean {
    const normalizedPath = this.normalizePath(this._path);
    const normalizedRoot = this.normalizePath(workspaceRoot);

    return normalizedPath === normalizedRoot ||
           normalizedPath.startsWith(normalizedRoot + '/');
  }

  /**
   * Get a display-friendly size string
   */
  get sizeDisplay(): string {
    if (this._size === null) {
      return this.isDirectory ? '-' : 'Unknown';
    }

    return formatFileSize(this._size);
  }

  /**
   * Get a display-friendly modified date string
   */
  get modifiedDisplay(): string {
    return this._modified.toLocaleDateString();
  }

  /**
   * Compare for sorting in file listings (directories first, then alphabetical)
   */
  compareForListing(other: FileEntry): number {
    // Directories come first
    if (this.isDirectory && !other.isDirectory) {
      return -1;
    }
    if (!this.isDirectory && other.isDirectory) {
      return 1;
    }

    // Same type, sort alphabetically (case-insensitive)
    return this._name.toLowerCase().localeCompare(other._name.toLowerCase());
  }

  /**
   * Check equality with another FileEntry
   */
  equals(other: FileEntry): boolean {
    return (
      this._name === other._name &&
      this._path === other._path &&
      this._entryType === other._entryType &&
      this._size === other._size &&
      this._modified.getTime() === other._modified.getTime()
    );
  }

  /**
   * Convert to plain object for serialization
   */
  toPlainObject(): FileEntryData {
    return {
      name: this._name,
      path: this._path,
      entryType: this._entryType.toString(),
      size: this._size,
      modified: this._modified.toISOString(),
    };
  }

  // Private validation and utility methods

  private validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new FileEntryError('File entry name cannot be empty', 'name');
    }
  }

  private validatePath(path: string): void {
    if (!path || path.trim().length === 0) {
      throw new FileEntryError('File entry path cannot be empty', 'path');
    }

    // Basic path validation - should be absolute
    if (!path.startsWith('/')) {
      throw new FileEntryError('Path must be absolute', 'path');
    }
  }

  private validateSizeConsistency(entryType: FileEntryType, size: number | null): void {
    if (entryType === FileEntryType.Directory && size !== null) {
      throw new FileEntryError('Directories cannot have a size', 'size');
    }
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }
}

/**
 * Enum representing the type of file system entry
 */
export enum FileEntryType {
  File = 'file',
  Directory = 'directory',
}

export namespace FileEntryType {
  /**
   * Create FileEntryType from string representation
   */
  export function fromString(value: string): FileEntryType {
    const normalized = value.toLowerCase();
    switch (normalized) {
      case 'file':
        return FileEntryType.File;
      case 'directory':
        return FileEntryType.Directory;
      default:
        throw new FileEntryError(`Invalid file entry type: ${value}`, 'entryType');
    }
  }

  /**
   * Get all valid type values
   */
  export function values(): FileEntryType[] {
    return [FileEntryType.File, FileEntryType.Directory];
  }
}

/**
 * Error class for FileEntry validation failures
 */
export class FileEntryError extends Error {
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(message);
    this.name = 'FileEntryError';
  }
}

/**
 * Type for serialized file entry data
 */
export interface FileEntryData {
  name: string;
  path: string;
  entryType: string;
  size: number | null;
  modified: string; // ISO string
}

/**
 * Type guard to check if an object is valid FileEntryData
 */
export function isFileEntryData(obj: any): obj is FileEntryData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.name === 'string' &&
    typeof obj.path === 'string' &&
    typeof obj.entryType === 'string' &&
    (obj.size === null || typeof obj.size === 'number') &&
    typeof obj.modified === 'string'
  );
}

/**
 * Create FileEntry from unknown data with validation
 */
export function createFileEntryFromData(data: unknown): FileEntry {
  if (!isFileEntryData(data)) {
    throw new FileEntryError('Invalid file entry data format', 'data');
  }

  return FileEntry.fromPlainObject(data);
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const threshold = 1024;

  if (bytes === 0) {
    return '0 B';
  }

  let size = bytes;
  let unitIndex = 0;

  while (size >= threshold && unitIndex < units.length - 1) {
    size /= threshold;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${bytes} ${units[unitIndex]}`;
  } else {
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}

/**
 * Utility functions for working with FileEntry collections
 */
export namespace FileEntryUtils {
  /**
   * Sort a collection of file entries for display (directories first, then alphabetical)
   */
  export function sortForListing(entries: FileEntry[]): FileEntry[] {
    return [...entries].sort((a, b) => a.compareForListing(b));
  }

  /**
   * Filter entries by type
   */
  export function filterByType(entries: FileEntry[], type: FileEntryType): FileEntry[] {
    return entries.filter(entry => entry.entryType === type);
  }

  /**
   * Get all files from a collection
   */
  export function getFiles(entries: FileEntry[]): FileEntry[] {
    return filterByType(entries, FileEntryType.File);
  }

  /**
   * Get all directories from a collection
   */
  export function getDirectories(entries: FileEntry[]): FileEntry[] {
    return filterByType(entries, FileEntryType.Directory);
  }

  /**
   * Find entry by name (case-insensitive)
   */
  export function findByName(entries: FileEntry[], name: string): FileEntry | null {
    return entries.find(entry =>
      entry.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Filter entries within workspace boundaries
   */
  export function filterWithinWorkspace(
    entries: FileEntry[],
    workspaceRoot: string
  ): FileEntry[] {
    return entries.filter(entry => entry.isWithinWorkspace(workspaceRoot));
  }

  /**
   * Calculate total size of all files in collection
   */
  export function calculateTotalSize(entries: FileEntry[]): number {
    return entries
      .filter(entry => entry.isFile && entry.size !== null)
      .reduce((total, entry) => total + (entry.size || 0), 0);
  }
}