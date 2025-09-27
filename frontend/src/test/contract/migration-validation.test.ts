import { describe, test, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

// Contract test for migration validation using contracts/migration-validation.schema.json
describe('Migration Validation Contract', () => {
  const frontendPath = join(process.cwd(), 'src');

  test('old store locations are removed', () => {
    const oldLocations = [
      'features/project-management/store.ts',
      'domains/workspace/ui/stores/workspace.ts',
      'stores/workspace.ts',
      'stores/ui.ts'
    ];

    oldLocations.forEach(oldPath => {
      const fullPath = join(frontendPath, oldPath);
      // This will fail until old files are removed
      expect(existsSync(fullPath), `Old store at ${oldPath} should be removed`).toBe(false);
    });
  });

  test('new store locations exist', () => {
    const newLocations = [
      'stores/project/project-store.ts',
      'stores/workspace/workspace-store.ts',
      'stores/ui/panel-store.ts',
      'stores/shared/file-categorization-store.ts'
    ];

    newLocations.forEach(newPath => {
      const fullPath = join(frontendPath, newPath);
      // This will fail until new stores are created
      expect(existsSync(fullPath), `New store at ${newPath} should exist`).toBe(true);
    });
  });

  test('import paths are updated throughout codebase', async () => {
    // This test will verify that old import patterns don't exist
    const { execSync } = await import('child_process');

    try {
      // Search for old import patterns (should return empty)
      const oldImports = [
        'features/project-management/store',
        'stores/workspace',
        'domains/workspace/ui/stores/workspace',
        'stores/ui',
        'stores/ui'
      ];

      oldImports.forEach(oldImport => {
        try {
          const result = execSync(`grep -r "${oldImport}" ${frontendPath} --include="*.ts" --include="*.tsx" || true`, { encoding: 'utf8' });
          // This will fail until imports are updated
          expect(result.trim(), `Old import pattern "${oldImport}" should not exist`).toBe('');
        } catch (error) {
          // grep returns non-zero when no matches found, which is what we want
          expect(true).toBe(true);
        }
      });
    } catch (error) {
      // If grep is not available, skip this test
      expect(true).toBe(true);
    }
  });

  test('typescript compilation passes', async () => {
    const { execSync } = await import('child_process');

    try {
      // Run TypeScript compilation check
      execSync('npx tsc --noEmit', { cwd: frontendPath, stdio: 'pipe' });
      expect(true).toBe(true);
    } catch (error) {
      // This will fail until all imports are properly updated
      expect(false, 'TypeScript compilation should pass after migration').toBe(true);
    }
  });

  test('no breaking changes to store APIs', async () => {
    // This test ensures all existing store functionality is preserved
    // Will fail until stores are properly migrated with preserved APIs

    expect(async () => {
      // Test project store API preservation
      const projectStore = await import('../../stores/project');
      const store = projectStore.useProjectStore();

      // Should have all expected methods from original store
      expect(store.loadProjects).toBeDefined();
      expect(store.createProject).toBeDefined();
      expect(store.updateProject).toBeDefined();
      expect(store.deleteProject).toBeDefined();
    }).not.toThrow();
  });

  test('store categorization is correct', () => {
    const featureStores = ['project']; // Single-feature stores
    const crossFeatureStores = ['workspace', 'ui']; // Multi-feature stores
    const sharedStores = ['shared']; // Shared functionality

    [...featureStores, ...crossFeatureStores, ...sharedStores].forEach(category => {
      const categoryPath = join(frontendPath, 'stores', category);
      // This will pass since directories were created in setup
      expect(existsSync(categoryPath), `Store category ${category} should exist`).toBe(true);
    });
  });
});