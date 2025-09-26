use crate::application::file_system_service::FileSystemService;
use tauri::State;

// Temporarily commented out due to missing FileSystemItemDto
/*
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
*/

#[tauri::command]
pub async fn is_path_accessible(
    path: String,
    _file_system_service: State<'_, FileSystemService>,
) -> Result<bool, String> {
    // Simple implementation using std::fs instead of service
    use std::path::Path;
    let path_obj = Path::new(&path);
    Ok(path_obj.exists())
}
