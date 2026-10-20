# Active Workspace Plugins & Engineering Rules

This project has the following Antigravity plugins configured in `.agents/plugins/`:

1. **GSD (`gsd`)**:
   - Spec-driven engineering to eliminate context rot.
   - Phases and plans are tracked in `.planning/`.
   - Never write code without an active phase plan or agreed specification.

2. **CodeRabbit (`coderabbit`)**:
   - Automated AI code review and vulnerability scanning.
   - High signal-to-noise ratio: logic bugs, boundary conditions, OWASP security, and resource leaks.
   - Categorize issues as `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, or `[LOW]`.

3. **Ponytail (`ponytail`)**:
   - "The laziest senior dev in the room" / Anti-overengineering.
   - Motto: *"The best code is the code you never wrote."*
   - Strictly climb the decision ladder: YAGNI -> Reuse -> Standard Library -> Platform Native -> Existing Dependency -> One Line -> Minimum Viable.
   - Never compromise security, trust boundaries, accessibility, or tests.

4. **Ralph Loop (`ralph-loop`)**:
   - Autonomous iteration loop using disk as persistent state (`PRD.md`, `TASK_LIST.md`, `progress.txt`).
   - Execute one atomic task per iteration, verify rigorously, log progress, and loop until complete.
