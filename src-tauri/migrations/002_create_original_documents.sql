-- Migration 002: Create original_documents table for File Metadata Extraction
-- Feature: 006-file-metadata-extraction
-- Purpose: Track source documents (PDF, DOCX, Markdown) in project workspaces

-- Create original_documents table
CREATE TABLE IF NOT EXISTS original_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_uuid TEXT UNIQUE NOT NULL, -- DocumentId (doc_*)
    project_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_type TEXT NOT NULL, -- PDF, DOCX, Markdown
    created_at DATETIME NOT NULL,
    modified_at DATETIME NOT NULL,
    checksum TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, file_path) -- Prevent duplicate entries per project
);