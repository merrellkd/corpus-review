# Frontend Architecture Refactoring Plan

**Project**: Corpus Review Frontend
**Date**: September 26, 2025
**Goal**: Refactor from DDD to Feature-Based Architecture
**Timeline**: 3 weeks
**Reference**: Based on FRONTEND_DDD_AUDIT.md analysis

---

## Overview

Refactor the over-engineered DDD frontend architecture to a feature-based approach that better suits UI development patterns while maintaining type safety and code organization benefits.

**Current Issues:**
- Multiple overlapping workspace stores (store proliferation)
- 898-line project store indicating excessive complexity
- Frontend domains duplicating backend domains unnecessarily
- Complex data flow: UI → Domain → DTO → Tauri → Backend

**Target Architecture:**
```
frontend/src/
├── features/
│   ├── project-management/    # Complete vertical slice
│   ├── workspace-navigation/  # Complete vertical slice
│   └── document-workspace/    # Complete vertical slice
├── shared/                    # Truly reusable code
└── stores/                    # Global app state only
```

---

## Phase 1: Analysis & Store Consolidation (Week 1)

### Pre-Work: Current State Analysis
- [ ] **1.1** Audit current component imports and dependencies
  ```bash
  grep -r "import.*domains" frontend/src --include="*.tsx" --include="*.ts" > component-audit.txt
  ```
- [ ] **1.2** Document current store structure and overlaps
  - Map all Zustand stores and their responsibilities
  - Identify duplicate workspace stores
  - Document the 898-line project store contents
- [ ] **1.3** Create feature boundary map
  - Project Management: CRUD operations, project listing
  - Workspace Navigation: File system browsing, directory navigation
  - Document Workspace: Document layout, caddy management
- [ ] **1.4** Identify truly shared components vs feature-specific components

### Store Consolidation Tasks
- [ ] **1.5** Create backup branch: `git checkout -b backup-before-frontend-refactor`
- [ ] **1.6** Merge workspace stores
  - [ ] Analyze `workspace-store.ts`, `workspaceStore.ts`, and domain workspace store
  - [ ] Create consolidated `features/workspace-navigation/store.ts`
  - [ ] Migrate state and actions from all three stores
  - [ ] Update components to use consolidated store
  - [ ] Remove old workspace store files
- [ ] **1.7** Simplify project store
  - [ ] Extract domain model complexity from 898-line project store
  - [ ] Focus on UI state and API integration only
  - [ ] Create streamlined `features/project-management/store.ts`
  - [ ] Remove unnecessary domain abstractions
- [ ] **1.8** Extract global UI state
  - [ ] Move panel visibility state to `stores/ui-store.ts`
  - [ ] Move layout state to global UI store
  - [ ] Keep feature state separate from UI layout state
- [ ] **1.9** Verify store consolidation works
  - [ ] Run build: `npm run build`
  - [ ] Test basic functionality in each affected area

---

## Phase 2: Feature Structure Creation & Component Migration (Week 2)

### Feature Directory Setup
- [ ] **2.1** Create feature-based directory structure
  ```bash
  mkdir -p frontend/src/features/project-management/{components,hooks,services,types}
  mkdir -p frontend/src/features/workspace-navigation/{components,hooks,services,types}
  mkdir -p frontend/src/features/document-workspace/{components,hooks,services,types}
  mkdir -p frontend/src/shared/{components,hooks,services,types,utils}
  ```

### Component Migration
- [ ] **2.2** Migrate project management components
  - [ ] Move project CRUD components to `features/project-management/components/`
  - [ ] Move project listing components
  - [ ] Move project creation/deletion UI
  - [ ] Update imports in moved components
- [ ] **2.3** Migrate workspace navigation components
  - [ ] Move file explorer components to `features/workspace-navigation/components/`
  - [ ] Move directory navigation UI
  - [ ] Move breadcrumb components
  - [ ] Update imports in moved components
- [ ] **2.4** Migrate document workspace components
  - [ ] Move document layout components to `features/document-workspace/components/`
  - [ ] Move document caddy components
  - [ ] Move document panel management
  - [ ] Update imports in moved components
- [ ] **2.5** Extract truly shared components
  - [ ] Identify components used across multiple features
  - [ ] Move to `shared/components/`
  - [ ] Create shared component index files
  - [ ] Update all imports to use shared components

### Hook Migration
- [ ] **2.6** Create feature-specific hooks
  - [ ] Move project-related hooks to `features/project-management/hooks/`
  - [ ] Move workspace navigation hooks to `features/workspace-navigation/hooks/`
  - [ ] Move document workspace hooks to `features/document-workspace/hooks/`
  - [ ] Extract truly shared hooks to `shared/hooks/`

### Type Migration
- [ ] **2.7** Organize TypeScript types by feature
  - [ ] Move project types to `features/project-management/types/`
  - [ ] Move workspace types to `features/workspace-navigation/types/`
  - [ ] Move document types to `features/document-workspace/types/`
  - [ ] Keep shared types in `shared/types/`

---

## Phase 3: Service Layer Simplification (Week 3)

### API Service Simplification
- [ ] **3.1** Replace domain services with direct API services
  - [ ] Create `features/project-management/services/project-api.ts`
    - Replace: `const project = Project.create(name, folder, note); await projectRepository.create(project);`
    - With: `await projectApi.create({ name, folder, note });`
  - [ ] Create `features/workspace-navigation/services/workspace-api.ts`
  - [ ] Create `features/document-workspace/services/document-api.ts`
- [ ] **3.2** Simplify Tauri integration
  - [ ] Keep command wrappers for type safety
  - [ ] Remove unnecessary DTO conversions
  - [ ] Enable direct API calls for simple operations
  - [ ] Update error handling to be more straightforward
- [ ] **3.3** Remove domain model complexity
  - [ ] Remove value objects that only wrap simple types
  - [ ] Remove aggregates that don't provide business value
  - [ ] Remove domain error hierarchies in favor of simple error types
  - [ ] Keep only validation that provides UI value

### Error Handling Streamlining
- [ ] **3.4** Implement streamlined error handling
  - [ ] Create global error boundary for unhandled errors
  - [ ] Add feature-specific error states in stores
  - [ ] Remove complex domain error hierarchies
  - [ ] Add user-friendly error messages

### Update Component Integration
- [ ] **3.5** Update components to use new service layer
  - [ ] Update project management components to use simplified API
  - [ ] Update workspace navigation components
  - [ ] Update document workspace components
  - [ ] Remove domain model imports from components

---

## Phase 4: Testing & Validation (Ongoing)

### Functional Testing
- [ ] **4.1** Verify core functionality after each phase
  - [ ] Project creation, deletion, listing works
  - [ ] Workspace navigation functions correctly
  - [ ] Document workspace operates as expected
  - [ ] All UI interactions remain functional

### Build & Quality Checks
- [ ] **4.2** Ensure build passes after each phase
  - [ ] Run `npm run build` after major changes
  - [ ] Fix TypeScript compilation errors
  - [ ] Address any linting warnings
  - [ ] Verify `npm run dev` works correctly

### Performance Validation
- [ ] **4.3** Verify performance improvements
  - [ ] Measure bundle size before/after refactoring
  - [ ] Check component render performance
  - [ ] Validate store update performance
  - [ ] Test memory usage improvements

---

## Phase 5: Cleanup & Documentation (Final Week)

### Code Cleanup
- [ ] **5.1** Remove old architecture files
  - [ ] Delete old domain directories: `rm -rf frontend/src/domains/`
  - [ ] Remove unused store files
  - [ ] Clean up unused imports and exports
  - [ ] Remove dead code identified during migration

### Documentation Updates
- [ ] **5.2** Update architecture documentation
  - [ ] Update README.md with new architecture description
  - [ ] Document feature-based organization principles
  - [ ] Update development guidelines
  - [ ] Create feature development templates

### Final Testing
- [ ] **5.3** Comprehensive functionality testing
  - [ ] Test all project management workflows
  - [ ] Test all workspace navigation features
  - [ ] Test all document workspace functionality
  - [ ] Verify no regressions in existing features

---

## Rollback Plan

If critical issues arise during refactoring:

1. **Immediate rollback**: `git checkout backup-before-frontend-refactor`
2. **Partial rollback**: Cherry-pick working changes from refactor branch
3. **Issue isolation**: Use feature flags to disable problematic areas

---

## Success Criteria

### Technical Metrics:
- [ ] Build passes without errors
- [ ] No functional regressions
- [ ] Reduced bundle size (target: 10-20% reduction)
- [ ] Fewer lines of code (target: 20-30% reduction)

### Developer Experience:
- [ ] New features can be added faster (single directory changes)
- [ ] Component location is intuitive (feature-based)
- [ ] State management is clearer (no overlapping stores)
- [ ] Onboarding is simpler (feature-based mental model)

---

## Notes

- **Incremental Progress**: Each phase should leave the application in a working state
- **Testing First**: Test after each major change, not just at the end
- **Documentation**: Update docs as you go, not after completion
- **Team Communication**: Keep team informed of progress and any blocking issues

**Estimated Effort**: 3 weeks full-time equivalent
**Risk Level**: Medium (well-planned migration with rollback options)
**Impact**: High (significant improvement in maintainability and developer experience)