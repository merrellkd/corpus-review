# Phase 1 Analysis Notes

## 1.1 Component Import Audit
- Generated `component-audit.txt` via `rg 'import.*domains' frontend/src -g '*.ts' -g '*.tsx'`
- 24 frontend modules directly import `domains/*` modules; heavy coupling to DDD structure persists across stores, components, and hooks.

## 1.2 Zustand Store Inventory & Overlaps
- `frontend/src/stores/project-store.ts`
  - Monolithic 898-line store covering data fetching, DTO orchestration, UI modal state, validation, pagination, filtering, and event bus logic.
  - Strongly coupled to domain repository (`domains/project/infrastructure/project-repository`).
- `frontend/src/stores/workspace-store.ts`
  - Handles Tauri-backed workspace navigation (open, list directory, history, loading/error flags).
  - Uses `@tauri-apps/api` directly and manages navigation history locally.
- `frontend/src/stores/workspaceStore.ts`
  - Alternate workspace store with mock data, layout persistence, and frontend-only workspace abstraction (`WorkspaceAdapter`, `WorkspaceLayout`).
  - Duplicates navigation state and UI panel visibility already present elsewhere; still imports domain DTOs.
- `frontend/src/stores/unifiedPanelState.ts`
  - Global panel visibility + layout toggles as Zustand store; overlaps with layout portions of `workspaceStore.ts` and document workspace domain store.
- `frontend/src/stores/panelStateMachine.ts`
  - XState-inspired finite state machine for panel visibility; redundant with `unifiedPanelState.ts` and feature-level layout logic.
- `frontend/src/stores/fileCategorization.ts`
  - Manages categorized file collections, appear tied to document caddies and workspace.
- `frontend/src/domains/workspace/ui/stores/workspace-store.ts`
  - Rich domain-focused store managing document workspace layout, transitions, adapters, error hierarchies.

**Overlap Summary**
- Three competing workspace stores (`stores/workspace-store.ts`, `stores/workspaceStore.ts`, `domains/workspace/ui/stores/workspace-store.ts`).
- Panel/layout state split between `workspaceStore.ts`, `unifiedPanelState.ts`, and domain workspace store.
- Global stores import domain layers directly, preventing clean feature boundaries.

## 1.3 Feature Boundary Map (Current Responsibilities)
- **Project Management**
  - UI: `frontend/src/components/ProjectWorkspace.tsx`, `frontend/src/ui/components/create-project-form.tsx`, `frontend/src/ui/pages/project-list-page.tsx`.
  - State: `stores/project-store.ts` (plus modal visibility in same store).
  - Services: `domains/project` repositories/services; `adapters` for DTO conversion.
- **Workspace Navigation**
  - UI: `frontend/src/components/FileExplorer.tsx`, `frontend/src/ui/components/workspace/*`, `frontend/src/ui/pages/WorkspacePage.tsx`.
  - State: `stores/workspace-store.ts`, `stores/workspaceStore.ts` (duplication), `shared/file-explorer/workspace-integration.ts`.
  - Services: Tauri commands (`open_workspace_navigation`, `list_directory`, `navigate_*`).
- **Document Workspace**
  - UI: `frontend/src/components/DocumentWorkspace.tsx`, `domains/workspace/ui/components/*` (document caddies, command bar, layout buttons).
  - State: `domains/workspace/ui/stores/workspace-store.ts` (document-level state, transitions), `stores/fileCategorization.ts`.
  - Services: `domains/workspace/application/*` adapters and domain services.

## 1.4 Shared vs Feature-Specific Components (Initial Pass)
- **Truly Shared**
  - `frontend/src/ui/components/folder-picker.tsx`
  - `frontend/src/ui/components/delete-confirm-dialog.tsx`
  - `frontend/src/ui/components/project-row.tsx` (used by project list + workspace context)
  - `frontend/src/components/TopToolbar.tsx` (global toolbar)
- **Feature-Specific Candidates**
  - Project Management: `ui/components/create-project-form.tsx`, `components/ProjectWorkspace.tsx`.
  - Workspace Navigation: `components/FileExplorer.tsx`, `ui/components/workspace/FileList.tsx`, `NavigationBreadcrumb.tsx`, `ProjectHeader.tsx`.
  - Document Workspace: `components/DocumentWorkspace.tsx`, `domains/workspace/ui/components/*`, `components/FilesCategoriesPanel.tsx`, `components/SearchPanel.tsx`.
- **Needs Review**
  - `components/DocumentWorkspace.tsx` currently mixes navigation + document logic; expect split during migration.
  - `components/ProjectWorkspace.tsx` manages both project summary + workspace nav; should be split into feature slices during later phases.

These notes will guide consolidation work in Phase 1.
