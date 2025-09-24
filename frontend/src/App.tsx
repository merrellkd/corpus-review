import React, { useState } from 'react';
import ProjectListPage from './ui/pages/project-list-page';
import { useProjectStore } from './stores/project-store';
import { ProjectWorkspace } from './components/ProjectWorkspace';

/**
 * Main App Component
 *
 * Handles navigation between project list and project workspace views
 */
function App() {
  const [currentView, setCurrentView] = useState<'list' | 'workspace'>('list');
  const currentProject = useProjectStore((state) => state.currentProject);

  // Auto-switch to workspace when project is selected
  React.useEffect(() => {
    if (currentProject) {
      setCurrentView('workspace');
    }
  }, [currentProject]);

  const handleBackToList = () => {
    setCurrentView('list');
    // Clear current project to return to list view
    useProjectStore.getState().setCurrentProject(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'workspace':
        if (currentProject) {
          return (
            <div className="h-full flex flex-col">
              {/* Navigation header */}
              <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center">
                <button
                  onClick={handleBackToList}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Projects</span>
                </button>
                <div className="mx-4 text-sm text-gray-400">|</div>
                <div className="text-sm font-medium text-gray-900">
                  {currentProject.name.value}
                </div>
              </div>

              {/* Workspace content */}
              <div className="flex-1">
                <ProjectWorkspace projectId={currentProject.id.value} />
              </div>
            </div>
          );
        }
        // Fallback to list if no project selected
        setCurrentView('list');
        return null;

      case 'list':
      default:
        return <ProjectListPage />;
    }
  };

  return (
    <div className="App h-screen bg-gray-100">
      {renderCurrentView()}
    </div>
  );
}

export default App;