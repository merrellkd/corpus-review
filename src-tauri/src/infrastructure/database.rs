use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use sqlx::{migrate::MigrateDatabase, Sqlite};
use std::str::FromStr;
use tracing::{info, error};
use anyhow::Result;

pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        info!("Initializing database at: {}", database_url);

        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            info!("Creating database at: {}", database_url);
            Sqlite::create_database(database_url).await?;
        }

        // Configure connection options
        let connection_options = SqliteConnectOptions::from_str(database_url)?
            .create_if_missing(true)
            .pragma("journal_mode", "WAL")
            .pragma("synchronous", "NORMAL")
            .pragma("foreign_keys", "ON");

        // Create connection pool
        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .connect_with(connection_options)
            .await?;

        info!("Database connection pool created successfully");

        Ok(Database { pool })
    }

    pub async fn run_migrations(&self) -> Result<()> {
        info!("Running database migrations");

        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await?;

        info!("Database migrations completed successfully");
        Ok(())
    }

    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

pub async fn initialize_database() -> Result<Database> {
    // Use application data directory for database
    let app_data_dir = tauri::api::path::app_data_dir(&tauri::Config::default())
        .ok_or_else(|| anyhow::anyhow!("Could not determine app data directory"))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)?;

    let database_path = app_data_dir.join("corpus_review.db");
    let database_url = format!("sqlite://{}", database_path.to_string_lossy());

    info!("Database path: {}", database_url);

    let database = Database::new(&database_url).await?;
    database.run_migrations().await?;

    Ok(database)
}