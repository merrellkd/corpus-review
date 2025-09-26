pub mod database;
pub mod dtos;
pub mod errors;
pub mod repositories;

pub use database::{DatabaseConnection, DatabaseHealth};
pub use dtos::{
    CreateProjectRequest, DeleteProjectRequest, ProjectDto, ProjectListDto, RepositoryStatsDto,
    UpdateProjectRequest,
};
pub use errors::{AppError, AppResult, ErrorResponse};
pub use repositories::SqliteProjectRepository;
