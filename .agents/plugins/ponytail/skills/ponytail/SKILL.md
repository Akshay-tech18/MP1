---
name: ponytail
description: Audit code, diffs, or architecture proposals against over-engineering, unnecessary dependencies, and YAGNI violations using the Ponytail ladder.
---

# Ponytail Anti-Overengineering Audit Skill

Use this skill whenever asked to review code for bloat, simplify an architecture, assess dependencies, or run a `/ponytail-review`.

## Audit Checklist

When analyzing code or a proposed change, evaluate against the 7 rungs of the Ponytail Ladder:

1. **Unnecessary Abstractions**: Are there interfaces with only 1 implementation? Single-use helper functions? Wrapper classes that just forward calls?
2. **Dependency Bloat**: Was a new package added when `node:crypto`, `fetch`, `math`, regex, or standard library tools already solve it?
3. **Speculative Generality**: Are there unused parameters, extensible plugin systems, or configuration flags that nothing actually uses?
4. **Boilerplate**: Can 20 lines of ceremonial code be collapsed into a clean standard idiom?

## Report Format

```markdown
## 🧘 Ponytail Audit Report

- **Verdict**: [LEAN & CLEAN / OVERENGINEERED / HEAVILY BLOATED]
- **Lines of code that could be deleted**: ~N lines

### ✂️ Recommended Cuts
1. **[Component/File]**: Why this is over-engineered and which rung of the ladder it violates.
   - **Simpler Replacement**:
     ```typescript
     // Replaced 30 lines with this:
     const result = existingHelper(data);
     ```

### 🛡️ Preserved Essentials
- Note essential security or validation checks that were preserved.
```
