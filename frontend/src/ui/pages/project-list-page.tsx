/**
 * ProjectListPage Component
 *
 * Main page for displaying and managing the project list with all
 * CRUD operations, search, filtering, and bulk actions.
 */

import React, { useEffect, useState } from 'react';
import {
  useProjectStore,
  useProjectList,
  useProjectActions,
  useProjectDialogs,
  useProjectSelection,
} from '../../features/project-management/store';
import type { ProjectListItem } from '../../features/project-management/store';
import ProjectRow from '../../features/project-management/components/project-row';
import CreateProjectForm, { CreateProjectModal } from '../../features/project-management/components/create-project-form';
import DeleteConfirmDialog from '../../shared/components/delete-confirm-dialog';

// ====================
// Component
// ====================

export interface ProjectListPageProps {
  /** Callback to open workspace for a project */
  onOpenWorkspace?: (projectId: string) => void;
}

export const ProjectListPage: React.FC<ProjectListPageProps> = ({
  onOpenWorkspace,
}) => {

  // ====================
  // Store State
  // ====================

  const { projects, isLoading, error, totalProjects, currentPage, hasMore } = useProjectList();
  const { fetchProjectsPaged, setSearchQuery, refreshProjects, clearError } = useProjectActions();

  const {
    showCreateDialog,
    showDeleteDialog,
    projectToDelete,
    showCreateProjectDialog,
    hideCreateProjectDialog,
    hideDeleteProjectDialog,
  } = useProjectDialogs();

  const {
    selectedProjectIds,
    selectedCount,
    selectProject,
    toggleProjectSelection,
    clearSelection,
    selectAll,
  } = useProjectSelection();

  const deleteProject = useProjectStore((state) => state.deleteProject);
  const openProject = useProjectStore((state) => state.openProject);
  const openProjectFolder = useProjectStore((state) => state.openProjectFolder);
  const showDeleteProjectDialog = useProjectStore((state) => state.showDeleteProjectDialog);
  const showUpdateProjectDialog = useProjectStore((state) => state.showUpdateProjectDialog);
  const isDeleting = useProjectStore((state) => state.isDeleting);
  const searchQuery = useProjectStore((state) => state.searchQuery);
  const stats = useProjectStore((state) => state.stats);
  const fetchStats = useProjectStore((state) => state.fetchStats);

  // ====================
  // Local State
  // ====================

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'folder'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterAccessible, setFilterAccessible] = useState<boolean | null>(null);
  const [showStats, setShowStats] = useState(false);

  // ====================
  // Effects
  // ====================

  // Load initial data
  useEffect(() => {
    fetchProjectsPaged();
    fetchStats();
  }, [fetchProjectsPaged, fetchStats]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // ====================
  // Event Handlers
  // ====================

  const handleRefresh = () => {
    refreshProjects();
    fetchStats();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleProjectClick = (project: ProjectListItem) => {
    selectProject(project.id);
  };

  const handleProjectDoubleClick = async (project: ProjectListItem) => {
    await openProject(project.id);
  };

  const handleProjectEdit = (project: ProjectListItem) => {
    showUpdateProjectDialog(project.id);
  };

  const handleProjectDelete = (project: ProjectListItem) => {
    showDeleteProjectDialog(project.id);
  };

  const handleProjectOpenFolder = async (project: ProjectListItem) => {
    try {
      await openProjectFolder(project.id);
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleProjectOpenWorkspace = (project: ProjectListItem) => {
    // Use callback to navigate to workspace
    onOpenWorkspace?.(project.id);
  };

  const handleBulkDelete = () => {
    if (selectedCount > 0) {
      // For bulk delete, we need to pass the projects to delete
      const projectsToDelete = projects.filter(p => selectedProjectIds.includes(p.id));
      // Since DeleteConfirmDialog expects Project | Project[], we'll handle this
      handleDeleteConfirm(projectsToDelete);
    }
  };

  const handleDeleteConfirm = (projectsToDelete?: ProjectListItem | ProjectListItem[]) => {
    // Implementation would open delete dialog with the projects
    console.log('Delete confirm for:', projectsToDelete || 'current selection');
  };

  const handleToggleSelectAll = () => {
    if (selectedCount === projects.length) {
      clearSelection();
    } else {
      selectAll();
    }
  };

  const handleSortChange = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ====================
  // Computed Properties
  // ====================

  const hasProjects = projects.length > 0;
  const isAllSelected = selectedCount === projects.length && projects.length > 0;
  const isSomeSelected = selectedCount > 0 && selectedCount < projects.length;

  const getProjectToDelete = () => {
    if (!projectToDelete) return null;
    return projects.find(p => p.id === projectToDelete) || null;
  };

  // ====================
  // Render Helper Functions
  // ====================

  const renderToolbar = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Title and stats */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <div className="text-sm text-gray-500">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                {totalProjects} {totalProjects === 1 ? 'project' : 'projects'}
                {selectedCount > 0 && (
                  <span className="ml-2 text-blue-600">
                    ({selectedCount} selected)
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          {/* Stats Toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            title="Toggle statistics"
          >
            📊
          </button>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="List view"
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              title="Grid view"
            >
              ⊞
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            title="Refresh projects"
          >
            ⟳
          </button>

          {/* Create Project */}
          <button
            onClick={showCreateProjectDialog}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + New Project
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearchAndFilters = () => (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(field);
              setSortOrder(order);
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="folder-asc">Folder A-Z</option>
            <option value="folder-desc">Folder Z-A</option>
          </select>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Filter:</span>
          <select
            value={filterAccessible === null ? 'all' : filterAccessible ? 'accessible' : 'inaccessible'}
            onChange={(e) => {
              const value = e.target.value;
              setFilterAccessible(
                value === 'all' ? null :
                value === 'accessible' ? true : false
              );
            }}
            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="accessible">Accessible</option>
            <option value="inaccessible">Inaccessible</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderBulkActions = () => {
    if (selectedCount === 0) return null;

    return (
      <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} project{selectedCount !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-700 hover:text-blue-900"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="px-3 py-1 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    if (!showStats || !stats) return null;

    return (
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</div>
            <div className="text-sm text-gray-500">Total Projects</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">{stats.accessibleProjects}</div>
            <div className="text-sm text-gray-500">Accessible</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-yellow-600">{stats.inaccessibleProjects}</div>
            <div className="text-sm text-gray-500">Inaccessible</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-blue-600">{stats.projectsWithNotes}</div>
            <div className="text-sm text-gray-500">With Notes</div>
          </div>
        </div>
      </div>
    );
  };

  const renderProjectList = () => {
    if (isLoading && projects.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading projects...</span>
          </div>
        </div>
      );
    }

    if (!hasProjects && !isLoading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first project to organize your document analysis work.
          </p>
          <button
            onClick={showCreateProjectDialog}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + Create Your First Project
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white">
        {/* List Header */}
        <div className="flex items-center px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isSomeSelected;
              }}
              onChange={handleToggleSelectAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </span>
          </div>
        </div>

        {/* Project Rows */}
        <div className="divide-y divide-gray-200">
          {projects.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              isSelected={selectedProjectIds.includes(project.id)}
              showSelection={true}
              showActions={true}
              onClick={handleProjectClick}
              onSelect={(id, selected) => toggleProjectSelection(id)}
              onEdit={handleProjectEdit}
              onDelete={handleProjectDelete}
              onOpenFolder={handleProjectOpenFolder}
              onOpenWorkspace={handleProjectOpenWorkspace}
              onDoubleClick={handleProjectDoubleClick}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
        <div className="flex items-start">
          <div className="text-red-500 mr-3">
            <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error Loading Projects</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  // ====================
  // Main Render
  // ====================

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      {renderToolbar()}

      {/* Stats */}
      {renderStats()}

      {/* Search and Filters */}
      {renderSearchAndFilters()}

      {/* Bulk Actions */}
      {renderBulkActions()}

      {/* Error Display */}
      {renderError()}

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderProjectList()}
      </div>

      {/* Modals and Dialogs */}
      <CreateProjectModal
        isOpen={showCreateDialog}
        onClose={hideCreateProjectDialog}
        onSuccess={() => {
          handleRefresh();
        }}
      />

      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        projects={getProjectToDelete() || []}
        isDeleting={isDeleting}
        onConfirm={async () => {
          if (projectToDelete) {
            await deleteProject(projectToDelete);
            clearSelection();
          }
        }}
        onCancel={hideDeleteProjectDialog}
        onClose={hideDeleteProjectDialog}
      />
    </div>
  );
};

// ====================
// Default Export
// ====================

export default ProjectListPage;
