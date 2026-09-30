# Message Board Plugin Route Auth Prototype <!-- omit in toc -->

Hands-on prototype findings on whether an EmDash sandboxed plugin route can be gated to members-only, produced while evaluating a possible migration of waneetabeach.ca to Cloudflare's EmDash CMS (Paca ticket WANE-7). Retained for reference even though the migration decision came out no-go.

## Table of Contents <!-- omit in toc -->

- [1. Setup](#1-setup)
- [2. Question](#2-question)
- [3. Finding: yes, via a declarative permission field enforced by the host](#3-finding-yes-via-a-declarative-permission-field-enforced-by-the-host)
- [4. Bonus finding: EmDash ships a native, non-plugin comments system](#4-bonus-finding-emdash-ships-a-native-non-plugin-comments-system)
- [5. Effort observed](#5-effort-observed)
- [6. Confidence](#6-confidence)

## 1. Setup

Hands-on prototype against a throwaway local EmDash instance (`npm create emdash@latest`), scaffolded outside this repository and never touching the waneetabeach.ca codebase or production data. Node v25.2.1, npm without pnpm, EmDash `emdash@0.30.0` scaffolded and `emdash@0.35.0` installed, `--legacy-peer-deps` needed due to a wrangler/`@cloudflare/workers-types` peer conflict in the template at the time.

## 2. Question

[EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md) found EmDash sandboxed plugin routes have no built-in caller auth — `RouteContext` has no user/session field. Can a sandboxed plugin route still be gated to members-only, and how much work does it take?

## 3. Finding: yes, via a declarative permission field enforced by the host

Reading the actual TypeScript source, not just the docs, in `node_modules/emdash/src/`:

- `astro/routes/api/plugins/[pluginId]/[...path].ts` — the native Astro route that receives every plugin-route HTTP request — resolves `routeMeta.permission`, defaulting to `"plugins:manage"` if unset, and calls `requirePerm(user, permission)` **before** ever invoking the sandboxed plugin handler via `emdash.handlePluginApiRoute(...)`.
- `requirePerm` (`api/authorize.ts`) returns 401 if `!user`, 403 if the user's role lacks the permission, else `null` to proceed.
- A route is public only if the plugin declares `public: true`; otherwise it is gated on `permission` — the JSDoc reads "RBAC permission required to invoke the route."
- `@emdash-cms/auth/src/rbac.ts`: `Permissions["content:read"] = Role.SUBSCRIBER` — explicitly the permission meant to gate member-only published content, with a full passing unit test suite (`rbac.test.ts`) confirming `hasPermission(null, "content:read") === false` and `hasPermission({role: SUBSCRIBER}, "content:read") === true`.

**Live confirmation.** A genuinely sandboxed plugin (`format: "standard"`, registered in `sandboxed: []`) named `@test/plugin-board` was built with one route, `posts`, declaring `permission: "content:read"` and no `public` flag. The real local dev server — Astro plus the Cloudflare adapter plus Dynamic Worker Loader — was booted and the route was curled with no auth:

```text
GET /_emdash/api/plugins/test-board/posts  (no session cookie)
→ HTTP 401 {"success":false,"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}
```

The plugin handler's own response payload — a `note` field confirming it had been reached — never appeared: the request was rejected by the host dispatcher before the sandboxed isolate was ever invoked. This satisfies "member-only visibility" without any auth code inside the plugin at all.

**This meaningfully corrects, not just extends, the earlier finding in [EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md).** The docs' flat statement, "plugin routes don't have built-in auth," is misleading — there is a built-in, host-enforced auth gate, the `permission` field. What is actually true, and still a real gap, is narrower: the plugin's own handler code never learns *who* the authenticated caller is. There is no per-user personalisation, no "show only my own posts," no verified authorship — `RouteContext` genuinely has no user field, confirmed by reading `routes.ts`. For a message board specifically: a POST to create a message cannot be cryptographically tied to a real member identity from inside the sandboxed handler — the plugin has to trust a self-reported name and email in the request body, the same limitation the native comments system works around by reading `locals.user`, which is only available to trusted/native code, not sandboxed plugin routes.

## 4. Bonus finding: EmDash ships a native, non-plugin comments system

`emdash/src/comments/` is a first-party, core — not sandboxed-plugin — threaded-comment feature: `comments/service.ts` runs a hook pipeline (`comment:beforeCreate`, `comment:moderate`, `comment:afterCreate`, `comment:afterModerate`), one-level threading via `parentId`, moderation states, anti-spam (honeypot, rate limiting, optional Turnstile), and per-collection settings (`comments_enabled`, `comments_moderation`, `comments_closed_after_days`, `comments_auto_approve_users`). The native API route (`astro/routes/api/comments/[collection]/[contentId]/index.ts`) runs as trusted code with full `locals.user` access — `POST` attaches `authorUserId` and verified name and email when a session exists, and falls back to self-reported fields when anonymous. `GET`, listing, is public and requires no auth by default, showing only approved comments, with no built-in member-only-visibility flag on comments themselves — that would need custom code layered on top, necessarily native, since it needs `locals.user`.

**This is a legitimate alternative design for "message board."** Rather than building posting, threading, and moderation from scratch as a sandboxed plugin and working around the identity gap above, the board could be built as trusted/native code on top of EmDash's existing comments primitive, gaining full `locals.user` access for real per-user identity and authorship. This is consistent with the general EmDash pattern: trusted/native code gets full auth context, while sandboxed plugins get only a coarse allow/deny gate.

## 5. Effort observed

Getting a genuinely sandboxed, not native-format, plugin running locally required a separate local npm package (`package.json` with `exports: {".": ..., "./sandbox": ...}`), a descriptor/runtime split across two files, and a manual esbuild step producing `dist/*.mjs`. Both `astro build` and even `astro dev` refused to run a sandboxed entrypoint pointing at unbuilt TypeScript — "sandbox entries must be pre-built JavaScript" — unlike trusted-mode plugins, which Vite runs directly. EmDash's CLI ships `emdash plugin bundle/login/publish` for marketplace publishing but no documented local build or watch command for sandboxed-mode dev iteration — a real, currently undocumented iteration-speed cost for sandboxed plugin development specifically. Trusted-mode plugins do not have this friction.

A related, separately investigated friction point — local `astro dev` latency against this EmDash instance, on the order of several seconds per page navigation versus sub-second builds and instant reload on the current Gilbert-based stack — was precisely isolated, through a long process of elimination, to something inside EmDash's own Astro integration rather than any Cloudflare binding, the plugin sandbox itself, WSL2, or the choice of npm versus pnpm. A real-world EmDash user with several months of experience reported the opposite — "pretty snappy" — so this is very likely fixable or environment-triggered rather than an inherent flaw, but the specific root cause was not found during this exploration.

## 6. Confidence

High — read directly from EmDash's own TypeScript source, not docs, corroborated by that source's own unit tests, and confirmed live against a running instance with a real HTTP request and response. The native comments system finding is also read directly from source. Low and unverified: whether this exact behaviour is stable across EmDash's fast release cadence — `0.30.0` to `0.35.0` within this session's research window alone.

[← Back to Explanation](./README.md)
