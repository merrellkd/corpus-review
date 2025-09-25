# Tasks: File Metadata Extraction

**Input**: Design documents from `/Users/kdm/projects/digital-ext/CORPUS_REVIEW/specs/006-file-metadata-extraction/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

## Execution Flow (main)

```
1. Load plan.md from feature directory ✅
   → Tech stack: Rust (Tauri backend), TypeScript/React (frontend)
   → Libraries: TipTap/ProseMirror, pdf-extract, docx-rs, pulldown-cmark
   → Structure: Web app (Tauri frontend + Rust backend)
2. Load design documents ✅:
   → data-model.md: 3 entities, 3 value objects, 1 aggregate
   → contracts/: 8 Tauri commands with DTOs
   → research.md: Library choices and architecture decisions
3. Generate tasks by category ✅
4. Apply DDD ordering: Domain → Application → Infrastructure → UI
5. Mark [P] for parallel execution (different files)
6. Number tasks sequentially T001-T055
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute for Tauri app structure

## Path Conventions

- **Backend**: `src-tauri/src/` (Rust code)
- **Frontend**: `src/` (TypeScript/React code)
- **Database**: `src-tauri/migrations/` (SQLite migrations)

## Phase 3.1: Database Setup

- [x] T001 Create SQLite migration for original_documents table in `src-tauri/migrations/002_create_original_documents.sql`
- [x] T002 Create SQLite migration for file_extractions table in `src-tauri/migrations/003_create_file_extractions.sql`
- [x] T003 Create SQLite migration for extracted_documents table in `src-tauri/migrations/004_create_extracted_documents.sql`
- [x] T004 Create database indexes migration in `src-tauri/migrations/005_create_indexes.sql`

## Phase 3.2: Domain Layer (DDD Core)

- [x] T005 [P] DocumentId value object in `src-tauri/src/domain/extraction/value_objects/document_id.rs`
- [x] T006 [P] ExtractionId value object in `src-tauri/src/domain/extraction/value_objects/extraction_id.rs`
- [x] T007 [P] ExtractedDocumentId value object in `src-tauri/src/domain/extraction/value_objects/extracted_document_id.rs`
- [x] T008 [P] FilePath value object in `src-tauri/src/domain/extraction/value_objects/file_path.rs`
- [x] T009 [P] DocumentType enum in `src-tauri/src/domain/extraction/value_objects/document_type.rs`
- [x] T010 [P] ExtractionStatus enum in `src-tauri/src/domain/extraction/value_objects/extraction_status.rs`
- [x] T011 [P] ProseMirrorJson value object in `src-tauri/src/domain/extraction/value_objects/prosemirror_json.rs`
- [x] T012 [P] OriginalDocument entity in `src-tauri/src/domain/extraction/entities/original_document.rs`
- [x] T013 [P] ExtractedDocument entity in `src-tauri/src/domain/extraction/entities/extracted_document.rs`
- [x] T014 [P] FileExtraction entity in `src-tauri/src/domain/extraction/entities/file_extraction.rs`
- [x] T015 DocumentExtractionAggregate root in `src-tauri/src/domain/extraction/aggregates/document_extraction_aggregate.rs`
- [x] T016 [P] DocumentRepository trait in `src-tauri/src/domain/extraction/repositories/document_repository.rs`
- [x] T017 [P] ExtractionRepository trait in `src-tauri/src/domain/extraction/repositories/extraction_repository.rs`
- [x] T018 [P] ExtractedDocumentRepository trait in `src-tauri/src//domain/extraction/repositories/extracted_document_repository.rs`

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] T019 [P] Contract test scan_project_documents in `src-tauri/tests/contract/test_scan_project_documents.rs`
- [x] T020 [P] Contract test get_document_details in `src-tauri/tests/contract/test_get_document_details.rs`
- [x] T021 [P] Contract test start_document_extraction in `src-tauri/tests/contract/test_start_document_extraction.rs`
- [x] T022 [P] Contract test get_extraction_status in `src-tauri/tests/contract/test_get_extraction_status.rs`
- [x] T023 [P] Contract test cancel_extraction in `src-tauri/tests/contract/test_cancel_extraction.rs`
- [x] T024 [P] Contract test get_extracted_document in `src-tauri/tests/contract/test_get_extracted_document.rs`
- [x] T025 [P] Contract test save_extracted_document in `src-tauri/tests/contract/test_save_extracted_document.rs`
- [x] T026 [P] Contract test get_original_document_preview in `src-tauri/tests/contract/test_get_original_document_preview.rs`
- [x] T027 [P] Integration test PDF extraction workflow in `src-tauri/tests/integration/test_pdf_extraction_workflow.rs`
- [x] T028 [P] Integration test DOCX structure preservation in `src-tauri/tests/integration/test_docx_structure_preservation.rs`
- [x] T029 [P] Integration test Markdown conversion in `src-tauri/tests/integration/test_markdown_conversion.rs`
- [x] T030 [P] Integration test DocumentCaddy dual-mode operation in `src/tests/integration/test_document_caddy_dual_mode.test.ts`

## Phase 3.4: Infrastructure Layer (ONLY after tests are failing)

- [x] T031 [P] SQLite DocumentRepository implementation in `src-tauri/src/infrastructure/repositories/sqlite_document_repository.rs`
- [x] T032 [P] SQLite ExtractionRepository implementation in `src-tauri/src/infrastructure/repositories/sqlite_extraction_repository.rs`
- [x] T033 [P] SQLite ExtractedDocumentRepository implementation in `src-tauri/src/infrastructure/repositories/sqlite_extracted_document_repository.rs`
- [x] T034 [P] PDF text extraction parser in `src-tauri/src/infrastructure/parsers/pdf_parser.rs`
- [x] T035 [P] DOCX structure extraction parser in `src-tauri/src/infrastructure/parsers/docx_parser.rs`
- [x] T036 [P] Markdown to ProseMirror converter in `src-tauri/src/infrastructure/parsers/markdown_parser.rs`
- [x] T037 [P] ProseMirror JSON serializer in `src-tauri/src/infrastructure/serializers/prosemirror_serializer.rs`
- [x] T038 File system service for .det files in `src-tauri/src/infrastructure/services/file_system_service.rs`

## Phase 3.5: Application Layer

- [x] T039 [P] DocumentService in `src-tauri/src/application/services/document_service.rs`
- [x] T040 [P] ExtractionService in `src-tauri/src/application/services/extraction_service.rs`
- [x] T041 [P] DTOs module in `src-tauri/src/application/dtos/mod.rs`
- [x] T042 Error handling and mapping in `src-tauri/src/application/errors/extraction_error.rs`

## Phase 3.6: Tauri Command Layer

- [x] T043 scan_project_documents command in `src-tauri/src/commands/document_commands.rs`
- [x] T044 get_document_details command in `src-tauri/src/commands/document_commands.rs`
- [x] T045 start_document_extraction command in `src-tauri/src/commands/extraction_commands.rs`
- [x] T046 get_extraction_status command in `src-tauri/src/commands/extraction_commands.rs`
- [x] T047 cancel_extraction command in `src-tauri/src/commands/extraction_commands.rs`
- [x] T048 get_extracted_document command in `src-tauri/src/commands/extracted_document_commands.rs`
- [x] T049 save_extracted_document command in `src-tauri/src/commands/extracted_document_commands.rs`
- [x] T050 get_original_document_preview command in `src-tauri/src/commands/document_preview_commands.rs`

## Phase 3.7: Frontend Integration

- [x] T051 [P] ExtractionStore slice in `src/stores/extraction-store.ts`
- [x] T052 [P] Tauri API client for extraction commands in `src/infrastructure/tauri-extraction-api.ts`
- [x] T053 DocumentCaddy dual-mode enhancement in `src/domains/workspace/ui/components/DocumentCaddy.tsx`
- [x] T054 ExtractionStatusIndicator component in `src/domains/workspace/ui/components/ExtractionStatusIndicator.tsx`
- [x] T055 Extract button integration in workspace file browser in `src/domains/workspace/ui/components/FileList.tsx`

## Dependencies

**Phase Dependencies**:

- Database setup (T001-T004) before all other phases
- Domain layer (T005-T018) before Application layer
- Tests (T019-T030) before Infrastructure/Application implementation
- Infrastructure (T031-T038) before Application (T039-T042)
- Application (T039-T042) before Tauri Commands (T043-T050)
- Backend (T001-T050) before Frontend (T051-T055)

**Specific Dependencies**:

- T015 (aggregate) depends on T012-T014 (entities)
- T016-T018 (repository traits) before T031-T033 (implementations)
- T039-T040 (services) depend on T031-T038 (repositories and parsers)
- T043-T050 (commands) depend on T039-T042 (services and DTOs)
- T053-T055 (UI) depend on T051-T052 (store and API client)

## Parallel Execution Examples

### Phase 3.2: Domain Value Objects (T005-T011)

```bash
# Launch all value objects in parallel:
Task: "DocumentId value object in src-tauri/src/domain/value_objects/document_id.rs"
Task: "ExtractionId value object in src-tauri/src/domain/value_objects/extraction_id.rs"
Task: "ExtractedDocumentId value object in src-tauri/src/domain/value_objects/extracted_document_id.rs"
Task: "FilePath value object in src-tauri/src/domain/value_objects/file_path.rs"
Task: "DocumentType enum in src-tauri/src/domain/value_objects/document_type.rs"
Task: "ExtractionStatus enum in src-tauri/src/domain/value_objects/extraction_status.rs"
Task: "ProseMirrorJson value object in src-tauri/src/domain/value_objects/prosemirror_json.rs"
```

### Phase 3.3: Contract Tests (T019-T026)

```bash
# Launch all Tauri command tests in parallel:
Task: "Contract test scan_project_documents in src-tauri/tests/contract/test_scan_project_documents.rs"
Task: "Contract test get_document_details in src-tauri/tests/contract/test_get_document_details.rs"
Task: "Contract test start_document_extraction in src-tauri/tests/contract/test_start_document_extraction.rs"
Task: "Contract test get_extraction_status in src-tauri/tests/contract/test_get_extraction_status.rs"
Task: "Contract test cancel_extraction in src-tauri/tests/contract/test_cancel_extraction.rs"
Task: "Contract test get_extracted_document in src-tauri/tests/contract/test_get_extracted_document.rs"
Task: "Contract test save_extracted_document in src-tauri/tests/contract/test_save_extracted_document.rs"
Task: "Contract test get_original_document_preview in src-tauri/tests/contract/test_get_original_document_preview.rs"
```

### Phase 3.4: Infrastructure Parsers (T034-T036)

```bash
# Launch all document parsers in parallel:
Task: "PDF text extraction parser in src-tauri/src/infrastructure/parsers/pdf_parser.rs"
Task: "DOCX structure extraction parser in src-tauri/src/infrastructure/parsers/docx_parser.rs"
Task: "Markdown to ProseMirror converter in src-tauri/src/infrastructure/parsers/markdown_parser.rs"
```

## Validation Checklist

_GATE: All items must be checked before implementation completion_

- [x] All 8 Tauri commands have corresponding contract tests (T019-T026)
- [x] All 3 domain entities have model creation tasks (T012-T014)
- [x] All contract tests come before implementation (T019-T030 before T031+)
- [x] All [P] tasks operate on different files (no conflicts)
- [x] Each task specifies exact file path
- [x] Domain layer has zero infrastructure dependencies (T005-T018)
- [x] Repository pattern isolates database access (T016-T018, T031-T033)
- [x] DDD layers properly ordered (Domain → Application → Infrastructure → UI)
- [x] All quickstart scenarios covered by integration tests (T027-T030)
- [x] Performance requirements addressed in infrastructure tasks (T034-T038)
- [x] DocumentCaddy dual-mode operation implemented (T053)
- [x] Extraction status tracking in UI (T054-T055)

## Notes

- **Constitutional Compliance**: All tasks follow DDD principles with proper layer isolation
- **Prefixed IDs**: DocumentId (doc*\*), ExtractionId (ext*\_), ExtractedDocumentId (det\_\_)
- **File Processing**: PDF (pdf-extract), DOCX (docx-rs), Markdown (pulldown-cmark)
- **UI Integration**: TipTap/ProseMirror for .det editing, format-specific viewers for originals
- **Performance**: <30s extraction, <2s status updates, <1s UI refresh
- **Storage**: SQLite for tracking, .det files alongside originals
- **Error Handling**: Graceful degradation with user-actionable messages

**Total Tasks**: 55 tasks across 7 phases, with 32 parallel-capable tasks marked [P]
