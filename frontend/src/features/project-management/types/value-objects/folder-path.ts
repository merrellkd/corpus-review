import { FolderPathError } from '../errors/project-errors';

/**
 * FolderPath Value Object - represents a validated folder path
 *
 * Business Rules:
 * - Cannot be empty
 * - Must represent a valid file system path
 * - Accessibility is checked but not enforced at creation (may become inaccessible later)
 * - Must be immutable once created
 */
export class FolderPath {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new FolderPath with validation
   */
  static new(value: string): FolderPath {
    if (!value || !value.trim()) {
      throw FolderPathError.required();
    }

    const trimmed = value.trim();
    return new FolderPath(trimmed);
  }

  /**
   * Get the string value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * Check equality with another FolderPath
   */
  equals(other: FolderPath): boolean {
    return this._value === other._value;
  }

  /**
   * Get the folder name (last component of path)
   */
  folderName(): string | null {
    const parts = this._value.split(/[/\\]/);
    const name = parts[parts.length - 1];
    return name || null;
  }

  /**
   * Get parent directory path
   */
  parent(): string | null {
    const parts = this._value.split(/[/\\]/);
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('/');
  }

  /**
   * Get display-friendly representation (truncated if needed)
   */
  display(maxLength?: number): string {
    if (!maxLength || this._value.length <= maxLength) {
      return this._value;
    }

    // Show the end of the path which is usually more meaningful
    const folderName = this.folderName();
    if (folderName && folderName.length < maxLength - 3) {
      const prefix = '...';
      const availableLength = maxLength - prefix.length - folderName.length - 1;
      if (availableLength > 0) {
        const startPart = this._value.substring(0, availableLength);
        return `${prefix}${startPart}/${folderName}`;
      }
    }

    return `...${this._value.substring(this._value.length - maxLength + 3)}`;
  }

  /**
   * Check if path is absolute
   */
  isAbsolute(): boolean {
    // Simple heuristic for common path formats
    return this._value.startsWith('/') ||
           /^[A-Za-z]:\\/.test(this._value) ||
           this._value.startsWith('\\\\');
  }

  /**
   * Join with another path component
   */
  join(component: string): string {
    const separator = this._value.includes('\\') ? '\\' : '/';
    return `${this._value}${separator}${component}`;
  }

  /**
   * Check if this path is a parent of another path
   */
  isParentOf(other: FolderPath): boolean {
    const thisNormalized = this._value.replace(/\\/g, '/').toLowerCase();
    const otherNormalized = other._value.replace(/\\/g, '/').toLowerCase();

    return otherNormalized.startsWith(thisNormalized + '/') ||
           otherNormalized.startsWith(thisNormalized + '\\');
  }
}