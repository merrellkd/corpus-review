# Tasks: Project List Management (MVP)

**Input**: Design documents from `/specs/003-project-list/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Tauri (Rust) + React TypeScript, SQLite, Zustand
   → Structure: Desktop app with DDD architecture
2. Load optional design documents:
   → data-model.md: Project entity with 5 value objects
   → contracts/: 4 Tauri commands (create, list, delete, open)
   → quickstart.md: 7 test scenarios with validation cases
3. Generate tasks by category:
   → Setup: Tauri project structure, dependencies, database
   → Tests: 4 command tests, 7 integration scenarios
   → Core: 5 value objects, Project aggregate, repository
   → Integration: SQLite implementation, Tauri commands
   → Polish: UI components, state management, validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Domain layer before infrastructure
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Tauri Backend**: `src-tauri/src/` for Rust code
- **React Frontend**: `src/` for TypeScript/React code
- **Tests**: `tests/` for integration tests, inline for unit tests

## Phase 3.1: Setup
- [x] T001 Create Tauri + React project structure with DDD folder organization
- [x] T002 Initialize Rust dependencies (tauri, sqlx, uuid, thiserror, serde, chrono) in src-tauri/Cargo.toml
- [x] T003 Initialize React dependencies (react, typescript, vite, zustand, zod, react-hook-form) in package.json
- [x] T004 [P] Configure TypeScript strict mode in tsconfig.json
- [x] T005 [P] Configure Rust clippy and rustfmt in src-tauri/Cargo.toml
- [x] T006 Create SQLite database schema with projects table in src-tauri/migrations/001_create_projects.sql

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T007 [P] Contract test create_project command in src-tauri/src/commands/tests/test_create_project.rs
- [x] T008 [P] Contract test list_projects command in src-tauri/src/commands/tests/test_list_projects.rs
- [x] T009 [P] Contract test delete_project command in src-tauri/src/commands/tests/test_delete_project.rs
- [x] T010 [P] Contract test open_project command in src-tauri/src/commands/tests/test_open_project.rs
- [x] T011 [P] Integration test project creation scenario in tests/integration/test_project_creation.rs
- [x] T012 [P] Integration test project list display in tests/integration/test_project_list.rs
- [x] T013 [P] Integration test project deletion in tests/integration/test_project_deletion.rs
- [x] T014 [P] Integration test validation scenarios in tests/integration/test_validation.rs

## Phase 3.3: Core Implementation (Domain Layer) - ONLY after tests are failing
- [x] T015 [P] ProjectId value object in src-tauri/src/domain/project/value_objects/project_id.rs
- [x] T016 [P] ProjectName value object in src-tauri/src/domain/project/value_objects/project_name.rs
- [x] T017 [P] FolderPath value object in src-tauri/src/domain/project/value_objects/folder_path.rs
- [x] T018 [P] ProjectNote value object in src-tauri/src/domain/project/value_objects/project_note.rs
- [x] T019 [P] CreatedAt value object in src-tauri/src/domain/project/value_objects/created_at.rs
- [x] T020 Project aggregate root in src-tauri/src/domain/project/aggregates/project.rs
- [x] T021 [P] ProjectError domain error enum in src-tauri/src/domain/project/errors/project_error.rs
- [x] T022 ProjectRepository trait in src-tauri/src/domain/project/repositories/project_repository.rs

## Phase 3.4: Infrastructure Layer
- [x] T023 SQLite ProjectRepository implementation in src-tauri/src/infrastructure/repositories/sqlite_project_repository.rs
- [x] T024 Database connection setup in src-tauri/src/infrastructure/database/connection.rs
- [x] T025 [P] ProjectDto data transfer object in src-tauri/src/infrastructure/dtos/project_dto.rs
- [x] T026 [P] CreateProjectRequest DTO in src-tauri/src/infrastructure/dtos/create_project_request.rs
- [x] T027 [P] AppError mapping in src-tauri/src/infrastructure/errors/app_error.rs

## Phase 3.5: Application Layer
- [x] T028 ProjectService application service in src-tauri/src/application/services/project_service.rs
- [x] T029 Application state setup in src-tauri/src/application/app_state.rs

## Phase 3.6: Tauri Commands
- [x] T030 create_project command handler in src-tauri/src/commands/create_project.rs
- [x] T031 list_projects command handler in src-tauri/src/commands/list_projects.rs
- [x] T032 delete_project command handler in src-tauri/src/commands/delete_project.rs
- [x] T033 open_project command handler in src-tauri/src/commands/open_project.rs
- [x] T034 Command module registration in src-tauri/src/commands/mod.rs
- [x] T035 Tauri app setup with commands in src-tauri/src/main.rs

## Phase 3.7: Frontend Domain Models
- [x] T036 [P] TypeScript Project interface in src/domain/entities/project.ts
- [x] T037 [P] ProjectId branded type in src/domain/value-objects/project-id.ts
- [x] T038 [P] CreateProjectData interface in src/domain/dtos/create-project-data.ts
- [x] T039 [P] AppError interface in src/domain/errors/app-error.ts

## Phase 3.8: Frontend Infrastructure
- [x] T040 Tauri API adapter in src/infrastructure/tauri/project-api.ts
- [x] T041 [P] Form validation schemas in src/infrastructure/validation/project-schemas.ts

## Phase 3.9: Frontend State Management
- [x] T042 Project Zustand store in src/stores/project-store.ts
- [x] T043 [P] Project store types in src/stores/types/project-store-types.ts

## Phase 3.10: UI Components
- [x] T044 ProjectListPage component in src/ui/pages/project-list-page.tsx
- [x] T045 CreateProjectForm component in src/ui/components/create-project-form.tsx
- [x] T046 [P] ProjectRow component in src/ui/components/project-row.tsx
- [x] T047 [P] DeleteConfirmDialog component in src/ui/components/delete-confirm-dialog.tsx
- [x] T048 [P] FolderPicker component in src/ui/components/folder-picker.tsx
- [x] T049 App routing and navigation in src/app.tsx

## Phase 3.11: Polish
- [x] T050 [P] Unit tests for value objects in src-tauri/src/domain/value_objects/tests/
- [x] T051 [P] Unit tests for Project aggregate in src-tauri/src/domain/aggregates/tests/test_project.rs
- [x] T052 [P] Frontend component tests in src/ui/components/__tests__/
- [x] T053 Performance validation (<100ms list load, <2s creation) using quickstart.md
- [x] T054 Error handling validation using quickstart.md scenarios
- [x] T055 [P] Code cleanup and documentation
- [x] T056 Execute full quickstart.md test suite

## Dependencies
- Setup (T001-T006) before all other phases
- Tests (T007-T014) before implementation (T015-T049)
- Domain layer (T015-T022) before Infrastructure (T023-T027)
- Infrastructure (T023-T027) before Application (T028-T029)
- Application (T028-T029) before Commands (T030-T035)
- Frontend domain (T036-T039) before Infrastructure (T040-T041)
- Frontend infrastructure (T040-T041) before State (T042-T043)
- Frontend state (T042-T043) before UI (T044-T049)
- Implementation complete before Polish (T050-T056)

## Parallel Execution Examples

### Setup Phase (can run together):
```bash
# T004-T005 (different files, no dependencies)
Task: "Configure TypeScript strict mode in tsconfig.json"
Task: "Configure Rust clippy and rustfmt in src-tauri/Cargo.toml"
```

### Contract Tests Phase (can run together):
```bash
# T007-T010 (different test files)
Task: "Contract test create_project command in src-tauri/src/commands/tests/test_create_project.rs"
Task: "Contract test list_projects command in src-tauri/src/commands/tests/test_list_projects.rs"
Task: "Contract test delete_project command in src-tauri/src/commands/tests/test_delete_project.rs"
Task: "Contract test open_project command in src-tauri/src/commands/tests/test_open_project.rs"
```

### Integration Tests Phase (can run together):
```bash
# T011-T014 (different test files)
Task: "Integration test project creation scenario in tests/integration/test_project_creation.rs"
Task: "Integration test project list display in tests/integration/test_project_list.rs"
Task: "Integration test project deletion in tests/integration/test_project_deletion.rs"
Task: "Integration test validation scenarios in tests/integration/test_validation.rs"
```

### Value Objects Phase (can run together):
```bash
# T015-T019 (different files, no dependencies)
Task: "ProjectId value object in src-tauri/src/domain/value_objects/project_id.rs"
Task: "ProjectName value object in src-tauri/src/domain/value_objects/project_name.rs"
Task: "FolderPath value object in src-tauri/src/domain/value_objects/folder_path.rs"
Task: "ProjectNote value object in src-tauri/src/domain/value_objects/project_note.rs"
Task: "CreatedAt value object in src-tauri/src/domain/value_objects/created_at.rs"
```

### DTOs Phase (can run together):
```bash
# T025-T027 (different files, no dependencies)
Task: "ProjectDto data transfer object in src-tauri/src/infrastructure/dtos/project_dto.rs"
Task: "CreateProjectRequest DTO in src-tauri/src/infrastructure/dtos/create_project_request.rs"
Task: "AppError mapping in src-tauri/src/infrastructure/errors/app_error.rs"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Follow strict DDD architecture - domain layer has zero infrastructure dependencies
- All identifiers use prefixed UUIDs (proj_) for type safety
- Verify tests fail before implementing functionality
- Use constitutional compliance checklist throughout implementation
- Frontend follows React + TypeScript + Zustand patterns
- Database uses SQLite with SQLX for compile-time query verification

## Task Generation Rules
1. Each contract file → contract test task marked [P]
2. Each value object → separate implementation task marked [P]
3. Each domain entity → implementation task (depends on value objects)
4. Each Tauri command → implementation task (sequential in same module)
5. Each UI component → implementation task marked [P] if independent
6. Integration tests cover all user scenarios from quickstart.md
7. Tests must be written first and must fail before implementation
8. Follow dependency order: Domain → Infrastructure → Application → Commands → UI