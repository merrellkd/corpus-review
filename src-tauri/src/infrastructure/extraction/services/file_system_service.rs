use std::path::{Path, PathBuf};
use std::fs::{self, File};
use std::time::SystemTime;
use tokio::fs as async_fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufWriter as AsyncBufWriter};
use crate::infrastructure::errors::{AppError, AppResult};
use crate::infrastructure::extraction::serializers::prosemirror_serializer::{
    ProseMirrorDocument, ProseMirrorSerializer
};

/// File metadata for .det files
#[derive(Debug, Clone)]
pub struct DetFileMetadata {
    pub file_path: PathBuf,
    pub original_path: PathBuf,
    pub file_size: u64,
    pub created: SystemTime,
    pub modified: SystemTime,
    pub is_readonly: bool,
}

/// File system service for managing .det files alongside original documents
pub struct FileSystemService;

impl FileSystemService {
    /// Maximum file size for processing (10MB)
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

    /// .det file extension
    const DET_EXTENSION: &'static str = "det";

    /// Generate .det file path from original file path
    /// Original: /path/to/document.pdf -> /path/to/document.pdf.det
    pub fn generate_det_path(original_path: &Path) -> PathBuf {
        let mut det_path = original_path.to_path_buf();
        det_path.set_extension(
            format!("{}.{}",
                original_path.extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or(""),
                Self::DET_EXTENSION
            )
        );
        det_path
    }

    /// Check if a path represents a .det file
    pub fn is_det_file(path: &Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| ext == Self::DET_EXTENSION)
            .unwrap_or(false)
    }

    /// Get the original file path from a .det file path
    /// /path/to/document.pdf.det -> /path/to/document.pdf
    pub fn get_original_path(det_path: &Path) -> AppResult<PathBuf> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "Path is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        let file_stem = det_path.file_stem()
            .and_then(|stem| stem.to_str())
            .ok_or_else(|| AppError::validation_error(
                "Cannot extract original filename from .det file",
                Some(format!("Path: {}", det_path.display()))
            ))?;

        let parent = det_path.parent()
            .unwrap_or_else(|| Path::new("."));

        Ok(parent.join(file_stem))
    }

    /// Check if a .det file exists for the given original file
    pub fn det_file_exists(original_path: &Path) -> bool {
        let det_path = Self::generate_det_path(original_path);
        det_path.exists()
    }

    /// Validate file size is within limits
    pub fn validate_file_size(path: &Path) -> AppResult<u64> {
        let metadata = fs::metadata(path)
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read file metadata for {}: {}", path.display(), e)
            ))?;

        let size = metadata.len();
        if size > Self::MAX_FILE_SIZE {
            return Err(AppError::validation_error(
                "File too large for processing",
                Some(format!("File size: {} bytes, limit: {} bytes", size, Self::MAX_FILE_SIZE))
            ));
        }

        Ok(size)
    }

    /// Check if original file is supported for extraction
    pub fn is_supported_file_type(path: &Path) -> bool {
        path.extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| {
                let ext_lower = ext.to_lowercase();
                matches!(ext_lower.as_str(), "pdf" | "docx" | "md" | "markdown")
            })
            .unwrap_or(false)
    }

    /// Validate file permissions and accessibility
    pub fn validate_file_access(path: &Path) -> AppResult<()> {
        if !path.exists() {
            return Err(AppError::not_found(format!("File: {}", path.display())));
        }

        let metadata = fs::metadata(path)
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot access file {}: {}", path.display(), e)
            ))?;

        if !metadata.is_file() {
            return Err(AppError::validation_error(
                "Path is not a regular file",
                Some(format!("Path: {}", path.display()))
            ));
        }

        // Check read permissions
        let _file = File::open(path)
            .map_err(|e| AppError::permission_error(
                format!("Cannot read file {}: {}", path.display(), e)
            ))?;

        Ok(())
    }

    /// Create a new .det file with ProseMirror content
    pub async fn create_det_file(
        original_path: &Path,
        content: &ProseMirrorDocument
    ) -> AppResult<PathBuf> {
        // Validate original file
        Self::validate_file_access(original_path)?;
        Self::validate_file_size(original_path)?;

        if !Self::is_supported_file_type(original_path) {
            return Err(AppError::validation_error(
                "Unsupported file type for extraction",
                Some(format!("File: {}", original_path.display()))
            ));
        }

        let det_path = Self::generate_det_path(original_path);

        // Check if .det file already exists
        if det_path.exists() {
            return Err(AppError::conflict(
                format!("Extracted document already exists: {}", det_path.display())
            ));
        }

        // Serialize content to JSON
        let json_content = ProseMirrorSerializer::serialize_to_json(content)?;

        // Create parent directory if it doesn't exist
        if let Some(parent) = det_path.parent() {
            async_fs::create_dir_all(parent).await
                .map_err(|e| AppError::filesystem_error(
                    format!("Cannot create directory {}: {}", parent.display(), e)
                ))?;
        }

        // Write content to .det file atomically
        Self::write_det_file_atomic(&det_path, &json_content).await?;

        Ok(det_path)
    }

    /// Read ProseMirror content from a .det file
    pub async fn read_det_file(det_path: &Path) -> AppResult<ProseMirrorDocument> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        Self::validate_file_access(det_path)?;

        // Read file content
        let mut file = async_fs::File::open(det_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot open .det file {}: {}", det_path.display(), e)
            ))?;

        let mut content = String::new();
        file.read_to_string(&mut content).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read .det file {}: {}", det_path.display(), e)
            ))?;

        // Parse and validate ProseMirror document
        ProseMirrorSerializer::deserialize_from_json(&content)
    }

    /// Write ProseMirror content to a .det file (update existing)
    pub async fn write_det_file(
        det_path: &Path,
        content: &ProseMirrorDocument
    ) -> AppResult<()> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        if !det_path.exists() {
            return Err(AppError::not_found(format!("Det file: {}", det_path.display())));
        }

        // Validate and sanitize content
        let mut content_copy = content.clone();
        ProseMirrorSerializer::sanitize_document(&mut content_copy)?;

        // Serialize content
        let json_content = ProseMirrorSerializer::serialize_to_json(&content_copy)?;

        // Write atomically
        Self::write_det_file_atomic(det_path, &json_content).await
    }

    /// Atomic write operation for .det files (write to temp file, then rename)
    async fn write_det_file_atomic(det_path: &Path, content: &str) -> AppResult<()> {
        let temp_path = det_path.with_extension(
            format!("{}.tmp", det_path.extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("det"))
        );

        // Write to temporary file
        {
            let temp_file = async_fs::File::create(&temp_path).await
                .map_err(|e| AppError::filesystem_error(
                    format!("Cannot create temporary file {}: {}", temp_path.display(), e)
                ))?;

            let mut writer = AsyncBufWriter::new(temp_file);
            writer.write_all(content.as_bytes()).await
                .map_err(|e| AppError::filesystem_error(
                    format!("Cannot write to temporary file {}: {}", temp_path.display(), e)
                ))?;

            writer.flush().await
                .map_err(|e| AppError::filesystem_error(
                    format!("Cannot flush temporary file {}: {}", temp_path.display(), e)
                ))?;
        } // File is closed here

        // Atomically rename temp file to final location
        async_fs::rename(&temp_path, det_path).await
            .map_err(|e| {
                // Try to clean up temp file if rename fails
                let _ = std::fs::remove_file(&temp_path);
                AppError::filesystem_error(
                    format!("Cannot rename temporary file {} to {}: {}",
                        temp_path.display(), det_path.display(), e)
                )
            })
    }

    /// Delete a .det file
    pub async fn delete_det_file(det_path: &Path) -> AppResult<()> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        if !det_path.exists() {
            return Ok(()); // Already deleted, operation is idempotent
        }

        async_fs::remove_file(det_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot delete .det file {}: {}", det_path.display(), e)
            ))
    }

    /// Get metadata for a .det file
    pub async fn get_det_file_metadata(det_path: &Path) -> AppResult<DetFileMetadata> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        let metadata = async_fs::metadata(det_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read metadata for {}: {}", det_path.display(), e)
            ))?;

        let original_path = Self::get_original_path(det_path)?;

        Ok(DetFileMetadata {
            file_path: det_path.to_path_buf(),
            original_path,
            file_size: metadata.len(),
            created: metadata.created()
                .unwrap_or(SystemTime::UNIX_EPOCH),
            modified: metadata.modified()
                .unwrap_or(SystemTime::UNIX_EPOCH),
            is_readonly: metadata.permissions().readonly(),
        })
    }

    /// List all .det files in a directory
    pub async fn list_det_files_in_directory(dir_path: &Path) -> AppResult<Vec<PathBuf>> {
        if !dir_path.is_dir() {
            return Err(AppError::validation_error(
                "Path is not a directory",
                Some(format!("Path: {}", dir_path.display()))
            ));
        }

        let mut entries = async_fs::read_dir(dir_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read directory {}: {}", dir_path.display(), e)
            ))?;

        let mut det_files = Vec::new();

        while let Some(entry) = entries.next_entry().await
            .map_err(|e| AppError::filesystem_error(
                format!("Error reading directory entry: {}", e)
            ))?
        {
            let path = entry.path();
            if path.is_file() && Self::is_det_file(&path) {
                det_files.push(path);
            }
        }

        det_files.sort();
        Ok(det_files)
    }

    /// Backup a .det file before modification
    pub async fn backup_det_file(det_path: &Path) -> AppResult<PathBuf> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        if !det_path.exists() {
            return Err(AppError::not_found(format!("Det file: {}", det_path.display())));
        }

        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let backup_path = det_path.with_extension(
            format!("{}.backup.{}",
                det_path.extension()
                    .and_then(|ext| ext.to_str())
                    .unwrap_or("det"),
                timestamp
            )
        );

        async_fs::copy(det_path, &backup_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot create backup of {}: {}", det_path.display(), e)
            ))?;

        Ok(backup_path)
    }

    /// Check if the original file is newer than the .det file (needs re-extraction)
    pub async fn is_original_newer(original_path: &Path) -> AppResult<bool> {
        let det_path = Self::generate_det_path(original_path);

        if !det_path.exists() {
            return Ok(true); // No .det file exists, so original is "newer"
        }

        let original_metadata = async_fs::metadata(original_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read original file metadata {}: {}", original_path.display(), e)
            ))?;

        let det_metadata = async_fs::metadata(&det_path).await
            .map_err(|e| AppError::filesystem_error(
                format!("Cannot read .det file metadata {}: {}", det_path.display(), e)
            ))?;

        let original_modified = original_metadata.modified()
            .unwrap_or(SystemTime::UNIX_EPOCH);
        let det_modified = det_metadata.modified()
            .unwrap_or(SystemTime::UNIX_EPOCH);

        Ok(original_modified > det_modified)
    }

    /// Validate .det file integrity (check if it contains valid ProseMirror JSON)
    pub async fn validate_det_file_integrity(det_path: &Path) -> AppResult<bool> {
        match Self::read_det_file(det_path).await {
            Ok(_) => Ok(true),
            Err(e) if matches!(e.code.as_str(), "VALIDATION_ERROR") => Ok(false),
            Err(e) => Err(e),
        }
    }

    /// Repair a corrupted .det file by creating an empty document
    pub async fn repair_det_file(det_path: &Path) -> AppResult<()> {
        if !Self::is_det_file(det_path) {
            return Err(AppError::validation_error(
                "File is not a .det file",
                Some(format!("Path: {}", det_path.display()))
            ));
        }

        // Create backup of corrupted file
        if det_path.exists() {
            let _backup_path = Self::backup_det_file(det_path).await?;
        }

        // Create a new empty document
        let empty_doc = ProseMirrorSerializer::create_empty_document();
        let json_content = ProseMirrorSerializer::serialize_to_json(&empty_doc)?;

        // Write the repaired content
        Self::write_det_file_atomic(det_path, &json_content).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::{TempDir, NamedTempFile};
    use tokio::fs::File;
    use tokio::io::AsyncWriteExt;

    #[test]
    fn test_generate_det_path() {
        let original = Path::new("/path/to/document.pdf");
        let det_path = FileSystemService::generate_det_path(original);
        assert_eq!(det_path, Path::new("/path/to/document.pdf.det"));

        let markdown = Path::new("/path/to/readme.md");
        let det_path = FileSystemService::generate_det_path(markdown);
        assert_eq!(det_path, Path::new("/path/to/readme.md.det"));
    }

    #[test]
    fn test_is_det_file() {
        assert!(FileSystemService::is_det_file(Path::new("/path/file.pdf.det")));
        assert!(FileSystemService::is_det_file(Path::new("document.det")));
        assert!(!FileSystemService::is_det_file(Path::new("/path/file.pdf")));
        assert!(!FileSystemService::is_det_file(Path::new("document.txt")));
    }

    #[test]
    fn test_get_original_path() {
        let det_path = Path::new("/path/to/document.pdf.det");
        let original = FileSystemService::get_original_path(det_path).unwrap();
        assert_eq!(original, Path::new("/path/to/document.pdf"));

        let invalid_path = Path::new("/path/to/document.pdf");
        let result = FileSystemService::get_original_path(invalid_path);
        assert!(result.is_err());
    }

    #[test]
    fn test_is_supported_file_type() {
        assert!(FileSystemService::is_supported_file_type(Path::new("doc.pdf")));
        assert!(FileSystemService::is_supported_file_type(Path::new("doc.docx")));
        assert!(FileSystemService::is_supported_file_type(Path::new("readme.md")));
        assert!(FileSystemService::is_supported_file_type(Path::new("readme.markdown")));
        assert!(!FileSystemService::is_supported_file_type(Path::new("doc.txt")));
        assert!(!FileSystemService::is_supported_file_type(Path::new("image.jpg")));
    }

    #[tokio::test]
    async fn test_create_and_read_det_file() {
        let temp_dir = TempDir::new().unwrap();
        let original_path = temp_dir.path().join("test.pdf");

        // Create a dummy original file
        let mut original_file = File::create(&original_path).await.unwrap();
        original_file.write_all(b"PDF content").await.unwrap();

        // Create a ProseMirror document
        let doc = ProseMirrorSerializer::create_empty_document();

        // Create .det file
        let det_path = FileSystemService::create_det_file(&original_path, &doc).await.unwrap();
        assert!(det_path.exists());
        assert!(FileSystemService::is_det_file(&det_path));

        // Read .det file
        let read_doc = FileSystemService::read_det_file(&det_path).await.unwrap();
        assert_eq!(read_doc.doc_type, "doc");
    }

    #[tokio::test]
    async fn test_atomic_write() {
        let temp_dir = TempDir::new().unwrap();
        let det_path = temp_dir.path().join("test.pdf.det");
        let content = r#"{"type":"doc","content":[]}"#;

        FileSystemService::write_det_file_atomic(&det_path, content).await.unwrap();
        assert!(det_path.exists());

        let read_content = tokio::fs::read_to_string(&det_path).await.unwrap();
        assert_eq!(read_content, content);
    }

    #[tokio::test]
    async fn test_validate_file_size() {
        let temp_dir = TempDir::new().unwrap();
        let test_file = temp_dir.path().join("test.pdf");

        // Create a small file
        let mut file = File::create(&test_file).await.unwrap();
        file.write_all(b"small content").await.unwrap();

        let size = FileSystemService::validate_file_size(&test_file).unwrap();
        assert!(size < FileSystemService::MAX_FILE_SIZE);
    }

    #[tokio::test]
    async fn test_backup_det_file() {
        let temp_dir = TempDir::new().unwrap();
        let det_path = temp_dir.path().join("test.pdf.det");

        // Create a .det file
        let mut file = File::create(&det_path).await.unwrap();
        file.write_all(b"original content").await.unwrap();

        // Create backup
        let backup_path = FileSystemService::backup_det_file(&det_path).await.unwrap();
        assert!(backup_path.exists());
        assert_ne!(backup_path, det_path);

        let backup_content = tokio::fs::read_to_string(backup_path).await.unwrap();
        assert_eq!(backup_content, "original content");
    }

    #[tokio::test]
    async fn test_list_det_files_in_directory() {
        let temp_dir = TempDir::new().unwrap();

        // Create some files
        File::create(temp_dir.path().join("doc1.pdf.det")).await.unwrap();
        File::create(temp_dir.path().join("doc2.docx.det")).await.unwrap();
        File::create(temp_dir.path().join("not_det.pdf")).await.unwrap();

        let det_files = FileSystemService::list_det_files_in_directory(temp_dir.path()).await.unwrap();
        assert_eq!(det_files.len(), 2);
        assert!(det_files.iter().all(|p| FileSystemService::is_det_file(p)));
    }
}