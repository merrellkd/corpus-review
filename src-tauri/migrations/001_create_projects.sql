-- Create projects table for Project List Management MVP
-- This migration creates the core table for storing project information
-- with support for the optional note field added in the spec update

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL, -- ProjectId value with proj_ prefix
  name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
  source_folder TEXT NOT NULL,
  note TEXT CHECK(length(note) <= 1000), -- Optional project description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE UNIQUE INDEX idx_projects_uuid ON projects(uuid);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_name ON projects(name);

-- Insert a comment to track schema version
INSERT INTO sqlite_master (type, name, tbl_name, rootpage, sql)
VALUES ('comment', 'schema_version', 'projects', 0, '001_create_projects.sql - Initial project table creation');