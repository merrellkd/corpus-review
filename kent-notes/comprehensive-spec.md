# PAI-Brains: Comprehensive Feature Specification

## Project Architecture Overview

Based on analysis of the complete codebase across `/pai-brains/src/`, `/pai-brains/ui-lab/`, and `/pai-brains/pb-annotation-system/`, PAI-Brains is a sophisticated **document intelligence core-platform** with the following architectural components:

### Technology Stack
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Tauri (Rust)
- **Database**: SurrealDB (embedded graph database)
- **AI Integration**: Hybrid (Local Ollama + configurable cloud fallback)
- **Architecture**: Domain-Driven Design (DDD) with Platform-First approach

### Project Structure
```
pai-brains/
├── src/                          # Main DDD-first architecture
│   ├── core-platform/            # Document intelligence foundation
│   ├── modules/                  # Vertical applications
│   ├── blueprints/              # Pre-configured app combinations
│   ├── ui-foundation/           # Shared design system
│   └── shared-infrastructure/    # Technical concerns
├── ui-lab/                      # Visual prototyping environment
├── pb-annotation-system/        # Legacy/reference implementation
└── docs/                        # Comprehensive architecture docs
```

## Core Platform Features (Implemented)

### 1. Multi-Document Workspace (MDW)
**Status**: Core implementation complete
**Location**: `src/core-platform/multi-document-workspace/`

**Key Capabilities**:
- **Document Caddies**: Side-by-side document viewing with synchronized state
- **Workspace Sessions**: Persistent multi-document working sessions
- **Cross-Document Linking**: Visual connections between related documents
- **Simultaneous Annotation**: Work across multiple documents with shared annotation context

**Implementation Components**:
- `DocumentManagementWorkspace` - Main workspace container
- Document caddy system for multi-document viewing
- Session persistence and restoration
- Cross-document relationship management

### 2. Document Annotation System
**Status**: Fully implemented with rich UI components
**Location**: `src/core-platform/document-annotation-system/`

**Key Capabilities**:
- **Rich Annotation Types**: Configurable annotation categories with color coding (Highlight, Definition, Person, Date, Terms/Definitions)
- **Contextual Notes**: Detailed notes attached to highlighted text
- **Multi-Level Tagging**: Document-level and annotation-level tag organization
- **Link Generation**: Shareable links to specific annotations
- **Visual Highlighting**: Color-coded text highlighting with type identification

**Implementation Components**:
- `AnnotationHighlight` - Core annotation display component
- `AnnotationTypeEditorModal` - Type management interface
- `ColorPicker` - Custom color selection for annotation types
- Annotation services for CRUD operations
- Text selection hooks and utilities

### 3. Project Management & Start Page
**Status**: Implemented with professional UI
**Location**: `src/ui-foundation/components/start-page/`

**Key Capabilities**:
- **Project Cards**: Visual project browser with metadata
- **Recent Projects**: Quick access to recently accessed projects
- **Project Actions**: Settings, export, duplicate, delete workflows
- **Grid/List Views**: Flexible project organization views
- **Search/Filter**: Find projects by name, type, or metadata

**Implementation Components**:
- `StartPage` - Main project selection interface
- Project card components with hover states
- Modal systems for project actions
- Project metadata management

### 4. File Organization System
**Status**: Comprehensive implementation
**Location**: Multiple locations across core-platform

**Key Capabilities**:
- **File Explorer**: Traditional hierarchical folder navigation
- **Category Explorer**: Dynamic document categorization system
- **Advanced Search**: Multi-criteria search across files, content, and annotations
- **File Status Tracking**: Document lifecycle states (new, categorized, annotated, reviewed)
- **Bulk Operations**: Mass file import and organization

**Implementation Categories**:
- Case Intake
- Medical Records (Historical, Hospital, Outpatient)
- Legal Documents
- Analysis Notes
- Reports
- Communication
- Reference Material
- Miscellaneous Supporting Files

### 5. Advanced Search Interface
**Status**: Sophisticated multi-selector implementation
**Location**: Search components throughout platform

**Key Capabilities**:
- **Multi-Criteria Search**: Filename, content, tags, annotations
- **Category Filtering**: Search within specific document types
- **Annotation Search**: Find by annotation type, highlighted text, notes
- **Tag-Based Search**: Document and annotation-level tag filtering
- **AI-Powered Search**: Natural language content queries

**Search Contexts**:
- Global project search
- Category-specific search
- Cross-document pattern search
- Annotation content search

### 6. UI Foundation & Design System
**Status**: Comprehensive implementation with CSS custom properties
**Location**: `src/ui-foundation/` and `ui-lab/`

**Key Components**:
- **Design Tokens**: CSS custom properties for theming (`--pai-*` variables)
- **Professional Styling**: Clean, modern interface suitable for professional use
- **Responsive Design**: Adaptable layouts for different screen sizes
- **Component Library**: Reusable UI components with consistent styling
- **Visual Prototyping**: UI Lab for rapid component development

**Design System Features**:
- Color palette with semantic naming
- Typography scale and font families
- Spacing and layout utilities
- Component variants and states
- Professional color schemes

## Advanced Features (Documented/Planned)

### 7. Git-Aware Functionality
**Status**: Documented architecture, some implementation
**Capabilities**:
- Branch change detection
- Git workflow integration
- Version control compatibility
- File system synchronization with git awareness

### 8. Multi-Format Document Parsing
**Status**: Architecture defined
**Supported Formats**:
- PDF files with text extraction
- DOCX document processing
- Excel/CSV data files
- Image files (OCR capability)
- Email files (.eml)
- YAML front matter handling

### 9. AI Integration Architecture
**Status**: Hybrid architecture planned
**Components**:
- Local Ollama integration
- Cloud AI fallback routing
- AI provenance tracking
- Decision extraction from documents
- Automated document classification

### 10. Module Architecture
**Status**: DDD structure established
**Vertical Modules**:
- **Legal Module**: Case management, expert witness workflows, compliance tracking
- **Medical Module**: Patient record analysis, treatment timelines, compliance monitoring
- **DevOps Module**: System monitoring, alert management, incident tracking
- **Research Module**: Literature review, citation management, academic workflows

### 11. Blueprint System
**Status**: Architecture defined
**Blueprint Examples**:
- Expert Witness Blueprint (core-platform + legal module + cost report templates)
- System Monitor Blueprint (core-platform + devops module + incident templates)
- Knowledge Worker Blueprint (core-platform + general templates)

## Implementation Architecture

### Domain-Driven Design Structure
Each feature follows strict DDD patterns:

```
feature-name/
├── domain/              # Pure business logic
│   ├── aggregates/      # Business rule enforcement
│   ├── entities/        # Domain objects with identity
│   ├── value-objects/   # Immutable values with validation
│   ├── events/          # Domain events for integration
│   └── repositories/    # Repository interfaces
├── application/         # Use cases and orchestration
│   └── services/        # Application services
├── infrastructure/      # External concerns
│   ├── repositories/    # Tauri/database implementations
│   └── services/        # External integrations
└── ui/                  # React components
    ├── components/      # Domain-specific UI
    └── hooks/           # React state management
```

### Key Patterns
- **Prefixed UUIDs**: All domain identifiers use prefixed patterns (`doc_`, `mws_`, `conv_`, etc.)
- **Value Objects**: Immutable domain concepts with validation
- **Repository Pattern**: Abstract interfaces with Tauri implementations
- **Event-Driven**: Domain events for cross-feature integration
- **Aggregate Pattern**: Consistency boundaries around business rules

### Tauri Integration
- **Backend Commands**: Rust command handlers in `src-tauri/src/commands.rs`
- **Capabilities**: Defined security permissions
- **File System Integration**: Direct file monitoring and manipulation
- **Database**: SurrealDB embedded for local data storage

## Reference Code Locations

### High-Value Reference Components

**Annotation System**:
- `pb-annotation-system/client/components/AnnotationHighlight.tsx` - Complete annotation UI
- `pb-annotation-system/client/components/AnnotationTypeEditorModal.tsx` - Type management
- `src/core-platform/document-annotation-system/` - DDD implementation

**Multi-Document Workspace**:
- `src/core-platform/multi-document-workspace/ui/layouts/DocumentManagementWorkspace.tsx`
- `src/App.tsx` - Main application structure

**UI Prototypes**:
- `ui-lab/src/core/StartPagePrototype.tsx` - Professional start page
- `ui-lab/src/core/SearchTabPrototype.tsx` - Advanced search interface
- `ui-lab/src/core/FileDiscoveryTreeView.tsx` - File organization
- `ui-lab/src/core/DocumentEditorPrototype.tsx` - Document viewing

**Design System**:
- `ui-lab/src/shared/design-system/` - CSS custom properties and tokens
- Professional color schemes and component patterns

**Architecture Documentation**:
- `docs/architecture/overview.md` - Complete feature matrix
- `docs/implementation/` - Feature-specific implementation guides
- `CLAUDE.md` - Development workflow and DDD patterns

### Working Implementations to Preserve

1. **Complete Annotation System** - Fully functional with rich UI
2. **Start Page Project Management** - Professional project browser
3. **Multi-Document Workspace Framework** - Core workspace architecture
4. **Design System Foundation** - CSS custom properties and theming
5. **DDD Architecture Patterns** - Domain modeling and structure
6. **Tauri Integration Patterns** - Frontend-backend communication
7. **UI Lab Prototyping Environment** - Visual development workflow

## Blueprint-Ready Architecture

The platform is designed for rapid vertical application deployment:

**Timeline Goal**: Spawn new vertical applications in < 2 days
- Day 1: Configuration and integration
- Day 2: Customization and polish

**Composition Model**: core-platform + selected modules + blueprint configuration

**Professional Domains Supported**:
- Legal case management
- Medical record analysis
- Research and academic workflows
- DevOps and system monitoring
- General knowledge work

This comprehensive specification captures the sophisticated document intelligence platform you've built, with particular strength in annotation systems, multi-document workflows, and professional UI design. The modular DDD architecture provides a solid foundation for rapid vertical application development.