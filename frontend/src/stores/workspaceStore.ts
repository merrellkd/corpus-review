import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { invoke } from '@tauri-apps/api/core'
import { WorkspaceDto, DirectoryListingDto } from '../domains/workspace/application/dtos/workspace-dtos'
import { WorkspaceAdapter, FileSystemItem, WorkspaceLayout } from '../adapters/workspace-dto-adapter'

// Backend integration enabled - use real file system data
const isDevelopment = false // Real backend integration enabled

// Types (simplified) - matches backend ProjectDto
interface Project {
  id: string
  name: string
  source_folder: string
  source_folder_name?: string
  note?: string
  note_preview?: string
  note_line_count?: number
  created_at: string
  is_accessible: boolean
}



// Mock data for development
const mockProject: Project = {
  id: 'project_550e8400-e29b-41d4-a716-446655440000',
  name: 'Sample Research Project',
  source_folder: '/Users/demo/Documents/Research/Source',
  source_folder_name: 'Source',
  note: 'This is a sample research project for testing purposes.',
  note_preview: 'This is a sample research project...',
  note_line_count: 1,
  created_at: '2024-01-15T10:30:00Z',
  is_accessible: true
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
  // Source folder files
  {
    name: 'research-notes.md',
    path: '/Users/demo/Documents/Research/Source/research-notes.md',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 2300,
    formatted_size: '2.3 KB',
    is_accessible: true,
    last_modified: '2024-01-15T10:30:00Z',
  },
  {
    name: 'data-collection.pdf',
    path: '/Users/demo/Documents/Research/Source/data-collection.pdf',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 1245680,
    formatted_size: '1.2 MB',
    is_accessible: true,
    last_modified: '2024-01-12T14:22:00Z',
  },
  {
    name: 'interview-transcripts.docx',
    path: '/Users/demo/Documents/Research/Source/interview-transcripts.docx',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 45800,
    formatted_size: '45 KB',
    is_accessible: true,
    last_modified: '2024-01-10T09:15:00Z',
  },
  {
    name: 'survey-results.xlsx',
    path: '/Users/demo/Documents/Research/Source/survey-results.xlsx',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 128500,
    formatted_size: '125 KB',
    is_accessible: true,
    last_modified: '2024-01-08T16:45:00Z',
  },
  {
    name: 'literature-review.md',
    path: '/Users/demo/Documents/Research/Source/literature-review.md',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 8950,
    formatted_size: '8.9 KB',
    is_accessible: true,
    last_modified: '2024-01-05T11:30:00Z',
  },
  {
    name: 'images',
    path: '/Users/demo/Documents/Research/Source/images',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'directory',
    size: 0,
    formatted_size: '-',
    is_accessible: true,
    last_modified: '2024-01-14T08:20:00Z',
  },
  {
    name: 'raw-data',
    path: '/Users/demo/Documents/Research/Source/raw-data',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'directory',
    size: 0,
    formatted_size: '-',
    is_accessible: true,
    last_modified: '2024-01-13T15:10:00Z',
  },
  {
    name: 'README.md',
    path: '/Users/demo/Documents/Research/Source/README.md',
    parent_path: '/Users/demo/Documents/Research/Source',
    item_type: 'file',
    size: 1024,
    formatted_size: '1.0 KB',
    is_accessible: true,
    last_modified: '2024-01-01T12:00:00Z',
  }
]

const mockReportsFiles: FileSystemItem[] = [
  {
    name: 'final-report.pdf',
    path: '/Users/demo/Documents/Research/Reports/final-report.pdf',
    parent_path: '/Users/demo/Documents/Research/Reports',
    item_type: 'file',
    size: 2048000,
    formatted_size: '2.0 MB',
    is_accessible: true,
    last_modified: '2024-01-16T10:30:00Z',
  },
  {
    name: 'preliminary-findings.docx',
    path: '/Users/demo/Documents/Research/Reports/preliminary-findings.docx',
    parent_path: '/Users/demo/Documents/Research/Reports',
    item_type: 'file',
    size: 67200,
    formatted_size: '66 KB',
    is_accessible: true,
    last_modified: '2024-01-14T16:20:00Z',
  },
  {
    name: 'data-analysis.xlsx',
    path: '/Users/demo/Documents/Research/Reports/data-analysis.xlsx',
    parent_path: '/Users/demo/Documents/Research/Reports',
    item_type: 'file',
    size: 256000,
    formatted_size: '250 KB',
    is_accessible: true,
    last_modified: '2024-01-12T14:15:00Z',
  },
  {
    name: 'charts-and-graphs',
    path: '/Users/demo/Documents/Research/Reports/charts-and-graphs',
    parent_path: '/Users/demo/Documents/Research/Reports',
    item_type: 'directory',
    size: 0,
    formatted_size: '-',
    is_accessible: true,
    last_modified: '2024-01-11T09:45:00Z',
  },
  {
    name: 'executive-summary.pdf',
    path: '/Users/demo/Documents/Research/Reports/executive-summary.pdf',
    parent_path: '/Users/demo/Documents/Research/Reports',
    item_type: 'file',
    size: 512000,
    formatted_size: '500 KB',
    is_accessible: true,
    last_modified: '2024-01-15T13:22:00Z',
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
  navigateToFolder: (folderName: string) => Promise<void>
  navigateToParent: () => Promise<void>
  refreshFiles: () => Promise<void>
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
      loadProject: async (projectId: string) => {
        set({ isLoading: true, error: null })

        try {
          // Get project details first
          const project = await invoke<Project>('open_project', { id: projectId })

          // Open workspace using real backend
          const workspace = await invoke<WorkspaceDto>('open_workspace_navigation', {
            projectId: project.id,
            projectName: project.name,
            sourceFolder: project.source_folder
          })

          // Debug: Log what we actually received
          console.log('Backend workspace response:', workspace)
          console.log('Workspace directoryListing:', workspace.directoryListing)

          // Convert backend DTOs to store format using adapter
          const adaptedWorkspace = WorkspaceAdapter.adaptWorkspace(workspace)

          // Create or load workspace layout for the project
          const workspaceLayout = WorkspaceAdapter.createDefaultLayout(project.id)

          set({
            currentProject: project,
            workspaceLayout,
            currentPath: adaptedWorkspace.currentPath,
            fileExplorerItems: adaptedWorkspace.fileExplorerItems,
            isLoading: false
          })
        } catch (error) {
          const friendlyMessage = WorkspaceAdapter.adaptError(error instanceof Error ? error : new Error('Unknown error'))

          set({
            error: friendlyMessage,
            isLoading: false
          })
        }
      },

      navigateToFolder: async (folderName: string) => {
        const current = get()
        if (!current.currentProject) return

        set({ isLoading: true, error: null })

        try {
          const workspace = await invoke<WorkspaceDto>('navigate_to_folder', {
            projectId: current.currentProject.id,
            projectName: current.currentProject.name,
            sourceFolder: current.currentProject.source_folder,
            currentPath: current.currentPath,
            folderName: folderName
          })

          const adaptedWorkspace = WorkspaceAdapter.adaptWorkspace(workspace)

          set({
            currentPath: adaptedWorkspace.currentPath,
            fileExplorerItems: adaptedWorkspace.fileExplorerItems,
            isLoading: false
          })
        } catch (error) {
          const friendlyMessage = WorkspaceAdapter.adaptError(error instanceof Error ? error : new Error('Navigation failed'))
          set({
            error: `Failed to navigate to ${folderName}: ${friendlyMessage}`,
            isLoading: false
          })
        }
      },

      navigateToParent: async () => {
        const current = get()
        if (!current.currentProject) return

        set({ isLoading: true, error: null })

        try {
          const workspace = await invoke<WorkspaceDto>('navigate_to_parent', {
            projectId: current.currentProject.id,
            projectName: current.currentProject.name,
            sourceFolder: current.currentProject.source_folder,
            currentPath: current.currentPath
          })

          const adaptedWorkspace = WorkspaceAdapter.adaptWorkspace(workspace)

          set({
            currentPath: adaptedWorkspace.currentPath,
            fileExplorerItems: adaptedWorkspace.fileExplorerItems,
            isLoading: false
          })
        } catch (error) {
          const friendlyMessage = WorkspaceAdapter.adaptError(error instanceof Error ? error : new Error('Navigation failed'))
          set({
            error: `Failed to navigate to parent: ${friendlyMessage}`,
            isLoading: false
          })
        }
      },

      refreshFiles: async () => {
        const current = get()
        if (!current.currentProject) return

        set({ isLoading: true, error: null })

        try {
          const directoryListing = await invoke<DirectoryListingDto>('list_directory', {
            projectId: current.currentProject.id,
            projectName: current.currentProject.name,
            sourceFolder: current.currentProject.source_folder,
            currentPath: current.currentPath
          })

          const fileItems = WorkspaceAdapter.adaptDirectoryListing(directoryListing, current.currentPath)

          set({
            fileExplorerItems: fileItems,
            isLoading: false
          })
        } catch (error) {
          const friendlyMessage = WorkspaceAdapter.adaptError(error instanceof Error ? error : new Error('Refresh failed'))
          set({
            error: `Failed to refresh files: ${friendlyMessage}`,
            isLoading: false
          })
        }
      },

      loadFolderContents: async (folderPath: string) => {
        set({ isLoading: true, error: null, currentPath: folderPath })

        try {
          if (isDevelopment) {
            await new Promise(resolve => setTimeout(resolve, 50))

            // Determine which mock files to show based on folder path
            let filesToShow: FileSystemItem[] = []
            if (folderPath.includes('Source') || folderPath === '' || !folderPath.includes('Reports')) {
              filesToShow = mockFiles
            } else if (folderPath.includes('Reports')) {
              filesToShow = mockReportsFiles
            }

            set({
              fileExplorerItems: filesToShow,
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