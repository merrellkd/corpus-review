pub mod workspace_service;
pub mod file_system_service;
pub mod dtos;
pub mod services;
pub mod app_state;

pub use workspace_service::{WorkspaceService, WorkspaceServiceError};
pub use file_system_service::{FileSystemService, FileSystemServiceError};
pub use dtos::*;
pub use services::{ProjectService, BatchResult, BatchError};
pub use app_state::{AppState, AppStatus, AppMetadata, HealthCheckResult, StateManager};