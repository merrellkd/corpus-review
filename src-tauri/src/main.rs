// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tracing::{info, Level};
use tracing_subscriber;

pub mod commands;
pub mod domain;
pub mod application;
pub mod infrastructure;

use application::workspace_service::WorkspaceService;
use infrastructure::database::{Database, initialize_database};
use std::sync::Arc;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    info!("Starting Corpus Review application");

    // Initialize database and services
    let database = initialize_database().await.expect("Failed to initialize database");
    let repository_factory = Arc::new(database);
    let workspace_service = WorkspaceService::new(repository_factory);

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(workspace_service)
        .invoke_handler(tauri::generate_handler![
            commands::workspace_commands::get_workspace_layout,
            commands::workspace_commands::save_workspace_layout,
            commands::workspace_commands::update_panel_visibility,
            commands::workspace_commands::update_panel_sizes,
            commands::workspace_commands::create_document_caddy,
            commands::workspace_commands::update_document_caddy,
            commands::workspace_commands::get_project_details,
            commands::file_system_commands::list_folder_contents,
            commands::file_system_commands::search_files_recursive,
            commands::file_system_commands::get_file_info,
            commands::file_system_commands::is_path_accessible
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}