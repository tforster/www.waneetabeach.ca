# AGENTS.md <!-- omit in toc -->

Shared agent context for all projects. This file is symlinked to project roots and consumed by GitHub Copilot, Claude Code, OpenAI Codex, and any other agent that honours the `AGENTS.md` convention.

Context is layered: this file carries universal standards. Client-specific context lives in `.github/instructions/` (e.g., `cpc-context.instructions.md`). Project-specific context lives in `.github/copilot-instructions.md`.

> [!NOTE]
> Code style, testing, and documentation standards are defined in the instruction files under
> `.github/instructions/` and are injected into context automatically by scope. They are not
> duplicated here. This file carries only content that must reach all tools, including those that
> do not read instruction files.

## Table of Contents <!-- omit in toc -->

- [1. Agent Behaviour](#1-agent-behaviour)
  - [1.1. Think Before Coding](#11-think-before-coding)
  - [1.2. Simplicity First](#12-simplicity-first)
  - [1.3. Surgical Changes](#13-surgical-changes)
  - [1.4. Goal-Driven Execution](#14-goal-driven-execution)

## 1. Agent Behaviour

Behavioural guidelines to reduce common LLM coding mistakes. These apply to every task in every project.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgement.

### 1.1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 1.2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 1.3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 1.4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```text
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
