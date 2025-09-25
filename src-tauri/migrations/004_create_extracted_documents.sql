-- Migration 004: Create extracted_documents table for File Metadata Extraction
-- Feature: 006-file-metadata-extraction
-- Purpose: Store processed .det files with TipTap/ProseMirror content

-- Create extracted_documents table
CREATE TABLE IF NOT EXISTS extracted_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    extracted_document_uuid TEXT UNIQUE NOT NULL, -- ExtractedDocumentId (det_*)
    original_document_id INTEGER NOT NULL,
    extracted_file_path TEXT NOT NULL,
    tiptap_content TEXT NOT NULL, -- JSON blob
    extraction_method TEXT NOT NULL,
    extracted_at DATETIME NOT NULL,
    content_preview TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    FOREIGN KEY (original_document_id) REFERENCES original_documents(id) ON DELETE CASCADE,
    UNIQUE(original_document_id), -- One extracted version per original
    CHECK (word_count >= 0),
    CHECK (character_count >= 0),
    CHECK (length(content_preview) <= 200)
);