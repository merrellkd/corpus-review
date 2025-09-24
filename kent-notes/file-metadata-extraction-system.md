This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: File Metadata Extraction System

This system handles local metadata extraction and processing for all file types in a corpus analysis project, with emphasis on maintaining user privacy through local-only processing. It coordinates with the Document Derivatives Management System to track relationships between original files, extracted versions, and derivatives.

## Supported File Types and Extraction

### Audio Files (.mp3, .wav, .flac, .aac, .ogg, .m4a)

- Duration, format, file size, creation/modification dates
- ID3 tags: artist, album, title, genre, year, track number
- Technical: bitrate, sample rate, channels
- Library: `music-metadata` for local extraction

### Video Files (.mp4, .avi, .mov, .mkv, .webm, .wmv)

- Duration, format, file size, creation/modification dates
- Technical: resolution, codec, frame rate, aspect ratio
- Container metadata if available
- Library: `fluent-ffmpeg` with `ffprobe` for local extraction

### Document Files (Word, RTF, PDF, Markdown, Excel)

- **Content Extraction**: Extract text content from Word (.doc, .docx), RTF (.rtf), PDF, Markdown (.md), Excel (.xls, .xlsx)
- **Format Conversion**: Convert extracted content to .det format (TipTap/ProseMirror JSON)
- **Structure Preservation**: Maintain document structure, formatting, and layout where possible
- **Metadata Extraction**: File system metadata (size, dates), document properties, embedded metadata
- **Error Handling**: Track extraction quality and any processing errors for manual correction
- **MIME type detection** and format validation

### Other File Types

- Basic file system metadata: size, creation date, modification date, file extension
- MIME type detection where possible
- All processing performed locally without network transmission

## Document Extraction and Derivative Creation

### .det File Generation

- **Base Extraction**: Create extracted.det file from original documents
- **TipTap/ProseMirror Format**: Standard JSON format for all extracted content
- **Metadata Embedding**: Include extraction metadata, source references, and processing information
- **Quality Tracking**: Monitor extraction accuracy and flag areas needing manual correction

### Derivative Relationship Tracking

- **Parent-Child Relationships**: Track which derivatives are created from which sources
- **Processing Chain**: Maintain complete history of document transformations
- **Metadata Inheritance**: Propagate relevant metadata from parent to derivative documents
- **Cross-References**: Enable navigation between related documents in different formats

### Derivative-Specific Metadata

- **Creation Tracking**: Timestamp and method for each derivative creation
- **Edit History**: Track manual corrections and modifications to extracted content
- **Processing Status**: Monitor completion status of extraction and derivative generation
- **Relationship Mapping**: Document family trees and transformation chains

## User Interface Requirements

### Project List Integration

- File type indicators and counts (documents, audio, video, other)
- Metadata search across all file types (duration, format, ID3 tags, etc.)
- Document family indicators showing original + derivative counts
- Processing status indicators for extraction and derivative creation

### Document Family Views

- Visual representation of parent-child relationships between documents
- Processing status for each document in the family (original, extracted, derivatives)
- Quick access to extraction quality reports and manual correction interfaces
- Navigation between related documents across different formats

## Data Persistence

### Database Storage

- File processing status/cache stored in project database
- Extracted metadata indexed for search functionality across all file types
- Document relationship mappings and processing chains
- Derivative creation history and edit tracking
- Processing quality scores and error logs

### File System Coordination

- Coordinate with Document Derivatives System for \_metadata.json files in document families
- Maintain consistent metadata between database and file system storage
- Support for both database queries and file system browsing of relationships
- Efficient indexing for search across original files, derivatives, and metadata

### Metadata Synchronization

- Keep database and file system metadata synchronized
- Handle updates when derivatives are created, edited, or deleted
- Maintain referential integrity between originals and derivatives
- Support for metadata migration and cleanup operations

## Integration with Document Derivatives System

### Extraction Process Coordination

- Create base `extracted.det` files in document family folders managed by Document Derivatives System
- Initialize `_metadata.json` files with extraction metadata and processing information
- Update processing status as extraction completes for each document

### Derivative Support

- Provide metadata extraction capabilities for newly created derivative documents
- Update relationship tracking when derivatives are created from extracted content
- Support search indexing across all documents in a family (original, extracted, derivatives)

### Unified Metadata Management

- Consistent metadata format across original files and derivatives
- Coordinate database and file system metadata storage
- Enable unified search across all document types and relationships

## Privacy and Security

- **Local Processing Only**: All metadata extraction performed locally without network transmission
- No data transmitted across network for any file type
- All processing libraries run entirely on user's machine
- Derivative relationships and metadata maintained locally without external dependencies
