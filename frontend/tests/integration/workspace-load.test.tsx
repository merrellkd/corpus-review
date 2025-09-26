import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectWorkspace } from '../../src/features/document-workspace/components/ProjectWorkspace';

// Mock Tauri API
const mockTauriApi = {
  invoke: vi.fn(),
};

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockTauriApi.invoke,
}));

describe('Workspace Load Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load workspace layout on component mount', async () => {
    // Mock successful workspace layout response
    const mockLayout = {
      id: 'layout_550e8400-e29b-41d4-a716-446655440000',
      projectId: 'project_550e8400-e29b-41d4-a716-446655440000',
      panelStates: {
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        searchPanelVisible: false,
        documentWorkspaceVisible: true,
      },
      panelSizes: {
        explorerWidth: 25,
        workspaceWidth: 75,
        panelHeights: {
          fileExplorer: 50,
          categoryExplorer: 50,
        },
      },
      lastModified: '2025-09-19T12:00:00Z',
    };

    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: mockLayout });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Verify workspace layout is requested
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('get_workspace_layout', {
        project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
      });
    });

    // Verify layout is applied - check for resizable panels
    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });
  });

  it('should handle missing workspace layout gracefully', async () => {
    // Mock response with no layout (new project)
    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Verify workspace layout is requested
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('get_workspace_layout', {
        project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
      });
    });

    // Should render with default layout when no saved layout exists
    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
      expect(screen.getByTestId('file-explorer-panel')).toBeInTheDocument();
      expect(screen.getByTestId('document-workspace-panel')).toBeInTheDocument();
    });
  });

  it('should load folder contents for file explorer on workspace load', async () => {
    const mockProject = {
      id: 'project_550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      sourceFolderPath: '/Users/test/Documents/Source',
      reportsFolderPath: '/Users/test/Documents/Reports',
    };

    const mockSourceFiles = [
      {
        path: '/Users/test/Documents/Source/document1.txt',
        name: 'document1.txt',
        type: 'file',
        parentPath: '/Users/test/Documents/Source',
        lastModified: '2025-09-19T10:00:00Z',
        size: 1024,
        isAccessible: true,
      },
      {
        path: '/Users/test/Documents/Source/subfolder',
        name: 'subfolder',
        type: 'directory',
        parentPath: '/Users/test/Documents/Source',
        lastModified: '2025-09-19T09:00:00Z',
        size: null,
        isAccessible: true,
      },
    ];

    const mockReportsFiles = [
      {
        path: '/Users/test/Documents/Reports/report1.pdf',
        name: 'report1.pdf',
        type: 'file',
        parentPath: '/Users/test/Documents/Reports',
        lastModified: '2025-09-19T11:00:00Z',
        size: 2048,
        isAccessible: true,
      },
    ];

    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      if (command === 'get_project_details') {
        return Promise.resolve({ project: mockProject });
      }
      if (command === 'list_folder_contents') {
        if (_args.folder_path === '/Users/test/Documents/Source') {
          return Promise.resolve({ items: mockSourceFiles });
        }
        if (_args.folder_path === '/Users/test/Documents/Reports') {
          return Promise.resolve({ items: mockReportsFiles });
        }
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for project details to load
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('get_project_details', {
        project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
      });
    });

    // Wait for folder contents to be requested
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Source',
      });
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Reports',
      });
    });

    // Verify files are displayed in the file explorer
    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
      expect(screen.getByText('subfolder')).toBeInTheDocument();
      expect(screen.getByText('report1.pdf')).toBeInTheDocument();
    });
  });

  it('should handle file loading errors gracefully', async () => {
    const mockProject = {
      id: 'project_550e8400-e29b-41d4-a716-446655440000',
      name: 'Test Project',
      sourceFolderPath: '/inaccessible/source',
      reportsFolderPath: '/inaccessible/reports',
    };

    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      if (command === 'get_project_details') {
        return Promise.resolve({ project: mockProject });
      }
      if (command === 'list_folder_contents') {
        return Promise.resolve({
          items: [],
          error: 'FOLDER_INACCESSIBLE: Permission denied',
        });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for error state to be handled
    await waitFor(() => {
      expect(screen.getByText(/folder is inaccessible/i)).toBeInTheDocument();
    });
  });

  it('should display loading states during workspace initialization', async () => {
    // Create a delayed promise to test loading state
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return delayedPromise;
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Verify loading state is shown
    expect(screen.getByText(/loading workspace/i)).toBeInTheDocument();

    // Resolve the promise
    resolvePromise!({ layout: null });

    // Verify loading state is removed
    await waitFor(() => {
      expect(screen.queryByText(/loading workspace/i)).not.toBeInTheDocument();
    });
  });

  it('should persist layout changes during workspace load', async () => {
    const mockLayout = {
      id: 'layout_550e8400-e29b-41d4-a716-446655440000',
      projectId: 'project_550e8400-e29b-41d4-a716-446655440000',
      panelStates: {
        fileExplorerVisible: false, // File explorer hidden
        categoryExplorerVisible: true,
        searchPanelVisible: true,
        documentWorkspaceVisible: true,
      },
      panelSizes: {
        explorerWidth: 30,
        workspaceWidth: 70,
        panelHeights: {
          categoryExplorer: 60,
          searchPanel: 40,
        },
      },
      lastModified: '2025-09-19T12:00:00Z',
    };

    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: mockLayout });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for layout to be applied
    await waitFor(() => {
      // File explorer should be hidden based on saved layout
      expect(screen.queryByTestId('file-explorer-panel')).not.toBeInTheDocument();

      // Category explorer and search panel should be visible
      expect(screen.getByTestId('category-explorer-panel')).toBeInTheDocument();
      expect(screen.getByTestId('search-panel')).toBeInTheDocument();

      // Document workspace should always be visible
      expect(screen.getByTestId('document-workspace-panel')).toBeInTheDocument();
    });
  });
});
