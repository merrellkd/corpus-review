/**
 * File Categorization Zustand Store - Unified Location
 *
 * Central state management for file organization and categorization features.
 * Handles drag-and-drop operations, category management, and bulk operations.
 *
 * Migrated from: stores/shared.ts
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ====================
// Types
// ====================

interface FileData {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  categories?: string[];
}

interface DragPreview {
  fileName: string;
  fileType: string;
  fileIcon: string;
  dragCount: number;
}

interface DropZoneState {
  isHovered: boolean;
  isValidTarget: boolean;
  canAcceptDrop: boolean;
}

interface Operation {
  file: FileData;
  category: string;
  status: 'success' | 'error';
  error?: string;
}

interface BulkOperation {
  files: FileData[];
  category: string;
  results: boolean[];
  successCount: number;
  failureCount: number;
}

type DragState = 'idle' | 'dragging' | 'dropping';

interface CategoryDefinition {
  id: string;
  name: string;
  color: string;
  description?: string;
  icon?: string;
  isDefault?: boolean;
}

// ====================
// State Interface
// ====================

interface FileCategorization {
  // Core drag state
  isDragging: boolean;
  draggedFile: FileData | null;
  draggedFiles: FileData[];
  dropTarget: string | null;
  dragState: DragState;

  // Drag preview
  dragPreview: DragPreview | null;
  showDragPreview: boolean;
  previewPosition: { x: number; y: number };

  // Drop zones
  dropZones: Record<string, DropZoneState>;
  activeDropZone: string | null;

  // Categories and file mappings
  categories: CategoryDefinition[];
  fileCategories: Record<string, string>; // file path -> category id
  categoryFiles: Record<string, FileData[]>; // category id -> files

  // Filtering and search
  activeFilters: string[];
  searchQuery: string;
  filteredFiles: FileData[];

  // Operations
  currentOperation: Operation | null;
  currentBulkOperation: BulkOperation | null;
  operationHistory: Operation[];

  // UI state
  isProcessing: boolean;
  error: string | null;

  // Statistics
  totalFiles: number;
  categorizedFiles: number;
  uncategorizedFiles: number;

  // Actions
  startDrag: (file: FileData, files?: FileData[]) => void;
  updateDragPosition: (x: number, y: number) => void;
  setDropTarget: (target: string | null) => void;
  endDrag: () => void;

  // Drop zone management
  registerDropZone: (id: string, state: DropZoneState) => void;
  updateDropZone: (id: string, state: Partial<DropZoneState>) => void;
  unregisterDropZone: (id: string) => void;

  // File categorization
  categorizeFile: (filePath: string, categoryId: string) => Promise<void>;
  categorizeFiles: (filePaths: string[], categoryId: string) => Promise<void>;
  uncategorizeFile: (filePath: string) => void;
  updateCategory: (filePath: string, categoryId: string) => void;

  // Category management
  createCategory: (name: string, color: string, description?: string) => void;
  updateCategoryDefinition: (id: string, updates: Partial<CategoryDefinition>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => CategoryDefinition | undefined;

  // Filtering
  filterFiles: (categoryIds: string[]) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;

  // Utility
  getFileCategory: (filePath: string) => string | undefined;
  getFilesInCategory: (categoryId: string) => FileData[];
  resetStore: () => void;
  clearError: () => void;
}

// ====================
// Default Categories
// ====================

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'document',
    name: 'Documents',
    color: '#3b82f6',
    description: 'Text documents, PDFs, presentations',
    icon: 'document',
    isDefault: true,
  },
  {
    id: 'image',
    name: 'Images',
    color: '#10b981',
    description: 'Photos, graphics, diagrams',
    icon: 'image',
    isDefault: true,
  },
  {
    id: 'code',
    name: 'Code',
    color: '#8b5cf6',
    description: 'Source code, scripts, configuration',
    icon: 'code',
    isDefault: true,
  },
  {
    id: 'data',
    name: 'Data',
    color: '#f59e0b',
    description: 'Datasets, databases, spreadsheets',
    icon: 'database',
    isDefault: true,
  },
  {
    id: 'archive',
    name: 'Archive',
    color: '#6b7280',
    description: 'Compressed files, backups',
    icon: 'archive',
    isDefault: true,
  },
];

// ====================
// Initial State
// ====================

const initialState = {
  // Core drag state
  isDragging: false,
  draggedFile: null,
  draggedFiles: [],
  dropTarget: null,
  dragState: 'idle' as DragState,

  // Drag preview
  dragPreview: null,
  showDragPreview: false,
  previewPosition: { x: 0, y: 0 },

  // Drop zones
  dropZones: {},
  activeDropZone: null,

  // Categories and file mappings
  categories: [...DEFAULT_CATEGORIES],
  fileCategories: {},
  categoryFiles: {},

  // Filtering and search
  activeFilters: [],
  searchQuery: '',
  filteredFiles: [],

  // Operations
  currentOperation: null,
  currentBulkOperation: null,
  operationHistory: [],

  // UI state
  isProcessing: false,
  error: null,

  // Statistics
  totalFiles: 0,
  categorizedFiles: 0,
  uncategorizedFiles: 0,
};

// ====================
// Store Implementation
// ====================

export const useFileCategorization = create<FileCategorization>()(
  devtools(
    persist(
      immer<FileCategorization>((set, get) => ({
        ...initialState,

        // ====================
        // Drag Operations
        // ====================

        startDrag: (file: FileData, files?: FileData[]) => {
          set((state) => {
            state.isDragging = true;
            state.draggedFile = file;
            state.draggedFiles = files || [file];
            state.dragState = 'dragging';
            state.showDragPreview = true;

            // Create drag preview
            state.dragPreview = {
              fileName: file.name,
              fileType: file.type,
              fileIcon: file.type === 'directory' ? 'folder' : 'file',
              dragCount: files ? files.length : 1,
            };
          });
        },

        updateDragPosition: (x: number, y: number) => {
          set((state) => {
            state.previewPosition = { x, y };
          });
        },

        setDropTarget: (target: string | null) => {
          set((state) => {
            state.dropTarget = target;
            state.activeDropZone = target;
          });
        },

        endDrag: () => {
          set((state) => {
            state.isDragging = false;
            state.draggedFile = null;
            state.draggedFiles = [];
            state.dropTarget = null;
            state.dragState = 'idle';
            state.showDragPreview = false;
            state.dragPreview = null;
            state.activeDropZone = null;
          });
        },

        // ====================
        // Drop Zone Management
        // ====================

        registerDropZone: (id: string, state: DropZoneState) => {
          set((draft) => {
            draft.dropZones[id] = { ...state };
          });
        },

        updateDropZone: (id: string, updates: Partial<DropZoneState>) => {
          set((state) => {
            if (state.dropZones[id]) {
              Object.assign(state.dropZones[id], updates);
            }
          });
        },

        unregisterDropZone: (id: string) => {
          set((state) => {
            delete state.dropZones[id];
          });
        },

        // ====================
        // File Categorization
        // ====================

        categorizeFile: async (filePath: string, categoryId: string) => {
          set((state) => {
            state.isProcessing = true;
            state.error = null;
          });

          try {
            // Simulate async operation
            await new Promise(resolve => setTimeout(resolve, 100));

            set((state) => {
              // Update file category mapping
              const oldCategory = state.fileCategories[filePath];
              state.fileCategories[filePath] = categoryId;

              // Remove from old category files
              if (oldCategory && state.categoryFiles[oldCategory]) {
                state.categoryFiles[oldCategory] = state.categoryFiles[oldCategory].filter(
                  file => file.path !== filePath
                );
              }

              // Add to new category files (if file data exists)
              if (!state.categoryFiles[categoryId]) {
                state.categoryFiles[categoryId] = [];
              }

              // Create operation record
              const operation: Operation = {
                file: { path: filePath, name: filePath.split('/').pop() || '', type: 'file' },
                category: categoryId,
                status: 'success',
              };

              state.currentOperation = operation;
              state.operationHistory.unshift(operation);

              // Keep history limited
              if (state.operationHistory.length > 100) {
                state.operationHistory = state.operationHistory.slice(0, 100);
              }

              state.isProcessing = false;

              // Update statistics
              get().updateStatistics();
            });

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to categorize file';
              state.isProcessing = false;
            });
          }
        },

        categorizeFiles: async (filePaths: string[], categoryId: string) => {
          set((state) => {
            state.isProcessing = true;
            state.error = null;
          });

          try {
            const results: boolean[] = [];

            for (const filePath of filePaths) {
              try {
                await get().categorizeFile(filePath, categoryId);
                results.push(true);
              } catch (error) {
                results.push(false);
              }
            }

            set((state) => {
              const bulkOperation: BulkOperation = {
                files: filePaths.map(path => ({
                  path,
                  name: path.split('/').pop() || '',
                  type: 'file' as const,
                })),
                category: categoryId,
                results,
                successCount: results.filter(r => r).length,
                failureCount: results.filter(r => !r).length,
              };

              state.currentBulkOperation = bulkOperation;
              state.isProcessing = false;
            });

          } catch (error) {
            set((state) => {
              state.error = error instanceof Error ? error.message : 'Failed to categorize files';
              state.isProcessing = false;
            });
          }
        },

        uncategorizeFile: (filePath: string) => {
          set((state) => {
            const oldCategory = state.fileCategories[filePath];
            delete state.fileCategories[filePath];

            // Remove from category files
            if (oldCategory && state.categoryFiles[oldCategory]) {
              state.categoryFiles[oldCategory] = state.categoryFiles[oldCategory].filter(
                file => file.path !== filePath
              );
            }
          });

          get().updateStatistics();
        },

        updateCategory: (filePath: string, categoryId: string) => {
          get().categorizeFile(filePath, categoryId);
        },

        // ====================
        // Category Management
        // ====================

        createCategory: (name: string, color: string, description?: string) => {
          set((state) => {
            const newCategory: CategoryDefinition = {
              id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name,
              color,
              description,
              isDefault: false,
            };

            state.categories.push(newCategory);
            state.categoryFiles[newCategory.id] = [];
          });
        },

        updateCategoryDefinition: (id: string, updates: Partial<CategoryDefinition>) => {
          set((state) => {
            const category = state.categories.find(c => c.id === id);
            if (category) {
              Object.assign(category, updates);
            }
          });
        },

        deleteCategory: (id: string) => {
          set((state) => {
            // Don't allow deleting default categories
            const category = state.categories.find(c => c.id === id);
            if (category?.isDefault) {
              state.error = 'Cannot delete default categories';
              return;
            }

            // Remove category
            state.categories = state.categories.filter(c => c.id !== id);

            // Uncategorize all files in this category
            Object.entries(state.fileCategories).forEach(([filePath, categoryId]) => {
              if (categoryId === id) {
                delete state.fileCategories[filePath];
              }
            });

            // Remove category files
            delete state.categoryFiles[id];
          });

          get().updateStatistics();
        },

        getCategoryById: (id: string) => {
          return get().categories.find(c => c.id === id);
        },

        // ====================
        // Filtering
        // ====================

        filterFiles: (categoryIds: string[]) => {
          set((state) => {
            state.activeFilters = [...categoryIds];

            // Apply filters
            if (categoryIds.length === 0) {
              state.filteredFiles = [];
            } else {
              const filteredFiles: FileData[] = [];
              categoryIds.forEach(categoryId => {
                if (state.categoryFiles[categoryId]) {
                  filteredFiles.push(...state.categoryFiles[categoryId]);
                }
              });
              state.filteredFiles = filteredFiles;
            }
          });
        },

        setSearchQuery: (query: string) => {
          set((state) => {
            state.searchQuery = query;

            // Apply search to filtered files or all files
            const searchBase = state.activeFilters.length > 0
              ? state.filteredFiles
              : Object.values(state.categoryFiles).flat();

            if (query.trim()) {
              state.filteredFiles = searchBase.filter(file =>
                file.name.toLowerCase().includes(query.toLowerCase()) ||
                file.path.toLowerCase().includes(query.toLowerCase())
              );
            } else if (state.activeFilters.length === 0) {
              state.filteredFiles = [];
            }
          });
        },

        clearFilters: () => {
          set((state) => {
            state.activeFilters = [];
            state.searchQuery = '';
            state.filteredFiles = [];
          });
        },

        // ====================
        // Utility Methods
        // ====================

        getFileCategory: (filePath: string) => {
          return get().fileCategories[filePath];
        },

        getFilesInCategory: (categoryId: string) => {
          return get().categoryFiles[categoryId] || [];
        },

        updateStatistics: () => {
          set((state) => {
            const categorizedCount = Object.keys(state.fileCategories).length;
            state.categorizedFiles = categorizedCount;
            state.uncategorizedFiles = Math.max(0, state.totalFiles - categorizedCount);
          });
        },

        resetStore: () => {
          set(() => ({ ...initialState, categories: [...DEFAULT_CATEGORIES] }));
        },

        clearError: () => {
          set((state) => {
            state.error = null;
          });
        },

      })),
      {
        name: 'file-categorization-store',
        partialize: (state) => ({
          categories: state.categories,
          fileCategories: state.fileCategories,
          categoryFiles: state.categoryFiles,
        }),
      }
    ),
    {
      name: 'file-categorization-store',
    }
  )
);

// ====================
// Store Hooks and Selectors
// ====================

/**
 * Hook for accessing drag and drop state
 */
export const useDragDropState = () => {
  return useFileCategorization((state) => ({
    isDragging: state.isDragging,
    draggedFile: state.draggedFile,
    draggedFiles: state.draggedFiles,
    dropTarget: state.dropTarget,
    dragPreview: state.dragPreview,
    showDragPreview: state.showDragPreview,
    previewPosition: state.previewPosition,
    startDrag: state.startDrag,
    updateDragPosition: state.updateDragPosition,
    setDropTarget: state.setDropTarget,
    endDrag: state.endDrag,
  }));
};

/**
 * Hook for accessing categorization functionality
 */
export const useCategorization = () => {
  return useFileCategorization((state) => ({
    categories: state.categories,
    fileCategories: state.fileCategories,
    activeFilters: state.activeFilters,
    filteredFiles: state.filteredFiles,
    searchQuery: state.searchQuery,
    isProcessing: state.isProcessing,
    error: state.error,
    categorizeFile: state.categorizeFile,
    categorizeFiles: state.categorizeFiles,
    uncategorizeFile: state.uncategorizeFile,
    updateCategory: state.updateCategory,
    filterFiles: state.filterFiles,
    setSearchQuery: state.setSearchQuery,
    clearFilters: state.clearFilters,
    getFileCategory: state.getFileCategory,
    clearError: state.clearError,
  }));
};

/**
 * Hook for accessing category management
 */
export const useCategoryManagement = () => {
  return useFileCategorization((state) => ({
    categories: state.categories,
    createCategory: state.createCategory,
    updateCategoryDefinition: state.updateCategoryDefinition,
    deleteCategory: state.deleteCategory,
    getCategoryById: state.getCategoryById,
    getFilesInCategory: state.getFilesInCategory,
  }));
};

// Export store for direct access
export default useFileCategorization;