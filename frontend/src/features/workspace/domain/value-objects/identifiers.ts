import { v4 as uuidv4 } from 'uuid';

/**
 * Value object for Workspace identifiers.
 * Enforces the prefixed UUID pattern: mws_<uuid>
 */
export class WorkspaceId {
  private static readonly PREFIX = 'mws_';
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {
    this.validateFormat(value);
  }

  /**
   * Creates a new WorkspaceId with generated UUID
   */
  static create(): WorkspaceId {
    const uuid = uuidv4();
    return new WorkspaceId(`${this.PREFIX}${uuid}`);
  }

  /**
   * Creates a WorkspaceId from an existing string value
   */
  static fromString(value: string): WorkspaceId {
    return new WorkspaceId(value);
  }

  /**
   * Gets the string representation of the WorkspaceId
   */
  toString(): string {
    return this.value;
  }

  /**
   * Gets the raw value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Extracts the UUID part without the prefix
   */
  getUuid(): string {
    return this.value.substring(WorkspaceId.PREFIX.length);
  }

  /**
   * Checks equality with another WorkspaceId
   */
  equals(other: WorkspaceId): boolean {
    return this.value === other.value;
  }

  private validateFormat(value: string): void {
    if (!value.startsWith(WorkspaceId.PREFIX)) {
      throw new Error(`WorkspaceId must start with prefix '${WorkspaceId.PREFIX}'. Got: ${value}`);
    }

    const uuid = value.substring(WorkspaceId.PREFIX.length);
    if (!WorkspaceId.UUID_REGEX.test(uuid)) {
      throw new Error(`WorkspaceId contains invalid UUID format. Got: ${uuid}`);
    }
  }
}

/**
 * Value object for DocumentCaddy identifiers.
 * Enforces the prefixed UUID pattern: doc_<uuid>
 */
export class DocumentCaddyId {
  private static readonly PREFIX = 'doc_';
  private static readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {
    this.validateFormat(value);
  }

  /**
   * Creates a new DocumentCaddyId with generated UUID
   */
  static create(): DocumentCaddyId {
    const uuid = uuidv4();
    return new DocumentCaddyId(`${this.PREFIX}${uuid}`);
  }

  /**
   * Creates a DocumentCaddyId from an existing string value
   */
  static fromString(value: string): DocumentCaddyId {
    return new DocumentCaddyId(value);
  }

  /**
   * Gets the string representation of the DocumentCaddyId
   */
  toString(): string {
    return this.value;
  }

  /**
   * Gets the raw value
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Extracts the UUID part without the prefix
   */
  getUuid(): string {
    return this.value.substring(DocumentCaddyId.PREFIX.length);
  }

  /**
   * Checks equality with another DocumentCaddyId
   */
  equals(other: DocumentCaddyId): boolean {
    return this.value === other.value;
  }

  private validateFormat(value: string): void {
    if (!value.startsWith(DocumentCaddyId.PREFIX)) {
      throw new Error(`DocumentCaddyId must start with prefix '${DocumentCaddyId.PREFIX}'. Got: ${value}`);
    }

    const uuid = value.substring(DocumentCaddyId.PREFIX.length);
    if (!DocumentCaddyId.UUID_REGEX.test(uuid)) {
      throw new Error(`DocumentCaddyId contains invalid UUID format. Got: ${uuid}`);
    }
  }
}