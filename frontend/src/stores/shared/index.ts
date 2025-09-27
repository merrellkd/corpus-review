/**
 * Shared Stores - Unified Store Location
 *
 * Re-exports for clean imports from centralized shared store location
 */

export {
  useFileCategorization,
  useDragDropState,
  useCategorization,
  useCategoryManagement
} from './file-categorization-store';

// Default export for convenience
export { useFileCategorization as default } from './file-categorization-store';