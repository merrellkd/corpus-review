/**
 * TypeScript DTOs for File Metadata Extraction
 *
 * These DTOs mirror the Rust backend DTOs and provide type safety
 * for document extraction operations.
 */

/**
 * Document file types supported for extraction
 */
export type DocumentFileType = 'PDF' | 'DOCX' | 'Markdown';

/**
 * Extraction status states
 */
export type ExtractionStatus = 'None' | 'Pending' | 'Processing' | 'Completed' | 'Error';

/**
 * Extraction methods used for processing documents
 */
export type ExtractionMethod = 'PdfTextExtraction' | 'PdfOcrExtraction' | 'DocxStructureExtraction' | 'MarkdownConversion';

/**
 * Original document DTO representing source files
 */
export interface OriginalDocumentDto {
  documentId: string; // doc_[uuid]
  projectId: string; // proj_[uuid]
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: DocumentFileType;
  createdAt: string; // ISO date-time
  modifiedAt: string; // ISO date-time
  hasExtraction: boolean;
  extractionStatus: ExtractionStatus | null;
}

/**
 * Extraction history entry for tracking previous extractions
 */
export interface ExtractionHistoryDto {
  extractionId: string;
  startedAt: string; // ISO date-time
  completedAt: string | null; // ISO date-time
  status: Exclude<ExtractionStatus, 'None'>;
  errorMessage: string | null;
  processingDurationMs: number | null;
}

/**
 * Detailed document information including extraction history
 */
export interface DocumentDetailsDto extends OriginalDocumentDto {
  checksum: string;
  extractionHistory: ExtractionHistoryDto[];
}

/**
 * Current extraction status information
 */
export interface ExtractionStatusDto {
  extractionId: string; // ext_[uuid]
  documentId: string; // doc_[uuid]
  status: Exclude<ExtractionStatus, 'None'>;
  extractionMethod: ExtractionMethod | null;
  startedAt: string; // ISO date-time
  completedAt: string | null; // ISO date-time
  errorMessage: string | null;
  progressPercentage: number | null; // 0-100
}

/**
 * Extracted document with editable TipTap content
 */
export interface ExtractedDocumentDto {
  extractedDocumentId: string; // det_[uuid]
  originalDocumentId: string; // doc_[uuid]
  extractedFilePath: string;
  tiptapContent: object; // TipTap/ProseMirror JSON structure
  extractionMethod: string;
  extractedAt: string; // ISO date-time
  contentPreview: string;
  wordCount: number;
  characterCount: number;
}

/**
 * Document preview for read-only viewing of original files
 */
export interface DocumentPreviewDto {
  documentId: string; // doc_[uuid]
  fileName: string;
  fileType: DocumentFileType;
  fileSizeBytes: number;
  previewContent: string; // HTML or text preview
  pageCount: number | null;
  metadata: Record<string, any>;
}

/**
 * Result of saving an extracted document
 */
export interface SaveResultDto {
  success: boolean;
  extractedDocumentId: string; // det_[uuid]
  savedAt: string; // ISO date-time
  wordCount: number;
  characterCount: number;
  errorMessage: string | null;
}

/**
 * Request parameters for starting document extraction
 */
export interface StartExtractionParams {
  documentId: string;
  forceReextract?: boolean;
}

/**
 * Request parameters for saving extracted document
 */
export interface SaveExtractedDocumentParams {
  extractedDocumentId: string;
  tiptapContent: object;
}

/**
 * Extraction error codes matching backend
 */
export enum ExtractionErrorCode {
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  EXTRACTION_NOT_FOUND = 'EXTRACTION_NOT_FOUND',
  EXTRACTED_DOCUMENT_NOT_FOUND = 'EXTRACTED_DOCUMENT_NOT_FOUND',
  EXTRACTION_IN_PROGRESS = 'EXTRACTION_IN_PROGRESS',
  EXTRACTION_NOT_COMPLETED = 'EXTRACTION_NOT_COMPLETED',
  EXTRACTION_NOT_CANCELLABLE = 'EXTRACTION_NOT_CANCELLABLE',
  UNSUPPORTED_FILE_TYPE = 'UNSUPPORTED_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_NOT_ACCESSIBLE = 'FILE_NOT_ACCESSIBLE',
  INVALID_CONTENT = 'INVALID_CONTENT',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * Extraction API error structure
 */
export interface ExtractionApiError {
  code: ExtractionErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * Utility functions for working with extraction DTOs
 */
export class ExtractionDtoUtils {
  /**
   * Check if document supports extraction
   */
  static isExtractionSupported(document: OriginalDocumentDto): boolean {
    return ['PDF', 'DOCX', 'Markdown'].includes(document.fileType);
  }

  /**
   * Check if file size is within extraction limits (10MB)
   */
  static isFileSizeValid(document: OriginalDocumentDto): boolean {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    return document.fileSizeBytes <= MAX_FILE_SIZE;
  }

  /**
   * Check if extraction can be started for a document
   */
  static canStartExtraction(document: OriginalDocumentDto): boolean {
    return (
      this.isExtractionSupported(document) &&
      this.isFileSizeValid(document) &&
      (!document.extractionStatus || document.extractionStatus === 'None' || document.extractionStatus === 'Error')
    );
  }

  /**
   * Check if extraction is currently active
   */
  static isExtractionActive(status: ExtractionStatus | null): boolean {
    return status === 'Pending' || status === 'Processing';
  }

  /**
   * Check if extraction has completed successfully
   */
  static isExtractionCompleted(status: ExtractionStatus | null): boolean {
    return status === 'Completed';
  }

  /**
   * Check if extraction has failed
   */
  static isExtractionFailed(status: ExtractionStatus | null): boolean {
    return status === 'Error';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get display status text for extraction status
   */
  static getStatusDisplayText(status: ExtractionStatus | null): string {
    switch (status) {
      case 'None':
      case null:
        return 'Not extracted';
      case 'Pending':
        return 'Queued for extraction';
      case 'Processing':
        return 'Extracting...';
      case 'Completed':
        return 'Extracted';
      case 'Error':
        return 'Extraction failed';
      default:
        return 'Unknown status';
    }
  }

  /**
   * Get CSS class for extraction status display
   */
  static getStatusCssClass(status: ExtractionStatus | null): string {
    switch (status) {
      case 'None':
      case null:
        return 'extraction-status-none';
      case 'Pending':
        return 'extraction-status-pending';
      case 'Processing':
        return 'extraction-status-processing';
      case 'Completed':
        return 'extraction-status-completed';
      case 'Error':
        return 'extraction-status-error';
      default:
        return 'extraction-status-unknown';
    }
  }

  /**
   * Validate OriginalDocumentDto structure
   */
  static isOriginalDocumentDto(obj: any): obj is OriginalDocumentDto {
    return (
      obj &&
      typeof obj.documentId === 'string' &&
      obj.documentId.startsWith('doc_') &&
      typeof obj.projectId === 'string' &&
      obj.projectId.startsWith('proj_') &&
      typeof obj.filePath === 'string' &&
      typeof obj.fileName === 'string' &&
      typeof obj.fileSizeBytes === 'number' &&
      ['PDF', 'DOCX', 'Markdown'].includes(obj.fileType) &&
      typeof obj.createdAt === 'string' &&
      typeof obj.modifiedAt === 'string' &&
      typeof obj.hasExtraction === 'boolean' &&
      (obj.extractionStatus === null || ['None', 'Pending', 'Processing', 'Completed', 'Error'].includes(obj.extractionStatus))
    );
  }

  /**
   * Validate ExtractedDocumentDto structure
   */
  static isExtractedDocumentDto(obj: any): obj is ExtractedDocumentDto {
    return (
      obj &&
      typeof obj.extractedDocumentId === 'string' &&
      obj.extractedDocumentId.startsWith('det_') &&
      typeof obj.originalDocumentId === 'string' &&
      obj.originalDocumentId.startsWith('doc_') &&
      typeof obj.extractedFilePath === 'string' &&
      typeof obj.tiptapContent === 'object' &&
      typeof obj.extractionMethod === 'string' &&
      typeof obj.extractedAt === 'string' &&
      typeof obj.contentPreview === 'string' &&
      typeof obj.wordCount === 'number' &&
      typeof obj.characterCount === 'number'
    );
  }

  /**
   * Validate ExtractionStatusDto structure
   */
  static isExtractionStatusDto(obj: any): obj is ExtractionStatusDto {
    return (
      obj &&
      typeof obj.extractionId === 'string' &&
      obj.extractionId.startsWith('ext_') &&
      typeof obj.documentId === 'string' &&
      obj.documentId.startsWith('doc_') &&
      ['Pending', 'Processing', 'Completed', 'Error'].includes(obj.status) &&
      typeof obj.startedAt === 'string' &&
      (obj.completedAt === null || typeof obj.completedAt === 'string') &&
      (obj.errorMessage === null || typeof obj.errorMessage === 'string') &&
      (obj.progressPercentage === null || (typeof obj.progressPercentage === 'number' && obj.progressPercentage >= 0 && obj.progressPercentage <= 100))
    );
  }
}