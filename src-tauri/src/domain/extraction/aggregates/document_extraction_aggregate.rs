use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::extraction::{
    entities::{ExtractedDocument, FileExtraction, OriginalDocument},
    value_objects::{
        DocumentId, ExtractedDocumentId, ExtractionId, ExtractionMethod, ExtractionStatus,
        ProseMirrorJson, ProjectId
    },
};

/// DocumentExtractionAggregate - Root aggregate managing the document extraction workflow
///
/// This aggregate encapsulates the entire extraction process, maintaining consistency
/// between the original document, extraction process tracking, and extracted results.
/// It enforces business rules and invariants across the extraction domain.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DocumentExtractionAggregate {
    /// The original document being processed (aggregate root)
    original_document: OriginalDocument,
    /// Current or most recent extraction process
    current_extraction: Option<FileExtraction>,
    /// Successfully extracted document (if any)
    extracted_document: Option<ExtractedDocument>,
    /// History of extraction attempts
    extraction_history: Vec<FileExtraction>,
}

impl DocumentExtractionAggregate {
    /// Creates a new aggregate for a document
    pub fn new(original_document: OriginalDocument) -> Self {
        Self {
            original_document,
            current_extraction: None,
            extracted_document: None,
            extraction_history: Vec::new(),
        }
    }

    /// Creates aggregate with existing extraction data (for loading from storage)
    pub fn with_extractions(
        original_document: OriginalDocument,
        extractions: Vec<FileExtraction>,
        extracted_document: Option<ExtractedDocument>,
    ) -> Result<Self, DocumentExtractionAggregateError> {
        let current_extraction = extractions
            .iter()
            .find(|e| e.status().is_active())
            .cloned();

        let extraction_history = extractions
            .into_iter()
            .filter(|e| e.status().is_finished())
            .collect();

        let mut aggregate = Self {
            original_document,
            current_extraction,
            extracted_document,
            extraction_history,
        };

        aggregate.validate_invariants()?;
        Ok(aggregate)
    }

    // Getters
    pub fn original_document(&self) -> &OriginalDocument {
        &self.original_document
    }

    pub fn current_extraction(&self) -> Option<&FileExtraction> {
        self.current_extraction.as_ref()
    }

    pub fn extracted_document(&self) -> Option<&ExtractedDocument> {
        self.extracted_document.as_ref()
    }

    pub fn extraction_history(&self) -> &[FileExtraction] {
        &self.extraction_history
    }

    pub fn document_id(&self) -> &DocumentId {
        self.original_document.document_id()
    }

    pub fn project_id(&self) -> &ProjectId {
        self.original_document.project_id()
    }

    /// Starts a new extraction process
    pub fn start_extraction(&mut self, force_reextract: bool) -> Result<ExtractionId, DocumentExtractionAggregateError> {
        // Check if extraction is already in progress
        if let Some(current) = &self.current_extraction {
            if current.status().is_active() {
                return Err(DocumentExtractionAggregateError::ExtractionInProgress);
            }
        }

        // Check if document can be extracted
        self.original_document.can_extract()
            .map_err(|e| DocumentExtractionAggregateError::CannotExtract(e.to_string()))?;

        // Check if re-extraction is needed
        if !force_reextract && self.extracted_document.is_some() {
            return Err(DocumentExtractionAggregateError::AlreadyExtracted);
        }

        // Determine extraction method
        let extraction_method = ExtractionMethod::for_document_type(self.original_document.file_type());

        // Create new extraction
        let extraction = FileExtraction::new(
            self.original_document.project_id().clone(),
            self.original_document.document_id().clone(),
            extraction_method,
        );

        let extraction_id = extraction.extraction_id().clone();
        self.current_extraction = Some(extraction);

        Ok(extraction_id)
    }

    /// Transitions extraction to processing state
    pub fn start_processing(&mut self) -> Result<(), DocumentExtractionAggregateError> {
        let extraction = self.current_extraction
            .as_mut()
            .ok_or(DocumentExtractionAggregateError::NoActiveExtraction)?;

        extraction.start_processing()
            .map_err(DocumentExtractionAggregateError::ExtractionError)?;

        Ok(())
    }

    /// Completes extraction with success
    pub fn complete_extraction(
        &mut self,
        tiptap_content: ProseMirrorJson,
    ) -> Result<ExtractedDocumentId, DocumentExtractionAggregateError> {
        let extraction = self.current_extraction
            .as_mut()
            .ok_or(DocumentExtractionAggregateError::NoActiveExtraction)?;

        // Create extracted document
        let extracted_document = ExtractedDocument::new(
            self.original_document.document_id().clone(),
            self.original_document.extracted_file_path(),
            tiptap_content,
            extraction.extraction_method().clone(),
        ).map_err(|e| DocumentExtractionAggregateError::InvalidContent(e.to_string()))?;

        let extracted_id = extracted_document.extracted_document_id().clone();

        // Complete the extraction
        extraction.complete_successfully(extracted_id.clone())
            .map_err(DocumentExtractionAggregateError::ExtractionError)?;

        // Store the extracted document
        self.extracted_document = Some(extracted_document);

        // Move completed extraction to history
        let completed_extraction = self.current_extraction.take().unwrap();
        self.extraction_history.push(completed_extraction);

        Ok(extracted_id)
    }

    /// Fails the current extraction with an error
    pub fn fail_extraction(&mut self, error_message: String) -> Result<(), DocumentExtractionAggregateError> {
        let extraction = self.current_extraction
            .as_mut()
            .ok_or(DocumentExtractionAggregateError::NoActiveExtraction)?;

        extraction.fail_with_error(error_message)
            .map_err(DocumentExtractionAggregateError::ExtractionError)?;

        // Move failed extraction to history
        let failed_extraction = self.current_extraction.take().unwrap();
        self.extraction_history.push(failed_extraction);

        Ok(())
    }

    /// Retries the last failed extraction
    pub fn retry_extraction(&mut self) -> Result<ExtractionId, DocumentExtractionAggregateError> {
        // Find the last failed extraction
        let last_failed = self.extraction_history
            .iter_mut()
            .rev()
            .find(|e| e.status() == &ExtractionStatus::Error)
            .ok_or(DocumentExtractionAggregateError::NoFailedExtraction)?;

        // Check if we can retry
        last_failed.retry()
            .map_err(DocumentExtractionAggregateError::ExtractionError)?;

        // Move to current extraction
        let extraction_id = last_failed.extraction_id().clone();
        let retry_extraction = last_failed.clone();

        // Remove from history and set as current
        self.extraction_history.retain(|e| e.extraction_id() != &extraction_id);
        self.current_extraction = Some(retry_extraction);

        Ok(extraction_id)
    }

    /// Cancels the current extraction
    pub fn cancel_extraction(&mut self) -> Result<(), DocumentExtractionAggregateError> {
        let extraction = self.current_extraction
            .as_mut()
            .ok_or(DocumentExtractionAggregateError::NoActiveExtraction)?;

        extraction.cancel()
            .map_err(DocumentExtractionAggregateError::ExtractionError)?;

        // Move cancelled extraction to history
        let cancelled_extraction = self.current_extraction.take().unwrap();
        self.extraction_history.push(cancelled_extraction);

        Ok(())
    }

    /// Updates the extracted document content
    pub fn update_extracted_content(
        &mut self,
        new_content: ProseMirrorJson,
    ) -> Result<(), DocumentExtractionAggregateError> {
        let extracted_doc = self.extracted_document
            .as_mut()
            .ok_or(DocumentExtractionAggregateError::NoExtractedDocument)?;

        extracted_doc.update_content(new_content)
            .map_err(|e| DocumentExtractionAggregateError::InvalidContent(e.to_string()))?;

        Ok(())
    }

    /// Returns the current extraction status
    pub fn extraction_status(&self) -> ExtractionStatus {
        match &self.current_extraction {
            Some(extraction) => extraction.status().clone(),
            None => {
                if self.extracted_document.is_some() {
                    ExtractionStatus::Completed
                } else {
                    ExtractionStatus::Pending
                }
            }
        }
    }

    /// Checks if extraction is currently in progress
    pub fn is_extraction_in_progress(&self) -> bool {
        matches!(self.extraction_status(), ExtractionStatus::Processing)
    }

    /// Checks if a successful extraction exists
    pub fn has_successful_extraction(&self) -> bool {
        self.extracted_document.is_some()
    }

    /// Returns the number of extraction attempts
    pub fn extraction_attempt_count(&self) -> usize {
        let history_count = self.extraction_history.len();
        let current_count = if self.current_extraction.is_some() { 1 } else { 0 };
        history_count + current_count
    }

    /// Returns summary information for the aggregate
    pub fn summary(&self) -> DocumentExtractionAggregateSummary {
        DocumentExtractionAggregateSummary {
            document_id: self.original_document.document_id().clone(),
            file_name: self.original_document.file_name().clone(),
            file_type: self.original_document.file_type().clone(),
            extraction_status: self.extraction_status(),
            has_extracted_document: self.extracted_document.is_some(),
            extraction_attempt_count: self.extraction_attempt_count(),
            last_extraction_at: self.last_extraction_time(),
            can_extract: self.original_document.can_extract().is_ok(),
            is_extraction_in_progress: self.is_extraction_in_progress(),
        }
    }

    /// Validates all aggregate invariants
    pub fn validate_invariants(&self) -> Result<(), DocumentExtractionAggregateError> {
        // Only one extraction can be active at a time
        let active_extractions: Vec<_> = self.extraction_history
            .iter()
            .filter(|e| e.status().is_active())
            .collect();

        if !active_extractions.is_empty() {
            return Err(DocumentExtractionAggregateError::InvariantViolation(
                "Found active extractions in history".to_string(),
            ));
        }

        // If there's an extracted document, there must be a successful extraction
        if self.extracted_document.is_some() {
            let has_success = self.extraction_history
                .iter()
                .any(|e| e.status() == &ExtractionStatus::Completed)
                || self.current_extraction
                    .as_ref()
                    .map(|e| e.status() == &ExtractionStatus::Completed)
                    .unwrap_or(false);

            if !has_success {
                return Err(DocumentExtractionAggregateError::InvariantViolation(
                    "Extracted document exists without successful extraction".to_string(),
                ));
            }
        }

        // All entities must belong to the same project
        let project_id = self.original_document.project_id();

        for extraction in &self.extraction_history {
            if extraction.project_id() != project_id {
                return Err(DocumentExtractionAggregateError::InvariantViolation(
                    "Extraction has different project ID".to_string(),
                ));
            }
        }

        if let Some(current) = &self.current_extraction {
            if current.project_id() != project_id {
                return Err(DocumentExtractionAggregateError::InvariantViolation(
                    "Current extraction has different project ID".to_string(),
                ));
            }
        }

        Ok(())
    }

    fn last_extraction_time(&self) -> Option<DateTime<Utc>> {
        let history_time = self.extraction_history
            .iter()
            .map(|e| e.started_at())
            .max();

        let current_time = self.current_extraction
            .as_ref()
            .map(|e| e.started_at());

        match (history_time, current_time) {
            (Some(h), Some(c)) => Some(*h.max(c)),
            (Some(h), None) => Some(*h),
            (None, Some(c)) => Some(*c),
            (None, None) => None,
        }
    }
}

/// Summary information for the aggregate
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DocumentExtractionAggregateSummary {
    pub document_id: DocumentId,
    pub file_name: String,
    pub file_type: crate::domain::extraction::value_objects::DocumentType,
    pub extraction_status: ExtractionStatus,
    pub has_extracted_document: bool,
    pub extraction_attempt_count: usize,
    pub last_extraction_at: Option<DateTime<Utc>>,
    pub can_extract: bool,
    pub is_extraction_in_progress: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum DocumentExtractionAggregateError {
    #[error("Extraction is already in progress")]
    ExtractionInProgress,
    #[error("Document already has a successful extraction")]
    AlreadyExtracted,
    #[error("Cannot extract document: {0}")]
    CannotExtract(String),
    #[error("No active extraction found")]
    NoActiveExtraction,
    #[error("No failed extraction found for retry")]
    NoFailedExtraction,
    #[error("No extracted document found")]
    NoExtractedDocument,
    #[error("Invalid content: {0}")]
    InvalidContent(String),
    #[error("Extraction error: {0}")]
    ExtractionError(crate::domain::extraction::entities::FileExtractionError),
    #[error("Aggregate invariant violated: {0}")]
    InvariantViolation(String),
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;
    use crate::domain::extraction::value_objects::{DocumentType, FilePath};

    #[test]
    fn test_new_aggregate() {
        let doc = create_test_document();
        let aggregate = DocumentExtractionAggregate::new(doc.clone());

        assert_eq!(aggregate.original_document(), &doc);
        assert!(aggregate.current_extraction().is_none());
        assert!(aggregate.extracted_document().is_none());
        assert_eq!(aggregate.extraction_history().len(), 0);
    }

    #[test]
    fn test_start_extraction() {
        let mut aggregate = create_test_aggregate();

        // This will fail because test document can't be extracted (file doesn't exist)
        let result = aggregate.start_extraction(false);
        assert!(result.is_err());
    }

    #[test]
    fn test_extraction_status() {
        let aggregate = create_test_aggregate();
        assert_eq!(aggregate.extraction_status(), ExtractionStatus::Pending);
    }

    #[test]
    fn test_extraction_attempt_count() {
        let aggregate = create_test_aggregate();
        assert_eq!(aggregate.extraction_attempt_count(), 0);
    }

    #[test]
    fn test_summary() {
        let aggregate = create_test_aggregate();
        let summary = aggregate.summary();

        assert_eq!(summary.document_id, *aggregate.document_id());
        assert_eq!(summary.extraction_status, ExtractionStatus::Pending);
        assert!(!summary.has_extracted_document);
        assert_eq!(summary.extraction_attempt_count, 0);
        assert!(!summary.can_extract); // Test file doesn't exist
    }

    #[test]
    fn test_validate_invariants() {
        let aggregate = create_test_aggregate();
        assert!(aggregate.validate_invariants().is_ok());
    }

    fn create_test_document() -> OriginalDocument {
        let project_id = ProjectId::new();
        let file_path = FilePath::new_unchecked(PathBuf::from("/test/document.pdf"));
        let now = Utc::now();

        OriginalDocument::with_id(
            DocumentId::new(),
            project_id,
            file_path,
            "document.pdf".to_string(),
            1024,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        )
    }

    fn create_test_aggregate() -> DocumentExtractionAggregate {
        let doc = create_test_document();
        DocumentExtractionAggregate::new(doc)
    }
}