use async_trait::async_trait;
use sqlx::{SqlitePool, Row};
use chrono::{DateTime, Utc};
use std::sync::Arc;

use crate::domain::project::{
    Project, ProjectId, ProjectRepository, RepositoryStats, ProjectError, ProjectResult
};

/// SQLite implementation of the ProjectRepository trait
///
/// This implementation provides persistent storage for Project aggregates using SQLite.
/// It handles the mapping between domain objects and database records while maintaining
/// the domain's business rules and invariants.
pub struct SqliteProjectRepository {
    pool: Arc<SqlitePool>,
}

impl SqliteProjectRepository {
    /// Create a new SqliteProjectRepository with the given connection pool
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        SqliteProjectRepository { pool }
    }

    /// Convert database row to Project domain object
    fn row_to_project(&self, row: &sqlx::sqlite::SqliteRow) -> ProjectResult<Project> {
        let id: String = row.try_get("uuid")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get uuid: {}", e)))?;

        let name: String = row.try_get("name")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get name: {}", e)))?;

        let source_folder: String = row.try_get("source_folder")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get source_folder: {}", e)))?;

        let note: Option<String> = row.try_get("note")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get note: {}", e)))?;

        let created_at: DateTime<Utc> = row.try_get("created_at")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get created_at: {}", e)))?;

        Project::from_data(
            id,
            name,
            source_folder,
            note,
            created_at.to_rfc3339(),
        )
    }
}

#[async_trait]
impl ProjectRepository for SqliteProjectRepository {
    async fn create(&self, project: &Project) -> ProjectResult<()> {
        // Check for duplicate name first
        if self.exists_by_name(project.name().value()).await? {
            return Err(ProjectError::duplicate_name(project.name().value()));
        }

        let query = r#"
            INSERT INTO projects (uuid, name, source_folder, note, created_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
        "#;

        let note_value = project.note().map(|n| n.value());
        let created_at_str = project.created_at().to_string();

        sqlx::query(query)
            .bind(project.id().value())
            .bind(project.name().value())
            .bind(project.source_folder().as_string())
            .bind(note_value)
            .bind(created_at_str)
            .execute(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to create project: {}", e)))?;

        Ok(())
    }

    async fn update(&self, project: &Project) -> ProjectResult<()> {
        let query = r#"
            UPDATE projects
            SET name = ?1, note = ?2
            WHERE uuid = ?3
        "#;

        let note_value = project.note().map(|n| n.value());

        let result = sqlx::query(query)
            .bind(project.name().value())
            .bind(note_value)
            .bind(project.id().value())
            .execute(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to update project: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(ProjectError::not_found(project.id().value()));
        }

        Ok(())
    }

    async fn delete(&self, id: &ProjectId) -> ProjectResult<()> {
        let query = "DELETE FROM projects WHERE uuid = ?1";

        let result = sqlx::query(query)
            .bind(id.value())
            .execute(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to delete project: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(ProjectError::not_found(id.value()));
        }

        Ok(())
    }

    async fn find_by_id(&self, id: &ProjectId) -> ProjectResult<Option<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            WHERE uuid = ?1
        "#;

        let row = sqlx::query(query)
            .bind(id.value())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to find project by id: {}", e)))?;

        match row {
            Some(r) => Ok(Some(self.row_to_project(&r)?)),
            None => Ok(None),
        }
    }

    async fn find_by_name(&self, name: &str) -> ProjectResult<Option<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            WHERE name = ?1 COLLATE NOCASE
        "#;

        let row = sqlx::query(query)
            .bind(name)
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to find project by name: {}", e)))?;

        match row {
            Some(r) => Ok(Some(self.row_to_project(&r)?)),
            None => Ok(None),
        }
    }

    async fn list_all(&self) -> ProjectResult<Vec<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            ORDER BY created_at DESC
        "#;

        let rows = sqlx::query(query)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to list projects: {}", e)))?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(self.row_to_project(&row)?);
        }

        Ok(projects)
    }

    async fn exists_by_id(&self, id: &ProjectId) -> ProjectResult<bool> {
        let query = "SELECT 1 FROM projects WHERE uuid = ?1";

        let exists = sqlx::query(query)
            .bind(id.value())
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to check project existence: {}", e)))?
            .is_some();

        Ok(exists)
    }

    async fn exists_by_name(&self, name: &str) -> ProjectResult<bool> {
        let query = "SELECT 1 FROM projects WHERE name = ?1 COLLATE NOCASE";

        let exists = sqlx::query(query)
            .bind(name)
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to check name existence: {}", e)))?
            .is_some();

        Ok(exists)
    }

    async fn count(&self) -> ProjectResult<usize> {
        let query = "SELECT COUNT(*) as count FROM projects";

        let row = sqlx::query(query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to count projects: {}", e)))?;

        let count: i64 = row.try_get("count")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get count: {}", e)))?;

        Ok(count as usize)
    }

    async fn list_paged(&self, offset: usize, limit: usize) -> ProjectResult<Vec<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            ORDER BY created_at DESC
            LIMIT ?1 OFFSET ?2
        "#;

        let rows = sqlx::query(query)
            .bind(limit as i64)
            .bind(offset as i64)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to list paged projects: {}", e)))?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(self.row_to_project(&row)?);
        }

        Ok(projects)
    }

    async fn search_by_name(&self, pattern: &str) -> ProjectResult<Vec<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            WHERE name LIKE ?1 COLLATE NOCASE
            ORDER BY
                CASE WHEN name LIKE ?2 THEN 1 ELSE 2 END,
                created_at DESC
        "#;

        let like_pattern = format!("%{}%", pattern);
        let exact_pattern = format!("{}%", pattern);

        let rows = sqlx::query(query)
            .bind(&like_pattern)
            .bind(&exact_pattern)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to search projects: {}", e)))?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(self.row_to_project(&row)?);
        }

        Ok(projects)
    }

    async fn find_by_date_range(
        &self,
        start_date: &DateTime<Utc>,
        end_date: &DateTime<Utc>,
    ) -> ProjectResult<Vec<Project>> {
        let query = r#"
            SELECT id, uuid, name, source_folder, note, created_at
            FROM projects
            WHERE created_at BETWEEN ?1 AND ?2
            ORDER BY created_at DESC
        "#;

        let rows = sqlx::query(query)
            .bind(start_date.to_rfc3339())
            .bind(end_date.to_rfc3339())
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to find projects by date range: {}", e)))?;

        let mut projects = Vec::new();
        for row in rows {
            projects.push(self.row_to_project(&row)?);
        }

        Ok(projects)
    }

    async fn health_check(&self) -> ProjectResult<()> {
        let query = "SELECT 1";

        sqlx::query(query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Health check failed: {}", e)))?;

        Ok(())
    }

    async fn get_stats(&self) -> ProjectResult<RepositoryStats> {
        let total_count = self.count().await?;

        if total_count == 0 {
            return Ok(RepositoryStats::empty());
        }

        // Get aggregate statistics
        let stats_query = r#"
            SELECT
                COUNT(*) as total,
                COUNT(note) as with_notes,
                AVG(LENGTH(name)) as avg_name_length,
                MIN(created_at) as oldest_date,
                MAX(created_at) as newest_date
            FROM projects
        "#;

        let stats_row = sqlx::query(stats_query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Failed to get stats: {}", e)))?;

        let total: i64 = stats_row.try_get("total")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get total: {}", e)))?;

        let with_notes: i64 = stats_row.try_get("with_notes")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get with_notes: {}", e)))?;

        let avg_name_length: f64 = stats_row.try_get("avg_name_length")
            .unwrap_or(0.0);

        let oldest_date_str: Option<String> = stats_row.try_get("oldest_date")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get oldest_date: {}", e)))?;

        let newest_date_str: Option<String> = stats_row.try_get("newest_date")
            .map_err(|e| ProjectError::repository_error(format!("Failed to get newest_date: {}", e)))?;

        let oldest_date = oldest_date_str
            .and_then(|s| s.parse::<DateTime<Utc>>().ok());

        let newest_date = newest_date_str
            .and_then(|s| s.parse::<DateTime<Utc>>().ok());

        // Count accessible projects (this is expensive but important for stats)
        let projects = self.list_all().await?;
        let accessible_count = projects.iter()
            .filter(|p| p.is_source_accessible())
            .count();

        // Get database file size (if possible)
        let database_size = self.get_database_size().await.ok();

        Ok(RepositoryStats {
            total_projects: total as usize,
            accessible_projects: accessible_count,
            inaccessible_projects: (total as usize) - accessible_count,
            average_name_length: avg_name_length,
            projects_with_notes: with_notes as usize,
            oldest_project_date: oldest_date,
            newest_project_date: newest_date,
            database_size_bytes: database_size,
        })
    }
}

impl SqliteProjectRepository {
    /// Get the database file size in bytes (SQLite-specific functionality)
    async fn get_database_size(&self) -> Result<u64, sqlx::Error> {
        let query = "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()";

        let row = sqlx::query(query)
            .fetch_one(&*self.pool)
            .await?;

        let size: i64 = row.try_get("size")?;
        Ok(size as u64)
    }

    /// Optimize the database by running VACUUM and ANALYZE
    pub async fn optimize(&self) -> ProjectResult<()> {
        // Run VACUUM to reclaim space
        sqlx::query("VACUUM")
            .execute(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("VACUUM failed: {}", e)))?;

        // Run ANALYZE to update statistics
        sqlx::query("ANALYZE")
            .execute(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("ANALYZE failed: {}", e)))?;

        Ok(())
    }

    /// Check database integrity
    pub async fn integrity_check(&self) -> ProjectResult<Vec<String>> {
        let query = "PRAGMA integrity_check";

        let rows = sqlx::query(query)
            .fetch_all(&*self.pool)
            .await
            .map_err(|e| ProjectError::repository_error(format!("Integrity check failed: {}", e)))?;

        let mut results = Vec::new();
        for row in rows {
            let message: String = row.try_get(0)
                .map_err(|e| ProjectError::repository_error(format!("Failed to get integrity result: {}", e)))?;
            results.push(message);
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use std::fs;
    use tempfile::TempDir;

    async fn setup_test_db() -> (SqlitePool, TempDir) {
        let temp_dir = tempfile::tempdir().expect("Failed to create temp dir");
        let db_path = temp_dir.path().join("test.db");

        let pool = SqlitePoolOptions::new()
            .connect(&format!("sqlite:{}", db_path.to_string_lossy()))
            .await
            .expect("Failed to connect to test database");

        // Run migrations
        let migration = r#"
            CREATE TABLE projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
                source_folder TEXT NOT NULL,
                note TEXT CHECK(length(note) <= 1000),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX idx_projects_uuid ON projects(uuid);
            CREATE INDEX idx_projects_name ON projects(name COLLATE NOCASE);
            CREATE INDEX idx_projects_created_at ON projects(created_at);
        "#;

        sqlx::query(migration)
            .execute(&pool)
            .await
            .expect("Failed to run migrations");

        (pool, temp_dir)
    }

    fn setup_test_folder(name: &str) -> String {
        let test_path = format!("/tmp/sqlite_repo_test_{}", name);
        fs::create_dir_all(&test_path).expect("Failed to create test directory");
        test_path
    }

    fn cleanup_test_folder(path: &str) {
        fs::remove_dir_all(path).ok();
    }

    #[tokio::test]
    async fn test_sqlite_repository_create_and_find() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));
        let test_folder = setup_test_folder("sqlite_create");

        let project = Project::new(
            "SQLite Test Project".to_string(),
            test_folder.clone(),
            Some("Test note".to_string())
        ).unwrap();

        // Test create
        let result = repo.create(&project).await;
        assert!(result.is_ok());

        // Test find by ID
        let found = repo.find_by_id(project.id()).await.unwrap();
        assert!(found.is_some());
        let found_project = found.unwrap();
        assert_eq!(found_project.name().value(), "SQLite Test Project");
        assert!(found_project.note().is_some());
        assert_eq!(found_project.note().unwrap().value(), "Test note");

        // Test find by name
        let found_by_name = repo.find_by_name("SQLite Test Project").await.unwrap();
        assert!(found_by_name.is_some());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_sqlite_repository_duplicate_name_error() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));
        let test_folder = setup_test_folder("sqlite_duplicate");

        let project1 = Project::new(
            "Duplicate SQLite Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        let project2 = Project::new(
            "Duplicate SQLite Project".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // First create should succeed
        assert!(repo.create(&project1).await.is_ok());

        // Second create should fail with duplicate name error
        let result = repo.create(&project2).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ProjectError::DuplicateName { .. }));

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_sqlite_repository_update_and_delete() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));
        let test_folder = setup_test_folder("sqlite_update_delete");

        let mut project = Project::new(
            "SQLite Update Test".to_string(),
            test_folder.clone(),
            None
        ).unwrap();

        // Create project
        repo.create(&project).await.unwrap();

        // Update project
        project.update_name("SQLite Updated Name".to_string()).unwrap();
        project.update_note(Some("Added note".to_string())).unwrap();
        assert!(repo.update(&project).await.is_ok());

        // Verify update
        let found = repo.find_by_id(project.id()).await.unwrap();
        let found_project = found.unwrap();
        assert_eq!(found_project.name().value(), "SQLite Updated Name");
        assert!(found_project.note().is_some());
        assert_eq!(found_project.note().unwrap().value(), "Added note");

        // Delete project
        assert!(repo.delete(project.id()).await.is_ok());

        // Verify deletion
        let found_after_delete = repo.find_by_id(project.id()).await.unwrap();
        assert!(found_after_delete.is_none());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_sqlite_repository_list_and_search() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));
        let test_folder = setup_test_folder("sqlite_list_search");

        // Create multiple projects
        let projects = vec![
            Project::new("SQLite Alpha Project".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("SQLite Beta Project".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("SQLite Gamma Analysis".to_string(), test_folder.clone(), None).unwrap(),
        ];

        for project in &projects {
            repo.create(project).await.unwrap();
        }

        // Test list all
        let all_projects = repo.list_all().await.unwrap();
        assert_eq!(all_projects.len(), 3);

        // Test search
        let search_results = repo.search_by_name("Project").await.unwrap();
        assert_eq!(search_results.len(), 2); // Alpha and Beta

        let analysis_results = repo.search_by_name("Analysis").await.unwrap();
        assert_eq!(analysis_results.len(), 1); // Gamma

        // Test pagination
        let paged_results = repo.list_paged(0, 2).await.unwrap();
        assert_eq!(paged_results.len(), 2);

        let second_page = repo.list_paged(2, 2).await.unwrap();
        assert_eq!(second_page.len(), 1);

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_sqlite_repository_stats() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));
        let test_folder = setup_test_folder("sqlite_stats");

        // Create projects with varying characteristics
        let projects = vec![
            Project::new("Short".to_string(), test_folder.clone(), None).unwrap(),
            Project::new("Medium Length Name".to_string(), test_folder.clone(), Some("With note".to_string())).unwrap(),
            Project::new("Very Long Project Name Indeed".to_string(), test_folder.clone(), Some("Another note here".to_string())).unwrap(),
        ];

        for project in &projects {
            repo.create(project).await.unwrap();
        }

        let stats = repo.get_stats().await.unwrap();

        assert_eq!(stats.total_projects, 3);
        assert_eq!(stats.projects_with_notes, 2);
        assert!(stats.average_name_length > 0.0);
        assert!(stats.oldest_project_date.is_some());
        assert!(stats.newest_project_date.is_some());

        cleanup_test_folder(&test_folder);
    }

    #[tokio::test]
    async fn test_sqlite_repository_health_check() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));

        let result = repo.health_check().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sqlite_repository_optimization() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));

        let result = repo.optimize().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_sqlite_repository_integrity_check() {
        let (pool, _temp_dir) = setup_test_db().await;
        let repo = SqliteProjectRepository::new(Arc::new(pool));

        let result = repo.integrity_check().await;
        assert!(result.is_ok());
        let messages = result.unwrap();
        assert!(!messages.is_empty());
        assert_eq!(messages[0], "ok"); // SQLite returns "ok" for healthy databases
    }
}