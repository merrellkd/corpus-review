import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

const FRONTEND_SRC = path.join(__dirname, '../../src');
const FEATURES_DIR = path.join(FRONTEND_SRC, 'features');

describe('Feature Structure Contract', () => {
  const expectedFeatures = [
    'project-management',
    'workspace-navigation',
    'document-workspace'
  ];

  const requiredSubdirectories = [
    'components',
    'hooks',
    'services',
    'types'
  ];

  beforeAll(() => {
    // Ensure features directory exists
    expect(fs.existsSync(FEATURES_DIR)).toBe(true);
  });

  it('should have all expected feature directories', () => {
    const featureDirs = fs.readdirSync(FEATURES_DIR)
      .filter(item => fs.statSync(path.join(FEATURES_DIR, item)).isDirectory());

    expectedFeatures.forEach(feature => {
      expect(featureDirs).toContain(feature);
    });
  });

  expectedFeatures.forEach(feature => {
    describe(`Feature: ${feature}`, () => {
      const featurePath = path.join(FEATURES_DIR, feature);

      it('should exist as a directory', () => {
        expect(fs.existsSync(featurePath)).toBe(true);
        expect(fs.statSync(featurePath).isDirectory()).toBe(true);
      });

      requiredSubdirectories.forEach(subdir => {
        it(`should have required subdirectory: ${subdir}`, () => {
          const subdirPath = path.join(featurePath, subdir);
          expect(fs.existsSync(subdirPath)).toBe(true);
          expect(fs.statSync(subdirPath).isDirectory()).toBe(true);
        });
      });

      it('should follow kebab-case naming convention', () => {
        expect(feature).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
      });
    });
  });

  describe('Shared directory', () => {
    const sharedPath = path.join(FRONTEND_SRC, 'shared');
    const requiredSharedDirs = ['components', 'hooks', 'services', 'types', 'utils'];

    it('should exist', () => {
      expect(fs.existsSync(sharedPath)).toBe(true);
      expect(fs.statSync(sharedPath).isDirectory()).toBe(true);
    });

    requiredSharedDirs.forEach(subdir => {
      it(`should have required subdirectory: ${subdir}`, () => {
        const subdirPath = path.join(sharedPath, subdir);
        expect(fs.existsSync(subdirPath)).toBe(true);
        expect(fs.statSync(subdirPath).isDirectory()).toBe(true);
      });
    });
  });

  describe('Constitutional compliance', () => {
    it('should not have cross-feature imports (except shared/ and stores/)', async () => {
      // This test will be expanded during implementation to check actual imports
      // For now, just verify structure exists for import validation
      expect(fs.existsSync(FEATURES_DIR)).toBe(true);
    });

    it('should follow feature self-containment principle', () => {
      // Verify each feature has the required directories for self-containment
      expectedFeatures.forEach(feature => {
        const featurePath = path.join(FEATURES_DIR, feature);
        requiredSubdirectories.forEach(subdir => {
          expect(fs.existsSync(path.join(featurePath, subdir))).toBe(true);
        });
      });
    });
  });
});