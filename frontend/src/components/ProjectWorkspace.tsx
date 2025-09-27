/**
 * TEMPORARY COMPATIBILITY LAYER
 *
 * Re-exports ProjectWorkspace from the new feature location for backward compatibility.
 * This allows existing imports to continue working during the transition period.
 *
 * @deprecated Use `import { ProjectWorkspace } from '@/features/project'` instead
 * This compatibility layer will be removed in a future release.
 */

// Re-export component and types from the new feature location
export { ProjectWorkspace } from '../features/project';
export type { WorkspaceProps as ProjectWorkspaceProps } from '../features/project';

// Development-time deprecation warning
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️  DEPRECATION WARNING: Importing ProjectWorkspace from @/components/ProjectWorkspace is deprecated. ' +
    'Please use `import { ProjectWorkspace } from "@/features/project"` instead. ' +
    'This compatibility layer will be removed in a future release.'
  );
}

