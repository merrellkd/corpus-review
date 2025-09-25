import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectHeader } from '../components/workspace/ProjectHeader';
import { NavigationBreadcrumb } from '../components/workspace/NavigationBreadcrumb';
import { FileList } from '../components/workspace/FileList';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { ViewMode } from '../../domains/workspace/application/dtos/workspace-dtos';

/**
 * Main workspace page component
 *
 * Provides the primary interface for navigating project files and folders.
 * Integrates all workspace components and manages the overall workspace state.
 */
export const WorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Workspace store state
  const {
    currentWorkspace,
    isLoading,
    error,
    openWorkspace,
    navigateToFolder,
    navigateToParent,
    navigateToPath,
    clearWorkspace,
  } = useWorkspaceStore();

  // Local UI state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load workspace on mount
  useEffect(() => {
    if (projectId) {
      // We would need to get project details first
      // For now, we'll simulate opening a workspace
      // In a real app, this would fetch project details then open workspace
      loadWorkspaceForProject(projectId);
    }

    // Cleanup on unmount
    return () => {
      clearWorkspace();
    };
  }, [projectId]);

  const loadWorkspaceForProject = async (id: string) => {
    try {
      // This is a simplified version - in reality we'd:
      // 1. Fetch project details from project service
      // 2. Use those details to open the workspace
      // For now, we'll use placeholder data
      await openWorkspace(id, 'Sample Project', '/path/to/project');
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  const handleBackToProjects = () => {
    clearWorkspace();
    navigate('/projects');
  };

  const handleFolderDoubleClick = async (folderName: string) => {
    if (!currentWorkspace) return;

    try {
      await navigateToFolder(
        currentWorkspace.projectId,
        currentWorkspace.projectName,
        currentWorkspace.sourceFolder,
        currentWorkspace.currentPath,
        folderName
      );
      // Clear selection when navigating
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to navigate to folder:', error);
    }
  };

  const handleNavigateUp = async () => {
    if (!currentWorkspace) return;

    try {
      await navigateToParent(
        currentWorkspace.projectId,
        currentWorkspace.projectName,
        currentWorkspace.sourceFolder,
        currentWorkspace.currentPath
      );
      // Clear selection when navigating
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to navigate to parent:', error);
    }
  };

  const handleBreadcrumbNavigate = async (path: string) => {
    if (!currentWorkspace) return;

    try {
      await navigateToPath(
        currentWorkspace.projectId,
        currentWorkspace.projectName,
        currentWorkspace.sourceFolder,
        path
      );
      // Clear selection when navigating
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to navigate to path:', error);
    }
  };

  const handleFileSelect = (fileName: string, selected: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(fileName);
      } else {
        newSet.delete(fileName);
      }
      return newSet;
    });
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="workspace-page workspace-page--loading">
        <div className="workspace-page__loading">
          <div className="workspace-page__spinner"></div>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="workspace-page workspace-page--error">
        <div className="workspace-page__error">
          <h2>Failed to load workspace</h2>
          <p>{error}</p>
          <button onClick={handleBackToProjects} className="workspace-page__error-button">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  // No workspace loaded
  if (!currentWorkspace) {
    return (
      <div className="workspace-page workspace-page--empty">
        <div className="workspace-page__empty">
          <p>No workspace loaded</p>
          <button onClick={handleBackToProjects} className="workspace-page__empty-button">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <ProjectHeader
        workspace={currentWorkspace}
        onBackToProjects={handleBackToProjects}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedCount={selectedFiles.size}
      />

      <NavigationBreadcrumb
        workspace={currentWorkspace}
        onNavigate={handleBreadcrumbNavigate}
        onNavigateUp={handleNavigateUp}
      />

      <main className="workspace-page__content">
        <FileList
          directoryListing={currentWorkspace.directoryListing}
          selectedFiles={selectedFiles}
          viewMode={viewMode}
          onFolderDoubleClick={handleFolderDoubleClick}
          onFileSelect={handleFileSelect}
        />
      </main>
    </div>
  );
};

export default WorkspacePage;