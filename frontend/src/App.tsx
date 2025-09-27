import React, { useState } from 'react';
import { ProjectListPage } from './features/project-management/components/ProjectListPage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { useProjectStore } from './stores/project';
import { Project } from './features/project-management/types';

/**
 * Main App Component
 *
 * Handles navigation between project list and project workspace views
 */
function App() {
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  const [selectedProjectForWorkspace, setSelectedProjectForWorkspace] = useState<Project | null>(null);

  const handleOpenWorkspace = (project: Project) => {
    console.log('App: handleOpenWorkspace called with project:', project);
    setSelectedProjectForWorkspace(project);
    setCurrentView('workspace');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProjectForWorkspace(null);
  };

  const renderCurrentView = () => {
    console.log('App: renderCurrentView called. currentView:', currentView, 'selectedProject:', !!selectedProjectForWorkspace);
    switch (currentView) {
      case 'workspace':
        if (selectedProjectForWorkspace) {
          console.log('App: Rendering ProjectWorkspace with projectId:', selectedProjectForWorkspace.id.value);
          try {
            return (
              <div className="h-full">
                <ProjectWorkspace
                  projectId={selectedProjectForWorkspace.id.value}
                  onBackToProjects={handleBackToList}
                />
              </div>
            );
          } catch (error) {
            console.error('App: Error rendering ProjectWorkspace:', error);
            return (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-red-600">
                  <p className="text-lg font-medium mb-2">Error loading workspace</p>
                  <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
                  <button
                    onClick={handleBackToList}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Back to Projects
                  </button>
                </div>
              </div>
            );
          }
        }
        // Fallback to list if no project selected
        console.log('App: No project selected, falling back to list');
        setCurrentView('list');
        return null;

      case 'list':
      default:
        console.log('App: Rendering ProjectListPage');
        return <ProjectListPage onOpenWorkspace={handleOpenWorkspace} />;
    }
  };

  return (
    <div className="App h-screen bg-gray-100">
      {renderCurrentView()}
    </div>
  );
}

export default App;