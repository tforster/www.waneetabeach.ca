# EmDash Plugin Sandbox Capabilities <!-- omit in toc -->

Research findings on what an EmDash sandboxed plugin can and cannot do, produced while evaluating a possible migration of waneetabeach.ca to Cloudflare's EmDash CMS (Paca ticket WANE-4). Retained for reference even though the migration decision came out no-go — see [Message Board Plugin Route Auth Prototype](./emdash-plugin-route-auth-prototype.md) for the follow-up hands-on prototype.

## Table of Contents <!-- omit in toc -->

- [1. Version and status correction](#1-version-and-status-correction)
- [2. Sources used](#2-sources-used)
- [3. Sandbox architecture, in brief](#3-sandbox-architecture-in-brief)
- [4. State and persistence options for a sandboxed plugin](#4-state-and-persistence-options-for-a-sandboxed-plugin)
- [5. External calls (fetch and bindings)](#5-external-calls-fetch-and-bindings)
- [6. UI hooks — how a plugin renders into pages and admin](#6-ui-hooks--how-a-plugin-renders-into-pages-and-admin)
  - [6.1 Admin panel (both modes)](#61-admin-panel-both-modes)
  - [6.2 Public-facing site pages — a hard split](#62-public-facing-site-pages--a-hard-split)
  - [6.3 Scheduled and background work](#63-scheduled-and-background-work)
  - [6.4 Lifecycle hooks available to plugins](#64-lifecycle-hooks-available-to-plugins)
- [7. Platform and deployment prerequisites](#7-platform-and-deployment-prerequisites)
- [8. Feasibility assessment — home-page content widgets](#8-feasibility-assessment--home-page-content-widgets)
- [9. Feasibility assessment — members-only message board](#9-feasibility-assessment--members-only-message-board)
- [10. Hard limits summary (sandboxed-mode plugins)](#10-hard-limits-summary-sandboxed-mode-plugins)
- [11. Confidence assessment](#11-confidence-assessment)

## 1. Version and status correction

Research date: 26 August 2026. EmDash launched as a **v0.1.0 developer preview on 1 April 2026** ([Cloudflare Blog](https://blog.cloudflare.com/emdash-wordpress/)), and the latest published package version at research time was **`emdash@0.35.0`**, released 24 August 2026 ([npm registry](https://registry.npmjs.org/emdash), [GitHub Releases](https://github.com/emdash-cms/emdash/releases)). No `1.0.0` tag existed in the GitHub releases feed or npm dist-tags. Treat all findings below as describing a fast-moving pre-1.0 project — APIs are plausible sources of breaking change.

## 2. Sources used

Primary, in priority order:

- EmDash GitHub repo, `skills/creating-plugins/SKILL.md` — the canonical, machine-consumed plugin authoring guide, checked into the repo the maintainers themselves use: <https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/SKILL.md>
- Reference sub-docs alongside it (raw content read directly): [hooks](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/hooks.md), [storage](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/storage.md), [API routes](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/api-routes.md), [Portable Text blocks](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/portable-text-blocks.md), [admin UI](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/admin-ui.md), [Block Kit](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/block-kit.md), [publishing](https://github.com/emdash-cms/emdash/blob/main/skills/creating-plugins/references/publishing.md)
- WordPress-porting guide, useful because it explicitly enumerates what maps and what doesn't: [porting-plugins.mdx](https://github.com/emdash-cms/emdash/blob/main/docs/src/content/docs/migration/porting-plugins.mdx)
- [Cloudflare launch post](https://blog.cloudflare.com/emdash-wordpress/)
- [EmDash GitHub repo root](https://github.com/emdash-cms/emdash) (README, licence, adapter description)
- Cloudflare's own Dynamic Worker Loader docs, used to cross-check EmDash's stated isolate limits: [Worker Loader bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/worker-loader/) and [Dynamic Workers usage limits](https://developers.cloudflare.com/dynamic-workers/usage/limits/)
- [npm registry](https://registry.npmjs.org/emdash) and [GitHub Releases](https://github.com/emdash-cms/emdash/releases) (version and date checks)

Secondary sources (CMSWire, Cybernews, dev.to, emdashcms.dev/.org) were used only to locate the primary docs and are not cited for factual claims below.

## 3. Sandbox architecture, in brief

Every EmDash plugin declares a **capability manifest** and runs in one of two modes:

| | Trusted | Sandboxed |
| :--- | :--- | :--- |
| Runs in | Main Astro process | Isolated V8 isolate (Cloudflare Dynamic Worker Loader) |
| Install method | `astro.config.mjs` code change and deploy | Admin UI, one-click from marketplace |
| Capabilities | Advisory only, not enforced | Enforced at runtime via an RPC bridge |
| Resource limits | None | CPU 50ms, 10 subrequests, 30s wall-time, ~128MB memory |
| Network access | Unrestricted | Blocked by default; only via `ctx.http.fetch()` validated against `allowedHosts` |
| Data access | Full database access | Scoped strictly to declared capabilities |
| Node.js APIs | Full access | Not available (V8 isolate only — no `fs`, `path`, `child_process`) |
| Platform | All platforms | Cloudflare Workers only |

A plugin declares, for example, `capabilities: ["content:read", "network:request"]` and `allowedHosts: ["api.example.com", "*.googleapis.com"]` in its descriptor; the admin sees a consent dialogue "similar to going through an OAuth flow" before install.

The 50ms-CPU / 10-subrequest / 30s-wall-time / ~128MB figures are EmDash-imposed defaults on top of the underlying primitive. Cloudflare's own Dynamic Worker Loader docs confirm the mechanism that makes this possible: the host configures custom `cpuMs` and `subRequests` limits per invocation, and if a Dynamic Worker hits either limit it throws immediately. This corroborates that EmDash's sandboxed mode is a real per-request/per-invocation isolate, not a long-lived process, consistent with no persistent WebSocket or long-lived connections.

## 4. State and persistence options for a sandboxed plugin

Three built-in mechanisms, all scoped per-plugin automatically:

1. **`ctx.storage`** — document collections with declared, indexed fields (single or composite indexes). Full CRUD and batch operations (`get`/`put`/`delete`/`getMany`/`putMany`/`deleteMany`) and an indexed `query()` with `where` operators (`gte`/`gt`/`lte`/`in`/`startsWith`), `orderBy`, cursor-based pagination, and `count()`. Only indexed fields can be queried — non-indexed queries throw.
2. **`ctx.kv`** — simple key-value store (`get`/`set`/`delete`/`list(prefix)`), used by convention for `settings:`, `state:`, and `cache:` prefixed keys.
3. **`admin.settingsSchema`** — a declarative schema (`string`/`number`/`boolean`/`select`/`secret`) that auto-generates an admin settings form; the values persist through `ctx.kv` with a `settings:` prefix, not a separate store.

Both storage and KV require no capability at all — the docs state plainly: "Storage (`ctx.storage`) and KV (`ctx.kv`) are always available — no capability needed. They're automatically scoped to the plugin." No documented size quota was found for either mechanism.

No raw D1/KV/R2 Cloudflare binding is exposed directly to plugin code — `ctx.storage`/`ctx.kv` are EmDash's own abstraction layered over whatever backend the deployment uses (D1 in Cloudflare production), not a pass-through binding a plugin author configures.

## 5. External calls (fetch and bindings)

- Sandboxed plugins: network is blocked by default. `fetch()` calls fail directly. A plugin must declare the `network:request` capability (restricted to `allowedHosts`, wildcards supported, e.g. `"*.googleapis.com"`) or `network:request:unrestricted` (only meant for user-supplied URLs), then call `ctx.http.fetch()`, which is validated against the declared host allowlist.
- Trusted plugins: unrestricted network access — capabilities are advisory only, not enforced, for trusted mode.
- No direct D1/KV/R2 Cloudflare binding is exposed to plugin code in either mode; all data access goes through `ctx.content`, `ctx.media`, `ctx.storage`, `ctx.kv` — scoped, capability-gated wrappers, not raw bindings.

## 6. UI hooks — how a plugin renders into pages and admin

This is the area with the sharpest split between sandboxed and native/trusted plugins, and it is the crux of the widget feasibility question (section 8).

### 6.1 Admin panel (both modes)

- Admin pages and dashboard widgets are declared in the descriptor (`adminPages`, `adminWidgets`) and rendered by the host.
- Sandboxed (standard-format) plugins render admin UI as Block Kit — a declarative JSON block language "inspired by Slack's Block Kit but not identical." No plugin JavaScript runs in the browser for sandboxed admin UI. The plugin's `routes.admin` handler receives page-load/interaction events and returns `{ blocks: [...] }`.
- Native (trusted-only) plugins can instead ship real React components via `src/admin.tsx` (`export const widgets = {...}`, `export const pages = {...}`), registered via `admin: { entry, pages, widgets }`.

### 6.2 Public-facing site pages — a hard split

Three distinct hook/feature surfaces exist for the public site, and only one is available to sandboxed plugins:

1. **`page:metadata`** hook — contributes structured, non-visual `<head>` data (meta tags, OG properties, canonical/alternate links, JSON-LD). "Plugins never emit raw HTML through this hook." Works in both trusted and sandboxed modes. Not usable for a visible UI widget.
2. **`page:fragments`** hook — contributes raw HTML/inline or external `<script>` tags into `head`, `body:start`, or `body:end` on public pages. **Trusted plugins only.** "Sandboxed plugins cannot register this hook — the manifest schema rejects it" (verbatim). This is the mechanism that would let a plugin inject arbitrary markup into a public page, and it is explicitly closed off to sandboxed/marketplace plugins.
3. **Portable Text (PT) custom block types** — a plugin-defined content block type that renders in the public page body. **Trusted plugins only.** "PT blocks require Astro components for site-side rendering (`componentsEntry`), loaded at build time from an npm package. Sandboxed/marketplace plugins are installed at runtime and can't ship components." This is the other mechanism that would let a plugin define a reusable, editor-insertable public-page widget, and it too is closed off to sandboxed plugins because component code must be present in the Astro build, not loaded at runtime in an isolate.

The only way a sandboxed plugin's own logic reaches a public page is indirectly: it exposes a JSON REST API route at `/_emdash/api/plugins/<plugin-id>/<route-name>`, and the site/theme code — which is trusted, build-time code, not the plugin — has to `fetch()` that route from a template and render the result itself. The plugin cannot push its own markup or JS into a public page in sandboxed mode; the theme has to pull from it.

### 6.3 Scheduled and background work

- **`cron` hook** — runs on a schedule, configured via `ctx.cron.schedule()` in `plugin:activate`, using standard cron syntax. `ctx.cron` is listed as "always available — scoped to plugin" — no capability needed, and available in sandboxed mode.
- **Queues** — no queue primitive (Cloudflare Queues or otherwise) is documented anywhere in the plugin skill/reference set, the porting guide, or the configuration reference.
- **Alarms / Durable Objects** — no Durable Object or alarm primitive is exposed to plugin authors in any primary source read. (A Durable Object, `EmDashPreviewDB`, is used internally by EmDash's own visual-editing preview feature per secondary-source mentions, but this is not a documented, plugin-facing capability.)
- **WebSockets / long-lived connections** — not mentioned anywhere in the plugin docs. Given sandboxed plugins run in a Dynamic Worker isolate invoked per-request with a 30-second wall-time cap and no documented persistent-connection API, there is no basis to assume WebSocket or long-lived-connection support exists for plugins.

### 6.4 Lifecycle hooks available to plugins

`plugin:install`, `plugin:activate`, `plugin:deactivate`, `plugin:uninstall`, `content:beforeSave`, `content:afterSave`, `content:beforeDelete`, `content:afterDelete`, `content:afterPublish`, `content:afterUnpublish`, `content:afterRestore`, `content:afterSchedule`, `content:afterUnschedule`, `media:beforeUpload`, `media:afterUpload`, `email:beforeSend`, `email:deliver` (exclusive), `email:afterSend`, `cron`, `page:metadata`, `page:fragments` (trusted only).

## 7. Platform and deployment prerequisites

- Dynamic Worker Loader is Cloudflare Workers-only — sandboxing is unavailable on Node.js; "all plugins run in trusted mode on non-Cloudflare platforms."
- Per the EmDash GitHub README, Dynamic Workers require a paid Cloudflare Workers account, not the free tier. The exact price was not independently re-verified in this session, but the "paid plan required" claim is consistent with Cloudflare's Dynamic Workers being a Workers Paid-plan feature generally, and is corroborated directly by [GitHub issue #149](https://github.com/emdash-cms/emdash/issues/149) — see [EmDash Content Model and Deployment](./emdash-content-model-and-deployment.md).
- Site owners can disable sandboxed plugins entirely via `wrangler.jsonc` configuration.

## 8. Feasibility assessment — home-page content widgets

**Verdict: not feasible as a genuinely sandboxed or marketplace plugin.** Feasible only as a trusted (native) plugin, which forfeits the sandbox's security guarantees and requires a code-change and redeploy to install — not a drop-in marketplace plugin.

Reasoning, directly from the primary sources in section 6:

- The one hook that can inject arbitrary markup or scripts into a public page — `page:fragments` — is explicitly restricted to trusted plugins.
- The one content-authoring mechanism that lets a plugin define a reusable, editor-placeable block type rendered on the public page — Portable Text custom blocks — is also trusted-only, because the rendering component has to be an Astro component compiled into the site at build time, and a sandboxed plugin is installed and loaded at runtime, after the build.
- The `page:metadata` hook does work in sandboxed mode, but it is deliberately limited to structured, non-visual `<head>` contributions, not a UI widget.
- A workaround exists but changes the shape of the feature: a sandboxed plugin can expose a JSON API route, and theme/template code — necessarily trusted, build-time Astro code, not the plugin — fetches from it and renders the markup itself. That satisfies "arbitrary small content widgets" only if the widget's visual shell is written once as trusted site code and the plugin merely supplies dynamic data, which is materially different from "a plugin implements a UI component."

If the intent is a marketplace-style, installable-without-redeploy home-page widget, EmDash's current sandbox model blocks it by design. If the intent is a first-party trusted plugin — or just theme code — that renders a widget, with data optionally sourced from a sandboxed plugin's API route, that is fully supported today.

## 9. Feasibility assessment — members-only message board

**Verdict: plausible for a sandboxed plugin, with one significant, currently under-documented gap: per-request caller identity and session on plugin routes.**

What's clearly supported:

- **Posting and storage** — a `posts`/`threads`/`replies` storage collection with indexes (for example `["threadId", "createdAt"]`) is a direct fit for `ctx.storage`, with cursor-based pagination for a board's typical "load more" experience.
- **Submission endpoint** — a plugin route can accept new posts; the `submissions` example in `SKILL.md` is structurally identical to what a "create post" endpoint needs, including a rate/limit check pattern (`ctx.kv` counters) that maps directly to basic anti-spam throttling.
- **Moderation** — `content:beforeSave` and `content:beforeDelete`/`content:afterDelete` hooks exist for the core content model; for a plugin's own `ctx.storage` collection, moderation is application logic inside the plugin's own route handlers (a status field such as `"pending"|"approved"|"spam"`, plus an admin Block Kit page to review and update status).
- **Member-only visibility, at the platform level** — a follow-up hands-on prototype confirmed this works today via a declarative `permission` field on the route, enforced by the host before the sandboxed handler ever runs. See [Message Board Plugin Route Auth Prototype](./emdash-plugin-route-auth-prototype.md) for the confirmed mechanism and the residual gap (the plugin still doesn't learn *who* is calling).

## 10. Hard limits summary (sandboxed-mode plugins)

- CPU: 50ms per invocation; subrequests: 10; wall-time: 30s; memory: ~128MB.
- No Node.js built-ins (`fs`, `path`, `child_process`, etc.) — Web APIs only.
- Network blocked by default; only declared, allowlisted hosts reachable via `ctx.http.fetch()`.
- No raw D1/KV/R2 bindings; only the scoped `ctx.content`/`ctx.media`/`ctx.storage`/`ctx.kv` wrappers, gated by declared capabilities.
- No `page:fragments` (raw HTML/script injection into public pages) — trusted only.
- No Portable Text custom block types (public-page-rendered content blocks) — trusted only.
- No documented queues, alarms, Durable Objects, or WebSocket/long-lived-connection API for plugin authors.
- No documented storage/KV size quota (absence of documentation, not confirmed absence of limit).
- Sandboxing/Dynamic Workers require Cloudflare Workers (not Node.js) and a paid Cloudflare account.
- Plugin routes carry no built-in caller identity inside the handler itself — see [Message Board Plugin Route Auth Prototype](./emdash-plugin-route-auth-prototype.md).

## 11. Confidence assessment

- **High confidence** — sandbox execution model, resource limits, capability/manifest mechanics, storage/KV API shape, hook list and signatures, the `page:fragments`/Portable-Text trusted-only restrictions. All read verbatim from EmDash's own in-repo skill/reference docs — the same files the EmDash team ships to drive AI-assisted plugin authoring.
- **Medium confidence** — the paid-plan requirement for Dynamic Workers as stated in the README (later independently confirmed via a GitHub issue — see [EmDash Content Model and Deployment](./emdash-content-model-and-deployment.md)), the member-role/`content:read` gating description (sourced from a secondary summary of EmDash's auth docs, cross-checked in [EmDash Auth and User Model](./emdash-auth-model.md)), and the internal-only Durable Object mention for preview databases.
- **Low confidence / open questions** — whether any queue, alarm, or WebSocket primitive exists for plugins (absence of documentation is suggestive but not conclusive for a project shipping new features roughly weekly).
- **General caveat** — EmDash is genuinely young (developer preview since April 2026, no 1.0 at research time, weekly-ish point releases). Docs, especially the Starlight site at docs.emdashcms.com, are thinner than the in-repo skill/reference files. Any of the specific limits or APIs above could change before a 1.0 release.

[← Back to Explanation](./README.md)
