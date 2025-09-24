This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: File Metadata Extraction (Enhanced - Iteration 2)

This iteration expands the basic PDF/DOCX extraction from Iteration 1 to include audio/video metadata processing and relationship tracking. It provides comprehensive metadata extraction while coordinating with the new document derivatives system.

## Enhanced Scope

Building on Iteration 1's document extraction, this iteration adds:

- Audio file metadata extraction (MP3, WAV, FLAC, AAC, OGG, M4A)
- Video file metadata extraction (MP4, AVI, MOV, MKV, WEBM, WMV)
- Document family relationship tracking and coordination
- Enhanced metadata storage and indexing for search
- Processing status coordination with derivatives system

**Explicitly NOT in this iteration:**

- Advanced document formats (RTF, Excel) beyond PDF/DOCX
- Complex processing chain history and versioning
- Sophisticated metadata search and filtering UI
- Batch processing operations
- Advanced error recovery and quality assessment
- Network-based metadata services or APIs

## User Scenarios & Testing

### Primary User Story

As a corpus analyst working with mixed media collections, I need comprehensive metadata extraction from all my files (documents, audio, video) so I can understand, search, and organize my corpus effectively while maintaining relationships between original files and their derivatives.

### Acceptance Scenarios

1. **Given** I have audio files in my project, **When** metadata extraction runs, **Then** I can see duration, format, ID3 tags, and technical specifications
2. **Given** I have video files in my project, **When** metadata extraction runs, **Then** I can see duration, resolution, codec information, and file properties
3. **Given** documents are extracted to derivatives folder, **When** I view the workspace, **Then** I can see relationships between originals, extracted versions, and derivatives
4. **Given** metadata extraction is complete, **When** I search or browse, **Then** I can find files using their metadata properties

### Edge Cases

- What happens when audio/video files are corrupted or have missing metadata?
- How does system handle very large media files (>1GB) during metadata extraction?
- What occurs when metadata extraction fails but file extraction succeeds?

## Requirements

### Functional Requirements

- **FR-001**: System MUST extract comprehensive metadata from audio files (duration, format, ID3 tags, technical specs)
- **FR-002**: System MUST extract comprehensive metadata from video files (duration, resolution, codec, container info)
- **FR-003**: System MUST coordinate with Document Derivatives System for relationship tracking
- **FR-004**: System MUST update document family metadata when processing original files
- **FR-005**: System MUST provide unified metadata search across all file types
- **FR-006**: System MUST track processing status for all supported file types
- **FR-007**: System MUST handle metadata extraction errors gracefully without blocking other processing
- **FR-008**: System MUST store metadata in searchable format in database
- **FR-009**: System MUST coordinate metadata updates with derivatives folder structure
- **FR-010**: System MUST provide metadata-based file organization and filtering

### Key Entities

- **Audio Metadata**: Duration, format, bitrate, sample rate, ID3 tags (artist, album, title, genre, year)
- **Video Metadata**: Duration, format, resolution, codec, frame rate, aspect ratio, container info
- **File Relationships**: Mappings between original files, extracted versions, and derivatives
- **Processing Chain**: History of metadata extraction and document processing operations

## Audio Metadata Extraction

### Supported Audio Formats

- **MP3**: ID3v1/ID3v2 tags, MPEG audio properties
- **WAV**: Basic audio properties, embedded metadata
- **FLAC**: Vorbis comments, lossless audio properties
- **AAC/M4A**: iTunes-style metadata, AAC properties
- **OGG**: Vorbis comments, Ogg container properties

### Extracted Audio Properties

```json
{
  "fileType": "audio",
  "format": "MP3",
  "duration": 180.5,
  "fileSize": 4321567,
  "bitrate": 192,
  "sampleRate": 44100,
  "channels": 2,
  "id3Tags": {
    "title": "Track Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "genre": "Genre",
    "year": "2024",
    "trackNumber": "03"
  },
  "technicalInfo": {
    "encoding": "MPEG-1 Layer 3",
    "mode": "Joint Stereo",
    "emphasis": "None"
  }
}
```

## Video Metadata Extraction

### Supported Video Formats

- **MP4**: H.264/H.265 video, AAC audio, MP4 container
- **AVI**: Various codecs, AVI container format
- **MOV**: QuickTime container with multiple codec support
- **MKV**: Matroska container with extensive codec support
- **WEBM**: VP8/VP9 video, Vorbis/Opus audio
- **WMV**: Windows Media Video format

### Extracted Video Properties

```json
{
  "fileType": "video",
  "format": "MP4",
  "duration": 3600.25,
  "fileSize": 1073741824,
  "resolution": {
    "width": 1920,
    "height": 1080
  },
  "videoCodec": "H.264",
  "audioCodec": "AAC",
  "frameRate": 29.97,
  "aspectRatio": "16:9",
  "bitrate": 2500,
  "container": {
    "type": "MP4",
    "version": "1.0"
  }
}
```

## Document Family Integration

### Relationship Tracking Enhancement

- **Original File Metadata**: Link extracted audio/video metadata to document families when applicable
- **Cross-Reference Updates**: Update document family \_metadata.json with multimedia file information
- **Processing Coordination**: Coordinate metadata extraction timing with derivative creation
- **Unified Search**: Enable search across document content and multimedia metadata

### Enhanced \_metadata.json Structure

```json
{
  "originalFile": {
    "path": "/source/document1.pdf",
    "name": "document1.pdf",
    "metadata": {
      "fileSize": 2048576,
      "created": "2024-09-20T10:00:00Z",
      "modified": "2024-09-22T15:30:00Z"
    }
  },
  "associatedMedia": [
    {
      "path": "/source/related-audio.mp3",
      "type": "audio",
      "metadata": {
        "duration": 180.5,
        "format": "MP3",
        "title": "Interview Recording"
      }
    }
  ],
  "extracted": {
    "filename": "extracted.det",
    "created": "2024-09-24T10:30:00Z",
    "status": "completed",
    "extractionQuality": "good"
  },
  "derivatives": [...]
}
```

## Database Schema Extensions

### Enhanced File Metadata Storage

```sql
-- Enhanced file metadata table
CREATE TABLE file_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'document', 'audio', 'video', 'other'
  file_size INTEGER,
  file_modified DATETIME,

  -- Document metadata
  document_format TEXT,
  extraction_status TEXT,
  extraction_quality TEXT,

  -- Audio metadata
  audio_duration REAL,
  audio_bitrate INTEGER,
  audio_sample_rate INTEGER,
  audio_title TEXT,
  audio_artist TEXT,
  audio_album TEXT,
  audio_genre TEXT,
  audio_year TEXT,

  -- Video metadata
  video_duration REAL,
  video_width INTEGER,
  video_height INTEGER,
  video_codec TEXT,
  video_frame_rate REAL,
  video_bitrate INTEGER,

  -- Processing metadata
  processed_at DATETIME,
  processing_errors TEXT,

  -- Relationships
  document_family_id TEXT,
  related_files TEXT, -- JSON array of related file paths

  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Search optimization indexes
CREATE INDEX idx_file_metadata_project ON file_metadata(project_id);
CREATE INDEX idx_file_metadata_type ON file_metadata(file_type);
CREATE INDEX idx_file_metadata_family ON file_metadata(document_family_id);
CREATE INDEX idx_audio_metadata ON file_metadata(audio_title, audio_artist, audio_album);
CREATE INDEX idx_video_metadata ON file_metadata(video_width, video_height, video_duration);
```

## Processing Workflow Enhancement

### Multi-Type Processing Coordination

1. **File Discovery**: Scan source folder for all supported file types
2. **Type Classification**: Categorize files as document, audio, video, other
3. **Parallel Processing**: Extract metadata from different file types concurrently
4. **Document Processing**: Create derivatives for documents, coordinate with derivatives system
5. **Relationship Mapping**: Link related files and update family metadata
6. **Database Updates**: Store all metadata in searchable format
7. **Status Updates**: Update processing status for project list display

### Processing Libraries

- **Audio Metadata**: `music-metadata` npm package for comprehensive audio metadata extraction
- **Video Metadata**: `ffprobe` (via `fluent-ffmpeg`) for video metadata extraction
- **Document Processing**: Existing PDF/DOCX extraction libraries from Iteration 1
- **File System**: Node.js `fs` modules for basic file metadata

## User Interface Integration

### Enhanced Workspace File Browser

```
📁 /source/
  📄 document1.pdf (2.1MB, 15 pages)
  🎵 interview.mp3 (♪ 3:45, 192kbps, "John Interview")
  🎥 presentation.mp4 (📹 25:30, 1080p, H.264)

📁 /derivatives/
  📂 doc_1/ (document1.pdf family)
    📄 extracted.det
    📝 summary-general.det
```

### Metadata Display

- **Audio Files**: Show duration, quality (bitrate), title/artist if available
- **Video Files**: Show duration, resolution, codec information
- **Documents**: Show page count, file size, extraction status
- **Processing Status**: Visual indicators for metadata extraction progress

### Search Integration Preparation

- **Metadata Fields**: Prepare audio/video metadata for search functionality
- **Filter Categories**: Enable filtering by file type, duration, quality
- **Quick Info**: Hover tooltips showing key metadata properties

## Performance Requirements

### Processing Performance

- **Audio Metadata**: Extract metadata within 2 seconds per audio file
- **Video Metadata**: Extract metadata within 5 seconds per video file (up to 1GB)
- **Concurrent Processing**: Handle 5-10 files simultaneously without system overload
- **Memory Management**: Efficient memory usage, avoid loading entire files into memory

### Database Performance

- **Metadata Storage**: Insert/update metadata within 100ms per file
- **Search Queries**: Metadata-based searches complete within 500ms
- **Indexing**: Maintain responsive search performance with 1000+ media files

## Error Handling

### Metadata Extraction Errors

- **Corrupted Audio**: "Audio file appears corrupted. Basic file info available."
- **Unsupported Video Codec**: "Video codec not supported for metadata extraction."
- **Missing Libraries**: "Media processing libraries not available. Install required dependencies."
- **Large File Timeout**: "Metadata extraction timed out for large file. Basic info available."

### Processing Coordination Errors

- **Derivative Sync Failures**: Continue processing other files, log sync errors
- **Database Update Failures**: Retry metadata storage, maintain processing progress
- **File Access Errors**: Skip inaccessible files, continue with available files

## Integration Points

### With Document Derivatives System

- **Family Coordination**: Update family metadata when processing mixed media projects
- **Processing Status**: Coordinate extraction status with derivative creation progress
- **Relationship Tracking**: Maintain links between documents and associated media files

### With Project List Enhancement

- **File Counts**: Provide accurate audio/video file counts for project display
- **Processing Progress**: Report metadata extraction progress for status indicators
- **Status Updates**: Update project status based on overall processing completion

### Future Integration Preparation

- **Advanced Search**: Comprehensive metadata ready for content-based search
- **Media Preview**: Metadata foundation for audio/video preview functionality
- **Batch Operations**: Processing infrastructure ready for bulk operations

## Success Criteria

### Metadata Accuracy

- **Audio Files**: 95%+ accuracy for standard MP3/AAC files with proper ID3 tags
- **Video Files**: Reliable duration, resolution, and codec detection for common formats
- **Processing Coverage**: Successfully process 90%+ of common audio/video files
- **Error Handling**: Graceful degradation when metadata extraction fails

### Performance Targets

- **Processing Speed**: Complete metadata extraction for typical project (50 files) within 60 seconds
- **System Responsiveness**: UI remains responsive during background metadata processing
- **Resource Usage**: Memory usage stays under 500MB during processing
- **Database Efficiency**: Metadata queries support responsive search and filtering

### User Experience

- **Progress Visibility**: Clear indication of metadata extraction progress
- **Information Access**: Essential metadata visible in file browser and search
- **Error Communication**: Clear error messages when processing fails
- **Integration Smoothness**: Seamless coordination with document derivatives workflow

This enhanced metadata extraction system provides comprehensive support for mixed media corpus analysis while maintaining coordination with the document derivatives system and preparing the foundation for advanced search and discovery capabilities.
