use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::path::{Path, PathBuf};
use crate::domain::workspace::value_objects::FilePath;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FileSystemItem {
    pub path: FilePath,
    pub name: String,
    pub item_type: FileSystemItemType,
    pub parent_path: Option<FilePath>,
    pub last_modified: DateTime<Utc>,
    pub size: Option<u64>, // bytes, None for directories
    pub is_accessible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FileSystemItemType {
    File,
    Directory,
}

impl FileSystemItemType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FileSystemItemType::File => "file",
            FileSystemItemType::Directory => "directory",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "file" => Some(FileSystemItemType::File),
            "directory" => Some(FileSystemItemType::Directory),
            _ => None,
        }
    }
}

impl FileSystemItem {
    pub fn new(
        path: FilePath,
        item_type: FileSystemItemType,
        last_modified: DateTime<Utc>,
        size: Option<u64>,
        is_accessible: bool,
    ) -> Result<Self, String> {
        let path_buf = PathBuf::from(path.as_str());

        let name = path_buf
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or("Invalid file name")?
            .to_string();

        let parent_path = path_buf
            .parent()
            .map(|p| FilePath::new(p.to_string_lossy().to_string()))
            .transpose()?;

        Ok(Self {
            path,
            name,
            item_type,
            parent_path,
            last_modified,
            size,
            is_accessible,
        })
    }

    pub fn is_file(&self) -> bool {
        matches!(self.item_type, FileSystemItemType::File)
    }

    pub fn is_directory(&self) -> bool {
        matches!(self.item_type, FileSystemItemType::Directory)
    }

    pub fn get_extension(&self) -> Option<String> {
        if self.is_file() {
            Path::new(self.path.as_str())
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|s| s.to_lowercase())
        } else {
            None
        }
    }

    pub fn get_file_size_formatted(&self) -> String {
        match self.size {
            Some(bytes) => format_file_size(bytes),
            None => "--".to_string(),
        }
    }

    pub fn is_within_allowed_directory(&self, source_path: &str, reports_path: &str) -> bool {
        let path_str = self.path.as_str();
        path_str.starts_with(source_path) || path_str.starts_with(reports_path)
    }

    pub fn can_be_opened(&self) -> bool {
        self.is_accessible && self.is_file()
    }

    pub fn can_be_expanded(&self) -> bool {
        self.is_accessible && self.is_directory()
    }

    pub fn get_display_title(&self) -> String {
        if let Some(extension) = self.get_extension() {
            // Remove extension for display title
            self.name.trim_end_matches(&format!(".{}", extension)).to_string()
        } else {
            self.name.clone()
        }
    }
}

fn format_file_size(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: u64 = 1024;

    if bytes < THRESHOLD {
        return format!("{} B", bytes);
    }

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= THRESHOLD as f64 && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD as f64;
        unit_index += 1;
    }

    format!("{:.1} {}", size, UNITS[unit_index])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_file_system_item() {
        let path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let item = FileSystemItem::new(
            path.clone(),
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            true,
        ).unwrap();

        assert_eq!(item.path, path);
        assert_eq!(item.name, "document.txt");
        assert!(item.is_file());
        assert_eq!(item.size, Some(1024));
        assert!(item.is_accessible);
    }

    #[test]
    fn test_file_extension() {
        let path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let item = FileSystemItem::new(
            path,
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            true,
        ).unwrap();

        assert_eq!(item.get_extension(), Some("txt".to_string()));
    }

    #[test]
    fn test_directory_no_size() {
        let path = FilePath::new("/Users/test/Documents/Source/folder".to_string()).unwrap();
        let item = FileSystemItem::new(
            path,
            FileSystemItemType::Directory,
            Utc::now(),
            None,
            true,
        ).unwrap();

        assert!(item.is_directory());
        assert_eq!(item.size, None);
        assert_eq!(item.get_file_size_formatted(), "--");
    }

    #[test]
    fn test_file_size_formatting() {
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(2048), "2.0 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
    }

    #[test]
    fn test_within_allowed_directory() {
        let path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let item = FileSystemItem::new(
            path,
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            true,
        ).unwrap();

        assert!(item.is_within_allowed_directory(
            "/Users/test/Documents/Source",
            "/Users/test/Documents/Reports"
        ));

        assert!(!item.is_within_allowed_directory(
            "/Users/test/Documents/Other",
            "/Users/test/Documents/Reports"
        ));
    }

    #[test]
    fn test_display_title() {
        let path = FilePath::new("/Users/test/Documents/Source/My Document.txt".to_string()).unwrap();
        let item = FileSystemItem::new(
            path,
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            true,
        ).unwrap();

        assert_eq!(item.get_display_title(), "My Document");
    }

    #[test]
    fn test_can_be_opened() {
        let path = FilePath::new("/Users/test/Documents/Source/document.txt".to_string()).unwrap();
        let accessible_file = FileSystemItem::new(
            path.clone(),
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            true,
        ).unwrap();

        let inaccessible_file = FileSystemItem::new(
            path,
            FileSystemItemType::File,
            Utc::now(),
            Some(1024),
            false,
        ).unwrap();

        assert!(accessible_file.can_be_opened());
        assert!(!inaccessible_file.can_be_opened());
    }
}