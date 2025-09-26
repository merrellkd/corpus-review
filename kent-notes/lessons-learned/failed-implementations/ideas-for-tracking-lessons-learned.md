> I've checked out master and I want to abandon the entire branch 006-file-metadata-extraction, but I'd like to keep it to refer back to as an
> example of how _not_ to work with spec-kit. Do you have any suggestions on how to store this in a way I can extract lessons learned? I _did_
> save a lesssons-learned.md file in it which is a copy of your previous reply. I suppose everything can go away except for that. But within the
> SDD methodology, how can I cannonize the lessons learned?

⏺ Excellent decision! This is exactly what mature development teams do - preserve failures as learning artifacts. Here's how to canonize this
within the SDD methodology:

1. Create a Lessons Learned Archive

# Create the archive structure

mkdir -p docs/lessons-learned/failed-implementations/
mkdir -p docs/lessons-learned/patterns/

# Archive the failed branch

git archive 006-file-metadata-extraction > docs/lessons-learned/failed-implementations/006-file-metadata-extraction.tar

# Or just keep the lessons-learned.md file

cp specs/006-file-metadata-extraction/lessons-learned.md
docs/lessons-learned/failed-implementations/006-massive-implementation-anti-pattern.md

2. Update Project Constitution

Add to /CLAUDE.md or create /docs/development-principles.md:

# Constitutional Amendment: Implementation Methodology

## Implementation Anti-Patterns (Learned from 006-file-metadata-extraction)

### ❌ The "Big Bang" Anti-Pattern

- **Never** implement entire feature suites in one commit
- **Never** add 50+ files without compilation verification
- **Never** assume dependency APIs without verification

### ✅ The Incremental Pattern

- One entity/value object per commit
- Compilation must pass before each commit
- Integration tests after each addition
- Feature flags for incomplete features

## Constitutional Requirements for New Features

1. **Compilation First Law**: `cargo check` must pass before any commit
2. **Small Commits Law**: Maximum 5 new files per commit
3. **Integration Testing Law**: New code must integrate with existing systems
4. **Documentation First Law**: Spec must be complete before implementation

5. Create SDD Anti-Pattern Documentation

Create specs/000-meta/anti-patterns.md:

# SDD Anti-Patterns: Learn from Our Mistakes

## Case Study: 006-file-metadata-extraction

### The Mistake

- **Commit**: `bd3ba32 006-file-metadata-etraction - /implement (first round)`
- **Impact**: 237+ compilation errors, 2+ hours to recover
- **Root Cause**: Implemented entire feature without incremental verification

### The Lesson

Never use `/implement` on complex features. Use `/plan` → incremental implementation.

### The Fix

Use the **Red-Green-Refactor with SDD** pattern:

1. `/specify` - Complete spec
2. `/plan` - Break into small chunks
3. Implement chunk 1 → verify compilation
4. Implement chunk 2 → verify compilation
5. Continue until complete

### Prevention Checklist

- [ ] Spec is complete before coding
- [ ] Implementation plan breaks feature into <10 chunks
- [ ] Each chunk adds <5 files
- [ ] `cargo check` passes after each chunk
- [ ] Integration test after each chunk

4. Update SDD Workflow Template

Create specs/000-meta/implementation-workflow.md:

# SDD Implementation Workflow (Post-006 Lessons)

## Phase 1: Specification

- Use `/specify` to create complete spec
- Verify all contracts are defined
- Validate with stakeholders

## Phase 2: Planning

- Use `/plan` to break into implementable chunks
- Each chunk should be completable in <2 hours
- Define success criteria for each chunk

## Phase 3: Incremental Implementation

````bash
# For each chunk:
1. Implement minimal code for chunk
2. cargo check  # MUST pass
3. Write/run tests
4. git commit -m "feat: implement chunk X - specific feature"
5. Integration test with existing system

Phase 4: Integration Verification

- Full system test
- Performance verification
- Documentation update

## 5. Reference in Future Specs

In new feature specs, add:

```markdown
## Implementation Strategy

⚠️ **Anti-Pattern Warning**: See `docs/lessons-learned/failed-implementations/006-massive-implementation-anti-pattern.md`

This feature will be implemented incrementally:
- Chunk 1: Value objects only
- Chunk 2: Entities only
- Chunk 3: Repository traits
- etc.

Each chunk must compile cleanly before proceeding.

6. Team Onboarding Material

Create docs/onboarding/development-guidelines.md:

# Development Guidelines

## Required Reading
1. `/docs/lessons-learned/failed-implementations/006-massive-implementation-anti-pattern.md`
2. This document

## The Golden Rules (Learned the Hard Way)
1. Never commit non-compiling code
2. Feature implementation ≠ feature completion in one shot
3. When in doubt, smaller commits are always better
4. Dependencies change - verify APIs before coding

7. Git Hook Integration

Create .git/hooks/pre-commit:

#!/bin/bash
# Prevent the 006-file-metadata-extraction mistake

echo "Running compilation check..."
cd src-tauri
if ! cargo check --quiet; then
    echo "❌ COMMIT BLOCKED: Code does not compile"
    echo "📚 See docs/lessons-learned/failed-implementations/006-massive-implementation-anti-pattern.md"
    echo "💡 Fix compilation errors before committing"
    exit 1
fi
echo "✅ Compilation check passed"

This transforms your failure into a permanent learning asset that will prevent future teams (and future you) from repeating the same mistake.
The SDD methodology becomes more robust because of this experience.
````
