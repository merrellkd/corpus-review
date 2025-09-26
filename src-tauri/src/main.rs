// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tracing::{info, Level};
use tracing_subscriber;

pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

use application::StateManager;
use infrastructure::database::initialize_database;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    info!("Starting Corpus Review application");

    // Initialize legacy workspace services (keep existing functionality)
    // Note: This uses the old database system for workspace management
    // TODO: Migrate workspace services to use the new project management system
    let _legacy_database = initialize_database()
        .await
        .expect("Failed to initialize legacy database");

    // For now, we'll create a simple adapter or use a mock for the workspace service
    // Since WorkspaceService needs a RepositoryFactory, we'll skip it for now
    // let workspace_service = WorkspaceService::new(repository_factory);

    // Build the Tauri application with dependency injection setup
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // TODO: Re-enable workspace service once RepositoryFactory is implemented
        // .manage(workspace_service)
        .setup(|app| {
            // Enable developer tools in development mode
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            // Initialize project management state asynchronously
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = StateManager::initialize_tauri_state(&app_handle).await {
                    tracing::error!(
                        "Failed to initialize project management state: {}",
                        error.message
                    );
                    // Don't fail the entire app startup, but log the error
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // TODO: Re-enable workspace commands once workspace service is restored
            // commands::workspace_commands::get_workspace_layout,
            // commands::workspace_commands::save_workspace_layout,
            // commands::workspace_commands::update_panel_visibility,
            // commands::workspace_commands::update_panel_sizes,
            // commands::workspace_commands::create_document_caddy,
            // commands::workspace_commands::update_document_caddy,
            // commands::workspace_commands::get_project_details,
            // commands::file_system_commands::list_folder_contents,
            // commands::file_system_commands::search_files_recursive,
            // commands::file_system_commands::get_file_info,
            commands::file_system_commands::is_path_accessible,
            // New project management commands
            commands::create_project::create_project,
            commands::create_project::validate_create_project_request,
            commands::create_project::check_project_name_availability,
            commands::create_project::get_project_creation_stats,
            commands::list_projects::list_projects,
            commands::list_projects::list_projects_paged,
            commands::list_projects::search_projects,
            commands::list_projects::get_project,
            commands::list_projects::get_project_by_name,
            commands::list_projects::get_repository_stats,
            commands::list_projects::get_inaccessible_projects,
            commands::list_projects::find_projects_by_date_range,
            commands::delete_project::delete_project,
            commands::delete_project::validate_delete_project_request,
            commands::delete_project::get_project_for_deletion,
            commands::delete_project::delete_projects_bulk,
            commands::delete_project::check_deletion_safety,
            commands::open_project::open_project,
            commands::open_project::open_project_by_name,
            commands::open_project::validate_project_access,
            commands::open_project::get_recent_projects,
            commands::open_project::open_project_folder,
            commands::open_project::get_project_opening_stats,
            // Workspace navigation commands
            commands::workspace_commands::open_workspace_navigation,
            commands::workspace_commands::list_directory,
            commands::workspace_commands::navigate_to_folder,
            commands::workspace_commands::navigate_to_parent,
            // Application state commands
            application::app_state::get_app_status,
            application::app_state::health_check
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
