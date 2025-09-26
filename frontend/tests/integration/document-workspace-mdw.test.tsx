import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentWorkspace } from '../../src/features/document-workspace/components/DocumentWorkspace';
import { useWorkspaceStore, workspaceSelectors } from '../../src/domains/workspace/ui/stores/workspace-store';
import { LayoutModeType } from '../../src/domains/workspace/domain/value-objects/layout-mode';
import { Position, Dimensions } from '../../src/domains/workspace/domain/value-objects/geometry';

/**
 * Integration tests for DocumentWorkspace component with Multi-Document Workspace domain
 *
 * These tests verify the complete integration between the DocumentWorkspace UI component
 * and the workspace domain layer, ensuring:
 * 1. Store integration and state management
 * 2. Layout mode switching through UI
 * 3. Document operations (add, move, resize, activate)
 * 4. Error handling integration
 * 5. Workspace lifecycle management
 */

// Mock the workspace store
vi.mock('../../src/domains/workspace/ui/stores/workspace-store', () => ({
  useWorkspaceStore: vi.fn(),
  workspaceSelectors: {
    currentWorkspace: (state: any) => state.currentWorkspace,
    documentList: (state: any) => state.documents,
    isLoading: (state: any) => state.isLoading,
    hasError: (state: any) => state.hasError,
  }
}));

describe('DocumentWorkspace + MDW Domain Integration', () => {
  let mockStore: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock store state and actions
    mockStore = {
      currentWorkspace: {
        id: 'mws_123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Workspace',
        layoutMode: LayoutModeType.STACKED,
        dimensions: { width: 1200, height: 800 },
        documents: {
          'doc_123e4567-e89b-12d3-a456-426614174001': {
            id: 'doc_123e4567-e89b-12d3-a456-426614174001',
            title: 'Document 1',
            filePath: '/test/document1.pdf',
            position: { x: 0, y: 0 },
            dimensions: { width: 400, height: 300 },
            zIndex: 1,
            isActive: true,
            isVisible: true,
            state: 'READY',
            isDraggable: true,
            isResizable: true,
            lastModified: new Date(),
          }
        },
        documentOrder: ['doc_123e4567-e89b-12d3-a456-426614174001'],
        activeDocumentId: 'doc_123e4567-e89b-12d3-a456-426614174001',
      },
      documents: [{
        id: 'doc_123e4567-e89b-12d3-a456-426614174001',
        title: 'Document 1',
        filePath: '/test/document1.pdf',
        position: { x: 0, y: 0 },
        dimensions: { width: 400, height: 300 },
        zIndex: 1,
        isActive: true,
        isVisible: true,
        state: 'READY',
        isDraggable: true,
        isResizable: true,
        lastModified: new Date(),
      }],
      isLoading: false,
      hasError: false,

      // Mock actions
      createWorkspace: vi.fn(),
      loadWorkspace: vi.fn(),
      switchLayoutMode: vi.fn(),
      removeDocument: vi.fn(),
      removeAllDocuments: vi.fn(),
      saveWorkspace: vi.fn(),
      activateDocument: vi.fn(),
      moveDocument: vi.fn(),
      resizeDocument: vi.fn(),
      updateDocumentTitle: vi.fn(),
      updateWorkspaceDimensions: vi.fn(),
    };

    // Mock the useWorkspaceStore hook
    (useWorkspaceStore as any).mockImplementation((selector?: any) => {
      if (selector) {
        // Call selector function with mock store
        return selector(mockStore);
      }
      // Return actions when no selector
      return {
        createWorkspace: mockStore.createWorkspace,
        loadWorkspace: mockStore.loadWorkspace,
        switchLayoutMode: mockStore.switchLayoutMode,
        removeDocument: mockStore.removeDocument,
        removeAllDocuments: mockStore.removeAllDocuments,
        saveWorkspace: mockStore.saveWorkspace,
        activateDocument: mockStore.activateDocument,
        moveDocument: mockStore.moveDocument,
        resizeDocument: mockStore.resizeDocument,
        updateDocumentTitle: mockStore.updateDocumentTitle,
        updateWorkspaceDimensions: mockStore.updateWorkspaceDimensions,
      };
    });
  });

  it('should render DocumentWorkspace with integrated MDW functionality', async () => {
    render(<DocumentWorkspace />);

    // Should render workspace command bar
    expect(screen.getByTestId('workspace-command-bar')).toBeInTheDocument();

    // Should render document caddy
    expect(screen.getByTestId('document-caddy-doc_123e4567-e89b-12d3-a456-426614174001')).toBeInTheDocument();

    // Should display workspace name
    expect(screen.getByText('Test Workspace')).toBeInTheDocument();

    // Should show current layout mode
    expect(screen.getByTestId('layout-mode-stacked')).toHaveClass('active');
  });

  it('should integrate layout mode switching between UI and domain', async () => {
    const user = userEvent.setup();
    render(<DocumentWorkspace />);

    // Find and click grid layout mode button
    const gridButton = screen.getByTestId('layout-mode-grid');
    await user.click(gridButton);

    // Verify store action was called with correct parameters
    expect(mockStore.switchLayoutMode).toHaveBeenCalledWith(
      LayoutModeType.GRID,
      'user'
    );
  });

  it('should handle document activation through UI interaction', async () => {
    const user = userEvent.setup();
    render(<DocumentWorkspace />);

    // Find document and click to activate
    const documentCaddy = screen.getByTestId('document-caddy-doc_123e4567-e89b-12d3-a456-426614174001');
    await user.click(documentCaddy);

    // Verify activation action was called
    expect(mockStore.activateDocument).toHaveBeenCalledWith(
      'doc_123e4567-e89b-12d3-a456-426614174001'
    );
  });

  it('should integrate document move operations', async () => {
    render(<DocumentWorkspace />);

    // Get document element
    const documentCaddy = screen.getByTestId('document-caddy-doc_123e4567-e89b-12d3-a456-426614174001');

    // Simulate drag operation (move document)
    fireEvent.mouseDown(documentCaddy, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(documentCaddy, { clientX: 100, clientY: 150 });
    fireEvent.mouseUp(documentCaddy);

    // Wait for async operations
    await waitFor(() => {
      expect(mockStore.moveDocument).toHaveBeenCalledWith(
        'doc_123e4567-e89b-12d3-a456-426614174001',
        expect.any(Position)
      );
    });
  });

  it('should integrate document resize operations', async () => {
    render(<DocumentWorkspace />);

    // Get document element
    const documentCaddy = screen.getByTestId('document-caddy-doc_123e4567-e89b-12d3-a456-426614174001');

    // Find resize handle
    const resizeHandle = screen.getByTestId('resize-handle-se');

    // Simulate resize operation
    fireEvent.mouseDown(resizeHandle, { clientX: 400, clientY: 300 });
    fireEvent.mouseMove(resizeHandle, { clientX: 500, clientY: 400 });
    fireEvent.mouseUp(resizeHandle);

    // Wait for async operations
    await waitFor(() => {
      expect(mockStore.resizeDocument).toHaveBeenCalledWith(
        'doc_123e4567-e89b-12d3-a456-426614174001',
        expect.any(Dimensions)
      );
    });
  });

  it('should handle workspace creation through UI', async () => {
    const user = userEvent.setup();

    // Mock empty workspace state
    mockStore.currentWorkspace = null;
    mockStore.documents = [];

    render(<DocumentWorkspace />);

    // Should show create workspace UI
    const createButton = screen.getByText('Create Workspace');
    await user.click(createButton);

    // Should call create workspace action
    expect(mockStore.createWorkspace).toHaveBeenCalledWith(
      expect.any(String),
      LayoutModeType.STACKED
    );
  });

  it('should integrate error handling between UI and domain', async () => {
    // Mock error state
    mockStore.hasError = true;
    mockStore.errorState = {
      error: new Error('Test workspace error'),
      operation: 'moveDocument',
      context: { documentId: 'doc_123e4567-e89b-12d3-a456-426614174001' }
    };

    render(<DocumentWorkspace />);

    // Should display error feedback
    expect(screen.getByTestId('error-feedback')).toBeInTheDocument();
    expect(screen.getByText(/Test workspace error/)).toBeInTheDocument();

    // Should show retry button for recoverable errors
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should integrate workspace persistence operations', async () => {
    const user = userEvent.setup();
    render(<DocumentWorkspace />);

    // Find and click save button
    const saveButton = screen.getByText('Save Workspace');
    await user.click(saveButton);

    // Verify save action was called
    expect(mockStore.saveWorkspace).toHaveBeenCalled();
  });

  it('should handle workspace dimension updates from UI resize', async () => {
    render(<DocumentWorkspace />);

    // Get workspace container
    const workspaceContainer = screen.getByTestId('document-workspace');

    // Simulate window/container resize
    fireEvent.resize(window, { target: { innerWidth: 1400, innerHeight: 900 } });

    // Wait for debounced resize handler
    await waitFor(() => {
      expect(mockStore.updateWorkspaceDimensions).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number)
        })
      );
    }, { timeout: 1000 });
  });

  it('should integrate document removal operations', async () => {
    const user = userEvent.setup();
    render(<DocumentWorkspace />);

    // Find document close button
    const closeButton = screen.getByTestId('document-close-doc_123e4567-e89b-12d3-a456-426614174001');
    await user.click(closeButton);

    // Verify remove action was called
    expect(mockStore.removeDocument).toHaveBeenCalledWith(
      'doc_123e4567-e89b-12d3-a456-426614174001'
    );
  });

  it('should handle loading states during domain operations', async () => {
    // Mock loading state
    mockStore.isLoading = true;

    render(<DocumentWorkspace />);

    // Should show loading indicator
    expect(screen.getByTestId('workspace-loading')).toBeInTheDocument();
    expect(screen.getByText(/Loading workspace/)).toBeInTheDocument();
  });

  it('should integrate auto-freeform mode switching', async () => {
    const user = userEvent.setup();

    // Start in grid mode
    mockStore.currentWorkspace.layoutMode = LayoutModeType.GRID;

    render(<DocumentWorkspace />);

    // Get document element
    const documentCaddy = screen.getByTestId('document-caddy-doc_123e4567-e89b-12d3-a456-426614174001');

    // Simulate drag operation that should trigger auto-freeform
    fireEvent.mouseDown(documentCaddy, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(documentCaddy, { clientX: 200, clientY: 250 });
    fireEvent.mouseUp(documentCaddy);

    // Should automatically switch to freeform mode
    await waitFor(() => {
      expect(mockStore.switchLayoutMode).toHaveBeenCalledWith(
        LayoutModeType.FREEFORM,
        'auto_drag'
      );
    });
  });

  it('should integrate title editing functionality', async () => {
    const user = userEvent.setup();
    render(<DocumentWorkspace />);

    // Find document title
    const documentTitle = screen.getByTestId('document-title-doc_123e4567-e89b-12d3-a456-426614174001');

    // Double-click to edit
    await user.dblClick(documentTitle);

    // Should show edit input
    const titleInput = screen.getByTestId('document-title-input');
    expect(titleInput).toBeInTheDocument();

    // Edit title
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Document Title');
    await user.keyboard('{Enter}');

    // Should call update title action
    expect(mockStore.updateDocumentTitle).toHaveBeenCalledWith(
      'doc_123e4567-e89b-12d3-a456-426614174001',
      'Updated Document Title'
    );
  });
});
