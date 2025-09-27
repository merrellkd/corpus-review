/**
 * Simplified Workspace Adapter
 *
 * Re-exports unified workspace types and provides minimal utility functions
 */

// Re-export unified types from workspace DTOs
export type {
  WorkspaceDto,
  FileSystemItem,
  DirectoryListing,
  BreadcrumbSegment,
  ViewMode,
} from "@/features/workspace/application/dtos/workspace-dtos";

export {
  formatFileSize,
  getBreadcrumbSegments,
} from "@/features/workspace/application/dtos/workspace-dtos";

// Simple workspace layout interface
export interface WorkspaceLayout {
  id: string;
  project_id: string;
  file_explorer_visible: boolean;
  category_explorer_visible: boolean;
  search_panel_visible: boolean;
  document_workspace_visible: boolean;
  explorer_width: number;
  workspace_width: number;
  last_modified: string;
}

// Simple utility functions
export const createDefaultLayout = (projectId: string): WorkspaceLayout => ({
  id: `layout_${Date.now()}`,
  project_id: projectId,
  file_explorer_visible: true,
  category_explorer_visible: false,
  search_panel_visible: false,
  document_workspace_visible: true,
  explorer_width: 30,
  workspace_width: 70,
  last_modified: new Date().toISOString(),
});

export const getFileIcon = (fileName: string, itemType: string): string => {
  if (itemType === "directory") return "📁";

  const extension = fileName.toLowerCase().split(".").pop();
  const iconMap: Record<string, string> = {
    md: "📄",
    txt: "📄",
    pdf: "📕",
    docx: "📘",
    doc: "📘",
    xlsx: "📗",
    xls: "📗",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    mp4: "🎥",
    avi: "🎥",
    mov: "🎥",
    mp3: "🎵",
    wav: "🎵",
    zip: "📦",
    rar: "📦",
    "7z": "📦",
  };

  return iconMap[extension || ""] || "📄";
};

// Import types for compatibility class
import type {
  WorkspaceDto,
  DirectoryListing,
} from "@/features/workspace/application/dtos/workspace-dtos";
import { formatFileSize as formatFileSizeUtil } from "@/features/workspace/application/dtos/workspace-dtos";

// Legacy compatibility aliases (can be removed when old code is updated)
export class WorkspaceAdapter {
  static fromDto = (workspace: WorkspaceDto) => workspace;
  static fromDirectoryDto = (listing: DirectoryListing) => listing.entries;
  static createDefaultLayout = createDefaultLayout;
  static getFileTypeIcon = getFileIcon;
  static formatFileSize = formatFileSizeUtil;
}
