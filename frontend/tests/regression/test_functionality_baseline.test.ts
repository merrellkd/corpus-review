import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = path.join(__dirname, '../../src');

describe('Functionality Baseline Capture', () => {
  let baseline: {
    fileCount: number;
    directories: string[];
    components: string[];
    stores: string[];
    domains: string[];
  };

  beforeAll(() => {
    // Capture current state before refactoring
    baseline = captureCurrentState();
  });

  function captureCurrentState() {
    const state = {
      fileCount: 0,
      directories: [] as string[],
      components: [] as string[],
      stores: [] as string[],
      domains: [] as string[]
    };

    // Count TypeScript/React files
    const files = getAllTsFiles(FRONTEND_SRC);
    state.fileCount = files.length;

    // Capture directory structure
    state.directories = getDirectories(FRONTEND_SRC);

    // Capture components
    state.components = files.filter(f => f.endsWith('.tsx') || f.includes('component'));

    // Capture stores
    state.stores = files.filter(f => f.includes('store') || f.includes('Store'));

    // Capture domain files
    state.domains = files.filter(f => f.includes('domain'));

    return state;
  }

  function getAllTsFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git') continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...getAllTsFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  function getDirectories(dir: string): string[] {
    const dirs: string[] = [];
    if (!fs.existsSync(dir)) return dirs;

    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (item === 'node_modules' || item === '.git') continue;

      const fullPath = path.join(dir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        dirs.push(fullPath);
        dirs.push(...getDirectories(fullPath));
      }
    }
    return dirs;
  }

  describe('Pre-refactoring State Capture', () => {
    it('should capture current file count', () => {
      expect(baseline.fileCount).toBeGreaterThan(0);
      console.log(`Baseline: ${baseline.fileCount} TypeScript files captured`);
    });

    it('should capture current directory structure', () => {
      expect(baseline.directories.length).toBeGreaterThan(0);
      console.log(`Baseline: ${baseline.directories.length} directories captured`);
    });

    it('should capture current components', () => {
      expect(baseline.components.length).toBeGreaterThan(0);
      console.log(`Baseline: ${baseline.components.length} components captured`);
    });

    it('should capture current stores', () => {
      expect(baseline.stores.length).toBeGreaterThan(0);
      console.log(`Baseline: ${baseline.stores.length} stores captured`);
    });

    it('should capture current domain files', () => {
      expect(baseline.domains.length).toBeGreaterThan(0);
      console.log(`Baseline: ${baseline.domains.length} domain files captured`);
    });
  });

  describe('Constitutional Compliance Baseline', () => {
    it('should verify feature directories are created', () => {
      const featuresDir = path.join(FRONTEND_SRC, 'features');
      expect(fs.existsSync(featuresDir)).toBe(true);
    });

    it('should verify shared directory is created', () => {
      const sharedDir = path.join(FRONTEND_SRC, 'shared');
      expect(fs.existsSync(sharedDir)).toBe(true);
    });

    it('should prepare for file count validation post-refactoring', () => {
      // After refactoring, total file count should remain the same (just moved)
      // This baseline will be used for comparison
      expect(baseline.fileCount).toBeGreaterThan(0);
    });
  });

  describe('Critical Application Files', () => {
    it('should verify App.tsx exists', () => {
      const appPath = path.join(FRONTEND_SRC, 'App.tsx');
      expect(fs.existsSync(appPath)).toBe(true);
    });

    it('should verify main.tsx exists', () => {
      const mainPath = path.join(FRONTEND_SRC, 'main.tsx');
      expect(fs.existsSync(mainPath)).toBe(true);
    });

    it('should verify essential components exist', () => {
      // Verify key components that will be moved still exist
      const componentsDir = path.join(FRONTEND_SRC, 'components');
      if (fs.existsSync(componentsDir)) {
        const components = fs.readdirSync(componentsDir);
        expect(components.length).toBeGreaterThan(0);
      }
    });
  });
});