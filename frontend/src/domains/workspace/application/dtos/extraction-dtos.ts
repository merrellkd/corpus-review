/**
 * TypeScript DTOs for File Metadata Extraction
 *
 * These DTOs mirror the Rust backend DTOs and provide type safety
 * and utility functions for document extraction operations.
 */

/**
 * Extraction status enum
 */
export type ExtractionStatus = "None" | "Pending" | "Processing" | "Completed" | "Error";

/**
 * File type enum for supported extraction formats
 */
export type DocumentFileType = "PDF" | "DOCX" | "Markdown";

/**
 * Extraction method enum
 */
export type ExtractionMethod = "PdfTextExtraction" | "PdfOcrExtraction" | "DocxStructureExtraction" | "MarkdownConversion";

/**
 * Original document DTO representing source files
 */
export interface OriginalDocumentDto {
  documentId: string;
  projectId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: DocumentFileType;
  createdAt: string; // ISO string
  modifiedAt: string; // ISO string
  hasExtraction: boolean;
  extractionStatus: ExtractionStatus | null;
}

/**
 * Document details DTO with additional metadata
 */
export interface DocumentDetailsDto extends OriginalDocumentDto {
  checksum: string;
  extractionHistory: ExtractionHistoryDto[];
}

/**
 * Extraction history entry DTO
 */
export interface ExtractionHistoryDto {
  extractionId: string;
  startedAt: string; // ISO string
  completedAt: string | null; // ISO string
  status: Exclude<ExtractionStatus, "None">;
  errorMessage: string | null;
  processingDurationMs: number | null;
}

/**
 * Extraction status DTO for tracking progress
 */
export interface ExtractionStatusDto {
  extractionId: string;
  documentId: string;
  status: Exclude<ExtractionStatus, "None">;
  extractionMethod: ExtractionMethod | null;
  startedAt: string; // ISO string
  completedAt: string | null; // ISO string
  errorMessage: string | null;
  progressPercentage: number | null;
}

/**
 * Extracted document DTO for editable content
 */
export interface ExtractedDocumentDto {
  extractedDocumentId: string;
  originalDocumentId: string;
  extractedFilePath: string;
  tiptapContent: object; // TipTap/ProseMirror JSON
  extractionMethod: string;
  extractedAt: string; // ISO string
  contentPreview: string;
  wordCount: number;
  characterCount: number;
}

/**
 * Document preview DTO for read-only viewing
 */
export interface DocumentPreviewDto {
  documentId: string;
  fileName: string;
  fileType: DocumentFileType;
  fileSizeBytes: number;
  previewContent: string; // HTML or text
  pageCount: number | null;
  metadata: Record<string, any>;
}

/**
 * Save result DTO
 */
export interface SaveResultDto {
  success: boolean;
  extractedDocumentId: string;
  savedAt: string; // ISO string
  wordCount: number;
  characterCount: number;
  errorMessage: string | null;
}

/**
 * Utility class for working with extraction DTOs
 */
export class ExtractionDtoUtils {
  /**
   * Check if a file type supports extraction
   */
  static isExtractableFileType(fileType: string): fileType is DocumentFileType {
    return ["PDF", "DOCX", "Markdown"].includes(fileType);
  }

  /**
   * Check if a file extension is supported for extraction
   */
  static isExtractableExtension(extension: string): boolean {
    const normalizedExt = extension.toLowerCase();
    return ["pdf", "docx", "doc", "md", "markdown"].includes(normalizedExt);
  }

  /**
   * Get file type from extension
   */
  static getFileTypeFromExtension(extension: string): DocumentFileType | null {
    const normalizedExt = extension.toLowerCase();
    switch (normalizedExt) {
      case "pdf":
        return "PDF";
      case "docx":
      case "doc":
        return "DOCX";
      case "md":
      case "markdown":
        return "Markdown";
      default:
        return null;
    }
  }

  /**
   * Check if extraction is in progress
   */
  static isExtractionInProgress(status: ExtractionStatus | null): boolean {
    return status === "Pending" || status === "Processing";
  }

  /**
   * Check if extraction is completed successfully
   */
  static isExtractionCompleted(status: ExtractionStatus | null): boolean {
    return status === "Completed";
  }

  /**
   * Check if extraction failed
   */
  static isExtractionFailed(status: ExtractionStatus | null): boolean {
    return status === "Error";
  }

  /**
   * Check if extraction can be started
   */
  static canStartExtraction(status: ExtractionStatus | null): boolean {
    return status === "None" || status === "Error" || status === null;
  }

  /**
   * Get status display text
   */
  static getStatusDisplayText(status: ExtractionStatus | null): string {
    switch (status) {
      case "None":
      case null:
        return "Not extracted";
      case "Pending":
        return "Queued";
      case "Processing":
        return "Processing";
      case "Completed":
        return "Extracted";
      case "Error":
        return "Failed";
      default:
        return "Unknown";
    }
  }

  /**
   * Get status icon for display
   */
  static getStatusIcon(status: ExtractionStatus | null): string {
    switch (status) {
      case "None":
      case null:
        return "📄";
      case "Pending":
        return "⏳";
      case "Processing":
        return "⚙️";
      case "Completed":
        return "✅";
      case "Error":
        return "❌";
      default:
        return "❓";
    }
  }

  /**
   * Get status CSS class for styling
   */
  static getStatusCssClass(status: ExtractionStatus | null): string {
    switch (status) {
      case "None":
      case null:
        return "extraction-status--none";
      case "Pending":
        return "extraction-status--pending";
      case "Processing":
        return "extraction-status--processing";
      case "Completed":
        return "extraction-status--completed";
      case "Error":
        return "extraction-status--error";
      default:
        return "extraction-status--unknown";
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSizeBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Check if file size is within extraction limits
   */
  static isFileSizeWithinLimits(bytes: number): boolean {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    return bytes <= MAX_FILE_SIZE;
  }

  /**
   * Get file size validation error message
   */
  static getFileSizeValidationError(bytes: number): string | null {
    if (!this.isFileSizeWithinLimits(bytes)) {
      return `File size (${this.formatFileSizeBytes(bytes)}) exceeds 10MB limit`;
    }
    return null;
  }

  /**
   * Format progress percentage for display
   */
  static formatProgressPercentage(percentage: number | null): string {
    if (percentage === null || percentage === undefined) {
      return "";
    }
    return `${Math.round(percentage)}%`;
  }

  /**
   * Format duration in milliseconds for display
   */
  static formatDuration(durationMs: number | null): string {
    if (durationMs === null || durationMs === undefined) {
      return "";
    }

    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Get extraction button text based on status
   */
  static getExtractionButtonText(status: ExtractionStatus | null): string {
    switch (status) {
      case "None":
      case null:
        return "Extract";
      case "Pending":
        return "Queued";
      case "Processing":
        return "Processing";
      case "Completed":
        return "Re-extract";
      case "Error":
        return "Retry";
      default:
        return "Extract";
    }
  }

  /**
   * Check if extraction button should be disabled
   */
  static isExtractionButtonDisabled(status: ExtractionStatus | null): boolean {
    return status === "Pending" || status === "Processing";
  }

  /**
   * Type guard for OriginalDocumentDto
   */
  static isOriginalDocumentDto(doc: any): doc is OriginalDocumentDto {
    return (
      doc &&
      typeof doc.documentId === "string" &&
      typeof doc.projectId === "string" &&
      typeof doc.filePath === "string" &&
      typeof doc.fileName === "string" &&
      typeof doc.fileSizeBytes === "number" &&
      typeof doc.fileType === "string" &&
      typeof doc.createdAt === "string" &&
      typeof doc.modifiedAt === "string" &&
      typeof doc.hasExtraction === "boolean" &&
      (doc.extractionStatus === null || typeof doc.extractionStatus === "string")
    );
  }

  /**
   * Type guard for ExtractionStatusDto
   */
  static isExtractionStatusDto(status: any): status is ExtractionStatusDto {
    return (
      status &&
      typeof status.extractionId === "string" &&
      typeof status.documentId === "string" &&
      typeof status.status === "string" &&
      typeof status.startedAt === "string" &&
      (status.completedAt === null || typeof status.completedAt === "string") &&
      (status.errorMessage === null || typeof status.errorMessage === "string") &&
      (status.progressPercentage === null || typeof status.progressPercentage === "number")
    );
  }
}