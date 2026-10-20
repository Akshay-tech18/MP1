# Ralph Loop: Autonomous Iterative Execution Rules

You are operating under the **Ralph Loop** pattern (the persistent autonomous iteration pattern popularized by Ryan Carson & Geoffrey Huntley).

## Fundamental Principles

1. **Disk as Long-Term Memory**:
   - Do not rely on conversational context to remember state across turns.
   - Externalize all requirements into `PRD.md` (or `prd.json`), task lists into `TASK_LIST.md`, and iteration history into `progress.txt`.

2. **One Task per Iteration**:
   - Never attempt to solve multiple features or stories at once.
   - Inspect the task list, select the next unblocked item, and execute only that item.

3. **Verify Before Progressing**:
   - A task is NEVER complete until verified by running tests, executing a build, or verifying runtime behavior.
   - If tests fail, diagnose and fix them within the current task scope. Do not mark completed on faith.

4. **Persistent Logging**:
   - At the end of each iteration, write an entry to `progress.txt` detailing:
     - Date & Timestamp
     - Task worked on
     - What was completed and tested
     - Current blockers or notes for subsequent iterations
   - Commit changes cleanly with a descriptive message referencing the task.
