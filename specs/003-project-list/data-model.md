# Data Model: Project List Management

## Domain Entities

### Project (Aggregate Root)

**Purpose**: Represents a Corpus Review workspace with source document folder and metadata

**Rust Domain Entity**:
```rust
pub struct Project {
    id: ProjectId,
    name: ProjectName,
    source_folder: FolderPath,
    note: Option<ProjectNote>,
    created_at: CreatedAt,
}

impl Project {
    pub fn create(
        id: ProjectId,
        name: ProjectName,
        source_folder: FolderPath,
        note: Option<ProjectNote>,
    ) -> Result<Self, ProjectError> {
        // Business rules validation
        Ok(Project {
            id,
            name,
            source_folder,
            note,
            created_at: CreatedAt::now(),
        })
    }

    pub fn can_be_deleted(&self) -> bool {
        // MVP: All projects can be deleted
        true
    }
}
```

**TypeScript Domain Model**:
```typescript
export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly sourceFolder: string;
  readonly note?: string;
  readonly createdAt: Date;
}

export interface CreateProjectData {
  name: string;
  sourceFolder: string;
  note?: string;
}
```

## Value Objects

### ProjectId
```rust
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProjectId(String);

impl ProjectId {
    pub fn new() -> Self {
        let uuid = Uuid::new_v4();
        ProjectId(format!("proj_{}", uuid))
    }

    pub fn from_string(value: String) -> Result<Self, ProjectError> {
        if !value.starts_with("proj_") {
            return Err(ProjectError::InvalidId);
        }
        Ok(ProjectId(value))
    }

    pub fn value(&self) -> &str {
        &self.0
    }
}
```

```typescript
export type ProjectId = string & { readonly __brand: 'ProjectId' };

export const ProjectId = {
  create(): ProjectId {
    return `proj_${crypto.randomUUID()}` as ProjectId;
  },

  fromString(value: string): ProjectId {
    if (!value.startsWith('proj_')) {
      throw new Error('Invalid project ID format');
    }
    return value as ProjectId;
  }
};
```

### ProjectName
```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectName(String);

impl ProjectName {
    pub fn new(value: String) -> Result<Self, ProjectError> {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            return Err(ProjectError::NameRequired);
        }
        if trimmed.len() > 255 {
            return Err(ProjectError::NameTooLong);
        }
        Ok(ProjectName(trimmed.to_string()))
    }

    pub fn value(&self) -> &str {
        &self.0
    }
}
```

### ProjectNote
```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectNote(String);

impl ProjectNote {
    pub fn new(value: String) -> Result<Self, ProjectError> {
        let trimmed = value.trim();
        if trimmed.len() > 1000 {
            return Err(ProjectError::NoteTooLong);
        }

        // Empty notes are allowed, but we store None instead
        if trimmed.is_empty() {
            return Err(ProjectError::EmptyNote);  // Use this to indicate None should be used
        }

        Ok(ProjectNote(trimmed.to_string()))
    }

    pub fn value(&self) -> &str {
        &self.0
    }
}
```

### FolderPath
```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FolderPath(PathBuf);

impl FolderPath {
    pub fn new(path: String) -> Result<Self, ProjectError> {
        let path_buf = PathBuf::from(&path);

        if !path_buf.exists() {
            return Err(ProjectError::FolderNotFound);
        }

        if !path_buf.is_dir() {
            return Err(ProjectError::NotADirectory);
        }

        Ok(FolderPath(path_buf))
    }

    pub fn value(&self) -> &Path {
        &self.0
    }

    pub fn as_string(&self) -> String {
        self.0.to_string_lossy().to_string()
    }
}
```

### CreatedAt
```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CreatedAt(DateTime<Utc>);

impl CreatedAt {
    pub fn now() -> Self {
        CreatedAt(Utc::now())
    }

    pub fn from_datetime(dt: DateTime<Utc>) -> Self {
        CreatedAt(dt)
    }

    pub fn value(&self) -> DateTime<Utc> {
        self.0
    }
}
```

## Repository Interface

### ProjectRepository (Domain Interface)
```rust
#[async_trait]
pub trait ProjectRepository: Send + Sync {
    async fn save(&self, project: &Project) -> Result<(), ProjectError>;
    async fn find_by_id(&self, id: &ProjectId) -> Result<Option<Project>, ProjectError>;
    async fn find_all(&self) -> Result<Vec<Project>, ProjectError>;
    async fn delete(&self, id: &ProjectId) -> Result<(), ProjectError>;
    async fn exists_with_name(&self, name: &ProjectName) -> Result<bool, ProjectError>;
}
```

## Domain Errors

```rust
#[derive(Debug, thiserror::Error, Serialize)]
pub enum ProjectError {
    #[error("Project name is required")]
    NameRequired,

    #[error("Project name too long (max 255 characters)")]
    NameTooLong,

    #[error("Source folder not found: {path}")]
    FolderNotFound { path: String },

    #[error("Path is not a directory: {path}")]
    NotADirectory { path: String },

    #[error("Invalid project ID format")]
    InvalidId,

    #[error("Project not found: {id}")]
    NotFound { id: String },

    #[error("Database error: {message}")]
    DatabaseError { message: String },

    #[error("A project with name '{name}' already exists")]
    DuplicateName { name: String },

    #[error("Project note too long (max 1000 characters)")]
    NoteTooLong,

    #[error("Empty note provided")]
    EmptyNote,
}
```

## DTOs (Data Transfer Objects)

### ProjectDto (Tauri Command Interface)
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectDto {
    pub id: String,
    pub name: String,
    pub source_folder: String,
    pub note: Option<String>,
    pub created_at: String, // ISO 8601 format
}

impl From<Project> for ProjectDto {
    fn from(project: Project) -> Self {
        ProjectDto {
            id: project.id().value().to_string(),
            name: project.name().value().to_string(),
            source_folder: project.source_folder().as_string(),
            note: project.note().map(|n| n.value().to_string()),
            created_at: project.created_at().value().to_rfc3339(),
        }
    }
}
```

### CreateProjectRequest
```rust
#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub source_folder: String,
    pub note: Option<String>,
}
```

```typescript
export interface CreateProjectRequest {
  name: string;
  sourceFolder: string;
  note?: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  sourceFolder: string;
  note?: string;
  createdAt: string; // ISO 8601
}
```

## Database Schema

### SQLite Table Definition
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE NOT NULL, -- ProjectId value
  name TEXT NOT NULL CHECK(length(name) > 0 AND length(name) <= 255),
  source_folder TEXT NOT NULL,
  note TEXT CHECK(length(note) <= 1000), -- Optional project description
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_projects_uuid ON projects(uuid);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_name ON projects(name);
```

### Database Model (Infrastructure Layer)
```rust
#[derive(Debug, sqlx::FromRow)]
pub struct ProjectRow {
    pub id: i64,
    pub uuid: String,
    pub name: String,
    pub source_folder: String,
    pub note: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl TryFrom<ProjectRow> for Project {
    type Error = ProjectError;

    fn try_from(row: ProjectRow) -> Result<Self, Self::Error> {
        let id = ProjectId::from_string(row.uuid)?;
        let name = ProjectName::new(row.name)?;
        let source_folder = FolderPath::new(row.source_folder)?;
        let note = row.note.map(ProjectNote::new).transpose()?;
        let created_at = CreatedAt::from_datetime(row.created_at);

        Project::create(id, name, source_folder, note, created_at)
    }
}
```

## Validation Rules

### Business Rules
1. **Project Name**: Must be non-empty, max 255 characters, trimmed
2. **Source Folder**: Must exist on filesystem and be a directory
3. **Project ID**: Must follow `proj_` prefix pattern with valid UUID
4. **Project Note**: Optional field, max 1000 characters when provided, trimmed
5. **Deletion**: All projects can be deleted in MVP (no constraints)

### Database Constraints
1. **UUID Uniqueness**: Enforced by unique index
2. **Name Length**: Enforced by CHECK constraint (1-255 characters)
3. **Note Length**: Enforced by CHECK constraint (max 1000 characters)
4. **Non-null Fields**: Required fields (name, source_folder) have NOT NULL constraint

## State Transitions

**MVP Note**: Projects have minimal state transitions in this version.

```
[Created] ←→ [Exists] → [Deleted]
```

- **Created**: New project added to database
- **Exists**: Project available in system
- **Deleted**: Project removed from database (permanent deletion)

Future iterations may add states like:
- **Archived**: Project hidden but preserved
- **Processing**: Project being scanned/indexed
- **Error**: Project with validation issues