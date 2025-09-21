import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Development mode detection - always use mock data in dev mode
const isDevelopment = true // Simplified for now

// Types (simplified)
interface Project {
  id: string
  name: string
  source_folder: string
  reports_folder: string
  created_at: string
}

interface WorkspaceLayout {
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

interface FileSystemItem {
  name: string
  path: string
  parent_path: string
  item_type: string
  size: number
  formatted_size: string
  is_accessible: boolean
  last_modified: string
}

// Mock data for development
const mockProject: Project = {
  id: 'project_550e8400-e29b-41d4-a716-446655440000',
  name: 'Sample Research Project',
  source_folder: '/Users/demo/Documents/Research/Source',
  reports_folder: '/Users/demo/Documents/Research/Reports',
  created_at: '2024-01-15T10:30:00Z'
}

const mockLayout: WorkspaceLayout = {
  id: 'layout_550e8400-e29b-41d4-a716-446655440001',
  project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
  file_explorer_visible: true,
  category_explorer_visible: false,
  search_panel_visible: true,
  document_workspace_visible: true,
  explorer_width: 25,
  workspace_width: 75,
  last_modified: '2024-01-15T10:30:00Z'
}

const mockFiles: FileSystemItem[] = [
  {
    name: 'research-notes.md',
    path: '/Users/demo/Documents/Research/Source/research-notes.md',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 2300,
    formatted_size: '2.3 KB',
    is_accessible: true,
    last_modified: '2024-01-15T10:30:00Z',
  }
]

// Document Caddy type
interface DocumentCaddy {
  id: string
  title: string
  filePath: string
  content?: string
  isActive: boolean
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  z_index?: number
}

// Workspace store state
interface WorkspaceState {
  // Core state
  currentProject: Project | null
  workspaceLayout: WorkspaceLayout | null
  isLoading: boolean
  error: string | null

  // Navigation state
  currentPath: string

  // Collections
  fileExplorerItems: FileSystemItem[]
  categoryExplorerItems: FileSystemItem[]
  searchResults: FileSystemItem[]
  documentCaddies: DocumentCaddy[]

  // Actions
  loadProject: (projectId: string) => Promise<void>
  loadFolderContents: (folderPath: string) => Promise<void>
  createDocumentCaddy: (filePath: string) => void
  updateDocumentCaddy: (caddyId: string, updates: Partial<DocumentCaddy>) => void
  searchFiles: (query: string) => Promise<void>
  updatePanelSizes: (panelType: string, width: number) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      workspaceLayout: null,
      isLoading: false,
      error: null,
      currentPath: '',
      fileExplorerItems: [],
      categoryExplorerItems: [],
      searchResults: [],
      documentCaddies: [],

      // Actions
      loadProject: async (_projectId: string) => {
        set({ isLoading: true, error: null })

        try {
          // For development, use mock data
          if (isDevelopment) {
            await new Promise(resolve => setTimeout(resolve, 500)) // Simulate loading
            set({
              currentProject: mockProject,
              workspaceLayout: mockLayout,
              fileExplorerItems: mockFiles,
              isLoading: false
            })
          } else {
            // In production, make actual API calls here
            set({ error: 'API integration not implemented yet', isLoading: false })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false
          })
        }
      },

      loadFolderContents: async (folderPath: string) => {
        set({ isLoading: true, error: null, currentPath: folderPath })

        try {
          if (isDevelopment) {
            await new Promise(resolve => setTimeout(resolve, 300))
            set({
              fileExplorerItems: mockFiles,
              isLoading: false
            })
          } else {
            set({ error: 'API integration not implemented yet', isLoading: false })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load folder contents',
            isLoading: false
          })
        }
      },

      createDocumentCaddy: (filePath: string) => {
        const current = get()
        const existingCaddy = current.documentCaddies.find(caddy => caddy.filePath === filePath)

        if (existingCaddy) {
          // Activate existing caddy
          set({
            documentCaddies: current.documentCaddies.map(caddy => ({
              ...caddy,
              isActive: caddy.id === existingCaddy.id
            }))
          })
          return
        }

        // Create new caddy
        const fileName = filePath.split('/').pop() || 'Unknown'
        const newCaddy: DocumentCaddy = {
          id: `caddy_${Date.now()}`,
          title: fileName,
          filePath,
          isActive: true
        }

        set({
          documentCaddies: [
            ...current.documentCaddies.map(caddy => ({ ...caddy, isActive: false })),
            newCaddy
          ]
        })
      },

      updateDocumentCaddy: (caddyId: string, updates: Partial<DocumentCaddy>) => {
        const current = get()
        set({
          documentCaddies: current.documentCaddies.map(caddy =>
            caddy.id === caddyId ? { ...caddy, ...updates } : caddy
          )
        })
      },

      searchFiles: async (query: string) => {
        set({ isLoading: true, error: null })

        try {
          if (isDevelopment) {
            await new Promise(resolve => setTimeout(resolve, 400))
            const filteredFiles = mockFiles.filter(file =>
              file.name.toLowerCase().includes(query.toLowerCase())
            )
            set({
              searchResults: filteredFiles,
              isLoading: false
            })
          } else {
            set({ error: 'Search API integration not implemented yet', isLoading: false })
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Search failed',
            isLoading: false
          })
        }
      },

      updatePanelSizes: (_panelType: string, width: number) => {
        const current = get()
        if (!current.workspaceLayout) return

        const updatedLayout = {
          ...current.workspaceLayout,
          explorer_width: width,
          workspace_width: 100 - width
        }

        set({ workspaceLayout: updatedLayout })
      }
    }),
    { name: 'workspace-store' }
  )
)