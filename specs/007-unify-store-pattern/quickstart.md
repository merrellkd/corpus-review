# Quickstart: Unify Store Pattern

## Development Test Scenarios

### Scenario 1: Store Migration Verification
**Objective**: Verify all stores are successfully moved to unified structure

**Pre-migration Setup**:
```bash
# Verify current store locations
find frontend/src -name "*store*" -type f | grep -E "\.(ts|tsx)$"

# Expected scattered locations:
# frontend/src/stores/workspaceStore.ts
# frontend/src/stores/workspace-store.ts
# frontend/src/stores/panelStateMachine.ts
# frontend/src/stores/unifiedPanelState.ts
# frontend/src/stores/fileCategorization.ts
# frontend/src/features/project-management/store.ts
# frontend/src/domains/workspace/ui/stores/workspace-store.ts
```

**Post-migration Verification**:
```bash
# Verify unified structure
ls -la frontend/src/stores/
# Expected: project/, workspace/, ui/, shared/, index.ts

# Verify individual store directories
ls -la frontend/src/stores/project/
# Expected: project-store.ts, project-store-types.ts, index.ts

ls -la frontend/src/stores/workspace/
# Expected: workspace-store.ts, workspace-store-types.ts, index.ts

ls -la frontend/src/stores/ui/
# Expected: panel-store.ts, ui-store-types.ts, index.ts

ls -la frontend/src/stores/shared/
# Expected: file-categorization-store.ts, index.ts
```

**Success Criteria**:
- All stores moved to `/stores/{feature}/` structure
- No orphaned store files in original locations
- All stores follow kebab-case naming convention

### Scenario 2: Import Path Update Validation
**Objective**: Verify all import paths are correctly updated

**Test Commands**:
```bash
# Search for old import patterns (should return empty)
grep -r "features/project-management/store" frontend/src/ || echo "✓ No old project store imports"
grep -r "stores/workspaceStore" frontend/src/ || echo "✓ No old workspace imports"
grep -r "domains/workspace/ui/stores" frontend/src/ || echo "✓ No old domain store imports"

# Verify new import patterns exist
grep -r "stores/project" frontend/src/ && echo "✓ New project store imports found"
grep -r "stores/workspace" frontend/src/ && echo "✓ New workspace store imports found"
grep -r "stores/ui" frontend/src/ && echo "✓ New UI store imports found"
```

**Success Criteria**:
- Zero occurrences of old import paths
- All components use new unified import paths
- Import statements compile without errors

### Scenario 3: TypeScript Compilation Validation
**Objective**: Ensure migration preserves type safety

**Test Commands**:
```bash
# Full TypeScript compilation check
cd frontend && npm run typecheck

# Individual store type validation
npx tsc --noEmit --strict frontend/src/stores/project/project-store.ts
npx tsc --noEmit --strict frontend/src/stores/workspace/workspace-store.ts
npx tsc --noEmit --strict frontend/src/stores/ui/panel-store.ts
```

**Expected Results**:
```
✓ No TypeScript errors
✓ All store interfaces properly typed
✓ Import/export types resolve correctly
✓ Strict mode compilation passes
```

### Scenario 4: Store Functionality Preservation
**Objective**: Verify store behavior remains unchanged

**Test Commands**:
```bash
# Run existing tests to ensure no regressions
cd frontend && npm test

# Specific store behavior tests
npm test -- --testNamePattern="project.*store"
npm test -- --testNamePattern="workspace.*store"
npm test -- --testNamePattern="panel.*store"
```

**Manual Verification**:
1. Open application in development mode
2. Navigate to project management features
3. Verify project CRUD operations work
4. Navigate to workspace features
5. Verify file navigation works
6. Test panel state changes
7. Verify UI responsiveness maintained

**Success Criteria**:
- All existing tests pass
- No behavioral changes in store functionality
- Store state management works identically

### Scenario 5: Duplicate Store Elimination Validation
**Objective**: Verify duplicate stores are properly consolidated

**Pre-migration Analysis**:
```bash
# Identify duplicate workspace stores
grep -l "workspace" frontend/src/stores/*.ts
grep -l "workspace" frontend/src/domains/workspace/ui/stores/*.ts

# Compare functionality overlap
diff frontend/src/stores/workspaceStore.ts frontend/src/stores/workspace-store.ts
diff frontend/src/stores/workspace-store.ts frontend/src/domains/workspace/ui/stores/workspace-store.ts
```

**Post-migration Verification**:
```bash
# Verify only one workspace store exists
find frontend/src -name "*workspace*store*" -type f
# Expected: frontend/src/stores/workspace/workspace-store.ts only

# Verify panel store consolidation
find frontend/src -name "*panel*" -type f | grep -v test
# Expected: frontend/src/stores/ui/panel-store.ts only
```

**Success Criteria**:
- Single workspace store in `/stores/workspace/`
- Single panel store in `/stores/ui/`
- No duplicate functionality across stores

### Scenario 6: Developer Experience Validation
**Objective**: Verify improved import patterns for developers

**Import Pattern Tests**:
```typescript
// Test clean import patterns work
import { useProjectStore } from 'stores/project';
import { useWorkspaceStore } from 'stores/workspace';
import { usePanelStore } from 'stores/ui';
import { useFileCategorization } from 'stores/shared';

// Test type imports work
import type { ProjectState, ProjectActions } from 'stores/project';
import type { WorkspaceState, WorkspaceActions } from 'stores/workspace';
```

**IDE Integration Test**:
```bash
# Verify TypeScript IntelliSense works
# Open VSCode and test:
# 1. Import autocomplete for 'stores/'
# 2. Type checking for store hooks
# 3. Go-to-definition for store types
# 4. Refactoring support for store usage
```

**Success Criteria**:
- Clean, predictable import paths
- Full TypeScript IntelliSense support
- Easy navigation between store definitions
- Consistent naming patterns across all stores

## Performance Validation

### Bundle Size Impact
```bash
# Before migration
cd frontend && npm run build
du -h dist/assets/*.js | sort -hr

# After migration
npm run build
du -h dist/assets/*.js | sort -hr

# Compare bundle sizes (should be same or smaller)
```

### Runtime Performance
```bash
# Development build time
time npm run dev

# Production build time
time npm run build

# Compare with pre-migration benchmarks
```

**Success Criteria**:
- Bundle size unchanged or reduced
- Build times unchanged or improved
- Runtime performance maintained

## Rollback Plan

### Emergency Rollback Commands
```bash
# If migration fails, restore from backup
git checkout HEAD~1 -- frontend/src/

# Or restore specific directories
git checkout HEAD~1 -- frontend/src/stores/
git checkout HEAD~1 -- frontend/src/features/
git checkout HEAD~1 -- frontend/src/domains/

# Verify rollback success
npm run typecheck && npm run build
```

### Validation After Rollback
- All original store locations restored
- TypeScript compilation passes
- All tests pass
- Application functionality verified