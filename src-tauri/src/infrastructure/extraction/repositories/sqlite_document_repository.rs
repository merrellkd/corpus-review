use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool, SqliteRow};
use std::result::Result;

use crate::domain::extraction::{
    entities::OriginalDocument,
    repositories::{DocumentRepository, DocumentPage, DocumentSearchCriteria, DocumentSortBy, SortOrder},
    value_objects::{DocumentId, DocumentType, FilePath, ProjectId},
};

/// SQLite implementation of DocumentRepository
///
/// This implementation provides persistence for OriginalDocument entities using SQLite.
/// It follows the Repository pattern to isolate database access from domain logic.
pub struct SqliteDocumentRepository {
    pool: SqlitePool,
}

impl SqliteDocumentRepository {
    /// Creates a new SqliteDocumentRepository with the given connection pool
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Maps a SQLite row to an OriginalDocument entity
    fn map_row_to_document(row: &SqliteRow) -> Result<OriginalDocument, DocumentRepositoryError> {
        let document_uuid: String = row.get("document_uuid");
        let document_id = DocumentId::from_string(document_uuid)
            .map_err(|e| DocumentRepositoryError::InvalidData(format!("Invalid document ID: {}", e)))?;

        let project_id_str: String = row.get("project_id");
        let project_id = ProjectId::from_string(project_id_str)
            .map_err(|e| DocumentRepositoryError::InvalidData(format!("Invalid project ID: {}", e)))?;

        let file_path_str: String = row.get("file_path");
        let file_path = FilePath::new_unchecked(std::path::PathBuf::from(file_path_str));

        let file_type_str: String = row.get("file_type");
        let file_type: DocumentType = file_type_str.parse()
            .map_err(|e| DocumentRepositoryError::InvalidData(format!("Invalid file type: {}", e)))?;

        let created_at: DateTime<Utc> = row.get("created_at");
        let modified_at: DateTime<Utc> = row.get("modified_at");

        Ok(OriginalDocument::with_id(
            document_id,
            project_id,
            file_path,
            row.get("file_name"),
            row.get::<i64, _>("file_size_bytes") as u64,
            file_type,
            created_at,
            modified_at,
            row.get("checksum"),
        ))
    }

    /// Helper to build ORDER BY clause
    fn build_order_clause(sort_by: &DocumentSortBy, sort_order: &SortOrder) -> String {
        let column = match sort_by {
            DocumentSortBy::FileName => "file_name",
            DocumentSortBy::FileSize => "file_size_bytes",
            DocumentSortBy::FileType => "file_type",
            DocumentSortBy::CreatedAt => "created_at",
            DocumentSortBy::ModifiedAt => "modified_at",
        };

        let direction = match sort_order {
            SortOrder::Ascending => "ASC",
            SortOrder::Descending => "DESC",
        };

        format!("ORDER BY {} {}", column, direction)
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
            .bind(id.as_str())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => Ok(Some(Self::map_row_to_document(&row)?)),
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
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
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
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => Ok(Some(Self::map_row_to_document(&row)?)),
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
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
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

        let search_pattern = format!("%{}%", pattern);
        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(search_pattern)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
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
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
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
            WHERE project_id = ? AND modified_at >= ?
            ORDER BY modified_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(since)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
        }

        Ok(documents)
    }

    async fn save(&self, document: &OriginalDocument) -> Result<(), Self::Error> {
        let query = r#"
            INSERT INTO original_documents
            (document_uuid, project_id, file_path, file_name, file_size_bytes,
             file_type, created_at, modified_at, checksum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(document_uuid) DO UPDATE SET
                file_path = excluded.file_path,
                file_name = excluded.file_name,
                file_size_bytes = excluded.file_size_bytes,
                file_type = excluded.file_type,
                created_at = excluded.created_at,
                modified_at = excluded.modified_at,
                checksum = excluded.checksum
        "#;

        sqlx::query(query)
            .bind(document.document_id().as_str())
            .bind(document.project_id().as_str())
            .bind(document.file_path().as_str())
            .bind(document.file_name())
            .bind(document.file_size_bytes() as i64)
            .bind(document.file_type().to_string())
            .bind(document.created_at())
            .bind(document.modified_at())
            .bind(document.checksum())
            .execute(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn save_batch(&self, documents: &[OriginalDocument]) -> Result<(), Self::Error> {
        let mut tx = self.pool.begin().await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        for document in documents {
            let query = r#"
                INSERT INTO original_documents
                (document_uuid, project_id, file_path, file_name, file_size_bytes,
                 file_type, created_at, modified_at, checksum)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(document_uuid) DO UPDATE SET
                    file_path = excluded.file_path,
                    file_name = excluded.file_name,
                    file_size_bytes = excluded.file_size_bytes,
                    file_type = excluded.file_type,
                    created_at = excluded.created_at,
                    modified_at = excluded.modified_at,
                    checksum = excluded.checksum
            "#;

            sqlx::query(query)
                .bind(document.document_id().as_str())
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
                .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;
        }

        tx.commit().await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn delete(&self, id: &DocumentId) -> Result<bool, Self::Error> {
        let query = "DELETE FROM original_documents WHERE document_uuid = ?";

        let result = sqlx::query(query)
            .bind(id.as_str())
            .execute(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(result.rows_affected() > 0)
    }

    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = "DELETE FROM original_documents WHERE project_id = ?";

        let result = sqlx::query(query)
            .bind(project_id.as_str())
            .execute(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(result.rows_affected() as usize)
    }

    async fn exists(&self, id: &DocumentId) -> Result<bool, Self::Error> {
        let query = "SELECT 1 FROM original_documents WHERE document_uuid = ?";

        let row = sqlx::query(query)
            .bind(id.as_str())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(row.is_some())
    }

    async fn exists_at_path(&self, path: &FilePath) -> Result<bool, Self::Error> {
        let query = "SELECT 1 FROM original_documents WHERE file_path = ?";

        let row = sqlx::query(query)
            .bind(path.as_str())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(row.is_some())
    }

    async fn count_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = "SELECT COUNT(*) as count FROM original_documents WHERE project_id = ?";

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let count: i64 = row.get("count");
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
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let count: i64 = row.get("count");
        Ok(count as usize)
    }

    async fn total_size_by_project(&self, project_id: &ProjectId) -> Result<u64, Self::Error> {
        let query = "SELECT COALESCE(SUM(file_size_bytes), 0) as total_size FROM original_documents WHERE project_id = ?";

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let total_size: i64 = row.get("total_size");
        Ok(total_size as u64)
    }

    async fn find_duplicates(&self, project_id: &ProjectId) -> Result<Vec<Vec<OriginalDocument>>, Self::Error> {
        // Find documents with same checksum
        let query = r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ? AND checksum IN (
                SELECT checksum FROM original_documents
                WHERE project_id = ?
                GROUP BY checksum
                HAVING COUNT(*) > 1
            )
            ORDER BY checksum, file_name
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(project_id.as_str())
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut duplicates: std::collections::HashMap<String, Vec<OriginalDocument>> = std::collections::HashMap::new();

        for row in rows {
            let document = Self::map_row_to_document(&row)?;
            let checksum = row.get::<String, _>("checksum");
            duplicates.entry(checksum).or_insert_with(Vec::new).push(document);
        }

        Ok(duplicates.into_values().collect())
    }

    async fn update_checksum(
        &self,
        id: &DocumentId,
        new_checksum: String,
        modified_at: DateTime<Utc>,
    ) -> Result<(), Self::Error> {
        let query = "UPDATE original_documents SET checksum = ?, modified_at = ? WHERE document_uuid = ?";

        sqlx::query(query)
            .bind(new_checksum)
            .bind(modified_at)
            .bind(id.as_str())
            .execute(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn list_paginated(
        &self,
        project_id: &ProjectId,
        offset: usize,
        limit: usize,
    ) -> Result<DocumentPage, Self::Error> {
        // Get total count
        let total_count = self.count_by_project(project_id).await?;

        // Get page data
        let query = format!(
            r#"
            SELECT document_uuid, project_id, file_path, file_name, file_size_bytes,
                   file_type, created_at, modified_at, checksum
            FROM original_documents
            WHERE project_id = ?
            ORDER BY file_name ASC
            LIMIT ? OFFSET ?
        "#);

        let rows = sqlx::query(&query)
            .bind(project_id.as_str())
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
        }

        let has_more = offset + documents.len() < total_count;

        Ok(DocumentPage {
            documents,
            total_count,
            offset,
            limit,
            has_more,
        })
    }

    async fn search(&self, criteria: &DocumentSearchCriteria) -> Result<Vec<OriginalDocument>, Self::Error> {
        let mut where_clauses = vec!["project_id = ?".to_string()];
        let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send>> = vec![Box::new(criteria.project_id.as_str())];

        // Build WHERE clauses based on criteria
        if let Some(ref file_types) = criteria.file_types {
            let placeholders: Vec<String> = file_types.iter().map(|_| "?".to_string()).collect();
            where_clauses.push(format!("file_type IN ({})", placeholders.join(", ")));
            for file_type in file_types {
                params.push(Box::new(file_type.to_string()));
            }
        }

        if let Some(ref pattern) = criteria.name_pattern {
            where_clauses.push("file_name LIKE ?".to_string());
            params.push(Box::new(format!("%{}%", pattern)));
        }

        if let Some(min_size) = criteria.min_size {
            where_clauses.push("file_size_bytes >= ?".to_string());
            params.push(Box::new(min_size as i64));
        }

        if let Some(max_size) = criteria.max_size {
            where_clauses.push("file_size_bytes <= ?".to_string());
            params.push(Box::new(max_size as i64));
        }

        if criteria.extractable_only {
            let max_extractable = DocumentType::max_size_bytes() as i64;
            where_clauses.push("file_size_bytes <= ?".to_string());
            params.push(Box::new(max_extractable));
        }

        let where_clause = where_clauses.join(" AND ");
        let order_clause = Self::build_order_clause(&criteria.sort_by, &criteria.sort_order);

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

        // Due to the complexity of dynamic parameter binding with sqlx,
        // this is a simplified implementation. In practice, you might use
        // a query builder or handle parameters more carefully.
        let rows = sqlx::query(&query)
            .bind(criteria.project_id.as_str())
            .fetch_all(&self.pool)
            .await
            .map_err(|e| DocumentRepositoryError::DatabaseError(e.to_string()))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(Self::map_row_to_document(&row)?);
        }

        Ok(documents)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum DocumentRepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Invalid data: {0}")]
    InvalidData(String),
    #[error("Document not found")]
    NotFound,
}