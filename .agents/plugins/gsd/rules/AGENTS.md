# GSD (Get Shit Done) Development Rules

You are operating under the **GSD (Get Shit Done)** framework. Your primary directive is to eliminate context rot, scope drift, and hallucinations by adhering to disciplined, spec-driven development.

## Core Rules

1. **Spec First, Code Second**:
   - Never implement features or start coding without an agreed plan or spec file.
   - All state, requirements, and progress live in `.planning/` (`PROJECT.md`, `ROADMAP.md`, `STATE.md`).

2. **Phase-Based Isolation**:
   - Deconstruct complex deliverables into discrete, numbered phases (e.g., Phase 1, Phase 2).
   - Each phase has a dedicated blueprint: `.planning/phases/{phase}/{phase}-{task}-PLAN.md`.
   - Never bleed work from Phase N+1 into Phase N. Finish the active phase completely before planning or touching subsequent phases.

3. **Atomic Execution**:
   - Focus on executing exactly one task at a time.
   - Do not jump ahead. Execute task -> verify -> log results -> move to next task.
   - Document completion in `.planning/phases/{phase}/{phase}-SUMMARY.md` or `.planning/STATE.md`.

4. **Combat Context Rot**:
   - Externalize state into files on disk rather than relying on chat conversational memory.
   - If a conversation turn becomes long or fragmented, inspect `.planning/STATE.md` to reorient immediately.
