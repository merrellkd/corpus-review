# Frontend Unused File Removal Plan

## Phase 1 – Establish Baseline
- [ ] Confirm working tree is clean or stash local changes (`git status`)
- [ ] Install dependencies if needed (`npm install`)
- [ ] Run baseline tests (`npm run test`)
- [ ] Run baseline build (`npm run build`)

## Phase 2 – Remove Legacy Assets
- [ ] Re-verify that the unused files have no remaining references (`rg "domains/" frontend/src` etc.)
- [ ] Delete legacy DDD domain tree (`frontend/src/domains/**`)
- [ ] Remove obsolete adapter (`frontend/src/adapters/workspace-dto-adapter.ts`)
- [ ] Remove unused workspace integration helper (`frontend/src/shared/file-explorer/workspace-integration.ts`)
- [ ] Remove deprecated workspace page (`frontend/src/ui/pages/WorkspacePage.tsx`)
- [ ] Update barrel/index files or exports that referenced removed modules

## Phase 3 – Post-Removal Validation
- [ ] Ensure linting passes (`npm run lint` if available)
- [ ] Run unit/integration tests (`npm run test`)
- [ ] Run production build (`npm run build`)
- [ ] Perform manual smoke test of the app (launch Tauri app, navigate key flows)

## Phase 4 – Wrap-Up
- [ ] Update documentation to reflect the feature-based architecture (e.g., remove DDD references)
- [ ] Capture before/after notes for the refactor summary or PR description
- [ ] Commit changes with descriptive message and push or open PR
