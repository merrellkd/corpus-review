> Let's talk about our workfow... how you and I work together. I want to use Spec-driven development, as defined in https://github.com/github/spec-kit. I also have several screens and components diagramed in Figma. I also have earlier attempts at this project in different repos. Prior attempts have desintegrated into confusing heaps of mishmash. In our constitution (.specify/memory/constitution.md) we have "Phase-Gated Feature Development" which is a remnant of a prior wokflow methodology called Enhanced Five Docs, which had a very high documentation burdon. It seems like a good idea, but we didn't use it while developing /Users/kdm/projects/digital-ext/CORPUS_REVIEW/specs/001-project-workspace, so maybe it should just be taken out. Do you agree? How can we enhance this constitution and our workflow to make development faster and more easily aligned to the wireframes?

# Claude

Recommended Enhanced Workflow:

For each new feature:

1. Start with Figma - Define wireframes/mockups first
2. Extract requirements - Use Figma screenshots to inform your functional spec
3. Write spec.md - Focus on "what/why" using your established template from 001-project-workspace
4. Technical planning - Map Figma components to your DDD architecture
5. Iterative implementation - Build in small, testable increments
6. Visual validation - Compare implementation against Figma designs

To prevent mishmash:

- Keep your strong DDD architecture (domain/application/infrastructure/ui)
- Use your prefixed identifiers system
- Maintain TypeScript strict mode
- Follow your established component patterns from 001-project-workspace

Your current spec structure in 001-project-workspace is excellent - it's comprehensive, testable, and includes state
management details. Use that as your template for future features.

The key is leveraging your proven architecture while streamlining the documentation overhead that was slowing you
down.

> I need a better understanding of the slash-commands (/specify, /plan, /tasks) provided by Spec-Kit, and where they fit
> in your recommended 6-step workflow.

⏺ Perfect! Here's how the spec-kit slash commands map to your enhanced 6-step workflow:

Enhanced Workflow with Spec-Kit Commands:

1. Start with Figma

- Create wireframes/mockups first
- No slash command needed - this is your design phase

2. Extract requirements → /specify

- Use Figma screenshots to inform your functional spec
- Command: /specify [feature description]
- Output: Creates spec.md with requirements, user stories, acceptance criteria
- Maps to: Your existing specs/001-project-workspace/spec.md structure

3. Technical planning → /plan

- Map Figma components to your DDD architecture
- Command: /plan [based on spec.md]
- Output: Creates plan.md with technical architecture, tech stack decisions
- Maps to: Your existing specs/001-project-workspace/plan.md

4. Task breakdown → /tasks

- Break plan into concrete implementation steps
- Command: /tasks [based on plan.md]
- Output: Creates tasks.md with actionable development tasks
- Maps to: Your existing specs/001-project-workspace/tasks.md

5. Iterative implementation → /implement

- Build in small, testable increments following DDD patterns
- Command: /implement [execute tasks]
- Process: Works through tasks systematically

6. Visual validation

- Compare implementation against Figma designs
- Manual validation step - ensure UI matches wireframes

Your Current Structure Already Aligns:

Your specs/001-project-workspace/ folder structure perfectly matches this workflow:

- spec.md ← /specify output
- plan.md ← /plan output
- tasks.md ← /tasks output
- Plus your additional files: data-model.md, research.md, quickstart.md

The slash commands would automate the creation of these structured documents while maintaining your DDD architecture
and TypeScript standards.
