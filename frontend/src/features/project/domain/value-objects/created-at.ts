import { CreatedAtError } from '../errors/project-errors';

/**
 * CreatedAt Value Object - represents a validated creation timestamp
 *
 * Business Rules:
 * - Must be a valid ISO 8601 datetime string
 * - Must be immutable once created
 * - Provides utility methods for date formatting and comparison
 */
export class CreatedAt {
  private readonly _value: Date;
  private readonly _isoString: string;

  private constructor(date: Date, isoString: string) {
    this._value = date;
    this._isoString = isoString;
  }

  /**
   * Create a new CreatedAt with current timestamp
   */
  static now(): CreatedAt {
    const now = new Date();
    return new CreatedAt(now, now.toISOString());
  }

  /**
   * Create CreatedAt from ISO string (for data reconstruction)
   */
  static fromString(isoString: string): CreatedAt {
    if (!isoString) {
      throw CreatedAtError.invalid('Empty timestamp string');
    }

    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw CreatedAtError.invalid(isoString);
    }

    return new CreatedAt(date, isoString);
  }

  /**
   * Create CreatedAt from Date object
   */
  static fromDate(date: Date): CreatedAt {
    if (!date || isNaN(date.getTime())) {
      throw CreatedAtError.invalid('Invalid Date object');
    }

    return new CreatedAt(new Date(date), date.toISOString());
  }

  /**
   * Get the Date object
   */
  get value(): Date {
    return new Date(this._value); // Return a copy to maintain immutability
  }

  /**
   * Convert to ISO string representation
   */
  toString(): string {
    return this._isoString;
  }

  /**
   * Get ISO string
   */
  toISOString(): string {
    return this._isoString;
  }

  /**
   * Check equality with another CreatedAt
   */
  equals(other: CreatedAt): boolean {
    return this._isoString === other._isoString;
  }

  /**
   * Compare with another CreatedAt (-1: before, 0: same, 1: after)
   */
  compareTo(other: CreatedAt): number {
    return this._value.getTime() - other._value.getTime();
  }

  /**
   * Check if this timestamp is before another
   */
  isBefore(other: CreatedAt): boolean {
    return this.compareTo(other) < 0;
  }

  /**
   * Check if this timestamp is after another
   */
  isAfter(other: CreatedAt): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Get human-readable relative time (e.g., "2 hours ago")
   */
  getRelativeTime(): string {
    const now = new Date();
    const diffMs = now.getTime() - this._value.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return this.formatDate();
    }
  }

  /**
   * Format as date string (locale-aware)
   */
  formatDate(): string {
    return this._value.toLocaleDateString();
  }

  /**
   * Format as date and time string (locale-aware)
   */
  formatDateTime(): string {
    return this._value.toLocaleString();
  }

  /**
   * Format in a specific format
   */
  format(options: Intl.DateTimeFormatOptions): string {
    return this._value.toLocaleDateString(undefined, options);
  }

  /**
   * Get the timestamp as milliseconds since epoch
   */
  getTime(): number {
    return this._value.getTime();
  }

  /**
   * Get year
   */
  get year(): number {
    return this._value.getFullYear();
  }

  /**
   * Get month (1-12)
   */
  get month(): number {
    return this._value.getMonth() + 1;
  }

  /**
   * Get day of month
   */
  get day(): number {
    return this._value.getDate();
  }

  /**
   * Check if the timestamp is today
   */
  get isToday(): boolean {
    const today = new Date();
    return this._value.toDateString() === today.toDateString();
  }

  /**
   * Check if the timestamp is this week
   */
  get isThisWeek(): boolean {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return this._value >= weekStart && this._value <= weekEnd;
  }
}