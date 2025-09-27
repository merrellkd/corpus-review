import React, { useState } from 'react';
import { ProjectListPage } from './features/project-management/components/ProjectListPage';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { useProjectStore } from './features/project-management/store';
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
    setSelectedProjectForWorkspace(project);
    setCurrentView('workspace');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProjectForWorkspace(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'workspace':
        if (selectedProjectForWorkspace) {
          return (
            <div className="h-full">
              <ProjectWorkspace
                projectId={selectedProjectForWorkspace.id.value}
                onBackToProjects={handleBackToList}
              />
            </div>
          );
        }
        // Fallback to list if no project selected
        setCurrentView('list');
        return null;

      case 'list':
      default:
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