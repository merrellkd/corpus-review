import type { WorkspaceDto } from './services/workspace-api'

export type ViewMode = 'list' | 'grid'

export interface BreadcrumbSegment {
  name: string
  path: string
}

export type { WorkspaceDto }
