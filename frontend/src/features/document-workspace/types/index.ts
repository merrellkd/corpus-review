import type { LayoutModeType as ApiLayoutModeType } from '../services/document-api';

export const layoutModes = {
  STACKED: 'stacked',
  GRID: 'grid',
  FREEFORM: 'freeform',
} as const;

export type LayoutModeType = ApiLayoutModeType;

export type DocumentState = 'loading' | 'ready' | 'error' | 'closing';

export interface Dimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface DocumentViewModel {
  id: string;
  title: string;
  filePath: string;
  position: Position;
  dimensions: Dimensions;
  zIndex: number;
  isActive: boolean;
  isVisible: boolean;
  state: DocumentState;
  errorMessage?: string;
  lastModified?: string;
}

export interface WorkspaceViewModel {
  id: string;
  name: string;
  layoutMode: LayoutModeType;
  size: Dimensions;
  lastModified?: string;
}
