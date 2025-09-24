This document will be fed to the spec-kit /specify command (see https://github.com/github/spec-kit) to initiate the Spec-Driven Development workflow.

# Feature: Document Derivatives Management (Enhanced - Iteration 3)

This iteration builds on the basic derivative workflow from Iteration 2 to add advanced derivative types, sophisticated document family visualization, enhanced metadata tracking, and integration with the reporting system.

## Enhanced Scope

Building on Iteration 2's basic derivatives (summary, anonymized), this iteration adds:

- Advanced derivative types: cost tables, explanatory documents, custom derivatives
- Sophisticated document family visualization and management
- Enhanced metadata tracking with processing chains
- Advanced derivative creation workflows and templates
- Integration with reports system for cross-referencing

**Explicitly NOT in this iteration:**

- Automated derivative generation using AI/ML
- Complex approval workflows or collaborative editing
- Version control system integration
- Advanced derivative analytics or comparison tools
- External system integration (SharePoint, etc.)
- Bulk derivative operations across multiple families

## User Scenarios & Testing

### Primary User Story

As a corpus analyst conducting detailed analysis, I need sophisticated derivative management capabilities so I can create specialized document versions (cost tables, explanatory notes, custom analysis documents) while maintaining clear family relationships and enabling cross-referencing with my analysis reports.

### Acceptance Scenarios

1. **Given** I need to analyze costs in a document, **When** I create a cost table derivative, **Then** the system provides a structured template for cost analysis data
2. **Given** I want to explain complex concepts, **When** I create explanatory documents, **Then** I can create detailed explanations that reference specific sections of source documents
3. **Given** I have document families with multiple derivatives, **When** I view family visualization, **Then** I can see clear relationships and processing chains between all related documents
4. **Given** I'm creating analysis reports, **When** I reference derivatives, **Then** the system shows available derivatives with their relationships and metadata

### Edge Cases

- What happens when complex processing chains create circular references?
- How does system handle families with 10+ derivatives of different types?
- What occurs when derivative templates are updated after derivatives are created?

## Requirements

### Functional Requirements

- **FR-001**: System MUST support advanced derivative types: cost tables, explanatory documents, and custom derivatives
- **FR-002**: System MUST provide specialized templates for different derivative types
- **FR-003**: System MUST display sophisticated document family visualization showing all relationships
- **FR-004**: System MUST enable creation of derivatives from other derivatives (processing chains)
- **FR-005**: System MUST track complex processing chains and metadata history
- **FR-006**: System MUST provide advanced derivative management interface with family-centric organization
- **FR-007**: System MUST integrate derivative browsing with reports creation workflow
- **FR-008**: System MUST support custom derivative types with user-defined templates
- **FR-009**: System MUST handle derivative naming conflicts and version management
- **FR-010**: System MUST provide derivative search and filtering within document families

### Key Entities

- **Cost Table Derivative**: Structured financial analysis document with standardized cost categories
- **Explanatory Document**: Detailed explanations and context for complex concepts or findings
- **Custom Derivative**: User-defined derivative type with flexible structure
- **Processing Chain**: Complete history of derivative creation from original through multiple generations
- **Derivative Template**: Structured starting point for specific derivative types

## Advanced Derivative Types

### Cost Table Derivatives

- **Purpose**: Structured financial analysis and cost breakdowns
- **Template Structure**: Predefined sections for cost categories, calculations, and summaries
- **Naming**: `cost-table-[purpose].det` (e.g., `cost-table-litigation.det`, `cost-table-damages.det`)

**Template Structure:**

```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 1 },
      "content": [{ "type": "text", "text": "Cost Analysis: [Purpose]" }]
    },
    {
      "type": "cost_table",
      "attrs": { "categories": ["direct", "indirect", "contingent"] }
    },
    {
      "type": "heading",
      "attrs": { "level": 2 },
      "content": [{ "type": "text", "text": "Summary" }]
    },
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "text": "Total estimated costs: $[CALCULATION]" }
      ]
    }
  ],
  "derivativeMetadata": {
    "type": "cost-table",
    "template": "standard-cost-analysis",
    "calculationFields": ["direct_costs", "indirect_costs", "contingent_costs"]
  }
}
```

### Explanatory Documents

- **Purpose**: Detailed explanations of complex concepts, processes, or findings
- **Template Structure**: Sections for concept overview, detailed explanation, examples, references
- **Naming**: `explanatory-[topic].det` (e.g., `explanatory-methodology.det`, `explanatory-legal-framework.det`)

### Custom Derivatives

- **Purpose**: User-defined derivative types for specialized analysis needs
- **Template Creation**: Interface for users to create custom derivative templates
- **Naming**: `[type]-[description].det` where type is user-defined

## Enhanced Document Family Visualization

### Family Tree View

```
📄 document1.pdf (Original)
├── 📄 extracted.det (Base Extraction)
│   ├── 📝 summary-general.det
│   ├── 🔒 anonymized.det
│   │   └── 📝 summary-anonymized.det (Derivative of Derivative)
│   ├── 💰 cost-table-damages.det
│   └── 📖 explanatory-methodology.det
└── 💰 cost-table-direct.det (From Original)
```

### Visual Family Management Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ Document Family: document1.pdf                                  │
├─────────────────────────────────────────────────────────────────┤
│ Original: document1.pdf (2.1MB, 15 pages)                     │
│                                                                 │
│ ┌─ extracted.det ────────────────────────────────────────┐   │
│ │  📝 summary-general.det                                 │   │
│ │  🔒 anonymized.det                                      │   │
│ │      └─ 📝 summary-anonymized.det                      │   │
│ │  💰 cost-table-damages.det                             │   │
│ │  📖 explanatory-methodology.det                        │   │
│ │                                                            │   │
│ │  [+ Create Derivative] [Manage Family]                    │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Processing Chain: Original → Extracted → 5 derivatives         │
│ Last Activity: 2024-09-24 15:30                               │
└─────────────────────────────────────────────────────────────────┘
```

## Enhanced Metadata Tracking

### Complex Processing Chain Metadata

```json
{
  "originalFile": {
    "path": "/source/document1.pdf",
    "name": "document1.pdf",
    "hash": "sha256-abc123...",
    "metadata": {
      "fileSize": 2048576,
      "pages": 15,
      "created": "2024-09-20T10:00:00Z"
    }
  },
  "processingChain": [
    {
      "step": 1,
      "operation": "extraction",
      "input": "document1.pdf",
      "output": "extracted.det",
      "timestamp": "2024-09-24T10:30:00Z",
      "method": "pdf-text-extraction-v1.2",
      "quality": "good"
    },
    {
      "step": 2,
      "operation": "derivative_creation",
      "input": "extracted.det",
      "output": "anonymized.det",
      "timestamp": "2024-09-24T11:00:00Z",
      "method": "manual_anonymization",
      "user": "analyst1"
    },
    {
      "step": 3,
      "operation": "derivative_creation",
      "input": "anonymized.det",
      "output": "summary-anonymized.det",
      "timestamp": "2024-09-24T11:30:00Z",
      "method": "manual_summary",
      "user": "analyst1"
    }
  ],
  "derivatives": {
    "extracted.det": {
      "type": "extracted",
      "parentFile": "document1.pdf",
      "children": [
        "summary-general.det",
        "anonymized.det",
        "cost-table-damages.det"
      ],
      "created": "2024-09-24T10:30:00Z",
      "status": "completed"
    },
    "cost-table-damages.det": {
      "type": "cost-table",
      "purpose": "damages",
      "template": "standard-cost-analysis",
      "parentFile": "extracted.det",
      "children": [],
      "created": "2024-09-24T12:00:00Z",
      "status": "in_progress"
    }
  }
}
```

## Advanced Derivative Creation Workflows

### Template-Based Creation

1. **Derivative Type Selection**: Choose from standard types or custom templates
2. **Template Customization**: Modify template structure if needed
3. **Parent Selection**: Choose which document to derive from (original, extracted, or other derivative)
4. **Metadata Configuration**: Set purpose, naming, and relationship metadata
5. **Content Initialization**: Create derivative with template structure and copied content
6. **Processing Chain Update**: Record complete derivation history

### Derivative Creation Interface

```
┌─────────────────────────────────────────────────────────────────┐
│ Create New Derivative                                           │
├─────────────────────────────────────────────────────────────────┤
│ Derive From: [extracted.det                          ▼]     │
│                                                                 │
│ Derivative Type:                                               │
│ ○ Summary (general)        ○ Cost Table                       │
│ ○ Summary (specific topic) ○ Explanatory Document             │
│ ○ Anonymized Version       ○ Custom Type                      │
│                                                                 │
│ Purpose/Topic: [_________________________]                    │
│                                                                 │
│ Template: [Standard Cost Analysis        ▼]                   │
│                                                                 │
│ Advanced Options:                                              │
│ ☑ Copy content from parent                                     │
│ ☑ Initialize with template structure                           │
│ ☐ Create processing notes                                      │
│                                                                 │
│              [Create Derivative] [Cancel]                      │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Enhancements

### Enhanced Derivative Tracking

```sql
-- Enhanced derivatives table
CREATE TABLE document_derivatives_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  derivative_type TEXT NOT NULL, -- 'extracted', 'summary', 'anonymized', 'cost-table', 'explanatory', 'custom'
  derivative_subtype TEXT, -- 'general', 'damages', 'methodology', etc.
  parent_filename TEXT,
  template_used TEXT,
  processing_step INTEGER, -- position in processing chain
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'error'
  quality_score REAL,
  FOREIGN KEY (family_id) REFERENCES document_families(id)
);

-- Processing chain tracking
CREATE TABLE processing_chains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  family_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  operation_type TEXT NOT NULL, -- 'extraction', 'derivative_creation', 'editing'
  input_file TEXT NOT NULL,
  output_file TEXT NOT NULL,
  method TEXT,
  user_id TEXT,
  processing_time REAL, -- seconds
  quality_metrics TEXT, -- JSON
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES document_families(id)
);

-- Custom derivative templates
CREATE TABLE derivative_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_name TEXT NOT NULL UNIQUE,
  derivative_type TEXT NOT NULL,
  template_structure TEXT NOT NULL, -- JSON template
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_system_template BOOLEAN DEFAULT FALSE
);
```

## Integration with Reports System

### Cross-System Integration

- **Derivative Browser**: Enhanced browsing in reports creation showing family context
- **Reference Context**: Include derivative type and relationship when referencing from reports
- **Processing History**: Show derivation history when creating report references
- **Quality Indicators**: Display derivative quality metrics when selecting references

### Enhanced Reference Display

```
Available References:
📂 doc_1/ (document1.pdf family)
  📄 extracted.det ⭐⭐⭐⭐ (Good extraction quality)
  📝 summary-general.det ⭐⭐⭐⭐⭐ (Manual summary, high quality)
  🔒 anonymized.det ⭐⭐⭐ (Privacy processed)
  💰 cost-table-damages.det ⭐⭐⭐⭐ (In progress, 85% complete)
  📖 explanatory-methodology.det ⭐⭐⭐⭐⭐ (Detailed explanation)
```

## Performance and Scalability

### Complex Family Management

- **Family Loading**: Load family visualization within 2 seconds for 20+ derivatives
- **Processing Chain**: Calculate processing chains within 1 second for complex families
- **Derivative Creation**: Complete template-based derivative creation within 5 seconds
- **Metadata Updates**: Update complex metadata structures within 500ms

### Memory and Storage

- **Efficient Metadata**: Optimize JSON storage for complex processing chains
- **Template Caching**: Cache derivative templates for fast creation workflows
- **Family Indexing**: Efficient indexing for family-based queries and searches

## Success Criteria

### Advanced Functionality

- **Derivative Types**: Support for all planned derivative types with appropriate templates
- **Processing Chains**: Accurate tracking of complex multi-generation derivative chains
- **Family Visualization**: Clear, intuitive display of complex document relationships
- **Template System**: Flexible template system supporting custom derivative types

### User Experience

- **Workflow Efficiency**: Streamlined creation of complex derivatives with appropriate templates
- **Relationship Clarity**: Clear understanding of document relationships and processing history
- **Integration Smoothness**: Seamless integration between derivatives and reports systems
- **Advanced Management**: Sophisticated tools for managing complex document families

### Technical Performance

- **Scalability**: Support for large document families with many derivatives
- **Data Integrity**: Perfect consistency in complex processing chain metadata
- **Performance Targets**: All operations meet specified performance requirements
- **Search Integration**: Advanced derivatives fully integrated with unified search capabilities

This enhanced derivatives system provides sophisticated document processing capabilities while maintaining clear organization and enabling advanced Corpus Review workflows with full integration to the reporting system.
