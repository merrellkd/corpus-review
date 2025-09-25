import { WorkspaceDto, DirectoryListingDto, FileEntryDto } from '../domains/workspace/application/dtos/workspace-dtos'

// UI Store Types (matches backend data structure)
export interface FileSystemItem {
  name: string
  path: string
  parent_path: string
  item_type: 'file' | 'directory' // More specific typing based on backend entryType
  size: number
  formatted_size: string
  is_accessible: boolean
  last_modified: string
}

export interface WorkspaceLayout {
  id: string
  project_id: string
  file_explorer_visible: boolean
  category_explorer_visible: boolean
  search_panel_visible: boolean
  document_workspace_visible: boolean
  explorer_width: number
  workspace_width: number
  last_modified: string
}

// Adapter functions
export class WorkspaceAdapter {
  /**
   * Converts backend FileEntryDto to UI FileSystemItem
   */
  static adaptFileEntry(entry: FileEntryDto, parentPath: string): FileSystemItem {
    const formatFileSize = (bytes: number | null): string => {
      if (bytes === null || entry.entryType === 'directory') return '—'
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    return {
      name: entry.name,
      path: entry.path,
      parent_path: parentPath,
      item_type: entry.entryType as 'file' | 'directory', // Backend uses 'entryType', UI uses 'item_type'
      size: entry.size || 0,
      formatted_size: formatFileSize(entry.size),
      is_accessible: true, // Assume accessible if returned by backend
      last_modified: entry.modified
    }
  }

  /**
   * Converts backend DirectoryListingDto to UI FileSystemItem array
   */
  static adaptDirectoryListing(listing: DirectoryListingDto, currentPath: string): FileSystemItem[] {
    return listing.entries.map(entry => this.adaptFileEntry(entry, currentPath))
  }

  /**
   * Converts backend WorkspaceDto to UI store format
   */
  static adaptWorkspace(workspace: WorkspaceDto): {
    currentPath: string
    fileExplorerItems: FileSystemItem[]
    canNavigateUp: boolean
    isRoot: boolean
    parentPath: string | null
  } {
    return {
      currentPath: workspace.currentPath,
      fileExplorerItems: this.adaptDirectoryListing(workspace.directoryListing, workspace.currentPath),
      canNavigateUp: workspace.directoryListing.canNavigateUp,
      isRoot: workspace.directoryListing.isRoot,
      parentPath: workspace.directoryListing.parentPath
    }
  }

  /**
   * Creates default workspace layout for new projects
   */
  static createDefaultLayout(projectId: string): WorkspaceLayout {
    return {
      id: `layout_${Date.now()}`,
      project_id: projectId,
      file_explorer_visible: true,
      category_explorer_visible: false,
      search_panel_visible: false,
      document_workspace_visible: true,
      explorer_width: 30,
      workspace_width: 70,
      last_modified: new Date().toISOString()
    }
  }

  /**
   * Validates and sanitizes file system paths
   */
  static sanitizePath(path: string): string {
    // Remove any potential path traversal attempts
    const sanitized = path.replace(/\.\./g, '').replace(/\/+/g, '/')
    return sanitized.startsWith('/') ? sanitized : `/${sanitized}`
  }

  /**
   * Determines file type based on extension for UI display
   */
  static getFileTypeIcon(fileName: string, itemType: string): string {
    if (itemType === 'directory') {
      return '📁'
    }

    const extension = fileName.toLowerCase().split('.').pop()
    switch (extension) {
      case 'md':
      case 'txt':
        return '📄'
      case 'pdf':
        return '📕'
      case 'docx':
      case 'doc':
        return '📘'
      case 'xlsx':
      case 'xls':
        return '📗'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎥'
      case 'mp3':
      case 'wav':
        return '🎵'
      case 'zip':
      case 'rar':
      case '7z':
        return '📦'
      default:
        return '📄'
    }
  }

  /**
   * Formats modification date for UI display
   */
  static formatModificationDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        return 'Today'
      } else if (diffDays === 1) {
        return 'Yesterday'
      } else if (diffDays < 7) {
        return `${diffDays} days ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return 'Unknown'
    }
  }

  /**
   * Creates error-friendly message from backend errors
   */
  static adaptError(error: Error): string {
    const message = error.message

    if (message.includes('permission')) {
      return 'Permission denied. Check folder access rights.'
    } else if (message.includes('not found')) {
      return 'Folder not found. The project source may have been moved.'
    } else if (message.includes('timeout')) {
      return 'File system operation timed out. Try again.'
    } else if (message.includes('disk')) {
      return 'Disk error. Check available storage space.'
    } else {
      return `File system error: ${message}`
    }
  }
}