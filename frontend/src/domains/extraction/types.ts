// TypeScript domain types for File Metadata Extraction

export type DocumentId = string; // Pattern: "doc_[uuid]"
export type ExtractedDocumentId = string; // Pattern: "det_[uuid]"
export type ExtractionId = string; // Pattern: "ext_[uuid]"
export type ProjectId = string; // Pattern: "proj_[uuid]"

export enum DocumentType {
  PDF = 'PDF',
  DOCX = 'DOCX',
  Markdown = 'Markdown'
}

export enum ExtractionStatus {
  None = 'None',
  Pending = 'Pending',
  Processing = 'Processing',
  Completed = 'Completed',
  Error = 'Error'
}

export enum ExtractionMethod {
  PdfTextExtraction = 'PdfTextExtraction',
  PdfOcrExtraction = 'PdfOcrExtraction',
  DocxStructureExtraction = 'DocxStructureExtraction',
  MarkdownConversion = 'MarkdownConversion'
}

export interface OriginalDocument {
  documentId: DocumentId;
  projectId: ProjectId;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: DocumentType;
  createdAt: string;
  modifiedAt: string;
  hasExtraction: boolean;
  extractionStatus: ExtractionStatus | null;
}

export interface DocumentDetails extends OriginalDocument {
  checksum: string;
  extractionHistory: ExtractionHistory[];
}

export interface ExtractionHistory {
  extractionId: ExtractionId;
  startedAt: string;
  completedAt: string | null;
  status: ExtractionStatus;
  errorMessage: string | null;
  processingDurationMs: number | null;
}

export interface ExtractionStatusInfo {
  extractionId: ExtractionId;
  documentId: DocumentId;
  status: ExtractionStatus;
  extractionMethod: ExtractionMethod | null;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  progressPercentage: number | null;
}

export interface ExtractedDocument {
  extractedDocumentId: ExtractedDocumentId;
  originalDocumentId: DocumentId;
  extractedFilePath: string;
  tiptapContent: object; // TipTap/ProseMirror JSON
  extractionMethod: ExtractionMethod;
  extractedAt: string;
  contentPreview: string;
  wordCount: number;
  characterCount: number;
}

export interface DocumentPreview {
  documentId: DocumentId;
  fileName: string;
  fileType: DocumentType;
  fileSizeBytes: number;
  previewContent: string; // HTML or text for read-only viewing
  pageCount: number | null;
  metadata: Record<string, any>;
}

export interface SaveResult {
  success: boolean;
  extractedDocumentId: ExtractedDocumentId;
  savedAt: string;
  wordCount: number;
  characterCount: number;
  errorMessage: string | null;
}

// Error types for handling API errors
export interface ExtractionError {
  code: string;
  message: string;
}

// UI state types
export interface DocumentViewMode {
  mode: 'view' | 'edit';
  document: OriginalDocument | ExtractedDocument;
  isToggleable: boolean;
}

export interface ExtractionProgress {
  extractionId: ExtractionId;
  documentId: DocumentId;
  status: ExtractionStatus;
  percentage: number | null;
  error: string | null;
}