---
name: ralph-loop
description: Executes the Ralph autonomous iteration loop: parses PRD/task list, picks the next task, implements it with minimum changes, tests it, updates progress.txt, and loops until done.
---

# Ralph Loop Autonomous Iteration Skill

Use this skill when running a multi-step project autonomously, executing tasks from a requirements list, or continuing an ongoing Ralph execution loop.

## Standard Loop State Files

- **`PRD.md` / `prd.json`**: Product requirements, user stories, acceptance criteria.
- **`TASK_LIST.md`**: Ordered list of granular tasks with checkboxes (`[ ]` / `[x]`).
- **`progress.txt`**: Append-only log of completed iterations.

## Execution Cycle

For each loop iteration:

1. **Orientation**:
   - Read `TASK_LIST.md` and the most recent entries in `progress.txt`.
   - Identify the first incomplete task `[ ]` whose dependencies are satisfied.
   - If all tasks are `[x]`, output completion celebration and stop.

2. **Execution**:
   - Implement the minimal, clean code required for this specific task.
   - Run tests, builds, or validation commands to prove correctness.

3. **Log & Checkoff**:
   - Update `TASK_LIST.md` marking the task as `[x]`.
   - Append to `progress.txt`:
     ```text
     ---
     Timestamp: YYYY-MM-DD HH:MM:SS
     Task: [Task description]
     Status: SUCCESS
     Verification: [Tests run and passed]
     Notes: [Key decisions made]
     ---
     ```

4. **Loop Continuation**:
   - Check if tasks remain. If yes, proceed to the next iteration.
