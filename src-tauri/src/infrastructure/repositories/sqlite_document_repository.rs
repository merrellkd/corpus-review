use async_trait::async_trait;
use sqlx::{SqlitePool, Row};
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::domain::extraction::{
    entities::OriginalDocument,
    repositories::document_repository::{
        DocumentRepository, DocumentPage, DocumentSearchCriteria, DocumentSortBy, SortOrder
    },
    value_objects::{DocumentId, DocumentType, FilePath, FileName, ProjectId}
};

/// SQLite implementation of the DocumentRepository trait
///
/// This implementation provides persistent storage for OriginalDocument entities using SQLite.
/// It handles the mapping between domain objects and database records while maintaining
/// the domain's business rules and invariants.
pub struct SqliteDocumentRepository {
    pool: Arc<SqlitePool>,
}

impl SqliteDocumentRepository {
    /// Create a new SqliteDocumentRepository with the given connection pool
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        SqliteDocumentRepository { pool }
    }

    /// Convert database row to OriginalDocument domain object
    fn row_to_document(&self, row: &sqlx::sqlite::SqliteRow) -> Result<OriginalDocument, DocumentRepositoryError> {
        let document_uuid: String = row.try_get("document_uuid")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get document_uuid: {}", e)))?;

        let project_id: i64 = row.try_get("project_id")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get project_id: {}", e)))?;

        let file_path: String = row.try_get("file_path")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get file_path: {}", e)))?;

        let file_name: String = row.try_get("file_name")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get file_name: {}", e)))?;

        let file_size_bytes: i64 = row.try_get("file_size_bytes")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get file_size_bytes: {}", e)))?;

        let file_type: String = row.try_get("file_type")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get file_type: {}", e)))?;

        let created_at: DateTime<Utc> = row.try_get("created_at")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get created_at: {}", e)))?;

        let modified_at: DateTime<Utc> = row.try_get("modified_at")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get modified_at: {}", e)))?;

        let checksum: String = row.try_get("checksum")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get checksum: {}", e)))?;

        // Parse domain objects from database values
        let document_id = DocumentId::from_string(&document_uuid)
            .map_err(|e| DocumentRepositoryError::Domain(format!("Invalid document_uuid: {}", e)))?;

        let project_id = ProjectId::from_i64(project_id);

        let file_path = FilePath::new(std::path::PathBuf::from(&file_path))
            .map_err(|e| DocumentRepositoryError::Domain(format!("Invalid file_path: {}", e)))?;

        let file_type = DocumentType::from_string(&file_type)
            .map_err(|e| DocumentRepositoryError::Domain(format!("Invalid file_type: {}", e)))?;

        Ok(OriginalDocument::with_id(
            document_id,
            project_id,
            file_path,
            file_name,
            file_size_bytes as u64,
            file_type,
            created_at,
            modified_at,
            checksum,
        ))
    }

    /// Build WHERE clause from search criteria
    fn build_search_where_clause(&self, criteria: &DocumentSearchCriteria) -> (String, Vec<sqlx::Value<'_>>) {
        let mut conditions = Vec::new();
        let mut params: Vec<sqlx::Value<'_>> = Vec::new();

        // Project ID is required
        conditions.push("project_id = ?".to_string());
        params.push(sqlx::Value::from(criteria.project_id.as_str()));

        // File types filter
        if let Some(ref file_types) = criteria.file_types {
            if !file_types.is_empty() {
                let placeholders: Vec<String> = (0..file_types.len())
                    .map(|i| format!("?{}", params.len() + i + 1))
                    .collect();
                conditions.push(format!("file_type IN ({})", placeholders.join(", ")));
                for file_type in file_types {
                    params.push(sqlx::Value::from(file_type.to_string()));
                }
            }
        }

        // Name pattern filter
        if let Some(ref pattern) = criteria.name_pattern {
            conditions.push("file_name LIKE ?".to_string());
            params.push(sqlx::Value::from(format!("%{}%", pattern)));
        }

        // Size filters
        if let Some(min_size) = criteria.min_size {
            conditions.push("file_size_bytes >= ?".to_string());
            params.push(sqlx::Value::from(min_size as i64));
        }

        if let Some(max_size) = criteria.max_size {
            conditions.push("file_size_bytes <= ?".to_string());
            params.push(sqlx::Value::from(max_size as i64));
        }

        // Created date filters
        if let Some(created_after) = criteria.created_after {
            conditions.push("created_at > ?".to_string());
            params.push(sqlx::Value::from(created_after));
        }

        if let Some(created_before) = criteria.created_before {
            conditions.push("created_at < ?".to_string());
            params.push(sqlx::Value::from(created_before));
        }

        // Modified date filters
        if let Some(modified_after) = criteria.modified_after {
            conditions.push("modified_at > ?".to_string());
            params.push(sqlx::Value::from(modified_after));
        }

        if let Some(modified_before) = criteria.modified_before {
            conditions.push("modified_at < ?".to_string());
            params.push(sqlx::Value::from(modified_before));
        }

        // Extractable only filter
        if criteria.extractable_only {
            conditions.push("file_size_bytes <= ?".to_string());
            params.push(sqlx::Value::from(DocumentType::max_size_bytes() as i64));
        }

        let where_clause = if conditions.is_empty() {
            "1=1".to_string()
        } else {
            conditions.join(" AND ")
        };

        (where_clause, params)
    }

    /// Build ORDER BY clause from sort criteria
    fn build_order_clause(&self, sort_by: &DocumentSortBy, sort_order: &SortOrder) -> String {
        let column = match sort_by {
            DocumentSortBy::FileName => "file_name",
            DocumentSortBy::FileSize => "file_size_bytes",
            DocumentSortBy::FileType => "file_type",
            DocumentSortBy::CreatedAt => "created_at",
            DocumentSortBy::ModifiedAt => "modified_at",
        };

        let order = match sort_order {
            SortOrder::Ascending => "ASC",
            SortOrder::Descending => "DESC",
        };

        format!("ORDER BY {} {}", column, order)
    }
}

#[async_trait]
impl DocumentRepository for SqliteDocumentRepository {
    type Error = DocumentRepositoryError;

    async fn find_by_id(&self, id: &DocumentId) -> Result<Option<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE document_uuid = ?
        "#;

        let row = sqlx::query(query)
            .bind(id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find document by ID: {}", e)))?;

        match row {
            Some(row) => Ok(Some(self.row_to_document(&row)?)),
            None => Ok(None),
        }
    }

    async fn find_by_project(&self, project_id: &ProjectId) -> Result<Vec<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ?
            ORDER BY file_name ASC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find documents by project: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_by_path(&self, path: &FilePath) -> Result<Option<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE file_path = ?
        "#;

        let row = sqlx::query(query)
            .bind(path.as_str())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find document by path: {}", e)))?;

        match row {
            Some(row) => Ok(Some(self.row_to_document(&row)?)),
            None => Ok(None),
        }
    }

    async fn find_by_type(
        &self,
        project_id: &ProjectId,
        file_type: &DocumentType,
    ) -> Result<Vec<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND file_type = ?
            ORDER BY file_name ASC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(file_type.to_string())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find documents by type: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_by_name_pattern(
        &self,
        project_id: &ProjectId,
        pattern: &str,
    ) -> Result<Vec<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND file_name LIKE ?
            ORDER BY file_name ASC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(format!("%{}%", pattern))
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find documents by name pattern: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_extractable_documents(
        &self,
        project_id: &ProjectId,
    ) -> Result<Vec<OriginalDocument>, Self::Error> {
        let max_size = DocumentType::max_size_bytes() as i64;
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND file_size_bytes <= ?
            ORDER BY file_name ASC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(max_size)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find extractable documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_modified_since(
        &self,
        project_id: &ProjectId,
        since: &DateTime<Utc>,
    ) -> Result<Vec<OriginalDocument>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND modified_at > ?
            ORDER BY modified_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(since)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find modified documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn save(&self, document: &OriginalDocument) -> Result<(), Self::Error> {
        let query = r#"
            INSERT INTO original_documents
            (document_uuid, project_id, file_path, file_name, file_size_bytes, file_type,
             created_at, modified_at, checksum)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(document_uuid) DO UPDATE SET
                file_path = excluded.file_path,
                file_name = excluded.file_name,
                file_size_bytes = excluded.file_size_bytes,
                file_type = excluded.file_type,
                modified_at = excluded.modified_at,
                checksum = excluded.checksum
        "#;

        sqlx::query(query)
            .bind(document.document_id().to_string())
            .bind(document.project_id().as_str())
            .bind(document.file_path().as_str())
            .bind(document.file_name())
            .bind(document.file_size_bytes() as i64)
            .bind(document.file_type().to_string())
            .bind(document.created_at())
            .bind(document.modified_at())
            .bind(document.checksum())
            .execute(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to save document: {}", e)))?;

        Ok(())
    }

    async fn save_batch(&self, documents: &[OriginalDocument]) -> Result<(), Self::Error> {
        if documents.is_empty() {
            return Ok(());
        }

        let mut tx = self.pool.begin()
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to start transaction: {}", e)))?;

        let query = r#"
            INSERT INTO original_documents
            (document_uuid, project_id, file_path, file_name, file_size_bytes, file_type,
             created_at, modified_at, checksum)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(document_uuid) DO UPDATE SET
                file_path = excluded.file_path,
                file_name = excluded.file_name,
                file_size_bytes = excluded.file_size_bytes,
                file_type = excluded.file_type,
                modified_at = excluded.modified_at,
                checksum = excluded.checksum
        "#;

        for document in documents {
            sqlx::query(query)
                .bind(document.document_id().to_string())
                .bind(document.project_id().as_str())
                .bind(document.file_path().as_str())
                .bind(document.file_name())
                .bind(document.file_size_bytes() as i64)
                .bind(document.file_type().to_string())
                .bind(document.created_at())
                .bind(document.modified_at())
                .bind(document.checksum())
                .execute(&mut *tx)
                .await
                .map_err(|e| DocumentRepositoryError::Database(format!("Failed to save document in batch: {}", e)))?;
        }

        tx.commit()
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to commit batch transaction: {}", e)))?;

        Ok(())
    }

    async fn delete(&self, id: &DocumentId) -> Result<bool, Self::Error> {
        let query = "DELETE FROM original_documents WHERE document_uuid = ?";

        let result = sqlx::query(query)
            .bind(id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to delete document: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = "DELETE FROM original_documents WHERE project_id = ?";

        let result = sqlx::query(query)
            .bind(project_id.as_str())
            .execute(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to delete documents by project: {}", e)))?;

        Ok(result.rows_affected() as usize)
    }

    async fn exists(&self, id: &DocumentId) -> Result<bool, Self::Error> {
        let query = "SELECT 1 FROM original_documents WHERE document_uuid = ? LIMIT 1";

        let result = sqlx::query(query)
            .bind(id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to check document existence: {}", e)))?;

        Ok(result.is_some())
    }

    async fn exists_at_path(&self, path: &FilePath) -> Result<bool, Self::Error> {
        let query = "SELECT 1 FROM original_documents WHERE file_path = ? LIMIT 1";

        let result = sqlx::query(query)
            .bind(path.as_str())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to check document path existence: {}", e)))?;

        Ok(result.is_some())
    }

    async fn count_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = "SELECT COUNT(*) as count FROM original_documents WHERE project_id = ?";

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to count documents by project: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }

    async fn count_by_type(
        &self,
        project_id: &ProjectId,
        file_type: &DocumentType,
    ) -> Result<usize, Self::Error> {
        let query = "SELECT COUNT(*) as count FROM original_documents WHERE project_id = ? AND file_type = ?";

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(file_type.to_string())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to count documents by type: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }

    async fn total_size_by_project(&self, project_id: &ProjectId) -> Result<u64, Self::Error> {
        let query = "SELECT COALESCE(SUM(file_size_bytes), 0) as total_size FROM original_documents WHERE project_id = ?";

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get total size by project: {}", e)))?;

        let total_size: i64 = row.try_get("total_size")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get total_size: {}", e)))?;

        Ok(total_size as u64)
    }

    async fn find_duplicates(&self, project_id: &ProjectId) -> Result<Vec<Vec<OriginalDocument>>, Self::Error> {
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND checksum IN (
                SELECT checksum
                FROM original_documents
                WHERE project_id = ?
                GROUP BY checksum
                HAVING COUNT(*) > 1
            )
            ORDER BY checksum, file_name
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(project_id.as_str())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to find duplicate documents: {}", e)))?;

        // Group documents by checksum
        let mut duplicates_map: std::collections::HashMap<String, Vec<OriginalDocument>> = std::collections::HashMap::new();

        for row in rows {
            let document = self.row_to_document(&row)?;
            let checksum = document.checksum().to_string();
            duplicates_map.entry(checksum).or_default().push(document);
        }

        Ok(duplicates_map.into_values().collect())
    }

    async fn update_checksum(
        &self,
        id: &DocumentId,
        new_checksum: String,
        modified_at: DateTime<Utc>,
    ) -> Result<(), Self::Error> {
        let query = r#"
            UPDATE original_documents
            SET checksum = ?, modified_at = ?
            WHERE document_uuid = ?
        "#;

        let result = sqlx::query(query)
            .bind(&new_checksum)
            .bind(&modified_at)
            .bind(id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to update checksum: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(DocumentRepositoryError::NotFound(id.to_string()));
        }

        Ok(())
    }

    async fn list_paginated(
        &self,
        project_id: &ProjectId,
        offset: usize,
        limit: usize,
    ) -> Result<DocumentPage, Self::Error> {
        // Get total count
        let count_query = "SELECT COUNT(*) as count FROM original_documents WHERE project_id = ?";
        let count_row = sqlx::query(count_query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get count for pagination: {}", e)))?;

        let total_count: i64 = count_row.try_get("count")
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        // Get documents for this page
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ?
            ORDER BY file_name ASC
            LIMIT ? OFFSET ?
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to list documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        let has_more = offset + documents.len() < total_count as usize;

        Ok(DocumentPage {
            documents,
            total_count: total_count as usize,
            offset,
            limit,
            has_more,
        })
    }

    async fn search(&self, criteria: &DocumentSearchCriteria) -> Result<Vec<OriginalDocument>, Self::Error> {
        let (where_clause, _params) = self.build_search_where_clause(criteria);
        let order_clause = self.build_order_clause(&criteria.sort_by, &criteria.sort_order);

        let query = format!(
            r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE {}
            {}
            "#,
            where_clause, order_clause
        );

        // Note: This is a simplified implementation. A full implementation would need to properly
        // bind the dynamic parameters. For now, we'll use the basic project filter.
        let rows = sqlx::query(&query)
            .bind(criteria.project_id.as_str())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::Database(format!("Failed to search documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_document(&row)?);
        }

        Ok(documents)
    }
}

/// Error types for SqliteDocumentRepository
#[derive(Debug, thiserror::Error)]
pub enum DocumentRepositoryError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Domain error: {0}")]
    Domain(String),
    #[error("Document not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
}

impl std::error::Error for DocumentRepositoryError {}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;
    use tempfile::tempdir;

    async fn create_test_pool() -> SqlitePool {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let pool = SqlitePool::connect(&format!("sqlite://{}?mode=rwc", db_path.display()))
            .await
            .unwrap();

        // Create the table
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS original_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_uuid TEXT UNIQUE NOT NULL,
                project_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_size_bytes INTEGER NOT NULL,
                file_type TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                modified_at DATETIME NOT NULL,
                checksum TEXT NOT NULL,
                UNIQUE(project_id, file_path)
            );
        "#)
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_save_and_find_document() {
        let pool = create_test_pool().await;
        let repo = SqliteDocumentRepository::new(Arc::new(pool));

        let project_id = ProjectId::new();
        let file_path = FilePath::new_unchecked(std::path::PathBuf::from("/test/document.pdf"));
        let now = Utc::now();

        let document = OriginalDocument::with_id(
            DocumentId::new(),
            project_id.clone(),
            file_path,
            "document.pdf".to_string(),
            1024,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        );

        // Save the document
        repo.save(&document).await.unwrap();

        // Find by ID
        let found = repo.find_by_id(document.document_id()).await.unwrap();
        assert!(found.is_some());
        assert_eq!(found.unwrap().document_id(), document.document_id());

        // Find by project
        let project_docs = repo.find_by_project(&project_id).await.unwrap();
        assert_eq!(project_docs.len(), 1);
        assert_eq!(project_docs[0].document_id(), document.document_id());
    }

    #[tokio::test]
    async fn test_document_exists() {
        let pool = create_test_pool().await;
        let repo = SqliteDocumentRepository::new(Arc::new(pool));

        let project_id = ProjectId::new();
        let file_path = FilePath::new_unchecked(std::path::PathBuf::from("/test/document.pdf"));
        let now = Utc::now();

        let document = OriginalDocument::with_id(
            DocumentId::new(),
            project_id,
            file_path,
            "document.pdf".to_string(),
            1024,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        );

        // Check doesn't exist initially
        assert!(!repo.exists(document.document_id()).await.unwrap());

        // Save and check exists
        repo.save(&document).await.unwrap();
        assert!(repo.exists(document.document_id()).await.unwrap());
    }

    #[tokio::test]
    async fn test_delete_document() {
        let pool = create_test_pool().await;
        let repo = SqliteDocumentRepository::new(Arc::new(pool));

        let project_id = ProjectId::new();
        let file_path = FilePath::new_unchecked(std::path::PathBuf::from("/test/document.pdf"));
        let now = Utc::now();

        let document = OriginalDocument::with_id(
            DocumentId::new(),
            project_id,
            file_path,
            "document.pdf".to_string(),
            1024,
            DocumentType::Pdf,
            now,
            now,
            "checksum123".to_string(),
        );

        // Save and delete
        repo.save(&document).await.unwrap();
        assert!(repo.exists(document.document_id()).await.unwrap());

        let deleted = repo.delete(document.document_id()).await.unwrap();
        assert!(deleted);
        assert!(!repo.exists(document.document_id()).await.unwrap());
    }
}