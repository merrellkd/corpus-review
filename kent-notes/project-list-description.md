This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Project List

This will temporarily be the starting screen while several application features are in development. This is so that we can get the source folder and reports folder specified for development at the project level.

- Create new projects
  - Project Name (required)
  - Source folder (required). This should bring up a system folder picker.

**Architectural Decision: Reports Folder Strategy**

Given the corpus analysis nature of this application, we will implement a hybrid approach:

1. **Default Behavior**: Reports folder is optional but recommended
2. **Immutable Source Mode**: When selected, source files remain untouched and all analysis/reports go to a separate reports folder
3. **Integrated Mode**: When reports folder is not specified, reports are saved within the source folder structure

**Implementation Details:**

- Reports folder (optional). This should bring up a system folder picker
- If no reports folder is specified, create a `_corpus_analysis` subfolder within the source directory
- Our file editing uses TipTap editor with ProseMirror backend
- Extracted/converted files use `.corpus` extension to distinguish from originals
- Support extraction from: Word (.doc, .docx), RTF (.rtf), PDF, Markdown (.md), Excel (.xls, .xlsx)
- Support local metadata extraction from: Audio (.mp3, .wav, .flac, .aac, .ogg, .m4a), Video (.mp4, .avi, .mov, .mkv, .webm, .wmv), and any other file types in corpus (no data transmission across network)

## User Interface Requirements

### Project Creation Form

- Project Name (required, text input)
- Source Folder (required, folder picker with validation)
- Reports Folder (optional, folder picker)
- Project Description (optional, textarea)
- Immutable Source toggle (checkbox, default: false)

### Project List View

- Grid/list view of existing projects
- Search/filter functionality
- Sort by: name, creation date, last modified
- Project status indicators (active, archived, etc.)
- File type indicators and counts (documents, audio, video, other)
- Metadata search across all file types (duration, format, ID3 tags, etc.)

### Project Actions

- Open Project (primary action)
- Edit Project Settings
- Archive Project
- Delete Project (with confirmation dialog)

## Data Persistence

- Projects stored in SQLite database
- Project metadata includes:
  - ID, name, description
  - Source and reports folder paths
  - Creation and modification timestamps
  - Settings (immutable mode, etc.)
  - File processing status/cache

## Metadata Extraction (Local Processing Only)

**Audio Files:**

- Duration, format, file size, creation/modification dates
- ID3 tags: artist, album, title, genre, year, track number
- Technical: bitrate, sample rate, channels
- Library: `music-metadata` for local extraction

**Video Files:**

- Duration, format, file size, creation/modification dates
- Technical: resolution, codec, frame rate, aspect ratio
- Container metadata if available
- Library: `fluent-ffmpeg` with `ffprobe` for local extraction

**Other File Types:**

- Basic file system metadata: size, creation date, modification date, file extension
- MIME type detection where possible
- All processing performed locally without network transmission

## Delete Project Dialog

When deleting a project, present options:

1. **Remove from list only** - Keep all files, remove from database
2. **Archive project** - Move to cold storage, compress data
3. **Full deletion** - Remove database entry and all generated files

Show storage impact:

- Database records: ~X KB
- Generated reports: ~X MB
- Cached extractions: ~X MB
- Total: ~X MB

**Note**: Original source files are never deleted automatically.
