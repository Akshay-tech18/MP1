---
name: gsd
description: Provides the Get Shit Done (GSD) structured workflows: initializing project plans, phase planning, executing phase blueprints, and verifying milestones to prevent context rot.
---

# GSD (Get Shit Done) Workflow Skill

Use this skill when initializing projects, structuring milestones, breaking down phases into executable plans, or running step-by-step phase executions.

## Directory Structure Managed

```text
.planning/
├── PROJECT.md          # Global project vision, constraints, and architecture
├── REQUIREMENTS.md     # Scoped functional and non-functional requirements
├── ROADMAP.md          # High-level phase breakdown and milestones
├── STATE.md            # Rolling project state, active phase, and completed tasks
└── phases/
    └── {phase_num}/
        ├── {phase_num}-CONTEXT.md   # Domain research and locked decisions
        ├── {phase_num}-PLAN.md      # Granular task blueprints
        └── {phase_num}-SUMMARY.md   # Task execution outcomes
```

## Workflows

### 1. Initialize New Project (`/gsd-new-project`)
1. Interview the user or inspect requirements to define:
   - Vision & Core Value Proposition
   - Key constraints (tech stack, APIs, runtime)
2. Generate `.planning/PROJECT.md` and `.planning/REQUIREMENTS.md`.
3. Create `.planning/ROADMAP.md` dividing the delivery into 2-5 distinct phases.
4. Initialize `.planning/STATE.md` with active phase set to `Phase 1`.

### 2. Plan Phase (`/gsd-plan-phase <phase>`)
1. Read `.planning/ROADMAP.md` and `.planning/STATE.md`.
2. Inspect the codebase for reusable modules, schemas, or existing utilities.
3. Generate `.planning/phases/{phase}/{phase}-PLAN.md` with:
   - Objectives & success criteria.
   - Ordered checklist of atomic tasks (each with clear inputs, files to change, and verification steps).

### 3. Execute Phase (`/gsd-execute-phase <phase>`)
1. Load `.planning/phases/{phase}/{phase}-PLAN.md`.
2. For each task in sequential order:
   - Implement the code changes adhering strictly to the plan.
   - Run tests, builds, or lint checks to verify.
   - Mark the task `[x]` in the plan.
3. Write `.planning/phases/{phase}/{phase}-SUMMARY.md` documenting what was completed, files changed, and test outcomes.
4. Update `.planning/STATE.md` with the new status.

### 4. Verify Work (`/gsd-verify-work <phase>`)
1. Run automated test suites, typecheckers, and lint scripts.
2. Confirm all acceptance criteria in `.planning/phases/{phase}/{phase}-PLAN.md` are satisfied.
