import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectWorkspace } from '../../src/components/ProjectWorkspace';

// Mock Tauri API
const mockTauriApi = {
  invoke: vi.fn(),
};

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockTauriApi.invoke,
}));

describe('File Explorer Integration Tests', () => {
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
    {
      path: '/Users/test/Documents/Source/readme.md',
      name: 'readme.md',
      type: 'file',
      parentPath: '/Users/test/Documents/Source',
      lastModified: '2025-09-19T08:00:00Z',
      size: 512,
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
    {
      path: '/Users/test/Documents/Reports/analysis',
      name: 'analysis',
      type: 'directory',
      parentPath: '/Users/test/Documents/Reports',
      lastModified: '2025-09-19T11:30:00Z',
      size: null,
      isAccessible: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
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
        return Promise.resolve({ items: [] });
      }
      return Promise.reject(new Error('Unknown command'));
    });
  });

  it('should display source and reports folder contents on load', async () => {
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for file explorer to load
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Source',
      });
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Reports',
      });
    });

    // Verify source files are displayed
    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
      expect(screen.getByText('subfolder')).toBeInTheDocument();
      expect(screen.getByText('readme.md')).toBeInTheDocument();
    });

    // Verify reports files are displayed
    await waitFor(() => {
      expect(screen.getByText('report1.pdf')).toBeInTheDocument();
      expect(screen.getByText('analysis')).toBeInTheDocument();
    });
  });

  it('should distinguish between files and directories visually', async () => {
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('file-explorer-panel')).toBeInTheDocument();
    });

    // Verify file icons/indicators
    await waitFor(() => {
      const fileElement = screen.getByTestId('file-item-document1.txt');
      expect(fileElement).toHaveAttribute('data-type', 'file');

      const folderElement = screen.getByTestId('file-item-subfolder');
      expect(folderElement).toHaveAttribute('data-type', 'directory');
    });
  });

  it('should handle file double-click to create document caddy', async () => {
    const mockCaddy = {
      id: 'doc_550e8400-e29b-41d4-a716-446655440000',
      filePath: '/Users/test/Documents/Source/document1.txt',
      title: 'document1',
      isActive: true,
      position: { x: 100, y: 100, zIndex: 1 },
      dimensions: { width: 600, height: 400, minWidth: 300, minHeight: 200 },
      scrollPosition: 0,
    };

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
        return Promise.resolve({ items: [] });
      }
      if (command === 'create_document_caddy') {
        return Promise.resolve({ caddy: mockCaddy });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    const user = userEvent.setup();
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for files to load
    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
    });

    // Double-click on file
    const fileElement = screen.getByTestId('file-item-document1.txt');
    await user.dblClick(fileElement);

    // Verify document caddy creation is requested
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('create_document_caddy', {
        file_path: '/Users/test/Documents/Source/document1.txt',
        workspace_id: expect.stringMatching(/^workspace_/),
      });
    });

    // Verify document caddy appears in workspace
    await waitFor(() => {
      expect(screen.getByTestId('document-caddy-doc_550e8400-e29b-41d4-a716-446655440000')).toBeInTheDocument();
      expect(screen.getByText('document1')).toBeInTheDocument();
    });
  });

  it('should handle directory expansion and navigation', async () => {
    const mockSubfolderFiles = [
      {
        path: '/Users/test/Documents/Source/subfolder/nested.txt',
        name: 'nested.txt',
        type: 'file',
        parentPath: '/Users/test/Documents/Source/subfolder',
        lastModified: '2025-09-19T07:00:00Z',
        size: 256,
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
        if (_args.folder_path === '/Users/test/Documents/Source/subfolder') {
          return Promise.resolve({ items: mockSubfolderFiles });
        }
        return Promise.resolve({ items: [] });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    const user = userEvent.setup();
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for initial files to load
    await waitFor(() => {
      expect(screen.getByText('subfolder')).toBeInTheDocument();
    });

    // Click on directory to expand
    const folderElement = screen.getByTestId('file-item-subfolder');
    await user.click(folderElement);

    // Verify subfolder contents are requested
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Source/subfolder',
      });
    });

    // Verify nested files appear
    await waitFor(() => {
      expect(screen.getByText('nested.txt')).toBeInTheDocument();
    });
  });

  it('should display folder hierarchy and breadcrumbs', async () => {
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for file explorer to load
    await waitFor(() => {
      expect(screen.getByTestId('file-explorer-panel')).toBeInTheDocument();
    });

    // Verify folder section headers
    await waitFor(() => {
      expect(screen.getByText('Source')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    // Verify folder paths are shown
    expect(screen.getByText('/Users/test/Documents/Source')).toBeInTheDocument();
    expect(screen.getByText('/Users/test/Documents/Reports')).toBeInTheDocument();
  });

  it('should handle empty folders gracefully', async () => {
    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      if (command === 'get_project_details') {
        return Promise.resolve({ project: mockProject });
      }
      if (command === 'list_folder_contents') {
        return Promise.resolve({ items: [] }); // Empty folders
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Wait for folder loading attempts
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Source',
      });
    });

    // Verify empty state messages
    await waitFor(() => {
      expect(screen.getByText(/source folder is empty/i)).toBeInTheDocument();
      expect(screen.getByText(/reports folder is empty/i)).toBeInTheDocument();
    });
  });

  it('should handle inaccessible folders with error messages', async () => {
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

    // Wait for error handling
    await waitFor(() => {
      expect(screen.getByText(/source folder is inaccessible/i)).toBeInTheDocument();
      expect(screen.getByText(/reports folder is inaccessible/i)).toBeInTheDocument();
      expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    });
  });

  it('should display file metadata (size, modified date)', async () => {
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
    });

    // Verify file size is displayed
    await waitFor(() => {
      expect(screen.getByText('1.0 KB')).toBeInTheDocument(); // 1024 bytes
      expect(screen.getByText('2.0 KB')).toBeInTheDocument(); // 2048 bytes
      expect(screen.getByText('512 B')).toBeInTheDocument(); // 512 bytes
    });

    // Verify last modified dates are displayed
    expect(screen.getByText(/Sep 19, 2025/)).toBeInTheDocument();
  });

  it('should support file filtering and search', async () => {
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('file-explorer-panel')).toBeInTheDocument();
    });

    // Find and use search input
    const searchInput = screen.getByPlaceholderText(/search files/i);
    await user.type(searchInput, 'doc');

    // Verify filtering works
    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
      expect(screen.queryByText('readme.md')).not.toBeInTheDocument();
      expect(screen.queryByText('subfolder')).not.toBeInTheDocument();
    });
  });

  it('should handle context menu actions on files', async () => {
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByText('document1.txt')).toBeInTheDocument();
    });

    // Right-click on file
    const fileElement = screen.getByTestId('file-item-document1.txt');
    await user.pointer({ keys: '[MouseRight]', target: fileElement });

    // Verify context menu appears
    await waitFor(() => {
      expect(screen.getByText('Open in New Caddy')).toBeInTheDocument();
      expect(screen.getByText('Copy Path')).toBeInTheDocument();
      expect(screen.getByText('Show in System')).toBeInTheDocument();
    });
  });

  it('should refresh folder contents when requested', async () => {
    const user = userEvent.setup();
    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('file-explorer-panel')).toBeInTheDocument();
    });

    // Clear previous invoke calls
    mockTauriApi.invoke.mockClear();

    // Click refresh button
    const refreshButton = screen.getByTestId('refresh-file-explorer');
    await user.click(refreshButton);

    // Verify folders are re-scanned
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Source',
      });
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('list_folder_contents', {
        folder_path: '/Users/test/Documents/Reports',
      });
    });
  });
});