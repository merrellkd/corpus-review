pub mod project_repository;

pub use project_repository::{ProjectRepository, RepositoryStats};

#[cfg(test)]
pub use project_repository::mock::MockProjectRepository;
