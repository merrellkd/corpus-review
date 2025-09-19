-- Initial workspace schema migration
-- Creates tables for workspace layout persistence

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,  -- project_uuid format
    name TEXT NOT NULL UNIQUE,
    source_folder_path TEXT NOT NULL,
    reports_folder_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Workspace layouts table
CREATE TABLE IF NOT EXISTS workspace_layouts (
    id TEXT PRIMARY KEY,  -- workspace_uuid format
    project_id TEXT NOT NULL,
    panel_states TEXT NOT NULL,  -- JSON serialized PanelVisibilityState
    panel_sizes TEXT NOT NULL,   -- JSON serialized PanelDimensionState
    last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Document caddies table
CREATE TABLE IF NOT EXISTS document_caddies (
    id TEXT PRIMARY KEY,  -- doc_uuid format
    workspace_layout_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    title TEXT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    position_z_index INTEGER DEFAULT 0,
    width REAL DEFAULT 300,
    height REAL DEFAULT 400,
    min_width REAL DEFAULT 200,
    min_height REAL DEFAULT 100,
    scroll_position REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_layout_id) REFERENCES workspace_layouts(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_layouts_project_id ON workspace_layouts(project_id);
CREATE INDEX IF NOT EXISTS idx_document_caddies_workspace_layout_id ON document_caddies(workspace_layout_id);
CREATE INDEX IF NOT EXISTS idx_document_caddies_file_path ON document_caddies(file_path);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
    AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_workspace_layouts_timestamp
    AFTER UPDATE ON workspace_layouts
BEGIN
    UPDATE workspace_layouts SET last_modified = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_document_caddies_timestamp
    AFTER UPDATE ON document_caddies
BEGIN
    UPDATE document_caddies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;