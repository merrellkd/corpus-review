<!--
SYNC IMPACT REPORT
===================
Version change: 1.1.0 → 2.0.0
Modified principles:
- Domain-Driven Design principle updated to apply only to backend (breaking change)
- Layer Isolation Enforcement updated to backend-only scope
- Frontend DDD Structure (React) section replaced with Feature-Based Frontend Structure
- Domain-per-Context Organization updated to backend-only
- Client-Side State Management updated for feature-based organization
Added sections:
- Frontend Feature-Based Architecture principle
- Feature Organization Requirements section
Removed sections: None
Templates requiring updates: ✅ All templates verified for consistency
Follow-up TODOs: None
Rationale: MAJOR bump due to breaking change in frontend architecture requirements - moving from DDD to feature-based structure
-->

# Corpus Review Constitution

## Core Principles

### I. Backend Domain-Driven Design (NON-NEGOTIABLE)

Backend features MUST follow strict DDD architecture. Domain layer contains pure business logic with zero infrastructure dependencies. Application layer orchestrates domain objects. Infrastructure layer handles external concerns. Tauri commands consume application services only.

### II. Backend Layer Isolation Enforcement

Backend domain layer CANNOT import from application or infrastructure layers. Application layer CANNOT import from infrastructure layers. Infrastructure layer implements domain repository interfaces. Violations block feature advancement.

### III. Frontend Feature-Based Architecture (NON-NEGOTIABLE)

Frontend MUST follow feature-based organization with vertical slices. Features contain all related components, hooks, services, and types. Shared code limited to truly reusable utilities and components. Over-engineered domain abstractions prohibited in UI layer.

### IV. Prefixed Identifier System

All domain identifiers use prefixed UUID value objects (`entity_`, `doc_`, `mws_`, etc.). Self-identifying IDs enable debugging clarity and type safety. Raw UUIDs prohibited in domain logic.

### V. Strict TypeScript Compilation

All code must pass TypeScript strict mode compilation. No implicit any, no missing return types, exact optional properties enforced. Type safety is non-negotiable for production deployment.

## Development Workflow

### Spec-Driven Development Workflow

Features follow GitHub's spec-kit methodology: establish principles → create functional specifications → technical planning → task breakdown → iterative implementation. Specifications define "what" and "why" before "how". AI models interpret specs for multi-step refinement rather than one-shot generation. Implementation aligns to wireframes and user scenarios.

### AI-First Development Process

Documentation optimized for Claude Code autonomous work. Feature-specific prompt packs provide complete context. Shared architectural patterns documented for consistency. Human oversight focuses on design decisions, not implementation details.

### Figma-to-Implementation Workflow

New interfaces start with Figma wireframes defining layout, components, and interactions. Screenshots and design specs extracted from Figma inform functional specifications. Implementation follows wireframe-to-component mapping with design system consistency. Visual validation against Figma designs before feature completion.

## Architecture Standards

### Backend DDD Structure (Tauri)

Backend follows domain-per-context organization under `src-tauri/src/`:

- `domain/{context}/` - Pure business logic organized by bounded context (project, workspace)
  - `aggregates/` - Domain aggregate roots
  - `entities/` - Domain entities
  - `value_objects/` - Value objects and typed identifiers
  - `repositories/` - Repository trait definitions
  - `errors/` - Domain-specific error types
- `application/` - Application services orchestrating domain logic
  - `services/` - Application service implementations
  - `dtos/` - Data transfer objects for application boundaries
- `infrastructure/` - External system implementations
  - `repositories/` - Repository implementations using SQLX
  - `database/` - Database schema and migrations
  - `dtos/` - Infrastructure data transfer objects
  - `serializers/` - Data serialization logic
  - `errors/` - Infrastructure error mappings
  - `services/` - External service integrations
- `commands/` - Tauri command handlers with domain routing
  - `tests/` - Command integration tests

### Frontend Feature-Based Structure (React)

Frontend follows feature-based organization under `frontend/src/`:

- `features/{feature-name}/` - Complete vertical slices for each feature
  - `components/` - Feature-specific React components
  - `hooks/` - Custom hooks for feature logic
  - `services/` - Direct API integration and business logic
  - `types/` - Feature-specific TypeScript types
  - `store.ts` - Feature-specific Zustand store (when needed)
- `shared/` - Truly reusable code across features
  - `components/` - Shared UI components
  - `hooks/` - Shared custom hooks
  - `services/` - Shared utilities and helpers
  - `types/` - Shared TypeScript types
  - `utils/` - Shared utility functions
- `stores/` - Global application state management only
  - `ui-store.ts` - Global UI state (panels, layout)
  - App-level state that spans multiple features

### Feature Organization Requirements

Each feature MUST be self-contained with minimal external dependencies. Feature services integrate directly with Tauri APIs without unnecessary domain abstractions. Store consolidation required - no duplicate or overlapping state management within features. Components within features consume feature services directly without complex data flow patterns.

### Backend Domain-per-Context Organization

Backend bounded contexts (project, workspace, etc.) maintain identical internal DDD structure. Domain logic remains pure with zero framework dependencies. Tauri commands consume domain logic through application services only. Infrastructure layers implement domain repository contracts.

### Technology Stack Compliance

Frontend: React + TypeScript with Vite. Backend: Tauri (Rust). Database: SQLite with SQLX. AI: Hybrid local/cloud with provider abstraction. Client-side state management via Zustand with typed stores. No deviations without architectural review.

### Tauri Command Organization

Commands organized by domain in separate files (max 300 lines per file). All commands follow snake_case naming with validation, error handling, and proper State management. Request/Response DTOs required for complex parameters. No direct database access - use repository pattern through infrastructure layer.

### Frontend State Management

UI state managed via feature-specific Zustand stores or global stores for cross-feature concerns. Each feature contains its own state management when needed. Global stores limited to UI layout state and app-level concerns. No prop drilling - use stores for cross-component state. Optimistic UI updates with error rollback patterns.

### Robust Logging Systems

Backend uses structured logging (tracing/log) with correlation IDs and domain context. Frontend implements console logging with log levels and context preservation. No sensitive data in logs. Error tracking includes user actions, system state, and reproduction steps. Log aggregation supports debugging across UI/Tauri boundary.

### Security and Quality Gates

No credentials in code or commits. Infrastructure dependencies isolated from domain logic. All external integrations through repository pattern. Type safety enforced at compile time.

## Governance

This constitution supersedes all other development practices. Feature advancement blocked until compliance verified. Complexity decisions require architectural justification. Use CLAUDE.md for implementation guidance and patterns.

All code reviews must verify: Backend DDD compliance, frontend feature organization, TypeScript compilation, phase documentation complete, identifier patterns followed, security standards met.

**Version**: 2.0.0 | **Ratified**: 2025-09-19 | **Last Amended**: 2025-09-26