
# Implementation Plan: Project Workspace Component Consolidation

**Branch**: `008-consolidate-frontend-src` | **Date**: 2025-09-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-consolidate-frontend-src/spec.md`

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
Consolidate ProjectWorkspace.tsx component from the global components directory into the project feature folder, removing complex DDD patterns and organizing using flat structure (components/, types/, index.ts). Maintain backward compatibility through temporary re-exports while establishing the prescribed feature-based organization pattern.

## Technical Context
**Language/Version**: TypeScript with React 18, Vite build system
**Primary Dependencies**: React, Zustand (state management), react-resizable-panels, Tauri
**Storage**: N/A (frontend reorganization only)
**Testing**: Component tests using existing test framework, import compatibility validation
**Target Platform**: Desktop application (Tauri wrapper)
**Project Type**: web - frontend/backend separation with Tauri
**Performance Goals**: No performance impact from reorganization, maintain existing component behavior
**Constraints**: Must preserve existing component functionality, backward compatibility required
**Scale/Scope**: Single component consolidation affecting ~5-10 import statements across codebase

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Frontend Feature-Based Architecture Compliance
✅ **PASS** - This consolidation directly implements Principle III: Frontend MUST follow feature-based organization with vertical slices. Moving ProjectWorkspace into the project feature folder aligns with constitutional requirements.

### Over-Engineered Domain Abstractions Prohibition
✅ **PASS** - Principle III explicitly prohibits over-engineered domain abstractions in UI layer. Removing DDD patterns and flattening to simple types/components directly follows this mandate.

### TypeScript Strict Mode Compilation
✅ **PASS** - Principle V requires strict TypeScript compilation. Reorganization maintains existing type safety without degradation.

### Feature Self-Containment Requirements
✅ **PASS** - Constitution requires features to be self-contained with minimal external dependencies. Consolidating project workspace functionality into the project feature reduces cross-feature dependencies.

**Overall Constitution Compliance**: PASS - No violations detected. This refactoring directly implements constitutional principles.

## Project Structure

### Documentation (this feature)
```
specs/008-consolidate-frontend-src/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
frontend/src/
├── features/
│   └── project/                   # Target consolidation location
│       ├── components/
│       │   └── ProjectWorkspace.tsx  # Moved from frontend/src/components/
│       ├── types/                 # Simplified types (no DDD layers)
│       │   ├── project-types.ts   # Flattened from domain/aggregates/
│       │   └── workspace-types.ts # Flattened from domain/value-objects/
│       └── index.ts               # Clean exports
├── components/
│   └── ProjectWorkspace.tsx       # Temporary re-export (backward compatibility)
└── stores/
    └── workspace/                 # Existing workspace store (unchanged)
```

**Structure Decision**: Web application structure with frontend feature-based organization. ProjectWorkspace component consolidation within existing project feature folder, implementing flat structure per constitutional requirements.

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
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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
