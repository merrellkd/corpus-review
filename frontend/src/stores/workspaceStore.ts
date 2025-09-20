import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/tauri'

// Development mode detection - always use mock data in dev mode
const isDevelopment = import.meta.env.DEV

// Mock data for development
const mockProject: ProjectDto = {
  id: 'project_550e8400-e29b-41d4-a716-446655440000',
  name: 'Sample Research Project',
  source_folder: '/Users/demo/Documents/Research/Source',
  reports_folder: '/Users/demo/Documents/Research/Reports',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
}

const mockLayout: WorkspaceLayoutDto = {
  id: 'layout_550e8400-e29b-41d4-a716-446655440001',
  project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
  file_explorer_visible: true,
  category_explorer_visible: false,
  search_panel_visible: true,
  explorer_width: 25,
  workspace_width: 75,
}

const mockFiles: FileSystemItemDto[] = [
  {
    name: 'research-notes.md',
    path: '/Users/demo/Documents/Research/Source/research-notes.md',
    item_type: 'file',
    formatted_size: '2.3 KB',
    modified_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'data-analysis',
    path: '/Users/demo/Documents/Research/Source/data-analysis',
    item_type: 'directory',
    formatted_size: '',
    modified_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'readme.md',
    path: '/Users/demo/Documents/Research/Source/readme.md',
    item_type: 'file',
    formatted_size: '1.0 KB',
    modified_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'report1.pdf',
    path: '/Users/demo/Documents/Research/Source/report1.pdf',
    item_type: 'file',
    formatted_size: '2.0 KB',
    modified_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'analysis',
    path: '/Users/demo/Documents/Research/Source/analysis',
    item_type: 'directory',
    formatted_size: '',
    modified_at: '2024-01-15T10:30:00Z',
  },
  {
    name: 'nested.txt',
    path: '/Users/demo/Documents/Research/Source/nested.txt',
    item_type: 'file',
    formatted_size: '512 B',
    modified_at: '2024-01-15T10:30:00Z',
  },
]

// Types matching the backend DTOs
export interface WorkspaceLayoutDto {
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

export interface FileSystemItemDto {
  path: string
  name: string
  item_type: string
  parent_path: string | null
  last_modified: string
  size: number | null
  is_accessible: boolean
  formatted_size: string
}

export interface DocumentCaddyDto {
  id: string
  file_path: string
  title: string
  position_x: number
  position_y: number
  width: number
  height: number
  z_index: number
  is_active: boolean
}

export interface ProjectDto {
  id: string
  name: string
  source_folder: string
  reports_folder: string
  created_at: string
}

// Store state interface
interface WorkspaceState {
  // Current project and layout
  currentProject: ProjectDto | null
  workspaceLayout: WorkspaceLayoutDto | null

  // File system state
  fileExplorerItems: FileSystemItemDto[]
  categoryExplorerItems: FileSystemItemDto[]
  searchResults: FileSystemItemDto[]
  currentPath: string

  // Document caddies
  documentCaddies: DocumentCaddyDto[]
  activeDocumentId: string | null

  // UI state
  isLoading: boolean
  error: string | null

  // Actions
  loadProject: (projectId: string) => Promise<void>
  updatePanelVisibility: (panelType: string, visible: boolean) => Promise<void>
  updatePanelSizes: (panelType: string, width: number, height?: number) => Promise<void>
  loadFolderContents: (folderPath: string) => Promise<void>
  searchFiles: (folderPath: string, query: string) => Promise<void>
  createDocumentCaddy: (filePath: string) => Promise<void>
  updateDocumentCaddy: (caddyId: string, positionX?: number, positionY?: number) => Promise<void>

  // Utility actions
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      workspaceLayout: null,
      fileExplorerItems: [],
      categoryExplorerItems: [],
      searchResults: [],
      currentPath: '',
      documentCaddies: [],
      activeDocumentId: null,
      isLoading: false,
      error: null,

      // Load project and its workspace layout
      loadProject: async (projectId: string) => {
        try {
          set({ isLoading: true, error: null })

          if (isDevelopment) {
            // Use mock data in development mode
            setTimeout(() => {
              set({
                currentProject: mockProject,
                workspaceLayout: mockLayout,
                fileExplorerItems: mockFiles,
                currentPath: mockProject.source_folder,
                isLoading: false,
              })
            }, 500) // Simulate loading delay
            return
          }

          // Load project details
          const project = await invoke<ProjectDto>('get_project_details', { projectId })

          // Load workspace layout
          const layout = await invoke<WorkspaceLayoutDto>('get_workspace_layout', { projectId })

          // Load initial folder contents for source folder
          const folderContents = await invoke<FileSystemItemDto[]>('list_folder_contents', {
            folderPath: project.source_folder
          })

          set({
            currentProject: project,
            workspaceLayout: layout,
            fileExplorerItems: folderContents,
            currentPath: project.source_folder,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to load project:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load project',
            isLoading: false
          })
        }
      },

      // Update panel visibility
      updatePanelVisibility: async (panelType: string, visible: boolean) => {
        const { currentProject } = get()
        if (!currentProject) return

        try {
          set({ isLoading: true, error: null })

          if (isDevelopment) {
            // Mock implementation for development
            console.log('Mock: updatePanelVisibility', panelType, visible)
            set({ isLoading: false })
            return
          }

          const updatedLayout = await invoke<WorkspaceLayoutDto>('update_panel_visibility', {
            projectId: currentProject.id,
            panelType,
            visible
          })

          set({
            workspaceLayout: updatedLayout,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to update panel visibility:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update panel visibility',
            isLoading: false
          })
        }
      },

      // Update panel sizes
      updatePanelSizes: async (panelType: string, width: number, height?: number) => {
        const { currentProject } = get()
        if (!currentProject) return

        try {
          if (isDevelopment) {
            // Mock implementation for development
            console.log('Mock: updatePanelSizes', panelType, width, height)
            return
          }

          const updatedLayout = await invoke<WorkspaceLayoutDto>('update_panel_sizes', {
            projectId: currentProject.id,
            panelType,
            width,
            height
          })

          set({ workspaceLayout: updatedLayout })
        } catch (error) {
          console.error('Failed to update panel sizes:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update panel sizes'
          })
        }
      },

      // Load folder contents
      loadFolderContents: async (folderPath: string) => {
        try {
          set({ isLoading: true, error: null })

          const items = await invoke<FileSystemItemDto[]>('list_folder_contents', { folderPath })

          set({
            fileExplorerItems: items,
            currentPath: folderPath,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to load folder contents:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to load folder contents',
            isLoading: false
          })
        }
      },

      // Search files
      searchFiles: async (folderPath: string, query: string) => {
        try {
          set({ isLoading: true, error: null })

          const results = await invoke<FileSystemItemDto[]>('search_files_recursive', {
            folderPath,
            query
          })

          set({
            searchResults: results,
            isLoading: false
          })
        } catch (error) {
          console.error('Failed to search files:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to search files',
            isLoading: false
          })
        }
      },

      // Create document caddy
      createDocumentCaddy: async (filePath: string) => {
        try {
          set({ isLoading: true, error: null })

          if (isDevelopment) {
            // Mock implementation for development
            console.log('Mock: createDocumentCaddy', filePath)
            const mockCaddy: DocumentCaddyDto = {
              id: `caddy_${Date.now()}`,
              title: filePath.split('/').pop() || 'Document',
              file_path: filePath,
              position_x: 50 + (Math.random() * 100),
              position_y: 50 + (Math.random() * 100),
              width: 400,
              height: 300,
              z_index: 1,
              is_active: true,
            }
            set(state => ({
              documentCaddies: [...state.documentCaddies, mockCaddy],
              activeDocumentId: mockCaddy.id,
              isLoading: false
            }))
            return
          }

          const caddy = await invoke<DocumentCaddyDto>('create_document_caddy', { filePath })

          set((state) => ({
            documentCaddies: [...state.documentCaddies, caddy],
            activeDocumentId: caddy.id,
            isLoading: false
          }))
        } catch (error) {
          console.error('Failed to create document caddy:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create document caddy',
            isLoading: false
          })
        }
      },

      // Update document caddy position
      updateDocumentCaddy: async (caddyId: string, positionX?: number, positionY?: number) => {
        try {
          if (isDevelopment) {
            // Mock implementation for development
            console.log('Mock: updateDocumentCaddy', caddyId, positionX, positionY)
            set(state => ({
              documentCaddies: state.documentCaddies.map(caddy =>
                caddy.id === caddyId
                  ? { ...caddy, position_x: positionX ?? caddy.position_x, position_y: positionY ?? caddy.position_y }
                  : caddy
              )
            }))
            return
          }

          const updatedCaddy = await invoke<DocumentCaddyDto>('update_document_caddy', {
            caddyId,
            positionX,
            positionY
          })

          set((state) => ({
            documentCaddies: state.documentCaddies.map(caddy =>
              caddy.id === caddyId ? updatedCaddy : caddy
            )
          }))
        } catch (error) {
          console.error('Failed to update document caddy:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to update document caddy'
          })
        }
      },

      // Utility actions
      setError: (error: string | null) => set({ error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'workspace-store',
    }
  )
)