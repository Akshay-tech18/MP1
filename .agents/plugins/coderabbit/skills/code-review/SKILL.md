---
name: code-review
description: Perform a comprehensive, high-signal CodeRabbit code review on modified files, diffs, or git commits, identifying security vulnerabilities, edge-case bugs, and optimization opportunities.
---

# CodeRabbit Code Review Skill

Use this skill whenever asked to review code, evaluate changes/diffs, inspect a pull request, or perform a security and quality audit.

## Review Workflow

### 1. Identify Target Changes
- Check the git diff, modified files, or user-supplied code snippet.
- Understand the intent, scope, and target architecture of the changes.

### 2. Systematic Inspection
Run through the CodeRabbit checklist:
- **Correctness & Logic**: Are loop terminations, edge conditions, null/undefined checks, and type conversions sound?
- **Security & OWASP**: Are input parameters validated? Are secrets guarded? Are SQL/command executions parameterized?
- **Performance & Resources**: Are database queries N+1? Are file handles, network connections, and streams cleanly closed?
- **Error Handling**: Are catch blocks appropriately logging and handling failures without silent swallowing?
- **Testing & Edge Cases**: Are there tests covering corner cases (empty arrays, negative numbers, null values, timeouts)?

### 3. Structured Review Report Format
Output the findings in this clear format:

```markdown
## 🐇 CodeRabbit Review Summary
- **Overall Assessment**: [APPROVE / CHANGES REQUESTED]
- **Risk Level**: [Low / Medium / High / Critical]

### 🚨 Critical & High Priority Issues
- **[Severity]** `path/to/file.ext#L10-L15`: Description of the bug or vulnerability.
  - **Impact**: What breaks or what exploit is possible.
  - **Suggested Fix**:
    ```diff
    - faulty line
    + corrected line
    ```

### ⚠️ Medium & Low Priority Observations
- Description and suggestion.

### ✅ What Went Well
- Commend clean architecture, good test coverage, or idiomatic patterns.
```
