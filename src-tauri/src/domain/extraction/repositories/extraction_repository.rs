use async_trait::async_trait;
use chrono::{DateTime, Utc};
use std::result::Result;

use crate::domain::extraction::{
    entities::FileExtraction,
    value_objects::{DocumentId, ExtractionId, ExtractionStatus, ProjectId}
};

/// Repository trait for FileExtraction entities
///
/// This trait defines the contract for persistence operations on FileExtraction entities,
/// which track the state and progress of document extraction processes.
#[async_trait]
pub trait ExtractionRepository: Send + Sync {
    /// Error type for repository operations
    type Error: std::error::Error + Send + Sync;

    /// Finds an extraction by its unique ID
    async fn find_by_id(&self, id: &ExtractionId) -> Result<Option<FileExtraction>, Self::Error>;

    /// Finds all extractions for a specific document
    async fn find_by_document(&self, document_id: &DocumentId) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds the most recent extraction for a document
    async fn find_latest_by_document(&self, document_id: &DocumentId) -> Result<Option<FileExtraction>, Self::Error>;

    /// Finds all extractions with a specific status
    async fn find_by_status(&self, status: &ExtractionStatus) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds extractions by status within a specific project
    async fn find_by_status_and_project(
        &self,
        status: &ExtractionStatus,
        project_id: &ProjectId,
    ) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds all active extractions (Pending or Processing) across all projects
    async fn find_active_extractions(&self) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds active extractions within a specific project
    async fn find_active_by_project(&self, project_id: &ProjectId) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds extractions that have been processing for too long (potentially stuck)
    async fn find_stuck_extractions(&self, timeout_minutes: u32) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds extractions that started after a specific timestamp
    async fn find_started_after(&self, after: &DateTime<Utc>) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds extractions that completed within a time range
    async fn find_completed_between(
        &self,
        start: &DateTime<Utc>,
        end: &DateTime<Utc>,
    ) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds failed extractions that can be retried
    async fn find_retryable_failures(&self, project_id: &ProjectId) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Finds extractions with a specific retry count
    async fn find_by_retry_count(&self, retry_count: u8) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Saves or updates an extraction
    async fn save(&self, extraction: &FileExtraction) -> Result<(), Self::Error>;

    /// Updates only the status of an extraction
    async fn update_status(
        &self,
        id: &ExtractionId,
        status: &ExtractionStatus,
    ) -> Result<(), Self::Error>;

    /// Updates status with completion time and duration
    async fn complete_extraction(
        &self,
        id: &ExtractionId,
        status: &ExtractionStatus,
        completed_at: DateTime<Utc>,
        duration_ms: Option<i64>,
    ) -> Result<(), Self::Error>;

    /// Updates status with error message
    async fn fail_extraction(
        &self,
        id: &ExtractionId,
        error_message: String,
        completed_at: DateTime<Utc>,
        duration_ms: Option<i64>,
    ) -> Result<(), Self::Error>;

    /// Increments the retry count for an extraction
    async fn increment_retry_count(&self, id: &ExtractionId) -> Result<(), Self::Error>;

    /// Deletes an extraction by ID
    async fn delete(&self, id: &ExtractionId) -> Result<bool, Self::Error>;

    /// Deletes all extractions for a specific document
    async fn delete_by_document(&self, document_id: &DocumentId) -> Result<usize, Self::Error>;

    /// Deletes all extractions for a project
    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error>;

    /// Deletes old completed extractions (cleanup)
    async fn delete_old_completed(&self, older_than: &DateTime<Utc>) -> Result<usize, Self::Error>;

    /// Checks if an extraction exists by ID
    async fn exists(&self, id: &ExtractionId) -> Result<bool, Self::Error>;

    /// Checks if there's an active extraction for a document
    async fn has_active_extraction(&self, document_id: &DocumentId) -> Result<bool, Self::Error>;

    /// Counts extractions by status within a project
    async fn count_by_status(
        &self,
        project_id: &ProjectId,
        status: &ExtractionStatus,
    ) -> Result<usize, Self::Error>;

    /// Counts total extractions for a document
    async fn count_by_document(&self, document_id: &DocumentId) -> Result<usize, Self::Error>;

    /// Gets extraction statistics for a project
    async fn get_project_statistics(&self, project_id: &ProjectId) -> Result<ExtractionStatistics, Self::Error>;

    /// Gets system-wide extraction statistics
    async fn get_system_statistics(&self) -> Result<ExtractionStatistics, Self::Error>;

    /// Lists extractions with pagination
    async fn list_paginated(
        &self,
        project_id: Option<&ProjectId>,
        offset: usize,
        limit: usize,
        sort_by: ExtractionSortBy,
        sort_order: SortOrder,
    ) -> Result<ExtractionPage, Self::Error>;

    /// Searches extractions by various criteria
    async fn search(&self, criteria: &ExtractionSearchCriteria) -> Result<Vec<FileExtraction>, Self::Error>;

    /// Gets performance metrics for extractions
    async fn get_performance_metrics(
        &self,
        project_id: Option<&ProjectId>,
        time_range: &TimeRange,
    ) -> Result<ExtractionPerformanceMetrics, Self::Error>;
}

/// Statistics about extractions
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractionStatistics {
    pub total_extractions: usize,
    pub pending_count: usize,
    pub processing_count: usize,
    pub completed_count: usize,
    pub error_count: usize,
    pub average_processing_time_ms: Option<i64>,
    pub success_rate: f64, // Percentage of successful extractions
    pub retry_rate: f64,   // Percentage requiring retries
}

/// Performance metrics for extractions
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractionPerformanceMetrics {
    pub total_processed: usize,
    pub total_processing_time_ms: i64,
    pub average_processing_time_ms: i64,
    pub median_processing_time_ms: i64,
    pub min_processing_time_ms: i64,
    pub max_processing_time_ms: i64,
    pub success_count: usize,
    pub failure_count: usize,
    pub success_rate: f64,
    pub throughput_per_hour: f64,
}

/// Paginated result for extraction listing
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractionPage {
    pub extractions: Vec<FileExtraction>,
    pub total_count: usize,
    pub offset: usize,
    pub limit: usize,
    pub has_more: bool,
}

/// Search criteria for extraction queries
#[derive(Debug, Clone, PartialEq)]
pub struct ExtractionSearchCriteria {
    pub project_id: Option<ProjectId>,
    pub document_id: Option<DocumentId>,
    pub statuses: Option<Vec<ExtractionStatus>>,
    pub started_after: Option<DateTime<Utc>>,
    pub started_before: Option<DateTime<Utc>>,
    pub completed_after: Option<DateTime<Utc>>,
    pub completed_before: Option<DateTime<Utc>>,
    pub min_retry_count: Option<u8>,
    pub max_retry_count: Option<u8>,
    pub has_error: Option<bool>,
    pub sort_by: ExtractionSortBy,
    pub sort_order: SortOrder,
    pub limit: Option<usize>,
}

/// Sort options for extraction queries
#[derive(Debug, Clone, PartialEq)]
pub enum ExtractionSortBy {
    StartedAt,
    CompletedAt,
    Status,
    RetryCount,
    ProcessingDuration,
}

/// Sort order options
#[derive(Debug, Clone, PartialEq)]
pub enum SortOrder {
    Ascending,
    Descending,
}

/// Time range for queries
#[derive(Debug, Clone, PartialEq)]
pub struct TimeRange {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

impl Default for ExtractionSearchCriteria {
    fn default() -> Self {
        Self {
            project_id: None,
            document_id: None,
            statuses: None,
            started_after: None,
            started_before: None,
            completed_after: None,
            completed_before: None,
            min_retry_count: None,
            max_retry_count: None,
            has_error: None,
            sort_by: ExtractionSortBy::StartedAt,
            sort_order: SortOrder::Descending,
            limit: None,
        }
    }
}

impl ExtractionSearchCriteria {
    /// Creates search criteria for a specific project
    pub fn for_project(project_id: ProjectId) -> Self {
        Self {
            project_id: Some(project_id),
            ..Default::default()
        }
    }

    /// Creates search criteria for a specific document
    pub fn for_document(document_id: DocumentId) -> Self {
        Self {
            document_id: Some(document_id),
            ..Default::default()
        }
    }

    /// Filters by specific statuses
    pub fn with_statuses(mut self, statuses: Vec<ExtractionStatus>) -> Self {
        self.statuses = Some(statuses);
        self
    }

    /// Filters by time range when started
    pub fn started_between(mut self, start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        self.started_after = Some(start);
        self.started_before = Some(end);
        self
    }

    /// Filters by retry count range
    pub fn with_retry_range(mut self, min: Option<u8>, max: Option<u8>) -> Self {
        self.min_retry_count = min;
        self.max_retry_count = max;
        self
    }

    /// Filters to only failed extractions
    pub fn failures_only(mut self) -> Self {
        self.statuses = Some(vec![ExtractionStatus::Error]);
        self
    }

    /// Filters to only successful extractions
    pub fn successes_only(mut self) -> Self {
        self.statuses = Some(vec![ExtractionStatus::Completed]);
        self
    }

    /// Sets sort order
    pub fn sort_by(mut self, sort_by: ExtractionSortBy, order: SortOrder) -> Self {
        self.sort_by = sort_by;
        self.sort_order = order;
        self
    }

    /// Limits the number of results
    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }
}

impl TimeRange {
    /// Creates a time range for the last N hours
    pub fn last_hours(hours: u32) -> Self {
        let end = Utc::now();
        let start = end - chrono::Duration::hours(hours as i64);
        Self { start, end }
    }

    /// Creates a time range for the last N days
    pub fn last_days(days: u32) -> Self {
        let end = Utc::now();
        let start = end - chrono::Duration::days(days as i64);
        Self { start, end }
    }

    /// Creates a time range for today
    pub fn today() -> Self {
        let now = Utc::now();
        let start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().and_utc();
        let end = now;
        Self { start, end }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extraction_search_criteria_builder() {
        let project_id = ProjectId::new();
        let criteria = ExtractionSearchCriteria::for_project(project_id.clone())
            .with_statuses(vec![ExtractionStatus::Completed, ExtractionStatus::Error])
            .with_retry_range(Some(0), Some(3))
            .sort_by(ExtractionSortBy::CompletedAt, SortOrder::Descending)
            .limit(50);

        assert_eq!(criteria.project_id, Some(project_id));
        assert_eq!(criteria.statuses, Some(vec![ExtractionStatus::Completed, ExtractionStatus::Error]));
        assert_eq!(criteria.min_retry_count, Some(0));
        assert_eq!(criteria.max_retry_count, Some(3));
        assert_eq!(criteria.sort_by, ExtractionSortBy::CompletedAt);
        assert_eq!(criteria.sort_order, SortOrder::Descending);
        assert_eq!(criteria.limit, Some(50));
    }

    #[test]
    fn test_time_range_creation() {
        let range = TimeRange::last_hours(24);
        let duration = range.end - range.start;
        assert_eq!(duration.num_hours(), 24);

        let today = TimeRange::today();
        assert!(today.start <= today.end);
    }

    #[test]
    fn test_failures_and_successes_filters() {
        let failures = ExtractionSearchCriteria::default().failures_only();
        assert_eq!(failures.statuses, Some(vec![ExtractionStatus::Error]));

        let successes = ExtractionSearchCriteria::default().successes_only();
        assert_eq!(successes.statuses, Some(vec![ExtractionStatus::Completed]));
    }
}