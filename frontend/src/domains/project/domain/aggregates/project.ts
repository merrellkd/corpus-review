import { ProjectId } from '../value-objects/project-id';
import { ProjectName } from '../value-objects/project-name';
import { FolderPath } from '../value-objects/folder-path';
import { ProjectNote } from '../value-objects/project-note';
import { CreatedAt } from '../value-objects/created-at';
import { ProjectError } from '../errors/project-errors';

/**
 * Project aggregate root representing a document analysis project
 *
 * Business Rules:
 * - Each project has a unique identifier
 * - Project name is required and must be valid
 * - Source folder must exist and be accessible
 * - Note is optional but validated when provided
 * - Creation timestamp is immutable
 * - Projects can be updated (name, note) but not source folder
 * - Source folder changes require creating a new project
 */
export class Project {
  private constructor(
    private readonly _id: ProjectId,
    private _name: ProjectName,
    private readonly _sourceFolder: FolderPath,
    private _note: ProjectNote | null,
    private readonly _createdAt: CreatedAt
  ) {}

  /**
   * Create a new Project with required fields
   */
  static create(
    name: string,
    sourceFolder: string,
    note?: string
  ): Project {
    try {
      const projectName = ProjectName.new(name);
      const folderPath = FolderPath.new(sourceFolder);
      const projectNote = ProjectNote.fromOptional(note);

      return new Project(
        ProjectId.new(),
        projectName,
        folderPath,
        projectNote,
        CreatedAt.now()
      );
    } catch (error) {
      if (error instanceof Error) {
        throw ProjectError.invalidName(error as any);
      }
      throw error;
    }
  }

  /**
   * Create a Project from existing data (for data reconstruction)
   */
  static fromData(
    id: string,
    name: string,
    sourceFolder: string,
    note: string | null,
    createdAt: string
  ): Project {
    try {
      const projectId = ProjectId.fromString(id);
      const projectName = ProjectName.new(name);
      const folderPath = FolderPath.new(sourceFolder);
      const projectNote = ProjectNote.fromOptional(note);
      const timestamp = CreatedAt.fromString(createdAt);

      return new Project(
        projectId,
        projectName,
        folderPath,
        projectNote,
        timestamp
      );
    } catch (error) {
      if (error instanceof Error) {
        throw ProjectError.invalidId();
      }
      throw error;
    }
  }

  /**
   * Get the project ID
   */
  get id(): ProjectId {
    return this._id;
  }

  /**
   * Get the project name
   */
  get name(): ProjectName {
    return this._name;
  }

  /**
   * Get the source folder path
   */
  get sourceFolder(): FolderPath {
    return this._sourceFolder;
  }

  /**
   * Get the project note (if any)
   */
  get note(): ProjectNote | null {
    return this._note;
  }

  /**
   * Get the creation timestamp
   */
  get createdAt(): CreatedAt {
    return this._createdAt;
  }

  /**
   * Update the project name
   */
  updateName(newName: string): void {
    try {
      this._name = ProjectName.new(newName);
    } catch (error) {
      throw ProjectError.invalidName(error as any);
    }
  }

  /**
   * Update the project note
   */
  updateNote(newNote?: string): void {
    try {
      this._note = ProjectNote.fromOptional(newNote);
    } catch (error) {
      throw ProjectError.invalidNote(error as any);
    }
  }

  /**
   * Clear the project note
   */
  clearNote(): void {
    this._note = null;
  }

  /**
   * Get a display-friendly project summary
   */
  summary(): string {
    const notePreview = this._note?.preview(50) || '';
    const folderName = this._sourceFolder.folderName() || 'Unknown';

    if (notePreview) {
      return `${this._name.value} (${folderName}) - ${notePreview}`;
    }

    return `${this._name.value} (${folderName})`;
  }

  /**
   * Get project metadata for display
   */
  metadata(): ProjectMetadata {
    return {
      id: this._id,
      name: this._name,
      sourceFolderName: this._sourceFolder.folderName(),
      sourceFolderPath: this._sourceFolder.value,
      notePreview: this._note?.preview(100) || null,
      noteLineCount: this._note?.lineCount || null,
      createdAt: this._createdAt,
      isAccessible: true // In frontend, we assume accessible unless told otherwise
    };
  }

  /**
   * Check equality with another Project
   */
  equals(other: Project): boolean {
    return this._id.equals(other._id);
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): ProjectData {
    return {
      id: this._id.value,
      name: this._name.value,
      sourceFolder: this._sourceFolder.value,
      note: this._note?.value || null,
      createdAt: this._createdAt.toISOString()
    };
  }

  /**
   * Clone this project with modifications
   */
  clone(modifications?: Partial<{
    name: string;
    note: string | null;
  }>): Project {
    const newName = modifications?.name ?? this._name.value;
    const newNote = modifications?.note ?? this._note?.value;

    return new Project(
      this._id,
      ProjectName.new(newName),
      this._sourceFolder,
      ProjectNote.fromOptional(newNote),
      this._createdAt
    );
  }
}

/**
 * Project metadata for UI display and serialization
 */
export interface ProjectMetadata {
  id: ProjectId;
  name: ProjectName;
  sourceFolderName: string | null;
  sourceFolderPath: string;
  notePreview: string | null;
  noteLineCount: number | null;
  createdAt: CreatedAt;
  isAccessible: boolean;
}

/**
 * Plain object representation of Project data
 */
export interface ProjectData {
  id: string;
  name: string;
  sourceFolder: string;
  note: string | null;
  createdAt: string;
}

/**
 * Project creation parameters
 */
export interface CreateProjectParams {
  name: string;
  sourceFolder: string;
  note?: string;
}

/**
 * Project update parameters
 */
export interface UpdateProjectParams {
  name?: string;
  note?: string | null;
}