pub mod repositories;
pub mod database;
pub mod dtos;
pub mod errors;

pub use dtos::{ProjectDto, ProjectListDto, RepositoryStatsDto, CreateProjectRequest, UpdateProjectRequest, DeleteProjectRequest};
pub use errors::{AppError, AppResult, ErrorResponse};
pub use repositories::SqliteProjectRepository;
pub use database::{DatabaseConnection, DatabaseHealth};