
# Implementation Plan: Frontend Architecture Refactoring

**Branch**: `006-refactor-existing-front` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-refactor-existing-front/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
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
Refactor existing frontend folder structure from mixed DDD/component-based organization to constitutional feature-based architecture with complete vertical slices. Move all project management, workspace navigation, and document workspace functionality into self-contained feature directories while preserving existing functionality and eliminating duplicate state management.

## Technical Context
**Language/Version**: TypeScript/React with Vite build system
**Primary Dependencies**: React, Zustand, Tauri (for backend integration), Zod (validation)
**Storage**: No changes to storage - refactoring only affects frontend organization
**Testing**: Vitest for unit tests, existing integration test framework
**Target Platform**: Desktop application via Tauri webview
**Project Type**: web - frontend component of Tauri desktop app
**Performance Goals**: No behavioral changes - maintain current performance characteristics
**Constraints**: Zero breaking changes to functionality, TypeScript strict mode compliance
**Scale/Scope**: ~75 existing frontend files across components, stores, domains, features

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Frontend Feature-Based Architecture (NON-NEGOTIABLE)**: ✅ PASS - This refactoring specifically implements constitutional requirement for feature-based organization with vertical slices

**Prefixed Identifier System**: ✅ PASS - No changes to identifier patterns, only file organization

**Strict TypeScript Compilation**: ✅ PASS - Requirement FR-012 ensures TypeScript compilation without errors

**Feature Organization Requirements**: ✅ PASS - Refactoring implements self-contained features with minimal external dependencies

**Store Consolidation**: ✅ PASS - Requirement FR-006 addresses constitutional mandate to eliminate duplicate state management

**No Constitutional Violations Detected** - This refactoring aligns with and implements constitutional principles

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
src-tauri/                    # Backend (Tauri/Rust) - No changes in this refactoring
└── src/
    ├── domain/
    ├── application/
    ├── infrastructure/
    └── commands/

frontend/                     # Frontend refactoring target
├── src/
│   ├── features/            # NEW: Constitutional feature-based organization
│   │   ├── project-management/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── store.ts
│   │   ├── workspace-navigation/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   └── store.ts
│   │   └── document-workspace/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── types/
│   │       └── store.ts
│   ├── shared/              # Truly reusable code (3+ features, no business logic)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── stores/              # Global app state only (UI layout, cross-feature)
│   │   └── ui-store.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
└── tests/
    ├── integration/         # Centralized integration tests
    └── contract/           # Centralized contract tests
```

**Structure Decision**: Web application with Tauri backend. Frontend follows constitutional feature-based architecture with complete vertical slices. Features contain all related components, hooks, services, types, and stores. Unit tests move into feature directories, integration/contract tests remain centralized.

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
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
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
- Generate incremental refactoring tasks based on clarified migration strategy
- Create feature directory structure tasks [P]
- File movement tasks organized by feature (project-management → workspace-navigation → document-workspace)
- Import update tasks following file movements
- Store consolidation tasks to eliminate duplication
- Test migration tasks (unit tests to features, preserve integration tests)
- Validation tasks after each major migration step

**Ordering Strategy**:
- Structure creation before file movement
- Feature-by-feature migration (smallest to largest complexity)
- Import updates immediately after file moves within each feature
- Store consolidation after all features migrated
- Validation after each feature completion
- Mark [P] for parallel execution only when files don't conflict

**Risk-Based Ordering**:
1. Project management (lowest risk, smallest scope)
2. Document workspace (medium risk, moderate coupling)
3. Workspace navigation (highest risk, most complex domain structure)
4. Shared component consolidation
5. Global store cleanup

**Estimated Output**: 35-40 numbered, ordered tasks focusing on incremental file organization changes

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
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v1.0.0 - See `/memory/constitution.md`*
