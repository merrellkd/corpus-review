import { invoke } from '@tauri-apps/api/core';
import {
  OriginalDocument,
  ExtractedDocument,
  DocumentDetails,
  ExtractionStatusInfo,
  DocumentPreview,
  SaveResult,
  DocumentId,
  ExtractedDocumentId,
  ExtractionId,
  ProjectId
} from '../types';

/**
 * Tauri API service for document extraction operations
 */
class ExtractionApiService {
  /**
   * Scan project workspace for supported document files
   */
  async scanProjectDocuments(projectId: ProjectId): Promise<OriginalDocument[]> {
    try {
      const result = await invoke<OriginalDocument[]>('scan_project_documents', {
        projectId
      });
      return result;
    } catch (error) {
      console.error('Failed to scan project documents:', error);
      throw new Error(`Failed to scan documents: ${error}`);
    }
  }

  /**
   * Get detailed information about a specific document
   */
  async getDocumentDetails(documentId: DocumentId): Promise<DocumentDetails> {
    try {
      const result = await invoke<DocumentDetails>('get_document_details', {
        documentId
      });
      return result;
    } catch (error) {
      console.error('Failed to get document details:', error);
      throw new Error(`Failed to get document details: ${error}`);
    }
  }

  /**
   * Begin extracting content from a document
   */
  async startDocumentExtraction(
    documentId: DocumentId,
    forceReextract = false
  ): Promise<ExtractionStatusInfo> {
    try {
      const result = await invoke<ExtractionStatusInfo>('start_document_extraction', {
        documentId,
        forceReextract
      });
      return result;
    } catch (error) {
      console.error('Failed to start document extraction:', error);
      throw new Error(`Failed to start extraction: ${error}`);
    }
  }

  /**
   * Check the status of a document extraction
   */
  async getExtractionStatus(extractionId: ExtractionId): Promise<ExtractionStatusInfo> {
    try {
      const result = await invoke<ExtractionStatusInfo>('get_extraction_status', {
        extractionId
      });
      return result;
    } catch (error) {
      console.error('Failed to get extraction status:', error);
      throw new Error(`Failed to get extraction status: ${error}`);
    }
  }

  /**
   * Cancel an in-progress extraction
   */
  async cancelExtraction(extractionId: ExtractionId): Promise<boolean> {
    try {
      const result = await invoke<boolean>('cancel_extraction', {
        extractionId
      });
      return result;
    } catch (error) {
      console.error('Failed to cancel extraction:', error);
      throw new Error(`Failed to cancel extraction: ${error}`);
    }
  }

  /**
   * Retrieve extracted document content for editing
   */
  async getExtractedDocument(documentId: DocumentId): Promise<ExtractedDocument> {
    try {
      const result = await invoke<ExtractedDocument>('get_extracted_document', {
        documentId
      });
      return result;
    } catch (error) {
      console.error('Failed to get extracted document:', error);
      throw new Error(`Failed to get extracted document: ${error}`);
    }
  }

  /**
   * Save changes to extracted document content
   */
  async saveExtractedDocument(
    extractedDocumentId: ExtractedDocumentId,
    tiptapContent: object
  ): Promise<SaveResult> {
    try {
      const result = await invoke<SaveResult>('save_extracted_document', {
        extractedDocumentId,
        tiptapContent
      });
      return result;
    } catch (error) {
      console.error('Failed to save extracted document:', error);
      throw new Error(`Failed to save document: ${error}`);
    }
  }

  /**
   * Get preview/metadata for original document viewing
   */
  async getOriginalDocumentPreview(documentId: DocumentId): Promise<DocumentPreview> {
    try {
      const result = await invoke<DocumentPreview>('get_original_document_preview', {
        documentId
      });
      return result;
    } catch (error) {
      console.error('Failed to get document preview:', error);
      throw new Error(`Failed to get document preview: ${error}`);
    }
  }
}

// Export singleton instance
export const extractionApiService = new ExtractionApiService();

/**
 * Helper function to determine if a file type supports extraction
 */
export const supportsExtraction = (fileType: string): boolean => {
  return ['PDF', 'DOCX', 'Markdown'].includes(fileType);
};

/**
 * Helper function to get file extension from file name
 */
export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > -1 ? fileName.substring(lastDot + 1).toLowerCase() : '';
};

/**
 * Helper function to check if a file is a .det file
 */
export const isDetFile = (fileName: string): boolean => {
  return fileName.endsWith('.det');
};

/**
 * Helper function to format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Helper function to format date/time
 */
export const formatDateTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  return date.toLocaleString();
};

/**
 * Helper function to get relative time
 */
export const getRelativeTime = (dateTimeString: string): string => {
  const date = new Date(dateTimeString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString();
};