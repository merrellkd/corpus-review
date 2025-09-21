import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Types for file categorization
interface FileData {
  path: string
  name: string
  type: 'file' | 'directory'
  size?: number
  categories?: string[]
}

interface DragPreview {
  fileName: string
  fileType: string
  fileIcon: string
  dragCount: number
}

interface DropZoneState {
  isHovered: boolean
  isValidTarget: boolean
  canAcceptDrop: boolean
}

interface Operation {
  file: FileData
  category: string
  status: 'success' | 'error'
  error?: string
}

interface BulkOperation {
  files: FileData[]
  category: string
  results: boolean[]
  successCount: number
  failureCount: number
}

type DragState = 'idle' | 'dragging' | 'dropping'

interface FileCategorizationState {
  // Core drag state
  isDragging: boolean
  draggedFile: FileData | null
  draggedFiles: FileData[]
  dropTarget: string | null
  dragState: DragState
  bulkOperation: boolean

  // Validation
  isValidDrop: boolean
  dropError: string | null
  availableCategories: string[]
  suggestedCategories: string[]

  // Visual feedback
  dragPreview: DragPreview | null
  dropZoneStates: Record<string, DropZoneState>

  // Operation tracking
  lastOperation: Operation | null
  lastBulkOperation: BulkOperation | null
  operationHistory: Operation[]

  // Undo/redo
  canUndo: boolean

  // Actions - Single file operations
  startDrag: (file: FileData) => void
  setDropTarget: (target: string | null) => void
  completeDrop: () => Promise<void>
  cancelDrag: () => void

  // Actions - Bulk operations
  startBulkDrag: (files: FileData[]) => void
  completeBulkDrop: () => Promise<void>

  // Actions - Validation
  isValidCategory: (category: string) => boolean

  // Actions - Visual feedback
  setDropZoneHover: (zoneId: string, isHovered: boolean) => void

  // Actions - History
  addToHistory: (operation: Operation) => void
  undoLastOperation: () => Promise<void>

  // Callbacks
  onCategorizeFile?: (file: FileData, category: string) => Promise<boolean>
  onBulkCategorizeFiles?: (files: FileData[], category: string) => Promise<boolean[]>
  onUncategorizeFile?: (file: FileData, category: string) => Promise<boolean>
}

interface FileCategorizationOptions {
  availableCategories?: string[]
  onCategorizeFile?: (file: FileData, category: string) => Promise<boolean>
  onBulkCategorizeFiles?: (files: FileData[], category: string) => Promise<boolean[]>
  onUncategorizeFile?: (file: FileData, category: string) => Promise<boolean>
}

const getFileTypeFromExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
    pdf: 'PDF Document',
    doc: 'Word Document',
    docx: 'Word Document',
    txt: 'Text File',
    md: 'Markdown File',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    gif: 'GIF Image'
  }
  return typeMap[ext || ''] || 'Unknown File'
}

const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return `${ext}-icon` || 'file-icon'
}

const getSuggestedCategories = (file: FileData): string[] => {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
    return ['documentation', 'research', 'reference']
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '')) {
    return ['images', 'assets', 'graphics']
  }

  if (['js', 'ts', 'py', 'java', 'cpp'].includes(ext || '')) {
    return ['code', 'development', 'source']
  }

  return ['misc', 'uncategorized']
}

const useFileCategorizationBase = create<FileCategorizationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isDragging: false,
      draggedFile: null,
      draggedFiles: [],
      dropTarget: null,
      dragState: 'idle',
      bulkOperation: false,
      isValidDrop: false,
      dropError: null,
      availableCategories: ['research', 'documentation', 'archive', 'images', 'code'],
      suggestedCategories: [],
      dragPreview: null,
      dropZoneStates: {},
      lastOperation: null,
      lastBulkOperation: null,
      operationHistory: [],
      canUndo: false,

      // Single file drag operations
      startDrag: (file: FileData) => {
        const suggestedCategories = getSuggestedCategories(file)

        set({
          isDragging: true,
          draggedFile: file,
          draggedFiles: [file],
          dragState: 'dragging',
          bulkOperation: false,
          suggestedCategories,
          dragPreview: {
            fileName: file.name,
            fileType: getFileTypeFromExtension(file.name),
            fileIcon: getFileIcon(file.name),
            dragCount: 1
          }
        })

        // Update all drop zones
        const current = get()
        const newDropZoneStates: Record<string, DropZoneState> = {}
        current.availableCategories.forEach(category => {
          newDropZoneStates[category] = {
            isHovered: false,
            isValidTarget: true,
            canAcceptDrop: true
          }
        })
        set({ dropZoneStates: newDropZoneStates })
      },

      setDropTarget: (target: string | null) => {
        const current = get()

        if (!target) {
          set({ dropTarget: null, isValidDrop: false, dropError: null })
          return
        }

        // Extract category name from target (handle 'category-research' -> 'research')
        const categoryName = target.startsWith('category-') ? target.substring(9) : target

        // Validate category
        if (!current.availableCategories.includes(categoryName)) {
          set({ dropTarget: null, isValidDrop: false, dropError: 'Invalid drop target' })
          return
        }

        // Check for duplicate categorization
        if (current.draggedFile?.categories?.includes(categoryName)) {
          set({ dropTarget: null, isValidDrop: false, dropError: 'File already in this category' })
          return
        }

        set({ dropTarget: target, isValidDrop: true, dropError: null })
      },

      completeDrop: async () => {
        const current = get()
        if (!current.draggedFile || !current.dropTarget || !current.onCategorizeFile) {
          return
        }

        set({ dragState: 'dropping' })

        // Extract category name for the callback
        const categoryName = current.dropTarget.startsWith('category-') ? current.dropTarget.substring(9) : current.dropTarget

        try {
          const success = await current.onCategorizeFile(current.draggedFile, categoryName)

          const operation: Operation = {
            file: current.draggedFile,
            category: categoryName,
            status: success ? 'success' : 'error'
          }

          if (success) {
            // Add to history for undo
            current.addToHistory(operation)
          }

          set({
            isDragging: false,
            draggedFile: null,
            draggedFiles: [],
            dropTarget: null,
            dragState: 'idle',
            lastOperation: operation,
            dragPreview: null
          })
        } catch (error) {
          const operation: Operation = {
            file: current.draggedFile,
            category: categoryName,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }

          set({
            isDragging: false,
            draggedFile: null,
            draggedFiles: [],
            dropTarget: null,
            dragState: 'idle',
            lastOperation: operation,
            dragPreview: null
          })
        }
      },

      cancelDrag: () => {
        set({
          isDragging: false,
          draggedFile: null,
          draggedFiles: [],
          dropTarget: null,
          dragState: 'idle',
          bulkOperation: false,
          isValidDrop: false,
          dropError: null,
          dragPreview: null,
          dropZoneStates: {}
        })
      },

      // Bulk operations
      startBulkDrag: (files: FileData[]) => {
        set({
          isDragging: true,
          draggedFile: null,
          draggedFiles: files,
          dragState: 'dragging',
          bulkOperation: true,
          dragPreview: {
            fileName: `${files.length} files`,
            fileType: 'Multiple Files',
            fileIcon: 'multi-file-icon',
            dragCount: files.length
          }
        })
      },

      completeBulkDrop: async () => {
        const current = get()
        if (!current.draggedFiles.length || !current.dropTarget || !current.onBulkCategorizeFiles) {
          return
        }

        set({ dragState: 'dropping' })

        // Extract category name for the callback
        const categoryName = current.dropTarget.startsWith('category-') ? current.dropTarget.substring(9) : current.dropTarget

        try {
          const results = await current.onBulkCategorizeFiles(current.draggedFiles, categoryName)

          const bulkOperation: BulkOperation = {
            files: current.draggedFiles,
            category: categoryName,
            results,
            successCount: results.filter(Boolean).length,
            failureCount: results.filter(r => !r).length
          }

          set({
            isDragging: false,
            draggedFiles: [],
            dropTarget: null,
            dragState: 'idle',
            bulkOperation: false,
            lastBulkOperation: bulkOperation
          })
        } catch (error) {
          set({
            isDragging: false,
            draggedFiles: [],
            dropTarget: null,
            dragState: 'idle',
            bulkOperation: false
          })
        }
      },

      // Validation
      isValidCategory: (category: string) => {
        const categoryName = category.startsWith('category-') ? category.substring(9) : category
        return get().availableCategories.includes(categoryName)
      },

      // Visual feedback
      setDropZoneHover: (zoneId: string, isHovered: boolean) => {
        const current = get()
        const newStates = { ...current.dropZoneStates }

        newStates[zoneId] = {
          isHovered,
          isValidTarget: current.isValidCategory(zoneId),
          canAcceptDrop: current.isDragging
        }

        set({ dropZoneStates: newStates })
      },

      // History management
      addToHistory: (operation: Operation) => {
        const current = get()
        const newHistory = [...current.operationHistory, operation]

        // Limit history size
        if (newHistory.length > 50) {
          newHistory.shift()
        }

        set({ operationHistory: newHistory, canUndo: newHistory.length > 0 })
      },

      undoLastOperation: async () => {
        const current = get()
        if (!current.canUndo || !current.onUncategorizeFile) {
          return
        }

        const lastOperation = current.operationHistory[current.operationHistory.length - 1]

        try {
          await current.onUncategorizeFile(lastOperation.file, lastOperation.category)

          // Remove from history
          const newHistory = current.operationHistory.slice(0, -1)
          set({ operationHistory: newHistory, canUndo: newHistory.length > 0 })
        } catch (error) {
          // Handle undo failure
          console.error('Failed to undo operation:', error)
        }
      }
    }),
    {
      name: 'file-categorization'
    }
  )
)

// Default hook without options
export const useFileCategorization = (options?: FileCategorizationOptions) => {
  if (options) {
    return useFileCategorizationWithOptions(options)
  }
  return useFileCategorizationBase()
}

// Hook factory with options
export const useFileCategorizationWithOptions = (options?: FileCategorizationOptions) => {
  const store = useFileCategorizationBase()

  React.useEffect(() => {
    if (options?.availableCategories) {
      useFileCategorizationBase.setState({ availableCategories: options.availableCategories })
    }

    if (options?.onCategorizeFile) {
      useFileCategorizationBase.setState({ onCategorizeFile: options.onCategorizeFile })
    }

    if (options?.onBulkCategorizeFiles) {
      useFileCategorizationBase.setState({ onBulkCategorizeFiles: options.onBulkCategorizeFiles })
    }

    if (options?.onUncategorizeFile) {
      useFileCategorizationBase.setState({ onUncategorizeFile: options.onUncategorizeFile })
    }
  }, [])

  return store
}

// Export store instance
export const fileCategorizationStore = useFileCategorizationBase