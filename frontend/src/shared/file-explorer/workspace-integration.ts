import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { Position, Dimensions } from '../../domains/workspace/domain/value-objects/geometry';
import { useWorkspaceStore } from '../../domains/workspace/ui/stores/workspace-store';
import { useWorkspaceEventDispatcher } from '../../domains/workspace/ui/hooks/useWorkspaceEvents';

/**
 * File type definitions for supported document types
 */
export interface FileTypeInfo {
  extension: string;
  mimeType: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'data';
  icon: string;
  defaultDimensions: { width: number; height: number };
  isSupported: boolean;
}

/**
 * Supported file types for workspace documents
 */
const SUPPORTED_FILE_TYPES: Record<string, FileTypeInfo> = {
  // Documents
  '.pdf': {
    extension: '.pdf',
    mimeType: 'application/pdf',
    category: 'document',
    icon: '📄',
    defaultDimensions: { width: 400, height: 600 },
    isSupported: true,
  },
  '.docx': {
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    icon: '📝',
    defaultDimensions: { width: 500, height: 700 },
    isSupported: true,
  },
  '.doc': {
    extension: '.doc',
    mimeType: 'application/msword',
    category: 'document',
    icon: '📝',
    defaultDimensions: { width: 500, height: 700 },
    isSupported: true,
  },
  '.txt': {
    extension: '.txt',
    mimeType: 'text/plain',
    category: 'document',
    icon: '📃',
    defaultDimensions: { width: 400, height: 500 },
    isSupported: true,
  },
  '.md': {
    extension: '.md',
    mimeType: 'text/markdown',
    category: 'document',
    icon: '📋',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.rtf': {
    extension: '.rtf',
    mimeType: 'application/rtf',
    category: 'document',
    icon: '📄',
    defaultDimensions: { width: 450, height: 650 },
    isSupported: true,
  },

  // Spreadsheets
  '.xlsx': {
    extension: '.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'data',
    icon: '📊',
    defaultDimensions: { width: 600, height: 400 },
    isSupported: true,
  },
  '.xls': {
    extension: '.xls',
    mimeType: 'application/vnd.ms-excel',
    category: 'data',
    icon: '📊',
    defaultDimensions: { width: 600, height: 400 },
    isSupported: true,
  },
  '.csv': {
    extension: '.csv',
    mimeType: 'text/csv',
    category: 'data',
    icon: '📈',
    defaultDimensions: { width: 500, height: 300 },
    isSupported: true,
  },

  // Presentations
  '.pptx': {
    extension: '.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    category: 'document',
    icon: '📊',
    defaultDimensions: { width: 600, height: 450 },
    isSupported: true,
  },
  '.ppt': {
    extension: '.ppt',
    mimeType: 'application/vnd.ms-powerpoint',
    category: 'document',
    icon: '📊',
    defaultDimensions: { width: 600, height: 450 },
    isSupported: true,
  },

  // Images
  '.png': {
    extension: '.png',
    mimeType: 'image/png',
    category: 'image',
    icon: '🖼️',
    defaultDimensions: { width: 400, height: 300 },
    isSupported: true,
  },
  '.jpg': {
    extension: '.jpg',
    mimeType: 'image/jpeg',
    category: 'image',
    icon: '🖼️',
    defaultDimensions: { width: 400, height: 300 },
    isSupported: true,
  },
  '.jpeg': {
    extension: '.jpeg',
    mimeType: 'image/jpeg',
    category: 'image',
    icon: '🖼️',
    defaultDimensions: { width: 400, height: 300 },
    isSupported: true,
  },
  '.gif': {
    extension: '.gif',
    mimeType: 'image/gif',
    category: 'image',
    icon: '🖼️',
    defaultDimensions: { width: 350, height: 250 },
    isSupported: true,
  },
  '.svg': {
    extension: '.svg',
    mimeType: 'image/svg+xml',
    category: 'image',
    icon: '🖼️',
    defaultDimensions: { width: 350, height: 350 },
    isSupported: true,
  },

  // Code files
  '.js': {
    extension: '.js',
    mimeType: 'text/javascript',
    category: 'code',
    icon: '💻',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.ts': {
    extension: '.ts',
    mimeType: 'text/typescript',
    category: 'code',
    icon: '💻',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.tsx': {
    extension: '.tsx',
    mimeType: 'text/typescript',
    category: 'code',
    icon: '💻',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.jsx': {
    extension: '.jsx',
    mimeType: 'text/javascript',
    category: 'code',
    icon: '💻',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.py': {
    extension: '.py',
    mimeType: 'text/x-python',
    category: 'code',
    icon: '🐍',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.html': {
    extension: '.html',
    mimeType: 'text/html',
    category: 'code',
    icon: '🌐',
    defaultDimensions: { width: 500, height: 600 },
    isSupported: true,
  },
  '.css': {
    extension: '.css',
    mimeType: 'text/css',
    category: 'code',
    icon: '🎨',
    defaultDimensions: { width: 450, height: 550 },
    isSupported: true,
  },
  '.json': {
    extension: '.json',
    mimeType: 'application/json',
    category: 'data',
    icon: '📋',
    defaultDimensions: { width: 400, height: 500 },
    isSupported: true,
  },
  '.xml': {
    extension: '.xml',
    mimeType: 'application/xml',
    category: 'data',
    icon: '📋',
    defaultDimensions: { width: 400, height: 500 },
    isSupported: true,
  },
};

/**
 * File selection configuration
 */
export interface FileSelectionConfig {
  multiple: boolean;
  directory?: boolean;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  defaultPath?: string;
  title?: string;
}

/**
 * Default file filters for common document types
 */
const DEFAULT_FILTERS = {
  ALL_SUPPORTED: {
    name: 'All Supported Files',
    extensions: Object.keys(SUPPORTED_FILE_TYPES).map(ext => ext.slice(1)),
  },
  DOCUMENTS: {
    name: 'Documents',
    extensions: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
  },
  SPREADSHEETS: {
    name: 'Spreadsheets',
    extensions: ['xlsx', 'xls', 'csv'],
  },
  PRESENTATIONS: {
    name: 'Presentations',
    extensions: ['pptx', 'ppt'],
  },
  IMAGES: {
    name: 'Images',
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'],
  },
  CODE: {
    name: 'Code Files',
    extensions: ['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'xml'],
  },
};

/**
 * Result of file selection operation
 */
export interface FileSelectionResult {
  success: boolean;
  files: string[];
  error?: string;
}

/**
 * Result of adding documents to workspace
 */
export interface AddDocumentsResult {
  success: boolean;
  addedDocuments: Array<{
    documentId: string;
    filePath: string;
    title: string;
  }>;
  failedFiles: Array<{
    filePath: string;
    error: string;
  }>;
}

/**
 * Hook for integrating file explorer with workspace
 */
export const useFileExplorerIntegration = () => {
  const { addDocument } = useWorkspaceStore();
  const { dispatchDocumentAdded } = useWorkspaceEventDispatcher();

  /**
   * Get file type information for a given file path
   */
  const getFileTypeInfo = (filePath: string): FileTypeInfo | undefined => {
    const extension = getFileExtension(filePath);
    return SUPPORTED_FILE_TYPES[extension];
  };

  /**
   * Check if a file is supported for workspace documents
   */
  const isFileSupported = (filePath: string): boolean => {
    const fileType = getFileTypeInfo(filePath);
    return fileType?.isSupported ?? false;
  };

  /**
   * Get file extension from path
   */
  const getFileExtension = (filePath: string): string => {
    const lastDot = filePath.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filePath.slice(lastDot).toLowerCase();
  };

  /**
   * Generate appropriate default dimensions for a file
   */
  const getDefaultDimensions = (filePath: string): Dimensions => {
    const fileType = getFileTypeInfo(filePath);
    const defaultSize = fileType?.defaultDimensions ?? { width: 400, height: 500 };
    return Dimensions.fromValues(defaultSize.width, defaultSize.height);
  };

  /**
   * Calculate smart positioning for new documents
   */
  const calculateSmartPosition = (index: number = 0): Position => {
    const baseX = 50;
    const baseY = 50;
    const offsetX = (index % 5) * 60; // Stagger horizontally
    const offsetY = Math.floor(index / 5) * 60; // Stagger vertically

    return Position.fromCoordinates(baseX + offsetX, baseY + offsetY);
  };

  /**
   * Open file dialog and select files
   */
  const selectFiles = async (config: FileSelectionConfig = { multiple: true }): Promise<FileSelectionResult> => {
    try {
      const defaultConfig: FileSelectionConfig = {
        filters: [DEFAULT_FILTERS.ALL_SUPPORTED],
        title: 'Select Documents for Workspace',
        ...config,
      };

      const result = await open({
        multiple: defaultConfig.multiple,
        directory: defaultConfig.directory,
        filters: defaultConfig.filters,
        defaultPath: defaultConfig.defaultPath,
        title: defaultConfig.title,
      });

      if (!result) {
        return { success: false, files: [] };
      }

      const files = Array.isArray(result) ? result : [result];
      return { success: true, files };
    } catch (error) {
      console.error('File selection failed:', error);
      return {
        success: false,
        files: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  };

  /**
   * Add selected files to workspace as documents
   */
  const addFilesToWorkspace = async (filePaths: string[]): Promise<AddDocumentsResult> => {
    const addedDocuments: Array<{ documentId: string; filePath: string; title: string }> = [];
    const failedFiles: Array<{ filePath: string; error: string }> = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      try {
        // Check if file is supported
        if (!isFileSupported(filePath)) {
          failedFiles.push({
            filePath,
            error: `File type not supported: ${getFileExtension(filePath)}`,
          });
          continue;
        }

        // Calculate position and dimensions
        const position = calculateSmartPosition(i);
        const dimensions = getDefaultDimensions(filePath);

        // Add document to workspace
        await addDocument(filePath, position, dimensions);

        // For now, assume success since addDocument doesn't return result object yet
        const documentId = `doc_${crypto.randomUUID()}`; // Temporary ID
        addedDocuments.push({
          documentId,
          filePath,
          title: filePath.split('/').pop() || filePath,
        });

        // Dispatch event
        dispatchDocumentAdded(
          documentId,
          filePath,
          position,
          dimensions
        );
      } catch (error) {
        console.error(`Failed to add file ${filePath}:`, error);
        failedFiles.push({
          filePath,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return {
      success: addedDocuments.length > 0,
      addedDocuments,
      failedFiles,
    };
  };

  /**
   * Open file dialog and add selected files to workspace
   */
  const openAndAddFilesToWorkspace = async (config?: FileSelectionConfig): Promise<AddDocumentsResult> => {
    const selectionResult = await selectFiles(config);

    if (!selectionResult.success || selectionResult.files.length === 0) {
      return {
        success: false,
        addedDocuments: [],
        failedFiles: selectionResult.error ? [{
          filePath: '',
          error: selectionResult.error,
        }] : [],
      };
    }

    return addFilesToWorkspace(selectionResult.files);
  };

  /**
   * Validate file path and get file info from Tauri backend
   */
  const validateAndGetFileInfo = async (filePath: string): Promise<{
    isValid: boolean;
    exists: boolean;
    title?: string;
    error?: string;
  }> => {
    try {
      // Check if path is valid
      const isValid: boolean = await invoke('validate_file_path', { filePath });
      if (!isValid) {
        return { isValid: false, exists: false, error: 'Invalid file path' };
      }

      // Check if file exists
      const exists: boolean = await invoke('file_exists', { filePath });
      if (!exists) {
        return { isValid: true, exists: false, error: 'File does not exist' };
      }

      // Get file title
      const title: string = await invoke('get_file_title', { filePath });

      return { isValid: true, exists: true, title };
    } catch (error) {
      console.error('File validation failed:', error);
      return {
        isValid: false,
        exists: false,
        error: error instanceof Error ? error.message : 'File validation failed',
      };
    }
  };

  /**
   * Get file category icon
   */
  const getFileIcon = (filePath: string): string => {
    const fileType = getFileTypeInfo(filePath);
    return fileType?.icon ?? '📄';
  };

  /**
   * Get file category name
   */
  const getFileCategory = (filePath: string): string => {
    const fileType = getFileTypeInfo(filePath);
    return fileType?.category ?? 'document';
  };

  /**
   * Filter files by category
   */
  const filterFilesByCategory = (filePaths: string[], category: string): string[] => {
    return filePaths.filter(path => getFileCategory(path) === category);
  };

  /**
   * Get supported file extensions as a string
   */
  const getSupportedExtensions = (): string[] => {
    return Object.keys(SUPPORTED_FILE_TYPES);
  };

  /**
   * Get file type statistics for a list of files
   */
  const getFileTypeStats = (filePaths: string[]): Record<string, number> => {
    const stats: Record<string, number> = {};

    filePaths.forEach(path => {
      const category = getFileCategory(path);
      stats[category] = (stats[category] || 0) + 1;
    });

    return stats;
  };

  return {
    // File type utilities
    getFileTypeInfo,
    isFileSupported,
    getFileExtension,
    getDefaultDimensions,
    getFileIcon,
    getFileCategory,
    filterFilesByCategory,
    getSupportedExtensions,
    getFileTypeStats,

    // File selection and workspace integration
    selectFiles,
    addFilesToWorkspace,
    openAndAddFilesToWorkspace,
    validateAndGetFileInfo,
    calculateSmartPosition,

    // Constants
    SUPPORTED_FILE_TYPES,
    DEFAULT_FILTERS,
  };
};

/**
 * Utility function to create workspace integration context
 */
export const createWorkspaceFileExplorerIntegration = () => {
  return useFileExplorerIntegration();
};

// Export constants for external use
export { SUPPORTED_FILE_TYPES, DEFAULT_FILTERS };

export default useFileExplorerIntegration;