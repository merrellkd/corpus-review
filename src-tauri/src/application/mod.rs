pub mod workspace_service;
pub mod file_system_service;
pub mod dtos;
pub mod services;
pub mod app_state;
pub mod errors;

pub use workspace_service::{WorkspaceService as LegacyWorkspaceService, WorkspaceServiceError};
pub use file_system_service::{FileSystemService, FileSystemServiceError};
pub use dtos::*;
pub use services::{ProjectService, BatchResult, BatchError, WorkspaceNavigationService};
pub use app_state::{AppState, AppStatus, AppMetadata, HealthCheckResult, StateManager};
pub use errors::*;