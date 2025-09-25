
# Implementation Plan: File Metadata Extraction

**Branch**: `006-file-metadata-extraction` | **Date**: 2025-09-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/kdm/projects/digital-ext/CORPUS_REVIEW/specs/006-file-metadata-extraction/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Extract content and metadata from PDF, DOCX, and Markdown files to create standardized editable .det format for corpus analysis. Supports dual-mode document viewing (read-only originals, editable extracted versions) with TipTap/ProseMirror JSON as standardized format. Manual extraction triggering with status tracking and error handling.

## Technical Context
**Language/Version**: Rust (Tauri backend), TypeScript/React (frontend)  
**Primary Dependencies**: Tauri 2.x, TipTap/ProseMirror, PDF parsing libs, DOCX processing, Markdown parser  
**Storage**: SQLite (SQLX) for extraction tracking, file system for .det files alongside originals  
**Testing**: Cargo test (backend), Vitest (frontend), integration tests for file processing  
**Target Platform**: Desktop (macOS, Windows, Linux) via Tauri
**Project Type**: web (Tauri frontend + Rust backend)  
**Performance Goals**: <30s extraction for 100-page docs, <2s status updates, <1s UI refresh  
**Constraints**: <10MB document limit, embedded images ignored in Markdown, offline-capable  
**Scale/Scope**: Individual user workspace, hundreds of documents per project, file-based workflow

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Domain-Driven Design**: ✅ PASS - File extraction follows DDD with domain entities (Document, ExtractionStatus), application services (ExtractionService), infrastructure (file parsers), UI layers
**Layer Isolation**: ✅ PASS - Domain layer contains pure business logic, application orchestrates extraction, infrastructure handles file I/O
**Prefixed Identifiers**: ✅ PASS - DocumentId, ExtractionId use prefixed UUID format (doc_, ext_)
**TypeScript Strict**: ✅ PASS - Frontend uses strict TypeScript compilation
**Tauri Commands**: ✅ PASS - Commands follow snake_case, use repository pattern, proper error handling

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) - Tauri frontend + Rust backend architecture

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Domain Layer Tasks:
  - Each entity/value object → domain model creation [P]
  - Repository interface definitions [P]
  - Domain event definitions [P]
- Infrastructure Layer Tasks:
  - Database schema migration tasks
  - Repository implementation tasks
  - File processing library integration tasks
- Application Layer Tasks:
  - Service implementation tasks
  - Tauri command handler tasks
- UI Layer Tasks:
  - DocumentCaddy enhancement tasks
  - Status indicator component tasks
  - Integration with workspace file browser

**Ordering Strategy**:
- DDD order: Domain → Application → Infrastructure → UI
- TDD order: Contract tests before implementation
- Dependency order: Core models before services before commands before UI
- Mark [P] for parallel execution within same layer

**Specific Task Categories**:
1. **Database Tasks** (5-7 tasks): Schema, migrations, indexes
2. **Domain Model Tasks** (8-12 tasks): Entities, value objects, aggregates
3. **Repository Tasks** (6-8 tasks): Interfaces and SQLite implementations
4. **File Processing Tasks** (6-8 tasks): PDF, DOCX, Markdown parsers
5. **Tauri Command Tasks** (8-10 tasks): Backend API implementations
6. **UI Integration Tasks** (6-8 tasks): DocumentCaddy, status indicators
7. **Testing Tasks** (10-15 tasks): Unit, integration, and contract tests

**Estimated Output**: 45-55 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [ ] Complexity deviations documented (None needed)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
