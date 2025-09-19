import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectWorkspace } from '../../src/components/ProjectWorkspace';

// Mock Tauri API
const mockTauriApi = {
  invoke: vi.fn(),
};

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: mockTauriApi.invoke,
}));

// Mock react-resizable-panels
const mockPanelGroup = vi.fn(({ children, direction, ...props }) => (
  <div data-testid="panel-group" data-direction={direction} {...props}>
    {children}
  </div>
));

const mockPanel = vi.fn(({ children, size, minSize, ...props }) => (
  <div data-testid="panel" data-size={size} data-min-size={minSize} {...props}>
    {children}
  </div>
));

const mockPanelResizeHandle = vi.fn((props) => (
  <div data-testid="resize-handle" {...props} />
));

vi.mock('react-resizable-panels', () => ({
  Panel: mockPanel,
  PanelGroup: mockPanelGroup,
  PanelResizeHandle: mockPanelResizeHandle,
}));

describe('Panel Resize Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize panels with correct default sizes', async () => {
    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null }); // No saved layout
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Verify default panel sizes are applied
    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 25, // Default explorer width
        minSize: 15,
      }),
      expect.any(Object)
    );

    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 75, // Default workspace width
        minSize: 30,
      }),
      expect.any(Object)
    );
  });

  it('should restore saved panel sizes on load', async () => {
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
        explorerWidth: 35, // Custom saved width
        workspaceWidth: 65,
        panelHeights: {
          fileExplorer: 60,
          categoryExplorer: 40,
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

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Verify saved panel sizes are applied
    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 35, // Saved explorer width
      }),
      expect.any(Object)
    );

    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        size: 65, // Saved workspace width
      }),
      expect.any(Object)
    );
  });

  it('should handle panel resize events and save layout', async () => {
    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      if (command === 'save_workspace_layout') {
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Find the onLayout callback passed to PanelGroup
    const panelGroupCall = mockPanelGroup.mock.calls.find(
      (call) => call[0].onLayout
    );
    expect(panelGroupCall).toBeDefined();

    const onLayoutCallback = panelGroupCall![0].onLayout;

    // Simulate panel resize by calling onLayout with new sizes
    const newSizes = [40, 60]; // Explorer: 40%, Workspace: 60%
    onLayoutCallback(newSizes);

    // Verify layout save is called with debounced timing
    await waitFor(
      () => {
        expect(mockTauriApi.invoke).toHaveBeenCalledWith('save_workspace_layout', {
          layout: expect.objectContaining({
            panelSizes: expect.objectContaining({
              explorerWidth: 40,
              workspaceWidth: 60,
            }),
          }),
        });
      },
      { timeout: 2000 } // Account for debouncing
    );
  });

  it('should handle vertical panel resizing within explorer', async () => {
    const mockLayout = {
      id: 'layout_550e8400-e29b-41d4-a716-446655440000',
      projectId: 'project_550e8400-e29b-41d4-a716-446655440000',
      panelStates: {
        fileExplorerVisible: true,
        categoryExplorerVisible: true,
        searchPanelVisible: true,
        documentWorkspaceVisible: true,
      },
      panelSizes: {
        explorerWidth: 30,
        workspaceWidth: 70,
        panelHeights: {
          fileExplorer: 40,
          categoryExplorer: 30,
          searchPanel: 30,
        },
      },
      lastModified: '2025-09-19T12:00:00Z',
    };

    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: mockLayout });
      }
      if (command === 'save_workspace_layout') {
        return Promise.resolve({ success: true });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Find the vertical PanelGroup for explorer panels
    const verticalPanelGroupCall = mockPanelGroup.mock.calls.find(
      (call) => call[0].direction === 'vertical' && call[0].onLayout
    );
    expect(verticalPanelGroupCall).toBeDefined();

    const onVerticalLayoutCallback = verticalPanelGroupCall![0].onLayout;

    // Simulate vertical resize: File Explorer larger, Category Explorer smaller
    const newVerticalSizes = [50, 25, 25]; // File: 50%, Category: 25%, Search: 25%
    onVerticalLayoutCallback(newVerticalSizes);

    // Verify layout save includes updated panel heights
    await waitFor(
      () => {
        expect(mockTauriApi.invoke).toHaveBeenCalledWith('save_workspace_layout', {
          layout: expect.objectContaining({
            panelSizes: expect.objectContaining({
              panelHeights: {
                fileExplorer: 50,
                categoryExplorer: 25,
                searchPanel: 25,
              },
            }),
          }),
        });
      },
      { timeout: 2000 }
    );
  });

  it('should enforce minimum panel sizes during resize', async () => {
    mockTauriApi.invoke.mockImplementation((command: string) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Verify minimum sizes are set for panels
    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        minSize: 15, // Explorer minimum
      }),
      expect.any(Object)
    );

    expect(mockPanel).toHaveBeenCalledWith(
      expect.objectContaining({
        minSize: 30, // Workspace minimum
      }),
      expect.any(Object)
    );
  });

  it('should auto-expand workspace when explorer panels are hidden', async () => {
    // Start with explorer visible
    let currentLayout = {
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

    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: currentLayout });
      }
      if (command === 'update_panel_visibility') {
        // Simulate hiding all explorer panels
        currentLayout.panelStates.fileExplorerVisible = false;
        currentLayout.panelStates.categoryExplorerVisible = false;
        currentLayout.panelSizes.explorerWidth = 0;
        currentLayout.panelSizes.workspaceWidth = 100;
        return Promise.resolve({
          success: true,
          new_layout: currentLayout,
        });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    const { rerender } = render(
      <ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />
    );

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Simulate hiding explorer panels (this would be triggered by UI interaction)
    await waitFor(() => {
      expect(mockTauriApi.invoke).toHaveBeenCalledWith('update_panel_visibility', {
        project_id: 'project_550e8400-e29b-41d4-a716-446655440000',
        panel_type: 'file_explorer',
        visible: false,
      });
    });

    // Re-render with updated layout
    rerender(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    // Verify workspace expands to full width
    await waitFor(() => {
      expect(mockPanel).toHaveBeenCalledWith(
        expect.objectContaining({
          size: 100, // Full width when explorer hidden
        }),
        expect.any(Object)
      );
    });
  });

  it('should handle resize errors gracefully', async () => {
    mockTauriApi.invoke.mockImplementation((command: string, _args: any) => {
      if (command === 'get_workspace_layout') {
        return Promise.resolve({ layout: null });
      }
      if (command === 'save_workspace_layout') {
        return Promise.resolve({ success: false, error: 'Database error' });
      }
      return Promise.reject(new Error('Unknown command'));
    });

    render(<ProjectWorkspace projectId="project_550e8400-e29b-41d4-a716-446655440000" />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });

    // Find and trigger resize
    const panelGroupCall = mockPanelGroup.mock.calls.find(
      (call) => call[0].onLayout
    );
    const onLayoutCallback = panelGroupCall![0].onLayout;
    onLayoutCallback([30, 70]);

    // Should not crash on save error
    await waitFor(() => {
      // Error should be logged or handled gracefully
      expect(screen.getByTestId('workspace-container')).toBeInTheDocument();
    });
  });
});