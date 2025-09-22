# Corpus Review Constitution

## Core Principles

### I. Domain-Driven Design (NON-NEGOTIABLE)

All features MUST follow strict DDD architecture. Domain layer contains pure business logic with zero infrastructure dependencies. Application layer orchestrates domain objects. Infrastructure layer handles external concerns. UI layer consumes application services only.

### II. Layer Isolation Enforcement

Domain layer CANNOT import from application or infrastructure layers. Application layer CANNOT import from infrastructure or UI layers. Infrastructure layer implements domain repository interfaces. Violations block feature advancement.

### III. Prefixed Identifier System

All domain identifiers use prefixed UUID value objects (`entity_`, `doc_`, `mws_`, etc.). Self-identifying IDs enable debugging clarity and type safety. Raw UUIDs prohibited in domain logic.

### IV. Strict TypeScript Compilation

All code must pass TypeScript strict mode compilation. No implicit any, no missing return types, exact optional properties enforced. Type safety is non-negotiable for production deployment.

## Development Workflow

### Spec-Driven Development Workflow

Features follow GitHub's spec-kit methodology: establish principles → create functional specifications → technical planning → task breakdown → iterative implementation. Specifications define "what" and "why" before "how". AI models interpret specs for multi-step refinement rather than one-shot generation. Implementation aligns to wireframes and user scenarios.

### AI-First Development Process

Documentation optimized for Claude Code autonomous work. Feature-specific prompt packs provide complete context. Shared architectural patterns documented for consistency. Human oversight focuses on design decisions, not implementation details.

### Figma-to-Implementation Workflow

New interfaces start with Figma wireframes defining layout, components, and interactions. Screenshots and design specs extracted from Figma inform functional specifications. Implementation follows wireframe-to-component mapping with design system consistency. Visual validation against Figma designs before feature completion.

## Architecture Standards

### DDD Structure Requirements

Every domain follows identical folder structure: `domain/` (aggregates, entities, value-objects, events, repositories), `application/` (services), `infrastructure/` (repository implementations, external services), `ui/` (components, hooks).

### Technology Stack Compliance

Frontend: React + TypeScript with Vite. Backend: Tauri (Rust). Database: SQLite with SQLX. AI: Hybrid local/cloud with provider abstraction. Client-side state management via Zustand with typed stores. No deviations without architectural review.

### Tauri Command Organization

Commands organized by domain in separate files (max 300 lines per file). All commands follow snake_case naming with validation, error handling, and proper State management. Request/Response DTOs required for complex parameters. No direct database access - use repository pattern through infrastructure layer.

### Client-Side State Management

UI state managed via Zustand stores with TypeScript interfaces. Each domain gets dedicated store slice with actions, selectors, and persistence. No prop drilling - use stores for cross-component state. Optimistic UI updates with error rollback patterns. Store organization mirrors DDD domain boundaries.

### Robust Logging Systems

Backend uses structured logging (tracing/log) with correlation IDs and domain context. Frontend implements console logging with log levels and context preservation. No sensitive data in logs. Error tracking includes user actions, system state, and reproduction steps. Log aggregation supports debugging across UI/Tauri boundary.

### Security and Quality Gates

No credentials in code or commits. Infrastructure dependencies isolated from domain logic. All external integrations through repository pattern. Type safety enforced at compile time.

## Governance

This constitution supersedes all other development practices. Feature advancement blocked until compliance verified. Complexity decisions require architectural justification. Use CLAUDE.md for implementation guidance and patterns.

All code reviews must verify: DDD compliance, TypeScript compilation, phase documentation complete, identifier patterns followed, security standards met.

**Version**: 1.0.0 | **Ratified**: 2025-09-19 | **Last Amended**: 2025-09-19
