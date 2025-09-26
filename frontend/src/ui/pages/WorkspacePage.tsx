import React, { useEffect, useState } from 'react';
import { ProjectHeader } from '../components/workspace/ProjectHeader';
import { NavigationBreadcrumb } from '../components/workspace/NavigationBreadcrumb';
import { FileList } from '../components/workspace/FileList';
import { useWorkspaceNavigationStore } from '../../features/workspace-navigation/store';
import type { ProjectListItem } from '../../features/project-management/store';

type ViewMode = 'list' | 'grid';

/**
 * Props for the WorkspacePage component
 */
export interface WorkspacePageProps {
  /** The project to display workspace for */
  project: ProjectListItem;
  /** Callback for returning to project list */
  onBackToProjects: () => void;
}

/**
 * Main workspace page component
 *
 * Provides the primary interface for navigating project files and folders.
 * Integrates all workspace components and manages the overall workspace state.
 */
export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  project,
  onBackToProjects,
}) => {

  // Workspace store state
  const {
    currentWorkspace,
    isLoading,
    error,
    openWorkspaceFromProject,
    navigateToFolder,
    navigateToParent,
    navigateToPath,
    clearWorkspace,
  } = useWorkspaceNavigationStore();

  // Local UI state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load workspace on mount
  useEffect(() => {
    if (project) {
      // Load workspace using the provided project data
      loadWorkspaceForProject(project);
    }

    // Cleanup on unmount
    return () => {
      clearWorkspace();
    };
  }, [project, clearWorkspace]);

  const loadWorkspaceForProject = async (projectData: ProjectListItem) => {
    try {
      // Open workspace using the provided project data
      await openWorkspaceFromProject({
        id: projectData.id,
        name: projectData.name,
        sourceFolder: projectData.sourceFolder,
      });
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  const handleBackToProjects = () => {
    clearWorkspace();
    onBackToProjects();
  };

  const handleFolderDoubleClick = async (folderName: string) => {
    if (!currentWorkspace) return;

    try {
      await navigateToFolder(folderName);
      // Clear selection when navigating
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to navigate to folder:', error);
    }
  };

  const handleNavigateUp = async () => {
    if (!currentWorkspace) return;

    try {
      await navigateToParent();
      // Clear selection when navigating
      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to navigate to parent:', error);
    }
  };

  const handleBreadcrumbNavigate = async (path: string) => {
    if (!currentWorkspace) return;

    try {
      await navigateToPath(path);
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
          directoryListing={currentWorkspace?.directoryListing}
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
