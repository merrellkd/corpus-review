use async_trait::async_trait;
use sqlx::{Row, SqlitePool};
use crate::domain::workspace::{
    entities::WorkspaceLayout,
    value_objects::{WorkspaceLayoutId, ProjectId},
    repositories::{WorkspaceLayoutRepository, RepositoryError},
    PanelType,
};

pub struct SqlxWorkspaceLayoutRepository {
    pool: SqlitePool,
}

impl SqlxWorkspaceLayoutRepository {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl WorkspaceLayoutRepository for SqlxWorkspaceLayoutRepository {
    async fn save(&self, layout: &WorkspaceLayout) -> Result<(), RepositoryError> {
        let query = r#"
            INSERT OR REPLACE INTO workspace_layouts
            (id, project_id, file_explorer_visible, category_explorer_visible,
             search_panel_visible, document_workspace_visible,
             explorer_width, workspace_width, last_modified)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        "#;

        sqlx::query(query)
            .bind(layout.id.to_string())
            .bind(layout.project_id.to_string())
            .bind(layout.panel_states.file_explorer_visible)
            .bind(layout.panel_states.category_explorer_visible)
            .bind(layout.panel_states.search_panel_visible)
            .bind(layout.panel_states.document_workspace_visible)
            .bind(layout.panel_sizes.explorer_width)
            .bind(layout.panel_sizes.workspace_width)
            .bind(layout.last_modified)
            .execute(&self.pool)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn find_by_id(&self, id: &WorkspaceLayoutId) -> Result<Option<WorkspaceLayout>, RepositoryError> {
        let query = r#"
            SELECT id, project_id, file_explorer_visible, category_explorer_visible,
                   search_panel_visible, document_workspace_visible,
                   explorer_width, workspace_width, last_modified
            FROM workspace_layouts WHERE id = ?1
        "#;

        let row = sqlx::query(query)
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let layout = self.row_to_workspace_layout(row)?;
                Ok(Some(layout))
            }
            None => Ok(None),
        }
    }

    async fn find_by_project_id(&self, project_id: &ProjectId) -> Result<Option<WorkspaceLayout>, RepositoryError> {
        let query = r#"
            SELECT id, project_id, file_explorer_visible, category_explorer_visible,
                   search_panel_visible, document_workspace_visible,
                   explorer_width, workspace_width, last_modified
            FROM workspace_layouts WHERE project_id = ?1
        "#;

        let row = sqlx::query(query)
            .bind(project_id.to_string())
            .fetch_optional(&self.pool)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        match row {
            Some(row) => {
                let layout = self.row_to_workspace_layout(row)?;
                Ok(Some(layout))
            }
            None => Ok(None),
        }
    }

    async fn delete(&self, id: &WorkspaceLayoutId) -> Result<(), RepositoryError> {
        sqlx::query("DELETE FROM workspace_layouts WHERE id = ?1")
            .bind(id.to_string())
            .execute(&self.pool)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn exists_for_project(&self, project_id: &ProjectId) -> Result<bool, RepositoryError> {
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM workspace_layouts WHERE project_id = ?1")
            .bind(project_id.to_string())
            .fetch_one(&self.pool)
            .await
            .map_err(|e| RepositoryError::DatabaseError(e.to_string()))?;

        Ok(count > 0)
    }
}

impl SqlxWorkspaceLayoutRepository {
    fn row_to_workspace_layout(&self, row: sqlx::sqlite::SqliteRow) -> Result<WorkspaceLayout, RepositoryError> {
        use std::collections::HashMap;
        use crate::domain::workspace::entities::workspace_layout::{PanelVisibilityState, PanelDimensionState};

        let id = WorkspaceLayoutId::from_string(row.get::<String, _>("id"))
            .map_err(|e| RepositoryError::ValidationError(e))?;
        let project_id = ProjectId::from_string(row.get::<String, _>("project_id"))
            .map_err(|e| RepositoryError::ValidationError(e))?;

        let panel_states = PanelVisibilityState {
            file_explorer_visible: row.get("file_explorer_visible"),
            category_explorer_visible: row.get("category_explorer_visible"),
            search_panel_visible: row.get("search_panel_visible"),
            document_workspace_visible: row.get("document_workspace_visible"),
        };

        let panel_sizes = PanelDimensionState {
            explorer_width: row.get("explorer_width"),
            workspace_width: row.get("workspace_width"),
            panel_heights: HashMap::new(),
        };

        let last_modified: chrono::DateTime<chrono::Utc> = row.get("last_modified");

        Ok(WorkspaceLayout {
            id,
            project_id,
            panel_states,
            panel_sizes,
            last_modified,
        })
    }
}