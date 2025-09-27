/**
 * Simplified Project Types - Flattened from DDD patterns
 *
 * Removed complex domain/aggregates structure and value objects
 * Simple, flat interfaces for project-related data
 */

// Main project interface - flattened from domain/aggregates/project.ts
export interface Project {
  id: string;
  name: string;
  source_folder: string;
  source_folder_name: string;
  note: string;
  note_preview: string;
  note_line_count: number;
  created_at: string;
  is_accessible: boolean;
}

// Simplified metadata interface for UI display
export interface ProjectMetadata {
  id: string;
  name: string;
  sourceFolderPath: string;
  notePreview?: string;
  createdAt: string;
}

// Project creation parameters
export interface CreateProjectParams {
  name: string;
  sourceFolder: string;
  note?: string;
}

// Project update parameters
export interface UpdateProjectParams {
  name?: string;
  note?: string | null;
}

// Folder path type - simplified from DDD value object
export interface FolderPath {
  value: string;
  isValid: boolean;
  folderName(): string | null;
}

// Helper function to create FolderPath objects (replaces DDD value object static methods)
export const createFolderPath = (path: string): FolderPath => {
  const isValid = path.trim().length > 0 && !path.includes('..') && !path.includes('~');

  return {
    value: path,
    isValid,
    folderName(): string | null {
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) {
        const winSegments = path.split('\\').filter(Boolean);
        return winSegments.length > 0 ? winSegments[winSegments.length - 1] : null;
      }
      return segments[segments.length - 1];
    }
  };
};

// Backward compatibility object to match old DDD interface
export const FolderPathUtil = {
  new: createFolderPath,
  fromString: createFolderPath
};