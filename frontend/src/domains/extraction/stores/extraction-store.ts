import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  OriginalDocument,
  ExtractedDocument,
  ExtractionStatusInfo,
  DocumentPreview,
  ExtractionProgress,
  DocumentId,
  ExtractedDocumentId,
  ExtractionId,
  ProjectId,
  ExtractionStatus
} from '../types';
import { extractionApiService } from '../services/extraction-api';

interface ExtractionStore {
  // State
  documents: OriginalDocument[];
  extractions: Map<ExtractionId, ExtractionStatusInfo>;
  extractionProgress: Map<DocumentId, ExtractionProgress>;
  currentDocument: ExtractedDocument | null;
  currentPreview: DocumentPreview | null;
  isLoading: boolean;
  error: string | null;

  // Computed state
  getDocumentById: (documentId: DocumentId) => OriginalDocument | undefined;
  getExtractionForDocument: (documentId: DocumentId) => ExtractionStatusInfo | undefined;
  getProgressForDocument: (documentId: DocumentId) => ExtractionProgress | undefined;

  // Actions
  scanDocuments: (projectId: ProjectId) => Promise<void>;
  startExtraction: (documentId: DocumentId, forceReextract?: boolean) => Promise<void>;
  getExtractionStatus: (extractionId: ExtractionId) => Promise<ExtractionStatusInfo>;
  cancelExtraction: (extractionId: ExtractionId) => Promise<void>;
  openDocument: (documentId: DocumentId) => Promise<void>;
  openPreview: (documentId: DocumentId) => Promise<void>;
  saveDocument: (extractedDocumentId: ExtractedDocumentId, content: object) => Promise<void>;
  clearError: () => void;
  clearCurrentDocument: () => void;
  clearCurrentPreview: () => void;

  // Internal actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateExtractionProgress: (documentId: DocumentId, progress: Partial<ExtractionProgress>) => void;
  pollExtractionStatus: (extractionId: ExtractionId) => void;
}

export const useExtractionStore = create<ExtractionStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    documents: [],
    extractions: new Map(),
    extractionProgress: new Map(),
    currentDocument: null,
    currentPreview: null,
    isLoading: false,
    error: null,

    // Computed state
    getDocumentById: (documentId: DocumentId) => {
      return get().documents.find(doc => doc.documentId === documentId);
    },

    getExtractionForDocument: (documentId: DocumentId) => {
      const extractions = Array.from(get().extractions.values());
      return extractions.find(ext => ext.documentId === documentId);
    },

    getProgressForDocument: (documentId: DocumentId) => {
      return get().extractionProgress.get(documentId);
    },

    // Actions
    scanDocuments: async (projectId: ProjectId) => {
      try {
        set({ isLoading: true, error: null });

        const documents = await extractionApiService.scanProjectDocuments(projectId);

        set({ documents, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to scan documents';
        set({ error: errorMessage, isLoading: false });
      }
    },

    startExtraction: async (documentId: DocumentId, forceReextract = false) => {
      try {
        set({ error: null });

        // Initialize progress tracking
        get().updateExtractionProgress(documentId, {
          documentId,
          status: ExtractionStatus.Pending,
          percentage: 0,
          error: null
        });

        const extractionStatus = await extractionApiService.startDocumentExtraction(
          documentId,
          forceReextract
        );

        // Update extractions map
        const extractions = new Map(get().extractions);
        extractions.set(extractionStatus.extractionId, extractionStatus);

        // Update progress
        get().updateExtractionProgress(documentId, {
          extractionId: extractionStatus.extractionId,
          status: extractionStatus.status,
          percentage: extractionStatus.progressPercentage,
          error: extractionStatus.errorMessage
        });

        set({ extractions });

        // Start polling for status updates if processing
        if (extractionStatus.status === ExtractionStatus.Processing) {
          get().pollExtractionStatus(extractionStatus.extractionId);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start extraction';
        get().updateExtractionProgress(documentId, {
          status: ExtractionStatus.Error,
          error: errorMessage
        });
        set({ error: errorMessage });
      }
    },

    getExtractionStatus: async (extractionId: ExtractionId) => {
      try {
        const status = await extractionApiService.getExtractionStatus(extractionId);

        // Update extractions map
        const extractions = new Map(get().extractions);
        extractions.set(extractionId, status);

        // Update progress
        get().updateExtractionProgress(status.documentId, {
          extractionId: status.extractionId,
          status: status.status,
          percentage: status.progressPercentage,
          error: status.errorMessage
        });

        set({ extractions });

        return status;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get extraction status';
        set({ error: errorMessage });
        throw error;
      }
    },

    cancelExtraction: async (extractionId: ExtractionId) => {
      try {
        await extractionApiService.cancelExtraction(extractionId);

        // Find the document ID for this extraction
        const extraction = get().extractions.get(extractionId);
        if (extraction) {
          get().updateExtractionProgress(extraction.documentId, {
            status: ExtractionStatus.Error,
            error: 'Extraction cancelled by user'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel extraction';
        set({ error: errorMessage });
      }
    },

    openDocument: async (documentId: DocumentId) => {
      try {
        set({ isLoading: true, error: null });

        const extractedDocument = await extractionApiService.getExtractedDocument(documentId);

        set({ currentDocument: extractedDocument, currentPreview: null, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to open document';
        set({ error: errorMessage, isLoading: false });
      }
    },

    openPreview: async (documentId: DocumentId) => {
      try {
        set({ isLoading: true, error: null });

        const preview = await extractionApiService.getOriginalDocumentPreview(documentId);

        set({ currentPreview: preview, currentDocument: null, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to open preview';
        set({ error: errorMessage, isLoading: false });
      }
    },

    saveDocument: async (extractedDocumentId: ExtractedDocumentId, content: object) => {
      try {
        set({ isLoading: true, error: null });

        const saveResult = await extractionApiService.saveExtractedDocument(
          extractedDocumentId,
          content
        );

        if (!saveResult.success) {
          throw new Error(saveResult.errorMessage || 'Save failed');
        }

        // Update current document if it matches
        const currentDoc = get().currentDocument;
        if (currentDoc && currentDoc.extractedDocumentId === extractedDocumentId) {
          set({
            currentDocument: {
              ...currentDoc,
              tiptapContent: content,
              wordCount: saveResult.wordCount,
              characterCount: saveResult.characterCount
            },
            isLoading: false
          });
        } else {
          set({ isLoading: false });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save document';
        set({ error: errorMessage, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),

    clearCurrentDocument: () => set({ currentDocument: null }),

    clearCurrentPreview: () => set({ currentPreview: null }),

    setLoading: (loading: boolean) => set({ isLoading: loading }),

    setError: (error: string | null) => set({ error }),

    updateExtractionProgress: (documentId: DocumentId, progress: Partial<ExtractionProgress>) => {
      const currentProgress = get().extractionProgress.get(documentId) || {
        extractionId: '' as ExtractionId,
        documentId,
        status: ExtractionStatus.None,
        percentage: null,
        error: null
      };

      const updatedProgress = { ...currentProgress, ...progress };
      const newProgressMap = new Map(get().extractionProgress);
      newProgressMap.set(documentId, updatedProgress);

      set({ extractionProgress: newProgressMap });
    },

    // Internal polling method
    pollExtractionStatus: (extractionId: ExtractionId) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await get().getExtractionStatus(extractionId);

          if (status.status === ExtractionStatus.Completed || status.status === ExtractionStatus.Error) {
            clearInterval(pollInterval);

            // If completed, refresh the documents list to update hasExtraction flag
            if (status.status === ExtractionStatus.Completed) {
              const document = get().getDocumentById(status.documentId);
              if (document) {
                const updatedDocuments = get().documents.map(doc =>
                  doc.documentId === status.documentId
                    ? { ...doc, hasExtraction: true, extractionStatus: ExtractionStatus.Completed }
                    : doc
                );
                set({ documents: updatedDocuments });
              }
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          console.error('Error polling extraction status:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
  }))
);

// Export a selector hook for easier component usage
export const useExtractionActions = () => {
  const store = useExtractionStore();
  return {
    scanDocuments: store.scanDocuments,
    startExtraction: store.startExtraction,
    cancelExtraction: store.cancelExtraction,
    openDocument: store.openDocument,
    openPreview: store.openPreview,
    saveDocument: store.saveDocument,
    clearError: store.clearError,
    clearCurrentDocument: store.clearCurrentDocument,
    clearCurrentPreview: store.clearCurrentPreview
  };
};

// Export selector hooks for computed state
export const useExtractionSelectors = () => {
  const store = useExtractionStore();
  return {
    getDocumentById: store.getDocumentById,
    getExtractionForDocument: store.getExtractionForDocument,
    getProgressForDocument: store.getProgressForDocument
  };
};