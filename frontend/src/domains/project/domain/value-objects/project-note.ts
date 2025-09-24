import { ProjectNoteError } from '../errors/project-errors';

/**
 * ProjectNote Value Object - represents a validated project note
 *
 * Business Rules:
 * - Maximum length of 1000 characters
 * - Automatically trims whitespace
 * - Empty string after trimming becomes null
 * - Must be immutable once created
 */
export class ProjectNote {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Create a new ProjectNote with validation
   */
  static new(value: string): ProjectNote {
    const trimmed = value.trim();

    if (trimmed.length > 1000) {
      throw ProjectNoteError.tooLong();
    }

    return new ProjectNote(trimmed);
  }

  /**
   * Create ProjectNote from optional string (returns null for empty)
   */
  static fromOptional(value: string | null | undefined): ProjectNote | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return ProjectNote.new(value);
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
   * Check equality with another ProjectNote
   */
  equals(other: ProjectNote): boolean {
    return this._value === other._value;
  }

  /**
   * Get a preview of the note (truncated for display)
   */
  preview(maxLength: number): string {
    if (this._value.length <= maxLength) {
      return this._value;
    }

    // Find a good break point (end of word or sentence)
    let truncated = this._value.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    const lastPeriod = truncated.lastIndexOf('.');

    if (lastPeriod > lastSpace && lastPeriod > maxLength * 0.7) {
      truncated = this._value.substring(0, lastPeriod + 1);
    } else if (lastSpace > maxLength * 0.7) {
      truncated = this._value.substring(0, lastSpace);
    }

    return `${truncated}...`;
  }

  /**
   * Get the character count
   */
  get length(): number {
    return this._value.length;
  }

  /**
   * Get the line count
   */
  get lineCount(): number {
    if (!this._value) return 0;
    return this._value.split(/\r\n|\r|\n/).length;
  }

  /**
   * Check if note contains a substring (case-insensitive)
   */
  contains(searchTerm: string): boolean {
    return this._value.toLowerCase().includes(searchTerm.toLowerCase());
  }

  /**
   * Check if the note is empty
   */
  get isEmpty(): boolean {
    return !this._value;
  }

  /**
   * Get lines of the note
   */
  get lines(): string[] {
    if (!this._value) return [];
    return this._value.split(/\r\n|\r|\n/);
  }

  /**
   * Get word count (approximate)
   */
  get wordCount(): number {
    if (!this._value) return 0;
    return this._value.trim().split(/\s+/).length;
  }
}