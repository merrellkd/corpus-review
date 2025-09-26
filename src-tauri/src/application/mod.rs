pub mod app_state;
pub mod dtos;
pub mod file_system_service;
pub mod services;
pub mod workspace_service;

pub use app_state::{AppMetadata, AppState, AppStatus, HealthCheckResult, StateManager};
pub use dtos::*;
pub use file_system_service::{FileSystemService, FileSystemServiceError};
pub use services::{BatchError, BatchResult, ProjectService, WorkspaceNavigationService};
pub use workspace_service::{WorkspaceService as LegacyWorkspaceService, WorkspaceServiceError};
