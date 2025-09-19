// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tracing::{info, Level};
use tracing_subscriber;

pub mod commands;
pub mod domain;
pub mod application;
pub mod infrastructure;

fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    info!("Starting Corpus Review application");

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::workspace_commands::get_workspace_layout,
            commands::workspace_commands::save_workspace_layout,
            commands::workspace_commands::list_folder_contents,
            commands::workspace_commands::update_panel_visibility,
            commands::workspace_commands::update_panel_sizes,
            commands::workspace_commands::create_document_caddy,
            commands::workspace_commands::update_document_caddy,
            commands::workspace_commands::get_project_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}