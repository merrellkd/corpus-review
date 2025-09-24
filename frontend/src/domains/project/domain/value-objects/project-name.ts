import { ProjectNameError } from '../errors/project-errors';

/**
 * ProjectName Value Object - represents a validated project name
 *
 * Business Rules:
 * - Cannot be empty after trimming
 * - Maximum length of 255 characters
 * - Automatically trims whitespace
 * - Must be immutable once created
 */
export class ProjectName {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new ProjectName with validation
   */
  static new(value: string): ProjectName {
    const trimmed = value.trim();

    if (!trimmed) {
      throw ProjectNameError.required();
    }

    if (trimmed.length > 255) {
      throw ProjectNameError.tooLong();
    }

    return new ProjectName(trimmed);
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
   * Check equality with another ProjectName
   */
  equals(other: ProjectName): boolean {
    return this._value === other._value;
  }

  /**
   * Get display-friendly representation (truncated if needed)
   */
  display(maxLength?: number): string {
    if (!maxLength || this._value.length <= maxLength) {
      return this._value;
    }
    return `${this._value.substring(0, maxLength - 3)}...`;
  }

  /**
   * Get the character count
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Check if name contains a substring (case-insensitive)
   */
  contains(searchTerm: string): boolean {
    return this._value.toLowerCase().includes(searchTerm.toLowerCase());
  }
}