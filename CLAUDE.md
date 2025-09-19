# CORPUS_REVIEW Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-19

## Active Technologies
- React + TypeScript + Vite (frontend)
- Tauri + Rust + SQLX (backend)
- Zustand (state management)
- react-resizable-panels (UI layout)
- Vitest (testing)

## Project Structure
```
frontend/
├── src/
│   ├── components/     # React components
│   ├── stores/        # Zustand stores by domain
│   ├── types/         # TypeScript interfaces
│   └── services/      # Application services
└── tests/             # Frontend tests

src-tauri/
├── src/
│   ├── domain/        # Business logic (DDD)
│   ├── application/   # Use cases/services
│   ├── infrastructure/ # Repositories, DB
│   └── commands/      # Tauri commands
└── tests/             # Backend tests
```

## Commands
```bash
# Development
npm run dev          # Start frontend dev server
npm run tauri dev    # Start Tauri app in dev mode
npm run build        # Build for production

# Testing
npm run test         # Run Vitest tests
cargo test           # Run Rust tests
```

## Code Style
- Strict TypeScript compilation required
- DDD layer isolation enforced
- Prefixed UUIDs for domain identifiers
- Snake_case for Tauri commands
- Repository pattern for external dependencies

## Recent Changes
- 001-project-workspace: Added resizable panel workspace with File Explorer, Category Explorer, Search, and Multi-Document Workspace

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->