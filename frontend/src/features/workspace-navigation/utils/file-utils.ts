import type { FileEntryDto, WorkspaceDto } from '../services/workspace-api'
import type { BreadcrumbSegment } from '../types'

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export const isDirectory = (entry: FileEntryDto): boolean => entry.entryType === 'directory'

export const isFile = (entry: FileEntryDto): boolean => entry.entryType === 'file'

export const getExtension = (entry: FileEntryDto): string => {
  if (isDirectory(entry)) {
    return ''
  }
  const lastDot = entry.name.lastIndexOf('.')
  return lastDot >= 0 ? entry.name.substring(lastDot + 1).toLowerCase() : ''
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 B'
  }

  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, index)
  return `${parseFloat(size.toFixed(2))} ${FILE_SIZE_UNITS[index]}`
}

export const getSizeDisplay = (entry: FileEntryDto): string => {
  if (isDirectory(entry)) {
    return '—'
  }
  if (entry.size === null) {
    return '—'
  }
  return formatFileSize(entry.size)
}

export const sortEntriesForListing = (entries: FileEntryDto[] | undefined): FileEntryDto[] => {
  if (!entries) {
    return []
  }

  return [...entries].sort((a, b) => {
    if (isDirectory(a) && isFile(b)) return -1
    if (isFile(a) && isDirectory(b)) return 1
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  })
}

export const getBreadcrumbSegments = (workspace: WorkspaceDto | null | undefined): BreadcrumbSegment[] => {
  if (!workspace) {
    return []
  }

  const segments: BreadcrumbSegment[] = [
    {
      name: workspace.projectName,
      path: workspace.sourceFolder,
    },
  ]

  if (workspace.currentPath === workspace.sourceFolder) {
    return segments
  }

  const relativePath = workspace.currentPath.replace(workspace.sourceFolder, '')
  const pathParts = relativePath.split('/').filter(Boolean)

  let currentPath = workspace.sourceFolder
  for (const part of pathParts) {
    currentPath = `${currentPath}/${part}`
    segments.push({
      name: part,
      path: currentPath,
    })
  }

  return segments
}

export const canNavigateUp = (workspace: WorkspaceDto): boolean => workspace.directoryListing.canNavigateUp
