use tauri::State;
use crate::application::{
    file_system_service::{FileSystemService, FileSystemServiceError},
    dtos::FileSystemItemDto,
};

#[tauri::command]
pub async fn list_folder_contents(
    folder_path: String,
    file_system_service: State<'_, FileSystemService>,
) -> Result<Vec<FileSystemItemDto>, String> {
    file_system_service
        .list_folder_contents(&folder_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_files_recursive(
    folder_path: String,
    query: String,
    file_system_service: State<'_, FileSystemService>,
) -> Result<Vec<FileSystemItemDto>, String> {
    file_system_service
        .search_files_recursive(&folder_path, &query)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_file_info(
    file_path: String,
    file_system_service: State<'_, FileSystemService>,
) -> Result<Option<FileSystemItemDto>, String> {
    file_system_service
        .get_file_info(&file_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn is_path_accessible(
    path: String,
    file_system_service: State<'_, FileSystemService>,
) -> Result<bool, String> {
    file_system_service
        .is_path_accessible(&path)
        .await
        .map_err(|e| e.to_string())
}