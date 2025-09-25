// Export types
export * from './types';

// Export stores
export * from './stores/extraction-store';

// Export services
export * from './services/extraction-api';

// Export UI components
export { TipTapEditor } from './ui/components/TipTapEditor';
export { DocumentViewer } from './ui/components/DocumentViewer';
export { ExtractionStatusIndicator, ExtractButton } from './ui/components/ExtractionStatusIndicator';
export { ModeToggle, ModeStatus } from './ui/components/ModeToggle';

// Export hooks
export { useExtractionError } from './hooks/useExtractionError';

// Re-export enhanced DocumentCaddy (already exported from its original location)
// Users should import from the workspace domain location for backward compatibility