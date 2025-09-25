-- Migration 003: Create file_extractions table for File Metadata Extraction
-- Feature: 006-file-metadata-extraction
-- Purpose: Track extraction process state and metadata for documents

-- Create file_extractions table
CREATE TABLE IF NOT EXISTS file_extractions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extraction_uuid TEXT UNIQUE NOT NULL, -- ExtractionId (ext_*)
    project_id INTEGER NOT NULL,
    original_document_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- Pending, Processing, Completed, Error
    extraction_method TEXT, -- PdfTextExtraction, DocxStructureExtraction, etc.
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    error_message TEXT,
    processing_duration_ms INTEGER,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (original_document_id) REFERENCES original_documents(id) ON DELETE CASCADE,
    CHECK (status IN ('Pending', 'Processing', 'Completed', 'Error')),
    CHECK (retry_count >= 0 AND retry_count <= 3)
);