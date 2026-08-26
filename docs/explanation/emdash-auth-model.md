# EmDash Auth and User Model <!-- omit in toc -->

Research findings on whether EmDash's built-in authentication fits a small, invite-only private community, and what replacing Better Auth with it would require, produced while evaluating a possible migration of waneetabeach.ca to Cloudflare's EmDash CMS (Paca ticket WANE-5). Retained for reference even though the migration decision came out no-go.

## Table of Contents <!-- omit in toc -->

- [1. What EmDash is](#1-what-emdash-is)
- [2. Does EmDash's auth model fit a small, invite-only private community?](#2-does-emdashs-auth-model-fit-a-small-invite-only-private-community)
- [3. What replacing Better Auth with EmDash's auth model would require](#3-what-replacing-better-auth-with-emdashs-auth-model-would-require)
  - [3.1 EmDash's auth is a from-scratch implementation, not a Better Auth wrapper](#31-emdashs-auth-is-a-from-scratch-implementation-not-a-better-auth-wrapper)
  - [3.2 Authentication methods available](#32-authentication-methods-available)
  - [3.3 Invite flow — the piece most relevant to "invite-only community"](#33-invite-flow--the-piece-most-relevant-to-invite-only-community)
  - [3.4 Session management](#34-session-management)
  - [3.5 Permission and role-scoping APIs for gating content, such as a members-only board](#35-permission-and-role-scoping-apis-for-gating-content-such-as-a-members-only-board)
  - [3.6 Content gating beyond RBAC — paywall enforcement still in design, not shipped](#36-content-gating-beyond-rbac--paywall-enforcement-still-in-design-not-shipped)
  - [3.7 Migration mechanics — what actually changes](#37-migration-mechanics--what-actually-changes)
- [4. What would be lost by dropping Better Auth for EmDash's model](#4-what-would-be-lost-by-dropping-better-auth-for-emdashs-model)
- [5. Confidence level and caveats](#5-confidence-level-and-caveats)
- [6. Sources](#6-sources)

Pure external research. No changes were made to the waneetabeach.ca repository or its existing [Authentication Architecture](./authentication.md).

## 1. What EmDash is

EmDash is Cloudflare's open-source, full-stack TypeScript CMS built on Astro 6, described as the "spiritual successor to WordPress," architected to run serverless on Cloudflare Workers (D1/R2/KV in production, SQLite locally), but not locked to Cloudflare — portable via Kysely and S3-API abstractions to Postgres, Turso, AWS S3, and similar. Source: [Introducing EmDash — Cloudflare Blog](https://blog.cloudflare.com/emdash-wordpress/); [GitHub — emdash-cms/emdash](https://github.com/emdash-cms/emdash).

Primary docs site: <https://docs.emdashcms.com/>. Secondary/AI-generated reference used only for cross-checking, flagged explicitly where used: [DeepWiki — Authentication and User Management](https://deepwiki.com/emdash-cms/emdash/3.3-authentication-and-user-management).

## 2. Does EmDash's auth model fit a small, invite-only private community?

**Short answer: partially, and more by accident than by design.** EmDash's built-in user model is an admin-managed team/staff model — the same shape as WordPress's admin/editor/author/subscriber roles — not a public-community membership system. For a "handful of known members" added by an admin, this actually maps reasonably well, but EmDash's own maintainers are on record saying the model is *not yet* meant to hold public/reader accounts safely, which is the closer analogy to a private members' board.

Key facts:

- EmDash ships role-based access control with five hierarchical tiers: Admin (50), Editor (40), Author (30), Contributor (20), Subscriber (10). Each role inherits permissions from all lower levels. Source: [Authentication — EmDash docs](https://docs.emdashcms.com/guides/authentication/), cross-checked against [DeepWiki 3.3](https://deepwiki.com/emdash-cms/emdash/3.3-authentication-and-user-management).
- The first user created during setup is always Admin, via the setup wizard. All other users are provisioned by an admin afterward — there is no default "anyone can just sign up and start posting" flow baked into core.
- Self-signup exists but is gated, not open by default: "self-signup is presently gated by the `allowed_domains` table" — admins can restrict who is allowed to self-register to specific email domains. There is no built-in "open to anyone" signup mode as of the codebase at research time; that is an open feature request, not a shipped feature. Source (primary, GitHub discussion by EmDash maintainers/contributors): [Discussion #1315 — Feature request: open signup + public subscriber profiles](https://github.com/emdash-cms/emdash/discussions/1315).
- Maintainer `ascorbic` explicitly pushed back on mixing public/reader accounts into the same table as admin/editor accounts, calling it a security risk: opening self-signup to arbitrary readers "opens up a much larger attack surface than currently where there is no untrusted access to admin," and proposed instead "a completely separate public account type that never touches `users` or the admin session at all."

**Implication for waneetabeach.ca**: a small, invite-only board of known, trusted members is the scenario EmDash's current model handles best — an admin invites specific people by email, they land in the same RBAC table as Subscriber-role users, and there is no attack-surface concern from strangers self-registering, because self-signup would stay disabled or domain-gated. EmDash was not designed with an anonymous-public or large-open-community membership model in mind; that is an explicit gap, actively being designed as a separate, not-yet-built "public account" system — see section 3.5.

## 3. What replacing Better Auth with EmDash's auth model would require

### 3.1 EmDash's auth is a from-scratch implementation, not a Better Auth wrapper

`@emdash-cms/auth`'s dependencies are `@oslojs/crypto`, `@oslojs/encoding`, `@oslojs/webauthn`, `ulidx`, `zod` — no `better-auth` dependency. EmDash implements WebAuthn/passkey, OAuth, magic link, and RBAC itself rather than building on Better Auth or any other third-party auth library. Source (primary, package.json): [packages/auth/package.json](https://github.com/emdash-cms/emdash/blob/main/packages/auth/package.json).

This means adopting EmDash's auth is not a drop-in swap of one auth library for a similar one — it is a different authentication paradigm (passkey-first, admin-provisioned) built specifically to be consumed through EmDash's own Astro integration and admin panel.

### 3.2 Authentication methods available

- **Passkeys (WebAuthn)** — the default and primary method: "EmDash's built-in login is passkeys."
- **Magic link** — email fallback, single-use, valid 15 minutes, requires email sending to be configured.
- **OAuth** — GitHub, Google, and "Atmosphere" (AT Protocol / Bluesky) ship built-in; third-party OAuth providers can be registered via the same `AuthProviderDescriptor` interface. There is no traditional password login.
- **Cloudflare Access** — can be configured as the exclusive auth method (`auth: access({...})` in `astro.config.mjs`), which disables passkeys, OAuth, magic-link, and self-signup entirely and defers to your identity provider, with `roleMapping` to map IdP groups to EmDash role levels.
- **Device authorization flow (RFC 8628)** — for CLI login (`npx emdash login`), not relevant to end-user/member auth.

Sources (primary): [Authentication — EmDash docs](https://docs.emdashcms.com/guides/authentication/), [Configuration reference — EmDash docs](https://docs.emdashcms.com/reference/configuration/).

### 3.3 Invite flow — the piece most relevant to "invite-only community"

- Admins invite via Settings → Users in the admin panel: enter email and role, send invite.
- Invites are valid for 7 days; admins can resend or revoke them from the Users page.
- The invitee clicks the emailed link and registers a passkey to complete signup.
- REST endpoint: `POST /_emdash/api/auth/invite` for invite creation; acceptance flow uses `invite`-type tokens and an accept/registration page.

### 3.4 Session management

- Sessions use secure, HttpOnly, `SameSite=Lax` cookies, with a 30-day lifetime and sliding expiration — expiry resets on activity.
- The session store is pluggable at the storage layer (Cloudflare KV, Redis, or file-based, per the package's portable-storage design) — this detail comes from a secondary source (DeepWiki) and was not independently confirmed against primary docs; treat as lower confidence.

### 3.5 Permission and role-scoping APIs for gating content, such as a members-only board

- Core permission model: numeric role levels (10/20/30/40/50) with inherited permissions; scoped permission strings such as `content:read` and `content:read_drafts`.
- `content:read` is granted to Subscriber (role 10) and above — this is the permission that gates a message board to logged-in members only: an authenticated Subscriber can read published member-only content, while an unauthenticated visitor cannot. A follow-up hands-on prototype confirmed this mechanism works today for plugin routes too — see [Message Board Plugin Route Auth Prototype](./emdash-plugin-route-auth-prototype.md).
- `content:read_drafts` is granted to Contributor (role 20) and above — Subscribers are filtered out of drafts, scheduled items, trashed items, revisions, and preview URLs; list/get endpoints "transparently filter to `status=published` for Subscribers."
- Enforcement helpers (per DeepWiki, secondary and unverified against source): `hasPermission()`, `requirePermission()`, `requirePermissionOnResource()` throwing a `PermissionError`, implemented in `packages/auth/src/rbac.ts`.
- API tokens (for CLI/agent access) carry their own JSON-encoded scopes, clamped to not exceed the token owner's RBAC role via a `clampScopes` function and a `SCOPE_MIN_ROLE` table (secondary source, unverified).

**Important caveat for the message-board use case specifically**: the `content:read`/`content:read_drafts` model gates EmDash's own content types (posts, pages, collections managed through its CMS admin), not a purpose-built discussion-board or forum feature. EmDash is a content *management* system, not forum software — there is no evidence in the docs or repo of built-in threaded discussion, replies, or forum-style permissions on their own. A "message board" would have to be modelled as an EmDash content collection, with Subscriber-level members granted `content:read` to view it and some elevated role or plugin granted write access to post — a workable pattern, but scaffolding rather than a ready-made forum feature. A subsequent finding surfaced a better-fitting primitive for this: EmDash's native comments system — see [Message Board Plugin Route Auth Prototype](./emdash-plugin-route-auth-prototype.md).

### 3.6 Content gating beyond RBAC — paywall enforcement still in design, not shipped

A parallel, more directly relevant discussion — native paywall/entitlement support — is still at proposal stage, not implemented:

- Proposal: "core gates, plugins and external providers do everything else," with the guarantee that "protected content is never delivered to a reader who is not authorized to see it," contrasted against the common, insecure practice of client-side `display:none` gating that leaks full content in the HTML response.
- Maintainer `ascorbic` responded positively in principle — "it does make sense for it to be in core, and to expose plugin hooks" — but flagged unresolved concerns, including separating editor accounts from subscriber/reader accounts, the same architectural gap flagged in section 2.

Source (primary, GitHub discussion): [Discussion #1467 — native paywall support](https://github.com/emdash-cms/emdash/discussions/1467) (referenced from #1315; URL not independently re-verified by number, moderate confidence on the exact discussion number, high confidence on the content quoted, which was fetched directly).

### 3.7 Migration mechanics — what actually changes

Because `@emdash-cms/auth` has no Better Auth dependency and is built to be consumed via EmDash's Astro integration (setup wizard, admin UI, D1/Kysely-backed `UserTable`/`AuthTokenTable`/`ApiTokenTable`/`OAuthTokenTable`), "replacing Better Auth with EmDash's auth" in practice means one of two things:

1. **Adopt EmDash as the CMS/app framework** (Astro-based), gaining its auth, admin UI, and content model together — a significant architecture change from the current stack ([Gilbert](./architecture.md)-built static app, itty-router API Worker plus D1, standalone Better Auth service).
2. **Extract just `@emdash-cms/auth`** and hand-wire it into the existing app and API workspaces. The package is described, secondarily, as having a "framework-agnostic core," which is plausible given it is a separate npm package with its own dependency list, but no primary documentation found in this research describes supported standalone or non-Astro usage, and the admin UI (invite management, Settings → Users) is part of EmDash's Astro admin panel, not the `auth` package alone — so a hand-wired integration would likely mean losing the built-in invite UI and reimplementing it against the package's lower-level APIs.

No primary-source evidence was found either confirming or ruling out standalone, non-EmDash-CMS use of `@emdash-cms/auth`; this is a genuine documentation gap given the project's newness.

## 4. What would be lost by dropping Better Auth for EmDash's model

These are inferred from what EmDash's docs and repo do *not* mention — features Better Auth is independently known for that have no EmDash equivalent found in this research — not from an EmDash-versus-Better-Auth comparison page, since none was found.

- **Broader OAuth/social provider catalogue.** EmDash ships GitHub, Google, and Atmosphere (Bluesky/AT Protocol) only, plus a pluggable interface for custom providers. Better Auth ships a much larger built-in provider list (Discord, Apple, Microsoft, Facebook, Twitch, LinkedIn, Spotify, GitLab, Reddit, TikTok, and more) without custom-provider work.
- **No traditional email-and-password login.** EmDash is passkey-first with magic-link and OAuth fallback only — there is no password-based login path at all. Members who need or expect classic password auth, for example less technical members without passkey-capable devices or password managers, lose that option entirely.
- **Decoupled, standalone auth-service architecture.** The current [Authentication Architecture](./authentication.md) runs Better Auth as its own service, independent of the static site and the API Worker. EmDash's auth is designed to run inside an EmDash/Astro deployment; no primary documentation found describes it as a standalone, framework-independent auth microservice in the way Better Auth is used here. Adopting it as documented would mean coupling auth to adopting EmDash itself.
- **A mature, single-purpose auth-only project with a large plugin ecosystem** — two-factor/TOTP, organizations and multi-tenancy, admin impersonation, username/phone-number auth, generic OAuth/OIDC/SSO plugins, rate-limiting plugins, and more, from Better Auth's known plugin catalogue. EmDash's auth surface, by contrast, is scoped tightly to what its own CMS needs — passkey/OAuth/magic-link login, RBAC for content roles, invite flow, API tokens for CLI/agent access — with no evidence of an equivalent plugin ecosystem found. This is expected given EmDash's age at research time, not a dedicated auth library.
- **Public/reader account safety model is explicitly unfinished.** As documented in sections 2 and 3.6, EmDash's own maintainers describe the current model as unsuited to holding public/reader accounts safely and are actively designing, not yet shipping, a separate account type for that purpose. Better Auth, being framework-agnostic and widely adopted, carries no such caveat.

## 5. Confidence level and caveats

- **High confidence** — EmDash ships passkey-first auth with OAuth and magic-link fallback, five-tier RBAC (Admin/Editor/Author/Contributor/Subscriber), an admin-driven invite flow (7-day expiry, resend/revoke), and a `content:read`/`content:read_drafts` permission split that can gate content to authenticated members. Corroborated by direct quotes from the primary docs site and the Cloudflare blog post.
- **Medium confidence** — self-signup being domain-gated by default with no built-in fully-open mode, and the maintainer's stated reluctance to mix public/reader accounts into the admin user table, both drawn from a GitHub discussion thread — a primary source, but a discussion or feature request rather than shipped documentation, so behaviour could change quickly given the project's youth.
- **Lower confidence, explicitly flagged above** — session-store backend options (KV/Redis/file), internal RBAC function names and file paths (`packages/auth/src/rbac.ts`, `clampScopes`, `SCOPE_MIN_ROLE`), and whether `@emdash-cms/auth` can be used standalone outside an EmDash/Astro deployment. These came from DeepWiki, an AI-generated secondary wiki rather than EmDash's own docs, or were not independently verified against raw source files during this research session.
- **General caveat** — EmDash was very new at research time (developer preview since 1 April 2026, roughly five months of real-world usage). Its docs are reasonably thorough for a young project, but several auth and permission areas most relevant to this research — public account separation, native paywall/content-gating enforcement — are actively being designed in public GitHub discussions rather than finalised. Treat anything from those threads as a snapshot of an evolving plan, not a stable spec.

## 6. Sources

- [Introducing EmDash — Cloudflare Blog](https://blog.cloudflare.com/emdash-wordpress/)
- [GitHub — emdash-cms/emdash](https://github.com/emdash-cms/emdash)
- [packages/auth/package.json](https://github.com/emdash-cms/emdash/blob/main/packages/auth/package.json)
- [EmDash docs home](https://docs.emdashcms.com/)
- [Authentication — EmDash docs](https://docs.emdashcms.com/guides/authentication/)
- [Configuration reference — EmDash docs](https://docs.emdashcms.com/reference/configuration/)
- [REST API reference — EmDash docs](https://docs.emdashcms.com/reference/rest-api/)
- [Introduction — EmDash docs](https://docs.emdashcms.com/introduction/)
- [GitHub Discussion #1315 — open signup and public subscriber profiles](https://github.com/emdash-cms/emdash/discussions/1315)
- [GitHub Discussion #1467 — native paywall support](https://github.com/emdash-cms/emdash/discussions/1467)
- [DeepWiki — Authentication and User Management](https://deepwiki.com/emdash-cms/emdash/3.3-authentication-and-user-management) (secondary/AI-generated, used only for cross-checking, flagged inline where relied upon)

[← Back to Explanation](./README.md)
