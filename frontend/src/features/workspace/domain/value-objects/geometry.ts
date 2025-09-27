/**
 * Value object representing a 2D position in pixels
 */
export class Position {
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {
    this.validateCoordinates(x, y);
  }

  /**
   * Creates a Position at the origin (0, 0)
   */
  static origin(): Position {
    return new Position(0, 0);
  }

  /**
   * Creates a Position from coordinate values
   */
  static fromCoordinates(x: number, y: number): Position {
    return new Position(x, y);
  }

  /**
   * Creates a Position from a point-like object
   */
  static fromPoint(point: { x: number; y: number }): Position {
    return new Position(point.x, point.y);
  }

  /**
   * Gets the X coordinate
   */
  getX(): number {
    return this.x;
  }

  /**
   * Gets the Y coordinate
   */
  getY(): number {
    return this.y;
  }

  /**
   * Returns position as a plain object
   */
  toPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * Creates a new Position translated by the given offset
   */
  translate(deltaX: number, deltaY: number): Position {
    return new Position(this.x + deltaX, this.y + deltaY);
  }

  /**
   * Creates a new Position moved to new coordinates
   */
  moveTo(x: number, y: number): Position {
    return new Position(x, y);
  }

  /**
   * Calculates the distance to another position
   */
  distanceTo(other: Position): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Checks if this position is within the given bounds
   */
  isWithinBounds(bounds: { width: number; height: number }): boolean {
    return this.x >= 0 && this.y >= 0 &&
           this.x <= bounds.width && this.y <= bounds.height;
  }

  /**
   * Constrains the position to stay within given bounds
   */
  constrainToBounds(bounds: { width: number; height: number }): Position {
    const constrainedX = Math.max(0, Math.min(this.x, bounds.width));
    const constrainedY = Math.max(0, Math.min(this.y, bounds.height));
    return new Position(constrainedX, constrainedY);
  }

  /**
   * Checks equality with another Position
   */
  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return `Position(${this.x}, ${this.y})`;
  }

  private validateCoordinates(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Position coordinates must be finite numbers. Got: (${x}, ${y})`);
    }
    if (x < 0 || y < 0) {
      throw new Error(`Position coordinates must be non-negative. Got: (${x}, ${y})`);
    }
  }
}

/**
 * Value object representing width and height dimensions in pixels
 */
export class Dimensions {
  private static readonly MIN_WIDTH = 100;
  private static readonly MIN_HEIGHT = 50;
  private static readonly MAX_WIDTH = 4000;
  private static readonly MAX_HEIGHT = 3000;

  constructor(
    private readonly width: number,
    private readonly height: number
  ) {
    this.validateDimensions(width, height);
  }

  /**
   * Creates default dimensions for a document caddy
   */
  static default(): Dimensions {
    return new Dimensions(600, 400);
  }

  /**
   * Creates minimum allowed dimensions
   */
  static minimum(): Dimensions {
    return new Dimensions(this.MIN_WIDTH, this.MIN_HEIGHT);
  }

  /**
   * Creates maximum allowed dimensions
   */
  static maximum(): Dimensions {
    return new Dimensions(this.MAX_WIDTH, this.MAX_HEIGHT);
  }

  /**
   * Creates Dimensions from width and height values
   */
  static fromValues(width: number, height: number): Dimensions {
    return new Dimensions(width, height);
  }

  /**
   * Creates Dimensions from a size-like object
   */
  static fromSize(size: { width: number; height: number }): Dimensions {
    return new Dimensions(size.width, size.height);
  }

  /**
   * Gets the width
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Gets the height
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Returns dimensions as a plain object
   */
  toSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Calculates the area
   */
  getArea(): number {
    return this.width * this.height;
  }

  /**
   * Calculates the aspect ratio (width/height)
   */
  getAspectRatio(): number {
    return this.width / this.height;
  }

  /**
   * Creates new Dimensions scaled by a factor
   */
  scale(factor: number): Dimensions {
    if (factor <= 0) {
      throw new Error(`Scale factor must be positive. Got: ${factor}`);
    }
    return new Dimensions(this.width * factor, this.height * factor);
  }

  /**
   * Creates new Dimensions with adjusted width
   */
  withWidth(newWidth: number): Dimensions {
    return new Dimensions(newWidth, this.height);
  }

  /**
   * Creates new Dimensions with adjusted height
   */
  withHeight(newHeight: number): Dimensions {
    return new Dimensions(this.width, newHeight);
  }

  /**
   * Creates new Dimensions expanded by the given amounts
   */
  expand(deltaWidth: number, deltaHeight: number): Dimensions {
    return new Dimensions(this.width + deltaWidth, this.height + deltaHeight);
  }

  /**
   * Constrains dimensions to fit within maximum bounds
   */
  constrainToMaximum(maxDimensions: Dimensions): Dimensions {
    const constrainedWidth = Math.min(this.width, maxDimensions.width);
    const constrainedHeight = Math.min(this.height, maxDimensions.height);
    return new Dimensions(constrainedWidth, constrainedHeight);
  }

  /**
   * Ensures dimensions meet minimum requirements
   */
  enforceMinimum(minDimensions: Dimensions): Dimensions {
    const enforcedWidth = Math.max(this.width, minDimensions.width);
    const enforcedHeight = Math.max(this.height, minDimensions.height);
    return new Dimensions(enforcedWidth, enforcedHeight);
  }

  /**
   * Checks if these dimensions fit within the given bounds
   */
  fitsWithin(bounds: Dimensions): boolean {
    return this.width <= bounds.width && this.height <= bounds.height;
  }

  /**
   * Checks equality with another Dimensions
   */
  equals(other: Dimensions): boolean {
    return this.width === other.width && this.height === other.height;
  }

  /**
   * Returns string representation
   */
  toString(): string {
    return `Dimensions(${this.width}x${this.height})`;
  }

  private validateDimensions(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`Dimensions must be finite numbers. Got: ${width}x${height}`);
    }
    if (width < Dimensions.MIN_WIDTH || height < Dimensions.MIN_HEIGHT) {
      throw new Error(
        `Dimensions must be at least ${Dimensions.MIN_WIDTH}x${Dimensions.MIN_HEIGHT}. Got: ${width}x${height}`
      );
    }
    if (width > Dimensions.MAX_WIDTH || height > Dimensions.MAX_HEIGHT) {
      throw new Error(
        `Dimensions must not exceed ${Dimensions.MAX_WIDTH}x${Dimensions.MAX_HEIGHT}. Got: ${width}x${height}`
      );
    }
  }
}