# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT-MAP.md`** at the repo root — points at one `CONTEXT.md` per workspace. Read each one relevant to the topic.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in (system-wide decisions).
- **`workspaces/<name>/docs/adr/`** — context-scoped decisions for that workspace, if present.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context (this repo — presence of `CONTEXT-MAP.md` at the root):

```text
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── workspaces/
    ├── app/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← app-specific decisions
    ├── api/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← api-specific decisions
    └── auth/
        ├── CONTEXT.md
        └── docs/adr/                  ← auth-specific decisions
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the relevant `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (static site with Gilbert build system) — but worth reopening because…_
