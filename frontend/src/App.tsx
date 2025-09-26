import React, { useState } from 'react';
import { ProjectListPage } from './ui/pages/project-list-page';
import { ProjectWorkspace } from './features/document-workspace/components/ProjectWorkspace';

/**
 * Main App Component
 *
 * Handles navigation between project list and project workspace views
 */
function App() {
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleOpenWorkspace = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('workspace');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedProjectId(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'workspace':
        if (selectedProjectId) {
          return (
            <div className="h-full">
              <ProjectWorkspace
                projectId={selectedProjectId}
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
