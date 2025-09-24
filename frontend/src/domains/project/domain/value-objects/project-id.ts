import { ProjectIdError } from '../errors/project-errors';

/**
 * ProjectId Value Object - represents a unique project identifier
 *
 * Business Rules:
 * - Must be in format "proj_<uuid>"
 * - Cannot be empty
 * - Must be immutable once created
 */
export class ProjectId {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Generate a new ProjectId with UUID
   */
  static new(): ProjectId {
    // In frontend, we'll typically receive IDs from backend
    // but provide this for completeness
    const uuid = crypto.randomUUID();
    return new ProjectId(`proj_${uuid}`);
  }

  /**
   * Create ProjectId from existing string (for data reconstruction)
   */
  static fromString(value: string): ProjectId {
    if (!value) {
      throw ProjectIdError.required();
    }

    if (!this.isValidFormat(value)) {
      throw ProjectIdError.invalid(value);
    }

    return new ProjectId(value);
  }

  /**
   * Validate project ID format
   */
  private static isValidFormat(value: string): boolean {
    return /^proj_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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
   * Check equality with another ProjectId
   */
  equals(other: ProjectId): boolean {
    return this._value === other._value;
  }

  /**
   * Get display-friendly representation
   */
  display(): string {
    return this._value.substring(5, 13); // Show first 8 chars after "proj_"
  }
}