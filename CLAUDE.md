# CLAUDE.md <!-- omit in toc -->

Agent context for this repo, consumed by Claude Code. Replaces the former `AGENTS.md`.

Context is layered: this file carries universal standards. Client-specific context lives in `.github/instructions/` (e.g., `cpc-context.instructions.md`). Project-specific context lives in `.github/copilot-instructions.md`.

> [!NOTE]
> Code style, testing, and documentation standards are defined in the instruction files under `.github/instructions/` and are injected into context automatically by scope. They are not duplicated here. This file carries only content that must reach the agent regardless of scope.

## Table of Contents <!-- omit in toc -->

- [1. Agent Behaviour](#1-agent-behaviour)
  - [1.1 Think Before Coding](#11-think-before-coding)
  - [1.2 Simplicity First](#12-simplicity-first)
  - [1.3 Surgical Changes](#13-surgical-changes)
  - [1.4 Goal-Driven Execution](#14-goal-driven-execution)
- [2. Version Control: Jujutsu, Not Git](#2-version-control-jujutsu-not-git)
- [3. Project Overview](#3-project-overview)
- [4. Where to Look](#4-where-to-look)
- [5. Agent Skills](#5-agent-skills)
  - [5.1 Issue Tracker](#51-issue-tracker)
  - [5.2 Domain Docs](#52-domain-docs)

## 1. Agent Behaviour

Behavioural guidelines to reduce common LLM coding mistakes. These apply to every task in this project.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgement.

### 1.1 Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 1.2 Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 1.3 Surgical Changes

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

### 1.4 Goal-Driven Execution

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

## 2. Version Control: Jujutsu, Not Git

This repo's history is stored on GitHub, but day-to-day change management uses [Jujutsu (`jj`)](https://jj-vcs.github.io/jj/), colocated with the `.git` directory — not plain `git`.

- Use `jj` commands (`jj status`, `jj log`, `jj diff`, `jj describe`, `jj new`, `jj git push`, etc.) for inspecting and creating changes in this repo, not `git add` / `git commit`.
- `jj` tracks the working copy as a live, anonymous change (`@`) — there is no staging area and no detached-HEAD state. `jj describe` sets the message on the current change; `jj new` starts the next one.
- Interop with GitHub still happens via `jj git push` / `jj git fetch`, which map onto the colocated `.git` directory.
- `jj` enforces a 1.0 MiB max new-file size by default; large binary assets (e.g. images added under `workspaces/app/src/files/`) will be refused with a snapshot warning unless the repo's `jj` config is adjusted or the files are excluded — check with the user before raising that limit or committing large assets.
- Never fall back to raw `git` commit/reset/checkout operations in this repo unless the user explicitly asks for a `git`-specific escape hatch (e.g. `git push` when `jj git push` won't do) — mixing the two workflows on the same working copy is easy to get wrong.

## 3. Project Overview

A Cloudflare-native community website for Waneeta Beach (a small Lake Erie cottage community): public history/local-info content plus a private members message board. npm workspaces: `workspaces/app` (static site, Gilbert-built), `workspaces/api` (itty-router Worker, D1 + Better Auth), `workspaces/auth` (Better Auth service).

## 4. Where to Look

- [docs/reference/directory-structure.md](docs/reference/directory-structure.md) — folder map
- [docs/reference/build-commands.md](docs/reference/build-commands.md) — npm scripts, `devops/` tooling
- [docs/reference/code-style.md](docs/reference/code-style.md) — formatting and naming
- [docs/explanation/architecture.md](docs/explanation/architecture.md) — system architecture
- [docs/adr/](docs/adr/) — architecture decisions
- [docs/how-to-guides/local-development.md](docs/how-to-guides/local-development.md) — running the stack locally
- [README.md](README.md) — setup and prerequisites

## 5. Agent Skills

### 5.1 Issue Tracker

Issues and tasks are tracked in Paca (project: WaneetaBeach), not GitHub Issues. See [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md).

### 5.2 Domain Docs

Multi-context: a root `CONTEXT-MAP.md` points to per-workspace `CONTEXT.md` files (`workspaces/app`, `workspaces/api`, `workspaces/auth`); system-wide ADRs live in `docs/adr/`. See [docs/agents/domain.md](docs/agents/domain.md).
