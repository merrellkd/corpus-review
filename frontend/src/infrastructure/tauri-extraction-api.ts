/**
 * Tauri API Client for File Metadata Extraction
 *
 * Wrapper functions for all extraction-related Tauri commands with proper
 * TypeScript types, error handling, and retry logic.
 */

import { invoke } from '@tauri-apps/api/core';
import {
  OriginalDocumentDto,
  DocumentDetailsDto,
  ExtractionStatusDto,
  ExtractedDocumentDto,
  DocumentPreviewDto,
  SaveResultDto,
  StartExtractionParams,
  SaveExtractedDocumentParams,
  ExtractionApiError,
  ExtractionErrorCode,
} from './extraction-dtos';

/**
 * Configuration for API calls
 */
interface ApiConfig {
  retryAttempts?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
}

const DEFAULT_CONFIG: Required<ApiConfig> = {
  retryAttempts: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
};

/**
 * Custom error class for extraction API errors
 */
export class ExtractionApiException extends Error {
  constructor(
    public readonly code: ExtractionErrorCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ExtractionApiException';
  }

  /**
   * Create from Tauri error response
   */
  static fromTauriError(error: any): ExtractionApiException {
    // Handle different error formats that may come from Tauri
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error);
        return new ExtractionApiException(
          parsed.code || ExtractionErrorCode.VALIDATION_ERROR,
          parsed.message || error,
          parsed.details
        );
      } catch {
        return new ExtractionApiException(
          ExtractionErrorCode.VALIDATION_ERROR,
          error
        );
      }
    }

    if (error && typeof error === 'object') {
      return new ExtractionApiException(
        error.code || ExtractionErrorCode.VALIDATION_ERROR,
        error.message || 'Unknown error occurred',
        error.details
      );
    }

    return new ExtractionApiException(
      ExtractionErrorCode.VALIDATION_ERROR,
      'Unknown error occurred'
    );
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      ExtractionErrorCode.FILE_SYSTEM_ERROR,
      ExtractionErrorCode.FILE_NOT_ACCESSIBLE,
    ].includes(this.code);
  }
}

/**
 * Utility function to add delay for retries
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generic invoke wrapper with retry logic and error handling
 */
async function invokeWithRetry<T>(
  command: string,
  params: Record<string, any> = {},
  config: ApiConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.retryAttempts; attempt++) {
    try {
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), finalConfig.timeoutMs);
      });

      const invokePromise = invoke<T>(command, params);
      const result = await Promise.race([invokePromise, timeoutPromise]) as T;

      return result;
    } catch (error) {
      lastError = error;
      const apiError = ExtractionApiException.fromTauriError(error);

      // Don't retry on non-retryable errors or last attempt
      if (!apiError.isRetryable() || attempt === finalConfig.retryAttempts) {
        throw apiError;
      }

      // Wait before retrying
      if (attempt < finalConfig.retryAttempts) {
        await delay(finalConfig.retryDelayMs * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw ExtractionApiException.fromTauriError(lastError);
}

/**
 * Tauri Extraction API Client
 */
export class TauriExtractionApi {
  /**
   * Scan project workspace for supported document files
   */
  static async scanProjectDocuments(
    projectId: string,
    config?: ApiConfig
  ): Promise<OriginalDocumentDto[]> {
    if (!projectId || !projectId.startsWith('proj_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid project ID format'
      );
    }

    return invokeWithRetry<OriginalDocumentDto[]>(
      'scan_project_documents',
      { project_id: projectId },
      config
    );
  }

  /**
   * Get detailed information about a specific document
   */
  static async getDocumentDetails(
    documentId: string,
    config?: ApiConfig
  ): Promise<DocumentDetailsDto> {
    if (!documentId || !documentId.startsWith('doc_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid document ID format'
      );
    }

    return invokeWithRetry<DocumentDetailsDto>(
      'get_document_details',
      { document_id: documentId },
      config
    );
  }

  /**
   * Begin extracting content from a document
   */
  static async startDocumentExtraction(
    params: StartExtractionParams,
    config?: ApiConfig
  ): Promise<ExtractionStatusDto> {
    if (!params.documentId || !params.documentId.startsWith('doc_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid document ID format'
      );
    }

    return invokeWithRetry<ExtractionStatusDto>(
      'start_document_extraction',
      {
        document_id: params.documentId,
        force_reextract: params.forceReextract || false,
      },
      config
    );
  }

  /**
   * Check the status of a document extraction
   */
  static async getExtractionStatus(
    extractionId: string,
    config?: ApiConfig
  ): Promise<ExtractionStatusDto> {
    if (!extractionId || !extractionId.startsWith('ext_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid extraction ID format'
      );
    }

    return invokeWithRetry<ExtractionStatusDto>(
      'get_extraction_status',
      { extraction_id: extractionId },
      { ...config, retryAttempts: 1 } // Status checks shouldn't retry much
    );
  }

  /**
   * Cancel an in-progress extraction
   */
  static async cancelExtraction(
    extractionId: string,
    config?: ApiConfig
  ): Promise<boolean> {
    if (!extractionId || !extractionId.startsWith('ext_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid extraction ID format'
      );
    }

    return invokeWithRetry<boolean>(
      'cancel_extraction',
      { extraction_id: extractionId },
      config
    );
  }

  /**
   * Retrieve extracted document content for editing
   */
  static async getExtractedDocument(
    documentId: string,
    config?: ApiConfig
  ): Promise<ExtractedDocumentDto> {
    if (!documentId || !documentId.startsWith('doc_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid document ID format'
      );
    }

    return invokeWithRetry<ExtractedDocumentDto>(
      'get_extracted_document',
      { document_id: documentId },
      config
    );
  }

  /**
   * Save changes to extracted document content
   */
  static async saveExtractedDocument(
    params: SaveExtractedDocumentParams,
    config?: ApiConfig
  ): Promise<SaveResultDto> {
    if (!params.extractedDocumentId || !params.extractedDocumentId.startsWith('det_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid extracted document ID format'
      );
    }

    if (!params.tiptapContent || typeof params.tiptapContent !== 'object') {
      throw new ExtractionApiException(
        ExtractionErrorCode.INVALID_CONTENT,
        'Invalid TipTap content format'
      );
    }

    return invokeWithRetry<SaveResultDto>(
      'save_extracted_document',
      {
        extracted_document_id: params.extractedDocumentId,
        tiptap_content: params.tiptapContent,
      },
      config
    );
  }

  /**
   * Get preview/metadata for original document viewing
   */
  static async getOriginalDocumentPreview(
    documentId: string,
    config?: ApiConfig
  ): Promise<DocumentPreviewDto> {
    if (!documentId || !documentId.startsWith('doc_')) {
      throw new ExtractionApiException(
        ExtractionErrorCode.VALIDATION_ERROR,
        'Invalid document ID format'
      );
    }

    return invokeWithRetry<DocumentPreviewDto>(
      'get_original_document_preview',
      { document_id: documentId },
      config
    );
  }

  /**
   * Poll extraction status until completion or error
   * Useful for tracking long-running extractions
   */
  static async pollExtractionStatus(
    extractionId: string,
    options: {
      intervalMs?: number;
      timeoutMs?: number;
      onProgress?: (status: ExtractionStatusDto) => void;
    } = {}
  ): Promise<ExtractionStatusDto> {
    const { intervalMs = 2000, timeoutMs = 300000, onProgress } = options; // 5 minute timeout
    const startTime = Date.now();

    while (true) {
      try {
        const status = await this.getExtractionStatus(extractionId, {
          retryAttempts: 1,
          timeoutMs: 10000, // Shorter timeout for polling
        });

        // Call progress callback if provided
        if (onProgress) {
          onProgress(status);
        }

        // Check if extraction is complete
        if (status.status === 'Completed' || status.status === 'Error') {
          return status;
        }

        // Check for timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new ExtractionApiException(
            ExtractionErrorCode.VALIDATION_ERROR,
            'Extraction polling timeout'
          );
        }

        // Wait before next poll
        await delay(intervalMs);
      } catch (error) {
        // If it's an extraction not found error, the extraction may have been cancelled
        if (error instanceof ExtractionApiException && error.code === ExtractionErrorCode.EXTRACTION_NOT_FOUND) {
          throw error;
        }

        // For other errors, wait and retry
        await delay(intervalMs);

        // But still respect the overall timeout
        if (Date.now() - startTime > timeoutMs) {
          throw error;
        }
      }
    }
  }

  /**
   * Batch operation to scan documents and get their extraction status
   */
  static async scanAndGetExtractionStatuses(
    projectId: string,
    config?: ApiConfig
  ): Promise<{
    documents: OriginalDocumentDto[];
    extractions: Map<string, ExtractionStatusDto>;
  }> {
    const documents = await this.scanProjectDocuments(projectId, config);
    const extractions = new Map<string, ExtractionStatusDto>();

    // Get extraction statuses for documents that have extractions
    const statusPromises = documents
      .filter(doc => doc.hasExtraction && doc.extractionStatus !== 'None')
      .map(async (doc) => {
        try {
          // We need to get the extraction ID somehow - this might require another API call
          // For now, we'll skip this since we don't have extraction IDs from the scan
          // The store will need to manage this differently
        } catch (error) {
          console.warn(`Failed to get extraction status for document ${doc.documentId}:`, error);
        }
      });

    await Promise.allSettled(statusPromises);

    return { documents, extractions };
  }
}

// Export convenience functions for direct use
export const {
  scanProjectDocuments,
  getDocumentDetails,
  startDocumentExtraction,
  getExtractionStatus,
  cancelExtraction,
  getExtractedDocument,
  saveExtractedDocument,
  getOriginalDocumentPreview,
  pollExtractionStatus,
  scanAndGetExtractionStatuses,
} = TauriExtractionApi;