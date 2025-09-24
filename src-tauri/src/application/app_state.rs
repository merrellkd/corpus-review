use std::sync::Arc;
use tokio::sync::RwLock;
use tauri::{Manager, AppHandle, State};

use crate::domain::project::ProjectRepository;
use crate::infrastructure::{
    SqliteProjectRepository, DatabaseConnection, DatabaseHealth, AppError, AppResult
};
use crate::application::services::project_service::ProjectService;

/// Application state container for dependency injection
///
/// This struct holds all the shared state and services that need to be
/// available throughout the application lifetime. It provides a clean
/// dependency injection mechanism for Tauri commands.
#[derive(Debug)]
pub struct AppState {
    /// Database connection manager
    database: Arc<DatabaseConnection>,

    /// Project repository implementation
    project_repository: Arc<dyn ProjectRepository>,

    /// Project application service
    project_service: Arc<ProjectService>,

    /// Application metadata
    metadata: Arc<RwLock<AppMetadata>>,
}

/// Application metadata and runtime information
#[derive(Debug, Clone)]
pub struct AppMetadata {
    /// Application version
    pub version: String,

    /// When the application was started
    pub started_at: chrono::DateTime<chrono::Utc>,

    /// Database path
    pub database_path: String,

    /// Whether the app is in development mode
    pub development_mode: bool,

    /// Last health check result
    pub last_health_check: Option<HealthCheckResult>,

    /// Application statistics
    pub stats: AppStats,
}

/// Health check result
#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub database_healthy: bool,
    pub database_response_time_ms: u64,
    pub error_message: Option<String>,
}

/// Application statistics
#[derive(Debug, Clone)]
pub struct AppStats {
    pub total_commands_executed: u64,
    pub total_projects_created: u64,
    pub total_projects_deleted: u64,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
}

impl Default for AppStats {
    fn default() -> Self {
        AppStats {
            total_commands_executed: 0,
            total_projects_created: 0,
            total_projects_deleted: 0,
            last_activity: None,
        }
    }
}

impl AppState {
    /// Initialize the application state
    pub async fn new(development_mode: bool) -> AppResult<Self> {
        // Initialize database connection
        let database = Arc::new(DatabaseConnection::new().await?);

        // Create repository
        let project_repository = Arc::new(SqliteProjectRepository::new(database.pool()));

        // Create services
        let project_service = Arc::new(ProjectService::new(project_repository.clone()));

        // Initialize metadata
        let metadata = AppMetadata {
            version: env!("CARGO_PKG_VERSION").to_string(),
            started_at: chrono::Utc::now(),
            database_path: database.path().to_string_lossy().to_string(),
            development_mode,
            last_health_check: None,
            stats: AppStats::default(),
        };

        let app_state = AppState {
            database,
            project_repository,
            project_service,
            metadata: Arc::new(RwLock::new(metadata)),
        };

        // Perform initial health check
        app_state.health_check().await?;

        Ok(app_state)
    }

    /// Initialize application state for testing
    #[cfg(test)]
    pub async fn new_for_testing() -> AppResult<Self> {
        use crate::domain::project::repositories::MockProjectRepository;

        // Create mock repository for testing
        let project_repository = Arc::new(MockProjectRepository::new());
        let project_service = Arc::new(ProjectService::new(project_repository.clone()));

        // Create temporary database for testing
        let (database, _temp_dir) = DatabaseConnection::new_temp().await?;
        let database = Arc::new(database);

        let metadata = AppMetadata {
            version: "test".to_string(),
            started_at: chrono::Utc::now(),
            database_path: "memory".to_string(),
            development_mode: true,
            last_health_check: None,
            stats: AppStats::default(),
        };

        Ok(AppState {
            database,
            project_repository,
            project_service,
            metadata: Arc::new(RwLock::new(metadata)),
        })
    }

    /// Get the database connection
    pub fn database(&self) -> Arc<DatabaseConnection> {
        self.database.clone()
    }

    /// Get the project repository
    pub fn project_repository(&self) -> Arc<dyn ProjectRepository> {
        self.project_repository.clone()
    }

    /// Get the project service
    pub fn project_service(&self) -> Arc<ProjectService> {
        self.project_service.clone()
    }

    /// Get application metadata (read-only)
    pub async fn metadata(&self) -> AppMetadata {
        self.metadata.read().await.clone()
    }

    /// Perform a comprehensive health check
    pub async fn health_check(&self) -> AppResult<HealthCheckResult> {
        let start_time = std::time::Instant::now();
        let timestamp = chrono::Utc::now();

        // Check database health
        let database_result = self.database.health_check().await;
        let response_time = start_time.elapsed();

        let result = match database_result {
            Ok(_) => HealthCheckResult {
                timestamp,
                database_healthy: true,
                database_response_time_ms: response_time.as_millis() as u64,
                error_message: None,
            },
            Err(error) => HealthCheckResult {
                timestamp,
                database_healthy: false,
                database_response_time_ms: response_time.as_millis() as u64,
                error_message: Some(error.to_string()),
            },
        };

        // Update metadata with health check result
        {
            let mut metadata = self.metadata.write().await;
            metadata.last_health_check = Some(result.clone());
        }

        // Return error if unhealthy
        if !result.database_healthy {
            return Err(AppError::database_error("Health check failed"));
        }

        Ok(result)
    }

    /// Record command execution statistics
    pub async fn record_command_execution(&self) {
        let mut metadata = self.metadata.write().await;
        metadata.stats.total_commands_executed += 1;
        metadata.stats.last_activity = Some(chrono::Utc::now());
    }

    /// Record project creation statistics
    pub async fn record_project_created(&self) {
        let mut metadata = self.metadata.write().await;
        metadata.stats.total_projects_created += 1;
        metadata.stats.last_activity = Some(chrono::Utc::now());
    }

    /// Record project deletion statistics
    pub async fn record_project_deleted(&self) {
        let mut metadata = self.metadata.write().await;
        metadata.stats.total_projects_deleted += 1;
        metadata.stats.last_activity = Some(chrono::Utc::now());
    }

    /// Gracefully shutdown the application state
    pub async fn shutdown(&self) {
        tracing::info!("Shutting down application state");

        // Close database connection
        self.database.close().await;

        tracing::info!("Application state shutdown complete");
    }

    /// Get application status summary
    pub async fn get_status(&self) -> AppStatus {
        let metadata = self.metadata().await;
        let uptime = chrono::Utc::now().signed_duration_since(metadata.started_at);

        AppStatus {
            version: metadata.version,
            uptime_seconds: uptime.num_seconds() as u64,
            development_mode: metadata.development_mode,
            database_path: metadata.database_path,
            database_healthy: metadata.last_health_check
                .map(|h| h.database_healthy)
                .unwrap_or(false),
            total_commands: metadata.stats.total_commands_executed,
            total_projects_created: metadata.stats.total_projects_created,
            total_projects_deleted: metadata.stats.total_projects_deleted,
            last_activity: metadata.stats.last_activity,
        }
    }
}

/// Application status information for monitoring
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppStatus {
    pub version: String,
    pub uptime_seconds: u64,
    pub development_mode: bool,
    pub database_path: String,
    pub database_healthy: bool,
    pub total_commands: u64,
    pub total_projects_created: u64,
    pub total_projects_deleted: u64,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
}

impl AppStatus {
    /// Get human-readable uptime
    pub fn uptime_display(&self) -> String {
        let seconds = self.uptime_seconds;
        let days = seconds / 86400;
        let hours = (seconds % 86400) / 3600;
        let minutes = (seconds % 3600) / 60;
        let secs = seconds % 60;

        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours, minutes, secs)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, secs)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, secs)
        } else {
            format!("{}s", secs)
        }
    }

    /// Check if the application is healthy
    pub fn is_healthy(&self) -> bool {
        self.database_healthy
    }

    /// Get status color for UI display
    pub fn status_color(&self) -> &'static str {
        if self.is_healthy() {
            "green"
        } else {
            "red"
        }
    }
}

/// Tauri state management utilities
pub struct StateManager;

impl StateManager {
    /// Initialize Tauri app state
    pub async fn initialize_tauri_state(app: &AppHandle) -> AppResult<()> {
        let development_mode = cfg!(debug_assertions);
        let app_state = AppState::new(development_mode).await?;

        app.manage(app_state);

        tracing::info!("Tauri application state initialized successfully");
        Ok(())
    }

    /// Get app state from Tauri state
    pub fn get_app_state(app: &AppHandle) -> &AppState {
        app.state::<AppState>()
    }

    /// Record command execution in Tauri context
    pub async fn record_command(app: &AppHandle) {
        let state = Self::get_app_state(app);
        state.record_command_execution().await;
    }
}

/// Tauri command for getting application status
#[tauri::command]
pub async fn get_app_status(state: State<'_, AppState>) -> Result<AppStatus, String> {
    state.get_status().await
        .map_err(|e| e.message)
}

/// Tauri command for performing health check
#[tauri::command]
pub async fn health_check(state: State<'_, AppState>) -> Result<HealthCheckResult, String> {
    state.health_check().await
        .map_err(|e| e.message)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_app_state_initialization() {
        let app_state = AppState::new_for_testing().await;
        assert!(app_state.is_ok());

        let state = app_state.unwrap();
        let metadata = state.metadata().await;
        assert_eq!(metadata.version, "test");
        assert!(metadata.development_mode);
    }

    #[tokio::test]
    async fn test_health_check() {
        let app_state = AppState::new_for_testing().await.unwrap();
        let health_result = app_state.health_check().await;
        assert!(health_result.is_ok());

        let health = health_result.unwrap();
        assert!(health.database_healthy);
    }

    #[tokio::test]
    async fn test_statistics_recording() {
        let app_state = AppState::new_for_testing().await.unwrap();

        // Initially zero
        let initial_status = app_state.get_status().await;
        assert_eq!(initial_status.total_commands, 0);
        assert_eq!(initial_status.total_projects_created, 0);

        // Record some activity
        app_state.record_command_execution().await;
        app_state.record_project_created().await;
        app_state.record_project_deleted().await;

        // Verify updates
        let updated_status = app_state.get_status().await;
        assert_eq!(updated_status.total_commands, 1);
        assert_eq!(updated_status.total_projects_created, 1);
        assert_eq!(updated_status.total_projects_deleted, 1);
        assert!(updated_status.last_activity.is_some());
    }

    #[test]
    fn test_app_status_display() {
        let status = AppStatus {
            version: "1.0.0".to_string(),
            uptime_seconds: 3661, // 1h 1m 1s
            development_mode: false,
            database_path: "/test/db.sqlite".to_string(),
            database_healthy: true,
            total_commands: 100,
            total_projects_created: 10,
            total_projects_deleted: 2,
            last_activity: Some(chrono::Utc::now()),
        };

        let uptime_display = status.uptime_display();
        assert_eq!(uptime_display, "1h 1m 1s");

        assert!(status.is_healthy());
        assert_eq!(status.status_color(), "green");
    }

    #[test]
    fn test_app_status_uptime_formats() {
        let test_cases = vec![
            (30, "30s"),
            (90, "1m 30s"),
            (3661, "1h 1m 1s"),
            (90061, "1d 1h 1m 1s"),
        ];

        for (seconds, expected) in test_cases {
            let status = AppStatus {
                version: "test".to_string(),
                uptime_seconds: seconds,
                development_mode: true,
                database_path: "test".to_string(),
                database_healthy: true,
                total_commands: 0,
                total_projects_created: 0,
                total_projects_deleted: 0,
                last_activity: None,
            };

            assert_eq!(status.uptime_display(), expected);
        }
    }
}