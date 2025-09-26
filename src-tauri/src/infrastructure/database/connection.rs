use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use sqlx::{ConnectOptions, Executor, Row};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::fs;
use tracing::{error, info};

use crate::domain::project::{ProjectError, ProjectResult};

/// Database connection manager for SQLite
///
/// Handles database initialization, connection pooling, migrations,
/// and health monitoring for the application's SQLite database.
#[derive(Debug)]
pub struct DatabaseConnection {
    pool: Arc<SqlitePool>,
    database_path: PathBuf,
}

impl DatabaseConnection {
    /// Create a new database connection with the default application database path
    pub async fn new() -> ProjectResult<Self> {
        let db_path = Self::get_default_database_path()?;
        Self::new_with_path(db_path).await
    }

    /// Create a new database connection with a specific database path
    pub async fn new_with_path<P: AsRef<Path>>(path: P) -> ProjectResult<Self> {
        let database_path = path.as_ref().to_path_buf();

        info!("Initializing database at: {}", database_path.display());

        // Ensure the parent directory exists
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                ProjectError::repository_error(format!(
                    "Failed to create database directory: {}",
                    e
                ))
            })?;
        }

        // Configure SQLite connection options
        let connection_options = SqliteConnectOptions::new()
            .filename(&database_path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
            .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
            .pragma("foreign_keys", "ON")
            .pragma("temp_store", "memory")
            .pragma("mmap_size", "268435456") // 256MB
            .disable_statement_logging(); // Reduce log noise in production

        // Create connection pool
        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .min_connections(1)
            .acquire_timeout(Duration::from_secs(10))
            .idle_timeout(Some(Duration::from_secs(300))) // 5 minutes
            .max_lifetime(Some(Duration::from_secs(1800))) // 30 minutes
            .connect_with(connection_options)
            .await
            .map_err(|_| ProjectError::DatabaseConnection)?;

        let connection = DatabaseConnection {
            pool: Arc::new(pool),
            database_path,
        };

        // Run migrations on startup
        connection.migrate().await?;

        info!("Database initialized successfully");
        Ok(connection)
    }

    /// Get the connection pool
    pub fn pool(&self) -> Arc<SqlitePool> {
        self.pool.clone()
    }

    /// Get the database file path
    pub fn path(&self) -> &Path {
        &self.database_path
    }

    /// Run database migrations
    pub async fn migrate(&self) -> ProjectResult<()> {
        info!("Running database migrations");

        // First, ensure the migrations table exists
        self.pool
            .execute(sqlx::query(
                r#"
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        "#,
            ))
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!(
                    "Failed to create schema_migrations table: {}",
                    e
                ))
            })?;

        let migrations = vec![
            // Initial schema
            (
                1,
                "create_projects_table",
                r#"
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
                    source_folder TEXT NOT NULL,
                    note TEXT CHECK(length(note) <= 1000),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            "#,
            ),
            // Indexes for performance
            (
                2,
                "create_indexes",
                r#"
                CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(uuid);
                CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name COLLATE NOCASE);
                CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
            "#,
            ),
        ];

        for (version, name, sql) in migrations {
            if !self.is_migration_applied(version).await? {
                info!("Applying migration {}: {}", version, name);

                let mut tx = self.pool.begin().await.map_err(|e| {
                    ProjectError::repository_error(format!(
                        "Failed to start migration transaction: {}",
                        e
                    ))
                })?;

                // Execute the migration
                tx.execute(sqlx::query(sql)).await.map_err(|e| {
                    ProjectError::repository_error(format!(
                        "Failed to execute migration {}: {}",
                        version, e
                    ))
                })?;

                // Record the migration
                let record_sql = r#"
                    INSERT OR IGNORE INTO schema_migrations (version, name)
                    VALUES (?1, ?2)
                "#;
                tx.execute(sqlx::query(record_sql).bind(version).bind(name))
                    .await
                    .map_err(|e| {
                        ProjectError::repository_error(format!(
                            "Failed to record migration {}: {}",
                            version, e
                        ))
                    })?;

                tx.commit().await.map_err(|e| {
                    ProjectError::repository_error(format!(
                        "Failed to commit migration {}: {}",
                        version, e
                    ))
                })?;

                info!("Migration {} applied successfully", version);
            }
        }

        info!("Database migrations completed");
        Ok(())
    }

    /// Check if a migration has been applied
    async fn is_migration_applied(&self, version: i32) -> ProjectResult<bool> {
        // First check if the migrations table exists
        let table_exists_sql = r#"
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='schema_migrations'
        "#;

        let table_exists = sqlx::query(table_exists_sql)
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!("Failed to check migrations table: {}", e))
            })?
            .is_some();

        if !table_exists {
            return Ok(false);
        }

        // Check if the specific migration has been applied
        let migration_exists_sql = r#"
            SELECT version FROM schema_migrations WHERE version = ?1
        "#;

        let migration_exists = sqlx::query(migration_exists_sql)
            .bind(version)
            .fetch_optional(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!(
                    "Failed to check migration {}: {}",
                    version, e
                ))
            })?
            .is_some();

        Ok(migration_exists)
    }

    /// Perform a health check on the database connection
    pub async fn health_check(&self) -> ProjectResult<DatabaseHealth> {
        let start_time = std::time::Instant::now();

        // Test basic connectivity
        let connectivity_result = sqlx::query("SELECT 1").fetch_one(&*self.pool).await;

        let is_connected = connectivity_result.is_ok();
        let response_time = start_time.elapsed();

        // Get database statistics
        let stats = if is_connected {
            Some(self.get_database_stats().await?)
        } else {
            None
        };

        let health = DatabaseHealth {
            is_connected,
            response_time,
            pool_size: self.pool.size(),
            idle_connections: self.pool.num_idle(),
            database_path: self.database_path.clone(),
            stats,
        };

        if !is_connected {
            error!("Database health check failed");
        }

        Ok(health)
    }

    /// Get detailed database statistics
    async fn get_database_stats(&self) -> ProjectResult<DatabaseStats> {
        let page_count_query = "PRAGMA page_count";
        let page_size_query = "PRAGMA page_size";
        let user_tables_query = r#"
            SELECT COUNT(*) as table_count
            FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        "#;

        let page_count_row = sqlx::query(page_count_query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!("Failed to get page count: {}", e))
            })?;

        let page_size_row = sqlx::query(page_size_query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!("Failed to get page size: {}", e))
            })?;

        let tables_row = sqlx::query(user_tables_query)
            .fetch_one(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!("Failed to get table count: {}", e))
            })?;

        let page_count: i64 = page_count_row.try_get(0).map_err(|e| {
            ProjectError::repository_error(format!("Failed to parse page count: {}", e))
        })?;

        let page_size: i64 = page_size_row.try_get(0).map_err(|e| {
            ProjectError::repository_error(format!("Failed to parse page size: {}", e))
        })?;

        let table_count: i64 = tables_row.try_get("table_count").map_err(|e| {
            ProjectError::repository_error(format!("Failed to parse table count: {}", e))
        })?;

        Ok(DatabaseStats {
            database_size_bytes: (page_count * page_size) as u64,
            table_count: table_count as usize,
            page_size: page_size as usize,
            page_count: page_count as usize,
        })
    }

    /// Close the database connection gracefully
    pub async fn close(&self) {
        info!("Closing database connection");
        self.pool.close().await;
        info!("Database connection closed");
    }

    /// Get the default database path for the application
    fn get_default_database_path() -> ProjectResult<PathBuf> {
        let data_dir = dirs::data_dir()
            .or_else(|| dirs::home_dir().map(|h| h.join(".local/share")))
            .ok_or_else(|| ProjectError::repository_error("Could not determine data directory"))?;

        let app_dir = data_dir.join("corpus-review");
        let db_path = app_dir.join("corpus_review.db");

        Ok(db_path)
    }

    /// Create a temporary database for testing
    #[cfg(test)]
    pub async fn new_temp() -> ProjectResult<(Self, tempfile::TempDir)> {
        let temp_dir = tempfile::tempdir().map_err(|e| {
            ProjectError::repository_error(format!("Failed to create temp dir: {}", e))
        })?;

        let db_path = temp_dir.path().join("test.db");
        let connection = Self::new_with_path(db_path).await?;

        Ok((connection, temp_dir))
    }

    /// Backup the database to a specified path
    pub async fn backup<P: AsRef<Path>>(&self, backup_path: P) -> ProjectResult<()> {
        let backup_path = backup_path.as_ref();

        info!("Creating database backup at: {}", backup_path.display());

        // Ensure backup directory exists
        if let Some(parent) = backup_path.parent() {
            fs::create_dir_all(parent).await.map_err(|e| {
                ProjectError::repository_error(format!("Failed to create backup directory: {}", e))
            })?;
        }

        // Use SQLite's VACUUM INTO command for atomic backup
        let backup_sql = format!("VACUUM INTO '{}'", backup_path.to_string_lossy());

        sqlx::query(&backup_sql)
            .execute(&*self.pool)
            .await
            .map_err(|e| {
                ProjectError::repository_error(format!("Failed to create backup: {}", e))
            })?;

        info!("Database backup created successfully");
        Ok(())
    }
}

/// Database health information
#[derive(Debug, Clone)]
pub struct DatabaseHealth {
    pub is_connected: bool,
    pub response_time: Duration,
    pub pool_size: u32,
    pub idle_connections: usize,
    pub database_path: PathBuf,
    pub stats: Option<DatabaseStats>,
}

/// Database statistics
#[derive(Debug, Clone)]
pub struct DatabaseStats {
    pub database_size_bytes: u64,
    pub table_count: usize,
    pub page_size: usize,
    pub page_count: usize,
}

impl DatabaseHealth {
    /// Check if the database is healthy
    pub fn is_healthy(&self) -> bool {
        self.is_connected && self.response_time < Duration::from_millis(1000)
    }

    /// Get a human-readable health status
    pub fn status_message(&self) -> String {
        if self.is_healthy() {
            format!(
                "Healthy - Response time: {}ms, Pool: {}/{} connections",
                self.response_time.as_millis(),
                self.pool_size - self.idle_connections as u32,
                self.pool_size
            )
        } else if !self.is_connected {
            "Unhealthy - Database connection failed".to_string()
        } else {
            format!(
                "Slow - Response time: {}ms (> 1000ms threshold)",
                self.response_time.as_millis()
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::fs;

    #[tokio::test]
    async fn test_database_connection_creation() {
        let (connection, _temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        assert!(connection.path().exists());

        let health = connection.health_check().await.unwrap();
        assert!(health.is_connected);
        assert!(health.is_healthy());
    }

    #[tokio::test]
    async fn test_database_migrations() {
        let (connection, _temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        // Check that projects table exists
        let table_exists = sqlx::query(
            r#"
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='projects'
        "#,
        )
        .fetch_optional(&*connection.pool())
        .await
        .unwrap();

        assert!(table_exists.is_some());

        // Check that indexes exist
        let index_exists = sqlx::query(
            r#"
            SELECT name FROM sqlite_master
            WHERE type='index' AND name='idx_projects_uuid'
        "#,
        )
        .fetch_optional(&*connection.pool())
        .await
        .unwrap();

        assert!(index_exists.is_some());
    }

    #[tokio::test]
    async fn test_database_health_check() {
        let (connection, _temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        let health = connection.health_check().await.unwrap();

        assert!(health.is_connected);
        assert!(health.response_time < Duration::from_secs(1));
        assert!(health.stats.is_some());

        let stats = health.stats.unwrap();
        assert!(stats.database_size_bytes > 0);
        assert!(stats.table_count > 0);
    }

    #[tokio::test]
    async fn test_database_backup() {
        let (connection, temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        // Insert some test data
        sqlx::query(
            r#"
            INSERT INTO projects (uuid, name, source_folder, note)
            VALUES ('proj_test', 'Test Project', '/tmp/test', 'Test note')
        "#,
        )
        .execute(&*connection.pool())
        .await
        .unwrap();

        // Create backup
        let backup_path = temp_dir.path().join("backup.db");
        connection.backup(&backup_path).await.unwrap();

        assert!(backup_path.exists());

        // Verify backup contains data
        let backup_pool = SqlitePool::connect(&format!("sqlite:{}", backup_path.to_string_lossy()))
            .await
            .unwrap();

        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM projects")
            .fetch_one(&backup_pool)
            .await
            .unwrap();

        assert_eq!(count.0, 1);

        backup_pool.close().await;
    }

    #[tokio::test]
    async fn test_migration_tracking() {
        let (connection, _temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        // Check that migration tracking table exists
        let migrations_table = sqlx::query(
            r#"
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='schema_migrations'
        "#,
        )
        .fetch_optional(&*connection.pool())
        .await
        .unwrap();

        assert!(migrations_table.is_some());

        // Check that migrations are recorded
        let migration_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM schema_migrations")
            .fetch_one(&*connection.pool())
            .await
            .unwrap();

        assert!(migration_count.0 > 0);
    }

    #[tokio::test]
    async fn test_database_stats() {
        let (connection, _temp_dir) = DatabaseConnection::new_temp().await.unwrap();

        let stats = connection.get_database_stats().await.unwrap();

        assert!(stats.database_size_bytes > 0);
        assert!(stats.table_count >= 2); // projects + schema_migrations
        assert!(stats.page_size > 0);
        assert!(stats.page_count > 0);
    }
}
