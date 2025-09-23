use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Sqlite, Row};
use std::collections::HashMap;

use crate::domains::workspace::domain::workspace::{Workspace, WorkspaceId};

/// Error types for workspace repository operations
#[derive(Debug, thiserror::Error)]
pub enum WorkspaceRepositoryError {
    #[error("Database error: {0}")]
    DatabaseError(#[from] sqlx::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Workspace not found: {0}")]
    NotFound(String),

    #[error("Workspace already exists: {0}")]
    AlreadyExists(String),

    #[error("Invalid workspace data: {0}")]
    InvalidData(String),
}

/// Repository trait for workspace persistence
#[async_trait]
pub trait WorkspaceRepository {
    async fn save(&self, workspace: &Workspace) -> Result<(), WorkspaceRepositoryError>;
    async fn find_by_id(&self, id: &WorkspaceId) -> Result<Option<Workspace>, WorkspaceRepositoryError>;
    async fn find_by_name(&self, name: &str) -> Result<Option<Workspace>, WorkspaceRepositoryError>;
    async fn list_all(&self) -> Result<Vec<Workspace>, WorkspaceRepositoryError>;
    async fn delete(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError>;
    async fn exists(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError>;
    async fn count(&self) -> Result<i64, WorkspaceRepositoryError>;
}

/// SQLite implementation of workspace repository
pub struct SqliteWorkspaceRepository {
    pool: Pool<Sqlite>,
}

impl SqliteWorkspaceRepository {
    pub fn new(pool: Pool<Sqlite>) -> Self {
        Self { pool }
    }

    /// Initialize database tables for workspace storage
    pub async fn migrate(&self) -> Result<(), WorkspaceRepositoryError> {
        // Create workspaces table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                layout_mode TEXT NOT NULL,
                workspace_size_width REAL NOT NULL,
                workspace_size_height REAL NOT NULL,
                document_count INTEGER NOT NULL DEFAULT 0,
                active_document_id TEXT,
                created_at TEXT NOT NULL,
                last_modified TEXT NOT NULL,
                UNIQUE(name)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create workspace_snapshots table for backup/restore functionality
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS workspace_snapshots (
                id TEXT PRIMARY KEY NOT NULL,
                workspace_id TEXT NOT NULL,
                snapshot_name TEXT NOT NULL,
                description TEXT,
                snapshot_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                tags TEXT,
                FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_workspaces_last_modified ON workspaces(last_modified)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_snapshots_workspace_id ON workspace_snapshots(workspace_id)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Create a workspace snapshot for backup purposes
    pub async fn create_snapshot(
        &self,
        workspace_id: &WorkspaceId,
        snapshot_name: String,
        description: Option<String>,
        tags: Vec<String>,
    ) -> Result<String, WorkspaceRepositoryError> {
        let workspace = self.find_by_id(workspace_id).await?
            .ok_or_else(|| WorkspaceRepositoryError::NotFound(workspace_id.to_string()))?;

        let snapshot_id = uuid::Uuid::new_v4().to_string();
        let snapshot_data = serde_json::to_string(&workspace)?;
        let tags_json = serde_json::to_string(&tags)?;
        let created_at = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO workspace_snapshots
            (id, workspace_id, snapshot_name, description, snapshot_data, created_at, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&snapshot_id)
        .bind(workspace_id.as_str())
        .bind(&snapshot_name)
        .bind(&description)
        .bind(&snapshot_data)
        .bind(&created_at)
        .bind(&tags_json)
        .execute(&self.pool)
        .await?;

        Ok(snapshot_id)
    }

    /// Restore workspace from a snapshot
    pub async fn restore_from_snapshot(
        &self,
        snapshot_id: &str,
    ) -> Result<Workspace, WorkspaceRepositoryError> {
        let row = sqlx::query(
            "SELECT snapshot_data FROM workspace_snapshots WHERE id = ?"
        )
        .bind(snapshot_id)
        .fetch_optional(&self.pool)
        .await?;

        let row = row.ok_or_else(|| WorkspaceRepositoryError::NotFound(snapshot_id.to_string()))?;
        let snapshot_data: String = row.get("snapshot_data");

        let workspace: Workspace = serde_json::from_str(&snapshot_data)?;

        // Save the restored workspace
        self.save(&workspace).await?;

        Ok(workspace)
    }

    /// List all snapshots for a workspace
    pub async fn list_snapshots(
        &self,
        workspace_id: &WorkspaceId,
    ) -> Result<Vec<WorkspaceSnapshotInfo>, WorkspaceRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id, snapshot_name, description, created_at, tags
            FROM workspace_snapshots
            WHERE workspace_id = ?
            ORDER BY created_at DESC
            "#,
        )
        .bind(workspace_id.as_str())
        .fetch_all(&self.pool)
        .await?;

        let mut snapshots = Vec::new();
        for row in rows {
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

            snapshots.push(WorkspaceSnapshotInfo {
                id: row.get("id"),
                name: row.get("snapshot_name"),
                description: row.get("description"),
                created_at: row.get("created_at"),
                tags,
            });
        }

        Ok(snapshots)
    }

    /// Delete a workspace snapshot
    pub async fn delete_snapshot(&self, snapshot_id: &str) -> Result<bool, WorkspaceRepositoryError> {
        let result = sqlx::query("DELETE FROM workspace_snapshots WHERE id = ?")
            .bind(snapshot_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get workspace statistics
    pub async fn get_statistics(&self) -> Result<WorkspaceStatistics, WorkspaceRepositoryError> {
        let total_workspaces: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workspaces")
            .fetch_one(&self.pool)
            .await?;

        let total_snapshots: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workspace_snapshots")
            .fetch_one(&self.pool)
            .await?;

        let layout_mode_stats = sqlx::query("SELECT layout_mode, COUNT(*) as count FROM workspaces GROUP BY layout_mode")
            .fetch_all(&self.pool)
            .await?;

        let mut layout_distribution = HashMap::new();
        for row in layout_mode_stats {
            let layout_mode: String = row.get("layout_mode");
            let count: i64 = row.get("count");
            layout_distribution.insert(layout_mode, count);
        }

        let avg_documents: Option<f64> = sqlx::query_scalar("SELECT AVG(document_count) FROM workspaces")
            .fetch_optional(&self.pool)
            .await?
            .flatten();

        Ok(WorkspaceStatistics {
            total_workspaces,
            total_snapshots,
            layout_distribution,
            average_documents_per_workspace: avg_documents.unwrap_or(0.0),
        })
    }
}

#[async_trait]
impl WorkspaceRepository for SqliteWorkspaceRepository {
    async fn save(&self, workspace: &Workspace) -> Result<(), WorkspaceRepositoryError> {
        let workspace_id = workspace.id.as_str();

        // Check if workspace exists
        let exists = self.exists(&workspace.id).await?;

        if exists {
            // Update existing workspace
            sqlx::query(
                r#"
                UPDATE workspaces SET
                    name = ?,
                    layout_mode = ?,
                    workspace_size_width = ?,
                    workspace_size_height = ?,
                    document_count = ?,
                    active_document_id = ?,
                    last_modified = ?
                WHERE id = ?
                "#,
            )
            .bind(&workspace.name)
            .bind(workspace.layout_mode.as_str())
            .bind(workspace.workspace_size.width)
            .bind(workspace.workspace_size.height)
            .bind(workspace.document_count as i64)
            .bind(&workspace.active_document_id)
            .bind(workspace.last_modified.to_rfc3339())
            .bind(workspace_id)
            .execute(&self.pool)
            .await?;
        } else {
            // Insert new workspace
            sqlx::query(
                r#"
                INSERT INTO workspaces
                (id, name, layout_mode, workspace_size_width, workspace_size_height,
                 document_count, active_document_id, created_at, last_modified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(workspace_id)
            .bind(&workspace.name)
            .bind(workspace.layout_mode.as_str())
            .bind(workspace.workspace_size.width)
            .bind(workspace.workspace_size.height)
            .bind(workspace.document_count as i64)
            .bind(&workspace.active_document_id)
            .bind(workspace.created_at.to_rfc3339())
            .bind(workspace.last_modified.to_rfc3339())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    async fn find_by_id(&self, id: &WorkspaceId) -> Result<Option<Workspace>, WorkspaceRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, layout_mode, workspace_size_width, workspace_size_height,
                   document_count, active_document_id, created_at, last_modified
            FROM workspaces WHERE id = ?
            "#,
        )
        .bind(id.as_str())
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let workspace = self.row_to_workspace(row)?;
            Ok(Some(workspace))
        } else {
            Ok(None)
        }
    }

    async fn find_by_name(&self, name: &str) -> Result<Option<Workspace>, WorkspaceRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT id, name, layout_mode, workspace_size_width, workspace_size_height,
                   document_count, active_document_id, created_at, last_modified
            FROM workspaces WHERE name = ?
            "#,
        )
        .bind(name)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let workspace = self.row_to_workspace(row)?;
            Ok(Some(workspace))
        } else {
            Ok(None)
        }
    }

    async fn list_all(&self) -> Result<Vec<Workspace>, WorkspaceRepositoryError> {
        let rows = sqlx::query(
            r#"
            SELECT id, name, layout_mode, workspace_size_width, workspace_size_height,
                   document_count, active_document_id, created_at, last_modified
            FROM workspaces
            ORDER BY last_modified DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut workspaces = Vec::new();
        for row in rows {
            let workspace = self.row_to_workspace(row)?;
            workspaces.push(workspace);
        }

        Ok(workspaces)
    }

    async fn delete(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError> {
        let result = sqlx::query("DELETE FROM workspaces WHERE id = ?")
            .bind(id.as_str())
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    async fn exists(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workspaces WHERE id = ?")
            .bind(id.as_str())
            .fetch_one(&self.pool)
            .await?;

        Ok(count > 0)
    }

    async fn count(&self) -> Result<i64, WorkspaceRepositoryError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workspaces")
            .fetch_one(&self.pool)
            .await?;

        Ok(count)
    }
}

impl SqliteWorkspaceRepository {
    fn row_to_workspace(&self, row: sqlx::sqlite::SqliteRow) -> Result<Workspace, WorkspaceRepositoryError> {
        use crate::domains::workspace::domain::workspace::{LayoutMode, Dimensions};

        let id_str: String = row.get("id");
        let workspace_id = WorkspaceId::from_string(id_str)
            .map_err(|e| WorkspaceRepositoryError::InvalidData(e))?;

        let layout_mode_str: String = row.get("layout_mode");
        let layout_mode = LayoutMode::from_str(&layout_mode_str)
            .map_err(|e| WorkspaceRepositoryError::InvalidData(e))?;

        let width: f64 = row.get("workspace_size_width");
        let height: f64 = row.get("workspace_size_height");
        let workspace_size = Dimensions::new(width, height)
            .map_err(|e| WorkspaceRepositoryError::InvalidData(e))?;

        let created_at_str: String = row.get("created_at");
        let created_at = chrono::DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|e| WorkspaceRepositoryError::InvalidData(format!("Invalid created_at: {}", e)))?
            .with_timezone(&chrono::Utc);

        let last_modified_str: String = row.get("last_modified");
        let last_modified = chrono::DateTime::parse_from_rfc3339(&last_modified_str)
            .map_err(|e| WorkspaceRepositoryError::InvalidData(format!("Invalid last_modified: {}", e)))?
            .with_timezone(&chrono::Utc);

        Ok(Workspace {
            id: workspace_id,
            name: row.get("name"),
            layout_mode,
            workspace_size,
            document_count: row.get::<i64, _>("document_count") as usize,
            active_document_id: row.get("active_document_id"),
            created_at,
            last_modified,
        })
    }
}

/// In-memory implementation for testing
pub struct InMemoryWorkspaceRepository {
    workspaces: std::sync::Mutex<HashMap<String, Workspace>>,
}

impl InMemoryWorkspaceRepository {
    pub fn new() -> Self {
        Self {
            workspaces: std::sync::Mutex::new(HashMap::new()),
        }
    }
}

#[async_trait]
impl WorkspaceRepository for InMemoryWorkspaceRepository {
    async fn save(&self, workspace: &Workspace) -> Result<(), WorkspaceRepositoryError> {
        let mut workspaces = self.workspaces.lock().unwrap();
        workspaces.insert(workspace.id.as_str().to_string(), workspace.clone());
        Ok(())
    }

    async fn find_by_id(&self, id: &WorkspaceId) -> Result<Option<Workspace>, WorkspaceRepositoryError> {
        let workspaces = self.workspaces.lock().unwrap();
        Ok(workspaces.get(id.as_str()).cloned())
    }

    async fn find_by_name(&self, name: &str) -> Result<Option<Workspace>, WorkspaceRepositoryError> {
        let workspaces = self.workspaces.lock().unwrap();
        Ok(workspaces.values().find(|w| w.name == name).cloned())
    }

    async fn list_all(&self) -> Result<Vec<Workspace>, WorkspaceRepositoryError> {
        let workspaces = self.workspaces.lock().unwrap();
        let mut result: Vec<_> = workspaces.values().cloned().collect();
        result.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
        Ok(result)
    }

    async fn delete(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError> {
        let mut workspaces = self.workspaces.lock().unwrap();
        Ok(workspaces.remove(id.as_str()).is_some())
    }

    async fn exists(&self, id: &WorkspaceId) -> Result<bool, WorkspaceRepositoryError> {
        let workspaces = self.workspaces.lock().unwrap();
        Ok(workspaces.contains_key(id.as_str()))
    }

    async fn count(&self) -> Result<i64, WorkspaceRepositoryError> {
        let workspaces = self.workspaces.lock().unwrap();
        Ok(workspaces.len() as i64)
    }
}

/// Workspace snapshot information
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceSnapshotInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub tags: Vec<String>,
}

/// Workspace repository statistics
#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceStatistics {
    pub total_workspaces: i64,
    pub total_snapshots: i64,
    pub layout_distribution: HashMap<String, i64>,
    pub average_documents_per_workspace: f64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domains::workspace::domain::workspace::{Workspace, LayoutMode, Dimensions};

    #[tokio::test]
    async fn test_in_memory_repository() {
        let repo = InMemoryWorkspaceRepository::new();

        // Test saving and retrieving
        let mut workspace = Workspace::new("Test Workspace".to_string()).unwrap();
        workspace.switch_layout_mode(LayoutMode::Grid);

        repo.save(&workspace).await.unwrap();

        let retrieved = repo.find_by_id(&workspace.id).await.unwrap();
        assert!(retrieved.is_some());

        let retrieved_workspace = retrieved.unwrap();
        assert_eq!(retrieved_workspace.name, "Test Workspace");
        assert_eq!(retrieved_workspace.layout_mode, LayoutMode::Grid);

        // Test find by name
        let found_by_name = repo.find_by_name("Test Workspace").await.unwrap();
        assert!(found_by_name.is_some());

        // Test listing
        let all_workspaces = repo.list_all().await.unwrap();
        assert_eq!(all_workspaces.len(), 1);

        // Test exists
        assert!(repo.exists(&workspace.id).await.unwrap());

        // Test count
        assert_eq!(repo.count().await.unwrap(), 1);

        // Test delete
        assert!(repo.delete(&workspace.id).await.unwrap());
        assert!(!repo.exists(&workspace.id).await.unwrap());
    }

    #[test]
    fn test_workspace_repository_error() {
        let err = WorkspaceRepositoryError::NotFound("test-id".to_string());
        assert_eq!(err.to_string(), "Workspace not found: test-id");
    }
}