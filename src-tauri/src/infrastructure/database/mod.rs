pub mod connection;

pub use connection::{DatabaseConnection, DatabaseHealth, DatabaseStats};

/// Initialize database for backward compatibility with existing code
pub async fn initialize_database() -> Result<DatabaseConnection, crate::infrastructure::AppError> {
    use crate::infrastructure::errors::IntoAppResult;
    DatabaseConnection::new().await.into_app_result()
}