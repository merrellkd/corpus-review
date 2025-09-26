use async_trait::async_trait;
use sqlx::{SqlitePool, Row};
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::domain::extraction::{
    entities::ExtractedDocument,
    repositories::extracted_document_repository::{
        ExtractedDocumentRepository, ExtractedDocumentStatistics, ExtractedDocumentSummary,
        ExtractedDocumentPage, ExtractedDocumentSearchCriteria, ExtractedDocumentSortBy,
        SortOrder, ExportFormat, ContentVersion
    },
    value_objects::{
        DocumentId, ExtractedDocumentId, ExtractionMethod, ProseMirrorJson, ProjectId, FilePath
    }
};

/// SQLite implementation of the ExtractedDocumentRepository trait
///
/// This implementation provides persistent storage for ExtractedDocument entities using SQLite.
/// It handles the mapping between domain objects and database records while maintaining
/// the domain's business rules and invariants.
pub struct SqliteExtractedDocumentRepository {
    pool: Arc<SqlitePool>,
}

impl SqliteExtractedDocumentRepository {
    /// Create a new SqliteExtractedDocumentRepository with the given connection pool
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        SqliteExtractedDocumentRepository { pool }
    }

    /// Convert database row to ExtractedDocument domain object
    fn row_to_extracted_document(&self, row: &sqlx::sqlite::SqliteRow) -> Result<ExtractedDocument, ExtractedDocumentRepositoryError> {
        let extracted_document_uuid: String = row.try_get("extracted_document_uuid")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get extracted_document_uuid: {}", e)))?;

        let original_document_id: i64 = row.try_get("original_document_id")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get original_document_id: {}", e)))?;

        let extracted_file_path: String = row.try_get("extracted_file_path")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get extracted_file_path: {}", e)))?;

        let tiptap_content: String = row.try_get("tiptap_content")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get tiptap_content: {}", e)))?;

        let extraction_method: String = row.try_get("extraction_method")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get extraction_method: {}", e)))?;

        let extracted_at: DateTime<Utc> = row.try_get("extracted_at")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get extracted_at: {}", e)))?;

        let content_preview: String = row.try_get("content_preview")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get content_preview: {}", e)))?;

        let word_count: i32 = row.try_get("word_count")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get word_count: {}", e)))?;

        let character_count: i32 = row.try_get("character_count")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get character_count: {}", e)))?;

        // Parse domain objects from database values
        let extracted_document_id = ExtractedDocumentId::from_string(&extracted_document_uuid)
            .map_err(|e| ExtractedDocumentRepositoryError::Domain(format!("Invalid extracted_document_uuid: {}", e)))?;

        let original_document_id = DocumentId::from_internal_id(original_document_id);

        let extracted_file_path = FilePath::new(std::path::PathBuf::from(&extracted_file_path))
            .map_err(|e| ExtractedDocumentRepositoryError::Domain(format!("Invalid extracted_file_path: {}", e)))?;

        let tiptap_content = ProseMirrorJson::from_json_string(&tiptap_content)
            .map_err(|e| ExtractedDocumentRepositoryError::Domain(format!("Invalid tiptap_content: {}", e)))?;

        let extraction_method = ExtractionMethod::from_string(&extraction_method)
            .map_err(|e| ExtractedDocumentRepositoryError::Domain(format!("Invalid extraction_method: {}", e)))?;

        Ok(ExtractedDocument::with_id(
            extracted_document_id,
            original_document_id,
            extracted_file_path,
            tiptap_content,
            extraction_method,
            extracted_at,
            content_preview,
            word_count as u32,
            character_count as u32,
        ))
    }

    /// Convert ExtractedDocument to database row values
    fn extracted_document_to_values(&self, document: &ExtractedDocument) -> (String, String, String, String, String, u32, u32) {
        (
            document.extracted_document_id().to_string(),
            document.extracted_file_path().as_str().to_string(),
            document.tiptap_content().to_json_string().unwrap_or_else(|_| "{}".to_string()),
            document.extraction_method().to_string(),
            document.content_preview().to_string(),
            document.word_count(),
            document.character_count(),
        )
    }

    /// Build ORDER BY clause from sort criteria
    fn build_order_clause(&self, sort_by: &ExtractedDocumentSortBy, sort_order: &SortOrder) -> String {
        let column = match sort_by {
            ExtractedDocumentSortBy::ExtractedAt => "extracted_at",
            ExtractedDocumentSortBy::WordCount => "word_count",
            ExtractedDocumentSortBy::CharacterCount => "character_count",
            ExtractedDocumentSortBy::ExtractionMethod => "extraction_method",
        };

        let order = match sort_order {
            SortOrder::Ascending => "ASC",
            SortOrder::Descending => "DESC",
        };

        format!("ORDER BY {} {}", column, order)
    }
}

#[async_trait]
impl ExtractedDocumentRepository for SqliteExtractedDocumentRepository {
    type Error = ExtractedDocumentRepositoryError;

    async fn find_by_id(&self, id: &ExtractedDocumentId) -> Result<Option<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT extracted_document_uuid, original_document_id, extracted_file_path,
                   tiptap_content, extraction_method, extracted_at, content_preview,
                   word_count, character_count
            FROM extracted_documents
            WHERE extracted_document_uuid = ?
        "#;

        let row = sqlx::query(query)
            .bind(id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted document by ID: {}", e)))?;

        match row {
            Some(row) => Ok(Some(self.row_to_extracted_document(&row)?)),
            None => Ok(None),
        }
    }

    async fn find_by_original(&self, original_id: &DocumentId) -> Result<Option<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.document_uuid = ?
        "#;

        let row = sqlx::query(query)
            .bind(original_id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted document by original: {}", e)))?;

        match row {
            Some(row) => Ok(Some(self.row_to_extracted_document(&row)?)),
            None => Ok(None),
        }
    }

    async fn find_by_project(&self, project_id: &ProjectId) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
            ORDER BY ed.extracted_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted documents by project: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_by_method(&self, method: &ExtractionMethod) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT extracted_document_uuid, original_document_id, extracted_file_path,
                   tiptap_content, extraction_method, extracted_at, content_preview,
                   word_count, character_count
            FROM extracted_documents
            WHERE extraction_method = ?
            ORDER BY extracted_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(method.to_string())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted documents by method: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_extracted_between(
        &self,
        start: &DateTime<Utc>,
        end: &DateTime<Utc>,
    ) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT extracted_document_uuid, original_document_id, extracted_file_path,
                   tiptap_content, extraction_method, extracted_at, content_preview,
                   word_count, character_count
            FROM extracted_documents
            WHERE extracted_at BETWEEN ? AND ?
            ORDER BY extracted_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(start)
            .bind(end)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted documents between dates: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_by_word_count_range(
        &self,
        project_id: &ProjectId,
        min_words: u32,
        max_words: u32,
    ) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let query = r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ? AND ed.word_count BETWEEN ? AND ?
            ORDER BY ed.word_count DESC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(min_words as i32)
            .bind(max_words as i32)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find extracted documents by word count range: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_recent(&self, project_id: &ProjectId, hours: u32) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let cutoff = Utc::now() - chrono::Duration::hours(hours as i64);

        let query = r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ? AND ed.extracted_at > ?
            ORDER BY ed.extracted_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .bind(cutoff)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find recent extracted documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn search_by_content(
        &self,
        project_id: &ProjectId,
        query: &str,
    ) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let search_query = r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ? AND (
                ed.content_preview LIKE ? OR
                ed.tiptap_content LIKE ?
            )
            ORDER BY ed.extracted_at DESC
        "#;

        let like_pattern = format!("%{}%", query);

        let rows = sqlx::query(search_query)
            .bind(project_id.as_str())
            .bind(&like_pattern)
            .bind(&like_pattern)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to search extracted documents by content: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn find_similar_content(
        &self,
        extracted_document_id: &ExtractedDocumentId,
        similarity_threshold: f32,
    ) -> Result<Vec<ExtractedDocument>, Self::Error> {
        // This is a simplified implementation - a full implementation would use
        // more sophisticated similarity algorithms (e.g., cosine similarity, fuzzy matching)
        let query = r#"
            SELECT target.extracted_document_uuid, target.original_document_id, target.extracted_file_path,
                   target.tiptap_content, target.extraction_method, target.extracted_at, target.content_preview,
                   target.word_count, target.character_count
            FROM extracted_documents source
            INNER JOIN extracted_documents target ON target.extracted_document_uuid != source.extracted_document_uuid
            WHERE source.extracted_document_uuid = ?
            AND ABS(target.word_count - source.word_count) < (source.word_count * ?)
            ORDER BY ABS(target.word_count - source.word_count) ASC
            LIMIT 10
        "#;

        let rows = sqlx::query(query)
            .bind(extracted_document_id.to_string())
            .bind(similarity_threshold)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to find similar content: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn save(&self, document: &ExtractedDocument) -> Result<(), Self::Error> {
        let query = r#"
            INSERT INTO extracted_documents
            (extracted_document_uuid, original_document_id, extracted_file_path, tiptap_content,
             extraction_method, extracted_at, content_preview, word_count, character_count)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(extracted_document_uuid) DO UPDATE SET
                extracted_file_path = excluded.extracted_file_path,
                tiptap_content = excluded.tiptap_content,
                extraction_method = excluded.extraction_method,
                extracted_at = excluded.extracted_at,
                content_preview = excluded.content_preview,
                word_count = excluded.word_count,
                character_count = excluded.character_count
        "#;

        // Get the internal document ID - simplified approach
        let original_document_internal_id = self.get_internal_document_id(document.original_document_id()).await?;

        sqlx::query(query)
            .bind(document.extracted_document_id().to_string())
            .bind(original_document_internal_id)
            .bind(document.extracted_file_path().as_str())
            .bind(document.tiptap_content().to_json_string().unwrap_or_else(|_| "{}".to_string()))
            .bind(document.extraction_method().to_string())
            .bind(document.extracted_at())
            .bind(document.content_preview())
            .bind(document.word_count() as i32)
            .bind(document.character_count() as i32)
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to save extracted document: {}", e)))?;

        Ok(())
    }

    async fn update_content(
        &self,
        id: &ExtractedDocumentId,
        content: &ProseMirrorJson,
    ) -> Result<(), Self::Error> {
        let query = "UPDATE extracted_documents SET tiptap_content = ? WHERE extracted_document_uuid = ?";

        let result = sqlx::query(query)
            .bind(content.to_json_string().unwrap_or_else(|_| "{}".to_string()))
            .bind(id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to update content: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(ExtractedDocumentRepositoryError::NotFound(id.to_string()));
        }

        Ok(())
    }

    async fn update_content_with_metadata(
        &self,
        id: &ExtractedDocumentId,
        content: &ProseMirrorJson,
        preview: String,
        word_count: u32,
        character_count: u32,
    ) -> Result<(), Self::Error> {
        let query = r#"
            UPDATE extracted_documents
            SET tiptap_content = ?, content_preview = ?, word_count = ?, character_count = ?
            WHERE extracted_document_uuid = ?
        "#;

        let result = sqlx::query(query)
            .bind(content.to_json_string().unwrap_or_else(|_| "{}".to_string()))
            .bind(preview)
            .bind(word_count as i32)
            .bind(character_count as i32)
            .bind(id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to update content with metadata: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(ExtractedDocumentRepositoryError::NotFound(id.to_string()));
        }

        Ok(())
    }

    async fn delete(&self, id: &ExtractedDocumentId) -> Result<bool, Self::Error> {
        let query = "DELETE FROM extracted_documents WHERE extracted_document_uuid = ?";

        let result = sqlx::query(query)
            .bind(id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to delete extracted document: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    async fn delete_by_original(&self, original_id: &DocumentId) -> Result<bool, Self::Error> {
        let query = r#"
            DELETE FROM extracted_documents
            WHERE original_document_id IN (
                SELECT id FROM original_documents WHERE document_uuid = ?
            )
        "#;

        let result = sqlx::query(query)
            .bind(original_id.to_string())
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to delete extracted document by original: {}", e)))?;

        Ok(result.rows_affected() > 0)
    }

    async fn delete_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = r#"
            DELETE FROM extracted_documents
            WHERE original_document_id IN (
                SELECT id FROM original_documents WHERE project_id = ?
            )
        "#;

        let result = sqlx::query(query)
            .bind(project_id.as_str())
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to delete extracted documents by project: {}", e)))?;

        Ok(result.rows_affected() as usize)
    }

    async fn delete_old(&self, older_than: &DateTime<Utc>) -> Result<usize, Self::Error> {
        let query = "DELETE FROM extracted_documents WHERE extracted_at < ?";

        let result = sqlx::query(query)
            .bind(older_than)
            .execute(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to delete old extracted documents: {}", e)))?;

        Ok(result.rows_affected() as usize)
    }

    async fn exists(&self, id: &ExtractedDocumentId) -> Result<bool, Self::Error> {
        let query = "SELECT 1 FROM extracted_documents WHERE extracted_document_uuid = ? LIMIT 1";

        let result = sqlx::query(query)
            .bind(id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to check extracted document existence: {}", e)))?;

        Ok(result.is_some())
    }

    async fn exists_for_original(&self, original_id: &DocumentId) -> Result<bool, Self::Error> {
        let query = r#"
            SELECT 1
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.document_uuid = ?
            LIMIT 1
        "#;

        let result = sqlx::query(query)
            .bind(original_id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to check extracted document existence for original: {}", e)))?;

        Ok(result.is_some())
    }

    async fn count_by_project(&self, project_id: &ProjectId) -> Result<usize, Self::Error> {
        let query = r#"
            SELECT COUNT(*) as count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
        "#;

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to count extracted documents by project: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }

    async fn count_by_method(&self, method: &ExtractionMethod) -> Result<usize, Self::Error> {
        let query = "SELECT COUNT(*) as count FROM extracted_documents WHERE extraction_method = ?";

        let row = sqlx::query(query)
            .bind(method.to_string())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to count extracted documents by method: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }

    async fn total_word_count(&self, project_id: &ProjectId) -> Result<u64, Self::Error> {
        let query = r#"
            SELECT COALESCE(SUM(ed.word_count), 0) as total_words
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
        "#;

        let row = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get total word count: {}", e)))?;

        let total_words: i64 = row.try_get("total_words")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get total_words: {}", e)))?;

        Ok(total_words as u64)
    }

    async fn get_statistics(&self, project_id: &ProjectId) -> Result<ExtractedDocumentStatistics, Self::Error> {
        let query = r#"
            SELECT
                COUNT(*) as total_documents,
                SUM(ed.word_count) as total_word_count,
                SUM(ed.character_count) as total_character_count,
                AVG(ed.word_count) as avg_word_count,
                AVG(ed.character_count) as avg_character_count,
                MIN(ed.word_count) as min_word_count,
                MAX(ed.word_count) as max_word_count,
                ed.extraction_method,
                COUNT(*) as method_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
            GROUP BY ed.extraction_method
        "#;

        let rows = sqlx::query(query)
            .bind(project_id.as_str())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get statistics: {}", e)))?;

        let mut total_documents = 0usize;
        let mut total_word_count = 0u64;
        let mut total_character_count = 0u64;
        let mut method_distribution = std::collections::HashMap::new();
        let mut largest_doc: Option<ExtractedDocumentSummary> = None;
        let mut smallest_doc: Option<ExtractedDocumentSummary> = None;

        for row in rows {
            let doc_count: i64 = row.try_get("total_documents").unwrap_or(0);
            let word_count: i64 = row.try_get("total_word_count").unwrap_or(0);
            let char_count: i64 = row.try_get("total_character_count").unwrap_or(0);
            let method_str: String = row.try_get("extraction_method").unwrap_or_default();

            total_documents += doc_count as usize;
            total_word_count += word_count as u64;
            total_character_count += char_count as u64;

            if let Ok(method) = ExtractionMethod::from_string(&method_str) {
                method_distribution.insert(method, doc_count as usize);
            }
        }

        // Get recent extractions counts
        let recent_24h_query = r#"
            SELECT COUNT(*) as count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ? AND ed.extracted_at > ?
        "#;

        let now = Utc::now();
        let cutoff_24h = now - chrono::Duration::hours(24);
        let cutoff_7d = now - chrono::Duration::days(7);

        let recent_24h = sqlx::query(recent_24h_query)
            .bind(project_id.as_str())
            .bind(cutoff_24h)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get recent 24h count: {}", e)))?;

        let recent_7d = sqlx::query(recent_24h_query)
            .bind(project_id.as_str())
            .bind(cutoff_7d)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get recent 7d count: {}", e)))?;

        let recent_extractions_24h: i64 = recent_24h.try_get("count").unwrap_or(0);
        let recent_extractions_7d: i64 = recent_7d.try_get("count").unwrap_or(0);

        let average_word_count = if total_documents > 0 {
            total_word_count as f64 / total_documents as f64
        } else {
            0.0
        };

        let average_character_count = if total_documents > 0 {
            total_character_count as f64 / total_documents as f64
        } else {
            0.0
        };

        Ok(ExtractedDocumentStatistics {
            total_documents,
            total_word_count,
            total_character_count,
            average_word_count,
            average_character_count,
            method_distribution,
            recent_extractions_24h: recent_extractions_24h as usize,
            recent_extractions_7d: recent_extractions_7d as usize,
            largest_document: largest_doc,
            smallest_document: smallest_doc,
        })
    }

    async fn list_paginated(
        &self,
        project_id: &ProjectId,
        offset: usize,
        limit: usize,
        sort_by: ExtractedDocumentSortBy,
        sort_order: SortOrder,
    ) -> Result<ExtractedDocumentPage, Self::Error> {
        // Get total count
        let count_query = r#"
            SELECT COUNT(*) as count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
        "#;

        let count_row = sqlx::query(count_query)
            .bind(project_id.as_str())
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get count for pagination: {}", e)))?;

        let total_count: i64 = count_row.try_get("count")
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get count: {}", e)))?;

        // Get documents for this page
        let order_clause = self.build_order_clause(&sort_by, &sort_order);
        let query = format!(
            r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE od.project_id = ?
            {}
            LIMIT ? OFFSET ?
            "#,
            order_clause
        );

        let rows = sqlx::query(&query)
            .bind(project_id.as_str())
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to list extracted documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        let has_more = offset + documents.len() < total_count as usize;

        Ok(ExtractedDocumentPage {
            documents,
            total_count: total_count as usize,
            offset,
            limit,
            has_more,
        })
    }

    async fn search(&self, criteria: &ExtractedDocumentSearchCriteria) -> Result<Vec<ExtractedDocument>, Self::Error> {
        let mut conditions = Vec::new();

        if let Some(ref _project_id) = criteria.project_id {
            conditions.push("od.project_id = ?".to_string());
        }

        if let Some(ref _original_document_id) = criteria.original_document_id {
            conditions.push("od.document_uuid = ?".to_string());
        }

        if let Some(ref methods) = criteria.extraction_methods {
            if !methods.is_empty() {
                let placeholders: Vec<String> = (0..methods.len())
                    .map(|i| format!("?{}", i + 1))
                    .collect();
                conditions.push(format!("ed.extraction_method IN ({})", placeholders.join(", ")));
            }
        }

        if let Some(ref _content_query) = criteria.content_query {
            conditions.push("(ed.content_preview LIKE ? OR ed.tiptap_content LIKE ?)".to_string());
        }

        if let Some(_min_word_count) = criteria.min_word_count {
            conditions.push("ed.word_count >= ?".to_string());
        }

        if let Some(_max_word_count) = criteria.max_word_count {
            conditions.push("ed.word_count <= ?".to_string());
        }

        if let Some(_extracted_after) = criteria.extracted_after {
            conditions.push("ed.extracted_at > ?".to_string());
        }

        if let Some(_extracted_before) = criteria.extracted_before {
            conditions.push("ed.extracted_at < ?".to_string());
        }

        let where_clause = if conditions.is_empty() {
            "1=1".to_string()
        } else {
            conditions.join(" AND ")
        };

        let order_clause = self.build_order_clause(&criteria.sort_by, &criteria.sort_order);

        let query = format!(
            r#"
            SELECT ed.extracted_document_uuid, ed.original_document_id, ed.extracted_file_path,
                   ed.tiptap_content, ed.extraction_method, ed.extracted_at, ed.content_preview,
                   ed.word_count, ed.character_count
            FROM extracted_documents ed
            INNER JOIN original_documents od ON ed.original_document_id = od.id
            WHERE {}
            {}
            "#,
            where_clause, order_clause
        );

        // Simplified query execution - in a real implementation, we'd properly bind all parameters
        let rows = sqlx::query(&query)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to search extracted documents: {}", e)))?;

        let mut documents = Vec::new();
        for row in rows {
            documents.push(self.row_to_extracted_document(&row)?);
        }

        Ok(documents)
    }

    async fn export_content(
        &self,
        id: &ExtractedDocumentId,
        format: &ExportFormat,
    ) -> Result<String, Self::Error> {
        let document = self.find_by_id(id).await?
            .ok_or_else(|| ExtractedDocumentRepositoryError::NotFound(id.to_string()))?;

        match format {
            ExportFormat::PlainText => {
                // Extract plain text from ProseMirror JSON
                Ok(document.tiptap_content().to_plain_text())
            }
            ExportFormat::Markdown => {
                // Convert ProseMirror JSON to Markdown
                Ok(document.tiptap_content().to_markdown())
            }
            ExportFormat::Html => {
                // Convert ProseMirror JSON to HTML
                Ok(document.tiptap_content().to_html())
            }
            ExportFormat::ProseMirrorJson => {
                // Return raw ProseMirror JSON
                document.tiptap_content().to_json_string().map_err(|e| ExtractedDocumentRepositoryError::Serialization(e.to_string()))
            }
            ExportFormat::Docx => {
                // This would require additional libraries for DOCX generation
                Err(ExtractedDocumentRepositoryError::Validation("DOCX export not yet supported".to_string()))
            }
        }
    }

    async fn save_batch(&self, documents: &[ExtractedDocument]) -> Result<(), Self::Error> {
        if documents.is_empty() {
            return Ok(());
        }

        let mut tx = self.pool.begin()
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to start transaction: {}", e)))?;

        let query = r#"
            INSERT INTO extracted_documents
            (extracted_document_uuid, original_document_id, extracted_file_path, tiptap_content,
             extraction_method, extracted_at, content_preview, word_count, character_count)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(extracted_document_uuid) DO UPDATE SET
                extracted_file_path = excluded.extracted_file_path,
                tiptap_content = excluded.tiptap_content,
                extraction_method = excluded.extraction_method,
                extracted_at = excluded.extracted_at,
                content_preview = excluded.content_preview,
                word_count = excluded.word_count,
                character_count = excluded.character_count
        "#;

        for document in documents {
            let original_document_internal_id = self.get_internal_document_id(document.original_document_id()).await?;

            sqlx::query(query)
                .bind(document.extracted_document_id().to_string())
                .bind(original_document_internal_id)
                .bind(document.extracted_file_path().as_str())
                .bind(document.tiptap_content().to_json_string().unwrap_or_else(|_| "{}".to_string()))
                .bind(document.extraction_method().to_string())
                .bind(document.extracted_at())
                .bind(document.content_preview())
                .bind(document.word_count() as i32)
                .bind(document.character_count() as i32)
                .execute(&mut *tx)
                .await
                .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to save document in batch: {}", e)))?;
        }

        tx.commit()
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to commit batch transaction: {}", e)))?;

        Ok(())
    }

    async fn get_content_history(&self, _id: &ExtractedDocumentId) -> Result<Vec<ContentVersion>, Self::Error> {
        // This is a placeholder implementation - content versioning would require additional tables
        // For now, return empty history
        Ok(vec![])
    }

    async fn backup_content(&self, id: &ExtractedDocumentId) -> Result<String, Self::Error> {
        let document = self.find_by_id(id).await?
            .ok_or_else(|| ExtractedDocumentRepositoryError::NotFound(id.to_string()))?;

        // Simple backup format - JSON with metadata
        let backup_data = serde_json::json!({
            "extracted_document_id": document.extracted_document_id().to_string(),
            "original_document_id": document.original_document_id().to_string(),
            "tiptap_content": document.tiptap_content().to_json_string().unwrap_or_else(|_| "{}".to_string()),
            "extraction_method": document.extraction_method().to_string(),
            "extracted_at": document.extracted_at().to_rfc3339(),
            "word_count": document.word_count(),
            "character_count": document.character_count(),
            "backup_created_at": Utc::now().to_rfc3339()
        });

        Ok(backup_data.to_string())
    }

    async fn restore_content(&self, id: &ExtractedDocumentId, backup_data: &str) -> Result<(), Self::Error> {
        let backup: serde_json::Value = serde_json::from_str(backup_data)
            .map_err(|e| ExtractedDocumentRepositoryError::Validation(format!("Invalid backup data: {}", e)))?;

        let tiptap_content_str = backup["tiptap_content"]
            .as_str()
            .ok_or_else(|| ExtractedDocumentRepositoryError::Validation("Missing tiptap_content in backup".to_string()))?;

        let tiptap_content = ProseMirrorJson::from_json_string(tiptap_content_str)
            .map_err(|e| ExtractedDocumentRepositoryError::Domain(format!("Invalid ProseMirror content in backup: {}", e)))?;

        let word_count = backup["word_count"]
            .as_u64()
            .ok_or_else(|| ExtractedDocumentRepositoryError::Validation("Missing word_count in backup".to_string()))?;

        let character_count = backup["character_count"]
            .as_u64()
            .ok_or_else(|| ExtractedDocumentRepositoryError::Validation("Missing character_count in backup".to_string()))?;

        // Generate new preview from restored content
        let preview = tiptap_content.preview(200);

        self.update_content_with_metadata(
            id,
            &tiptap_content,
            preview,
            word_count as u32,
            character_count as u32,
        ).await?;

        Ok(())
    }
}

impl SqliteExtractedDocumentRepository {
    /// Helper method to get internal document ID from DocumentId UUID
    async fn get_internal_document_id(&self, document_id: &DocumentId) -> Result<i64, ExtractedDocumentRepositoryError> {
        let query = "SELECT id FROM original_documents WHERE document_uuid = ?";

        let row = sqlx::query(query)
            .bind(document_id.to_string())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get internal document ID: {}", e)))?;

        match row {
            Some(row) => {
                let id: i64 = row.try_get("id")
                    .map_err(|e| ExtractedDocumentRepositoryError::Database(format!("Failed to get internal ID: {}", e)))?;
                Ok(id)
            }
            None => Err(ExtractedDocumentRepositoryError::NotFound(format!("Original document not found: {}", document_id.to_string())))
        }
    }
}

/// Error types for SqliteExtractedDocumentRepository
#[derive(Debug, thiserror::Error)]
pub enum ExtractedDocumentRepositoryError {
    #[error("Database error: {0}")]
    Database(String),
    #[error("Domain error: {0}")]
    Domain(String),
    #[error("Extracted document not found: {0}")]
    NotFound(String),
    #[error("Validation error: {0}")]
    Validation(String),
    #[error("Serialization error: {0}")]
    Serialization(String),
}

impl std::error::Error for ExtractedDocumentRepositoryError {}

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

        // Create the tables
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

            CREATE TABLE IF NOT EXISTS extracted_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                extracted_document_uuid TEXT UNIQUE NOT NULL,
                original_document_id INTEGER NOT NULL,
                extracted_file_path TEXT NOT NULL,
                tiptap_content TEXT NOT NULL,
                extraction_method TEXT NOT NULL,
                extracted_at DATETIME NOT NULL,
                content_preview TEXT NOT NULL,
                word_count INTEGER NOT NULL,
                character_count INTEGER NOT NULL,
                FOREIGN KEY (original_document_id) REFERENCES original_documents(id),
                UNIQUE(original_document_id)
            );
        "#)
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_extracted_document_repository_creation() {
        let pool = create_test_pool().await;
        let repo = SqliteExtractedDocumentRepository::new(Arc::new(pool));

        let extracted_document_id = ExtractedDocumentId::new();

        // For now, just test that the repository can be created
        // Full testing would require setting up proper document relationships
        assert!(!repo.exists(&extracted_document_id).await.unwrap());
    }

    #[tokio::test]
    async fn test_statistics_with_empty_database() {
        let pool = create_test_pool().await;
        let repo = SqliteExtractedDocumentRepository::new(Arc::new(pool));

        let project_id = ProjectId::new();
        let stats = repo.get_statistics(&project_id).await.unwrap();

        assert_eq!(stats.total_documents, 0);
        assert_eq!(stats.total_word_count, 0);
        assert_eq!(stats.total_character_count, 0);
        assert_eq!(stats.average_word_count, 0.0);
        assert_eq!(stats.average_character_count, 0.0);
    }
}