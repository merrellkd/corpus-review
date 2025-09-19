import '@testing-library/jest-dom'
import { vi } from 'vitest'

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