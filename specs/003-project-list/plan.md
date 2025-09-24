# Implementation Plan: Project List Management (MVP)

**Branch**: `003-project-list-see` | **Date**: 2025-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-project-list/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path
   → Feature spec loaded successfully
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

Project List Management MVP enables corpus analysts to create and manage basic project information for organizing work around specific document collections, with simple CRUD operations, folder validation, and SQLite persistence.

## Technical Context

**Language/Version**: TypeScript with React (Vite) + Tauri (Rust backend)
**Primary Dependencies**: React, Tauri, SQLite, SQLX, Zustand
**Storage**: SQLite database with projects table
**Testing**: Vitest (frontend), Cargo test (backend)
**Target Platform**: Desktop application (Windows/macOS/Linux via Tauri)
**Project Type**: desktop - determines Tauri + React structure
**Performance Goals**: <100ms project list load, <2s project creation, <500ms navigation
**Constraints**: Support up to 100 projects efficiently, folder validation required
**Scale/Scope**: Single-user desktop application, basic CRUD operations only

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Domain-Driven Design (NON-NEGOTIABLE)

- ✅ Project will be implemented as domain aggregate with pure business logic
- ✅ Domain layer will have zero infrastructure dependencies
- ✅ Application services will orchestrate domain objects
- ✅ Infrastructure implements repository interfaces

### Layer Isolation Enforcement

- ✅ Domain layer will not import from application/infrastructure layers
- ✅ UI layer will consume only application services
- ✅ Tauri commands will be in infrastructure layer

### Prefixed Identifier System

- ✅ Project entities will use prefixed UUID (`proj_`) for type safety
- ✅ No raw UUIDs in domain logic

### Strict TypeScript Compilation

- ✅ All code must pass TypeScript strict mode
- ✅ Type safety enforced at compile time

## Project Structure

### Documentation (this feature)

```
specs/003-project-list-see/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Tauri + React Desktop Application Structure
src-tauri/
├── src/
│   ├── commands/        # Tauri command handlers
│   ├── domain/          # Pure business logic
│   │   ├── aggregates/
│   │   ├── entities/
│   │   ├── value_objects/
│   │   └── repositories/
│   ├── application/     # Application services
│   └── infrastructure/ # Repository implementations, SQLite
└── Cargo.toml

src/
├── domain/              # TypeScript domain models
├── application/         # Application services
├── infrastructure/      # Tauri API adapters
├── ui/                  # React components
│   ├── components/
│   ├── pages/
│   └── hooks/
└── stores/              # Zustand stores

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Desktop application using Tauri + React architecture

## Phase 0: Outline & Research

Research topics identified from Technical Context:

- SQLite schema design for projects table
- Tauri command patterns for CRUD operations
- React folder picker component implementation
- Zustand store patterns for project management
- Form validation patterns for project creation
- Error handling patterns across Tauri/React boundary

**Output**: research.md with technology decisions and patterns

## Phase 1: Design & Contracts

1. **Extract entities from feature spec** → `data-model.md`:

   - Project entity with id, name, source_folder, created_at fields
   - ProjectId value object with prefixed UUID
   - Validation rules for name length and folder existence
   - No complex state transitions for MVP

2. **Generate API contracts** from functional requirements:

   - Tauri commands: create_project, list_projects, delete_project, open_project
   - Command DTOs for request/response types
   - Error types for validation and filesystem issues
   - Output schemas to `/contracts/`

3. **Generate contract tests** from contracts:

   - Test files for each Tauri command
   - Assert command request/response schemas
   - Tests will fail initially (no implementation)

4. **Extract test scenarios** from user stories:

   - Project creation scenario with folder validation
   - Project list display scenario
   - Project deletion with confirmation scenario
   - Error handling scenarios for invalid inputs

5. **Update agent file incrementally**:
   - Update CLAUDE.md with project-specific context
   - Add Tauri + React patterns
   - Include DDD structure for this domain

**Output**: data-model.md, /contracts/\*, failing tests, quickstart.md, CLAUDE.md

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs
- Each Tauri command → command test task [P]
- Project domain entity → model creation task [P]
- Each user story → integration test task
- UI component tasks for project list and creation form
- Store implementation tasks for state management

**Ordering Strategy**:

- TDD order: Tests before implementation
- Domain-first: Entities → Services → Commands → UI
- Mark [P] for parallel execution where possible

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations identified for this MVP feature_

## Progress Tracking

_This checklist is updated during execution flow_

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
- [x] Complexity deviations documented

---

_Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`_
