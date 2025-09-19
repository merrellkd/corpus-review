# Research: Project Workspace

**Feature**: Project Workspace
**Date**: 2025-09-19
**Status**: Phase 0 Complete

## Research Findings

### Testing Framework Decision
**Decision**: Vitest for frontend, Rust's built-in testing for backend
**Rationale**:
- Vitest provides fast React component testing with TypeScript support
- Native Rust testing framework sufficient for Tauri commands and domain logic
- Consistent with Vite frontend build system specified in constitution
- Playwright for E2E testing of desktop application workflows

**Alternatives considered**:
- Jest: Slower than Vitest, less optimal for Vite projects
- Testing Library alone: Needs test runner, Vitest includes this
- Cypress: Heavier than Playwright for desktop testing

### Panel Resizing Implementation
**Decision**: react-resizable-panels library
**Rationale**:
- Purpose-built for React component-based resizable panel layouts
- Handles complex nested panel scenarios (main workspace + MDW Caddy components)
- Built-in persistence and restoration of panel sizes
- Touch-friendly drag handles with smooth resize animations
- TypeScript support and active maintenance
- Designed specifically for the nested panel use case we're implementing

**Alternatives considered**:
- CSS Grid: Less flexible for nested component hierarchies and dynamic resizing
- Custom ResizeObserver implementation: Complex to build reliably for nested scenarios
- CSS Resize: Limited browser support and insufficient for component-based architecture

### File System Access Pattern
**Decision**: Tauri filesystem API with repository pattern abstraction
**Rationale**:
- Tauri provides secure filesystem access within app permissions
- Repository pattern isolates domain from Tauri-specific implementations
- Enables future extension to cloud storage without domain changes
- Structured error handling for inaccessible folders

**Alternatives considered**:
- Direct fs operations: Violates layer isolation principles
- Web File API: Insufficient for desktop file browsing needs
- Native file dialogs: Limited for continuous folder monitoring

### State Management Architecture
**Decision**: Domain-specific Zustand stores with persistence middleware
**Rationale**:
- Separate stores for workspace layout, file explorer, document state
- Built-in persistence for panel sizes and visibility preferences
- Type-safe actions and selectors following DDD boundaries
- Optimistic updates with error rollback for file operations

**Alternatives considered**:
- Redux Toolkit: Overly complex for workspace state management
- React Context: Performance issues with frequent layout updates
- Jotai: Less established patterns for complex state persistence

### Document Caddy Implementation
**Decision**: react-resizable-panels for caddy containers with virtual scrolling
**Rationale**:
- Each Document Caddy is a resizable panel within the MDW area
- Supports nested panel layouts for multi-document scenarios
- Handles dynamic addition/removal of document caddies
- Smooth resizing between multiple open documents
- Memory-efficient with lazy loading of document content

**Alternatives considered**:
- Custom panel implementation: Complex to handle all edge cases reliably
- Fixed-size containers: Doesn't provide the flexible workspace experience
- Tab-based approach: Doesn't match multi-document workspace design

## Implementation Readiness
All technical unknowns resolved. Ready for Phase 1 design and contracts generation.