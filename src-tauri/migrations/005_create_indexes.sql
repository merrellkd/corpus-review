-- Migration 005: Create database indexes for File Metadata Extraction
-- Feature: 006-file-metadata-extraction
-- Purpose: Optimize query performance for document extraction operations

-- Indexes for original_documents table
CREATE INDEX IF NOT EXISTS idx_original_documents_project ON original_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_original_documents_type ON original_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_original_documents_uuid ON original_documents(document_uuid);
CREATE INDEX IF NOT EXISTS idx_original_documents_path ON original_documents(file_path);

-- Indexes for file_extractions table
CREATE INDEX IF NOT EXISTS idx_file_extractions_status ON file_extractions(status);
CREATE INDEX IF NOT EXISTS idx_file_extractions_project ON file_extractions(project_id);
CREATE INDEX IF NOT EXISTS idx_file_extractions_document ON file_extractions(original_document_id);
CREATE INDEX IF NOT EXISTS idx_file_extractions_uuid ON file_extractions(extraction_uuid);
CREATE INDEX IF NOT EXISTS idx_file_extractions_started ON file_extractions(started_at);

-- Indexes for extracted_documents table
CREATE INDEX IF NOT EXISTS idx_extracted_documents_original ON extracted_documents(original_document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_documents_uuid ON extracted_documents(extracted_document_uuid);
CREATE INDEX IF NOT EXISTS idx_extracted_documents_extracted_at ON extracted_documents(extracted_at);