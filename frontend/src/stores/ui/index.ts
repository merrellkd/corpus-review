/**
 * UI Store - Unified Store Location
 *
 * Re-exports for clean imports from centralized store location
 */

export {
  usePanelStore,
  usePanelStateMachine,
  useUnifiedPanelState,
  usePanelLayout,
  useUIPreferences
} from './panel-store';

export type {
  UIStore,
  UIState,
  UIActions,
  UIStateCallbacks,
  ActivePanelType,
  PanelStateType,
  LayoutMode,
  PanelConfig,
  PanelLayout,
  LastValidState,
} from './ui-store-types';

export {
  DEFAULT_PANEL_CONFIG,
  DEFAULT_PANEL_LAYOUT,
  DEFAULT_UI_CONFIG,
  UIStoreError,
} from './ui-store-types';

// Default export for convenience
export { usePanelStore as default } from './panel-store';