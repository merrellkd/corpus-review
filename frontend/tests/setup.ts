import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { configure } from '@testing-library/react'

// Configure Testing Library to reduce DOM output
configure({
  getElementError: (message, _container) => {
    const error = new Error(message || 'TestingLibraryElementError')
    error.name = 'TestingLibraryElementError'
    error.stack = ''
    return error
  }
})

// Suppress DOM dumps during TDD phase
process.env.DEBUG_PRINT_LIMIT = '0'

// Mock Tauri API for tests
global.window = Object.create(window)
Object.defineProperty(window, '__TAURI__', {
  value: {
    invoke: vi.fn(),
    event: {
      listen: vi.fn(),
      emit: vi.fn(),
    },
  },
  writable: true,
})

// Mock IntersectionObserver for react-resizable-panels
Object.defineProperty(global, 'IntersectionObserver', {
  value: class MockIntersectionObserver {
    root = null
    rootMargin = ''
    thresholds = []
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return [] }
  },
  writable: true,
})

// Mock ResizeObserver for react-resizable-panels
Object.defineProperty(global, 'ResizeObserver', {
  value: class MockResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}
    disconnect() {}
    observe() {}
    unobserve() {}
  },
  writable: true,
})