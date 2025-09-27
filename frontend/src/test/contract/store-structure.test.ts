import { describe, test, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Contract test for store structure validation using contracts/store-structure.schema.json
describe('Store Structure Contract Validation', () => {
  const storesPath = join(process.cwd(), 'src/stores');

  test('stores directory exists', () => {
    expect(existsSync(storesPath)).toBe(true);
  });

  test('required feature directories exist', () => {
    const requiredDirs = ['project', 'workspace', 'ui'];
    const existingDirs = readdirSync(storesPath).filter(item =>
      statSync(join(storesPath, item)).isDirectory()
    );

    requiredDirs.forEach(dir => {
      expect(existingDirs).toContain(dir);
    });
  });

  test('project store structure compliance', () => {
    const projectPath = join(storesPath, 'project');
    expect(existsSync(projectPath)).toBe(true);

    // These files should exist after implementation
    const requiredFiles = ['project-store.ts', 'index.ts'];
    requiredFiles.forEach(file => {
      const filePath = join(projectPath, file);
      // This will fail until implementation is complete
      expect(existsSync(filePath), `${file} should exist in project store`).toBe(true);
    });
  });

  test('workspace store structure compliance', () => {
    const workspacePath = join(storesPath, 'workspace');
    expect(existsSync(workspacePath)).toBe(true);

    const requiredFiles = ['workspace-store.ts', 'index.ts'];
    requiredFiles.forEach(file => {
      const filePath = join(workspacePath, file);
      // This will fail until implementation is complete
      expect(existsSync(filePath), `${file} should exist in workspace store`).toBe(true);
    });
  });

  test('ui store structure compliance', () => {
    const uiPath = join(storesPath, 'ui');
    expect(existsSync(uiPath)).toBe(true);

    const requiredFiles = ['panel-store.ts', 'index.ts'];
    requiredFiles.forEach(file => {
      const filePath = join(uiPath, file);
      // This will fail until implementation is complete
      expect(existsSync(filePath), `${file} should exist in UI store`).toBe(true);
    });
  });

  test('kebab-case naming convention', () => {
    // Check all store files follow kebab-case pattern
    const kebabCasePattern = /^[a-z]+(-[a-z]+)*\.(ts|js)$/;

    const checkDirectory = (dirPath: string) => {
      if (!existsSync(dirPath)) return;

      const files = readdirSync(dirPath);
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          expect(kebabCasePattern.test(file),
            `File ${file} should follow kebab-case naming`).toBe(true);
        }
      });
    };

    ['project', 'workspace', 'ui', 'shared'].forEach(dir => {
      checkDirectory(join(storesPath, dir));
    });
  });
});