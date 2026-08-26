# EmDash Content Model and Deployment vs. Current Stack <!-- omit in toc -->

Research findings on how EmDash's content model and Cloudflare deployment compare to waneetabeach.ca's current stack, produced while evaluating a possible migration to Cloudflare's EmDash CMS (Paca ticket WANE-6). Retained for reference even though the migration decision came out no-go.

## Table of Contents <!-- omit in toc -->

- [1. What EmDash is](#1-what-emdash-is)
- [2. Content model: Portable Text and JSON vs. prose pages](#2-content-model-portable-text-and-json-vs-prose-pages)
- [3. Running EmDash on Cloudflare: deployment shape](#3-running-emdash-on-cloudflare-deployment-shape)
- [4. Authentication](#4-authentication)
- [5. Comparison to the current stack](#5-comparison-to-the-current-stack)
- [6. Confidence summary](#6-confidence-summary)
- [7. Sources](#7-sources)

Research date: 26 August 2026. EmDash reached v1.0 according to the Cloudflare blog post at the time this research was conducted; a subsequent, more detailed investigation ([EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md)) found no `1.0.0` tag actually existed and corrected the premise — EmDash was still pre-1.0 at research time. Docs were young when this research was done — several pages were thin, and some sections referenced from other pages, such as an "Architecture (internals)" page, could not be located directly and had to be reconstructed from secondary sources or GitHub. Confidence per claim is noted inline; overall confidence in this document is medium — core architecture and content-model claims are corroborated across the primary docs site and the GitHub repo, but some deployment and operations edges, such as pricing tiers and plugin sandbox specifics, rely on a single GitHub issue or search-engine-summarised doc pages rather than a page read end-to-end directly.

## 1. What EmDash is

Cloudflare's open-source CMS, "the spiritual successor to WordPress," built entirely in TypeScript on Astro 6, MIT licensed, with no WordPress code reuse. Source: [Cloudflare Blog — Introducing EmDash](https://blog.cloudflare.com/emdash-wordpress/).

- Repo: [github.com/emdash-cms/emdash](https://github.com/emdash-cms/emdash). Docs: [docs.emdashcms.com](https://docs.emdashcms.com/). Playground: emdashcms.com.
- Repo layout (from the GitHub README): `packages/core` (Astro integration, admin UI, CLI), `packages/auth`, `packages/cloudflare` (D1/R2/Worker Loader adapters), `packages/plugins`, `packages/create-emdash`, `templates/` (starter themes), `demos/`, `docs/` (Starlight site).
- Homepage pitch: "a modern, Astro-native CMS" — content edits show up immediately via Astro 6 Live Content Collections, full TypeScript type generation from the content model, and a WordPress-inspired plugin system with hooks, storage, and admin-UI extension points.

## 2. Content model: Portable Text and JSON vs. prose pages

**Core model.** Content is organised into collections — a content type such as posts, pages, or products — each with developer- or admin-defined fields. Collections are defined either visually in the admin panel under "Content Types" or via the CLI/seed files, and map 1:1 to SQL tables (`ec_*` tables under Kysely). Source: [docs.emdashcms.com/concepts/content-model/](https://docs.emdashcms.com/concepts/content-model/) and the [content-model.mdx source](https://github.com/emdash-cms/emdash/blob/main/docs/src/content/docs/concepts/content-model.mdx).

**Portable Text.** Rich and body content is stored as Portable Text — "a structured JSON format that decouples content from presentation" so the same content can render as a web page, mobile app, email, or API response "without parsing HTML." In TypeScript this is typed as `PortableTextBlock[]` (for example, `content: PortableTextBlock[]` on a `Post` interface) and rendered with a `<PortableText>` component, or converted via ProseMirror helpers, rather than injected as raw HTML. The `PortableTextBlock[]` typing and "decouples content from presentation" framing are directly quoted from the docs; the exact block schema is medium confidence, since a full page with a literal JSON example could not be rendered during research.

**System fields.** Every entry automatically carries `id`, `slug` (URL-safe, locale-specific), `status` (draft/published/scheduled), `author_id`, `created_at`/`updated_at`/`published_at`, `deleted_at` (soft delete), and `version` (increments on save).

**Taxonomies and menus.** Seed files (JSON, version-controllable) also define taxonomies (hierarchical categories) and navigation menus alongside collections.

**Type generation.** `npx emdash types` (or `emdash types` via CLI) generates a TypeScript interface per collection plus typed query overloads, so `getEmDashCollection("posts")` returns fully typed entries and the IDE flags type errors immediately after a schema change.

**Mapping onto simple history/local-info prose pages.** For a site like waneetabeach.ca's current content — mostly static prose pages with occasional images, no e-commerce or product-style structured data — EmDash's model is a reasonable but non-trivial fit:

- A "page" collection with a `title` string field, a `body` field of type `portableText`, and a `slug` would map cleanly onto the existing static pages.
- Prose has to be authored and stored as Portable Text JSON, not Markdown or raw HTML. This is a real migration cost: existing Markdown/HTML content would need conversion into block JSON. New content authored via the admin panel's ProseMirror-based editor produces this JSON natively, so only *existing* content needs the one-time transform.
- Images are handled through a media library backed by portable storage — R2 in Cloudflare's case, S3-compatible elsewhere. The dedicated media-library doc page could not be loaded directly during research (a 404 on the guessed URL), so exact reference-from-Portable-Text mechanics — likely asset IDs embedded as image blocks — are low confidence and should be re-verified against the equivalent of `docs.emdashcms.com/features/media-library/` before relying on it.
- This is heavier machinery than a pure static-site-generator content model, such as Markdown frontmatter plus Astro content collections, for what is fundamentally brochure or informational content — EmDash brings a database, an admin UI, and a structured schema builder to a use case a flat-file SSG handles with plain Markdown files.

## 3. Running EmDash on Cloudflare: deployment shape

**Single integrated deployment, not a services split.** EmDash is added to an existing Astro project as an integration (`astro.config.mjs`), and the whole thing — admin panel at `/_emdash/admin`, content API, and site rendering — ships as one Astro app deployed to Cloudflare Workers via `@astrojs/cloudflare`.

**Bindings.** Production configuration lives in `wrangler.jsonc`:

- **D1** binding (for example `"binding": "DB"` plus `database_id`) — Cloudflare's serverless SQLite, used automatically when deployed to Workers.
- **R2** binding (for example `"binding": "MEDIA"`) — object storage for the media library, via a portable S3-compatible storage API that also supports AWS S3 or the local filesystem outside Cloudflare.
- Optional **Images** binding — Cloudflare Images handles on-the-fly resizing, wired in automatically by `@astrojs/cloudflare` and billed per unique transformation past the 5,000/month free tier.
- Optional **Cache** configuration (`"cache": { "enabled": true }`) to use native Workers Cache instead of the legacy `cloudflareCache()` helper; `cacheCloudflare()` from `@astrojs/cloudflare/cache` plus `routeRules` in `astro.config.mjs` drive page-level TTLs; `cache.purge()` from `cloudflare:workers` purges without needing an API token.
- Scheduled publishing uses Worker Cron Triggers.

**Database is portable by design.** Under the hood the database layer uses Kysely as a SQL abstraction, so the same code targets D1 (Workers/serverless SQLite), SQLite (local development or self-hosted Node, file-based, needs persistent disk), libSQL/Turso (remote SQLite fork), PostgreSQL (self-hosted Node), or Hyperdrive (Workers plus external Postgres, connection pooling). Core migrations run automatically on all dialects.

**Build and dev workflow** (from the Cloudflare demo):

```text
pnpm dev        # local dev using workerd (the real Workers runtime), auto-migrates D1 on first request
pnpm build      # production build
pnpm preview    # test against real Workers runtime
pnpm deploy     # wrangler deploy
```

A deployment-guide variant from the root docs:

```text
pnpm build
pnpm exec emdash migrate --status --json   # check pending migrations (needs account/database flags)
pnpm exec emdash migrate                   # apply migrations (needs target fingerprint flag)
pnpm exec wrangler deploy
```

The migration job needs a `CLOUDFLARE_API_TOKEN` with D1 Edit permission. Wrangler auto-provisions the D1 database and R2 bucket on first deploy if they do not already exist. The live URL defaults to `https://<name>.<subdomain>.workers.dev`.

**Scaffolding.** `npm create emdash@latest`, or per the docs homepage, `npm create astro@latest -- --template @emdash-cms/template-blog` followed by `npm run dev`, with the admin panel at `http://localhost:4321/_emdash/admin`.

**Plugin execution model.** Plugins — EmDash's WordPress-plugin analogue — run sandboxed in per-plugin V8 isolates via Cloudflare's Dynamic Worker Loader, with capability-based permissions declared in a manifest, for example `content:read`. Network access is blocked by default and must go through `ctx.http.fetch()` validated against an `allowedHosts` list; storage access is scoped to the plugin's own KV/collections. High confidence on the general shape — sandboxed isolates, capability manifest — was later confirmed and extended in detail in [EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md); medium confidence on the exact enforcement mechanics at the time of this research.

**Important operational constraint — paid-plan requirement.** [GitHub issue #149](https://github.com/emdash-cms/emdash/issues/149) reports that the default EmDash template uses Dynamic Workers, which is a Workers Paid-tier feature; deploying the default template to a Cloudflare Free plan fails at the final Worker version upload with error code 10195, "In order to use Dynamic Workers, you must switch to a paid plan." The build itself succeeds; only the deploy step fails. The issue was closed "not planned" — the maintainers did not add a free-tier-compatible mode. Practical implication: any EmDash-based site that keeps the default plugin architecture requires a Workers Paid subscription, not just a Workers Free account. This is a directly load-bearing fact for the waneetabeach.ca comparison and is high confidence, having been read in full from the primary GitHub issue.

## 4. Authentication

- EmDash ships its own auth system (packages `@emdash/auth`/`@emdash-cms/auth-*`), not an integration of Better Auth as far as the docs describe — the authentication guide describes a custom passkey-first implementation and does not name Better Auth as the underlying library. This was confirmed directly by reading `packages/auth/package.json` in a follow-up investigation — see [EmDash Auth and User Model](./emdash-auth-model.md).
- Default and primary method: WebAuthn passkeys — phishing-resistant, no password sent over the network, works via browser/password-manager sync.
- Pluggable providers ship out of the box: GitHub and Google OAuth, and Atmosphere/AT Protocol login (handle/DID allowlists, no client secret). Third-party providers plug in via an `AuthProviderDescriptor` interface (id, label, optional admin React components, route handlers, public route prefixes, storage collections).
- Role-based access control, five hierarchical levels: Subscriber (10, published content only) → Contributor (20, create with approval) → Author (30, full content control) → Editor (40, all content management) → Admin (50, system-wide; the first user is always Admin).
- Not a separate service — auth is built into the EmDash Astro integration itself, configured via an `authProviders` array on the integration, with database-backed sessions (secure, HttpOnly, `SameSite=Lax` cookies, 30-day expiry) stored in the same D1/SQLite database as content.
- Cloudflare-specific note: for Cloudflare Access deployments, Access becomes the exclusive auth method, replacing the built-in providers.

## 5. Comparison to the current stack

Current stack for reference: a separate static-site build (`workspaces/app`, [Gilbert](./architecture.md)-built), a separate itty-router API Worker (`workspaces/api`), a separate D1 database, and a standalone [Better Auth service](./authentication.md) (`workspaces/auth`).

| Concern | Current stack (this repo) | EmDash |
| :--- | :--- | :--- |
| Site rendering | Separate static-site build (`workspaces/app`, Gilbert-built) | Built into the same Astro app/Worker as content admin and API |
| Content API | Separate itty-router Worker (`workspaces/api`) | No separate API Worker — content is queried in-process via `getEmDashCollection()`/`getEmDashEntry()` inside the same Astro deployment |
| Database | Separate D1 instance behind the API Worker | Still D1, but bound directly to the single EmDash Worker, no intermediary API layer |
| Auth | Standalone Better Auth service (`workspaces/auth`) | Built into the EmDash integration itself — no separate auth service, own passkey/OAuth/RBAC system, own session table in the same database |
| Content authoring | Whatever mechanism exists today — presumably files/Markdown or a bespoke admin | Admin panel at `/_emdash/admin` plus visual schema builder and Portable Text editor, all part of the deployed Worker |
| Deploy units | Three separate workspaces/deploy targets (app, api, auth) | One deploy target: `wrangler deploy` of the single Astro+EmDash Worker |

**What would collapse into EmDash's single deployment:**

- The separate itty-router content/API Worker — EmDash's Astro integration reads content directly from D1 via Kysely inside the same Worker that renders pages, so a standalone API layer for serving page content becomes redundant.
- The standalone Better Auth service — EmDash brings its own passkey/OAuth/RBAC auth built into the same app, backed by the same D1 database, so a separate auth deployment or service is no longer needed for the CMS's own admin/member-area auth, though see the caveat below.
- The build step for a separate static-site generator — EmDash *is* the Astro app; there is no separate "generate static output, then deploy" pipeline distinct from the CMS's own dev/build/deploy cycle, though the site can still be built statically or server-rendered depending on Astro configuration.

**What would likely still need to stay separate or be re-thought:**

- If the message board's auth/session model has custom requirements beyond EmDash's five-tier RBAC — different member roles, custom invite flows, integration with an external identity system — EmDash's built-in auth may not be a drop-in replacement for the existing Better Auth setup; it would need evaluation against actual message-board auth requirements, not just history/local-info reader auth.
- Any bespoke API endpoints unrelated to CMS content — message-board-specific business logic, non-content data models — are not automatically covered by EmDash's `getEmDashCollection`/plugin model; those either become EmDash plugins, with the sandboxing and capability constraints described in [EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md), or would need their own Worker anyway, partially reintroducing the separate-API-Worker shape.
- Anything requiring Dynamic Workers, the plugin sandbox, forces the Workers Paid plan (see section 3) — if the project currently runs on Workers Free, that is a new recurring cost, not just an architecture simplification.

**Rough infra/ops delta:**

- Fewer moving parts: one deploy target instead of three (app/api/auth), one database binding path instead of API-Worker-mediated D1 access, one auth system instead of a standalone Better Auth deployment. Less cross-service coordination — no need to keep the API Worker and static-site build in sync, no separate auth service to version, deploy, or monitor.
- More constrained by EmDash's opinions: content must live in EmDash's schema and Portable Text model, a migration cost for existing prose; the admin/authoring flow is EmDash's own UI, not a custom-built one; auth is EmDash's own system, a migration cost off Better Auth if features do not match; plugin extensibility is sandboxed and capability-gated, so it is not possible to just write arbitrary Worker code the way a custom itty-router API can; and the default template requires a paid Cloudflare Workers plan due to Dynamic Workers, a real cost and operations constraint the current stack does not have, assuming the current stack runs on Free or does not need Dynamic Workers.
- Given the project's youth at research time — roughly four months post-launch, with docs still gappy — there is meaningful adoption risk: a thinner community and ecosystem, evolving APIs, and documentation gaps that would need to be resolved, likely by reading source in `packages/core`, before committing.

## 6. Confidence summary

- **High confidence** — EmDash exists, is TypeScript-on-Astro, MIT licensed, single-Worker deployment via `@astrojs/cloudflare` plus D1/R2 bindings in `wrangler.jsonc`, Portable Text as the rich-content field type, built-in — not separate — auth with passkeys/OAuth/RBAC, and the Dynamic-Workers-requires-paid-plan constraint, directly read from the GitHub issue.
- **Medium confidence** — exact Portable Text JSON shape and image-embedding mechanics, since a page with a literal example could not be loaded; plugin sandbox enforcement specifics at the time of this research, later firmed up in [EmDash Plugin Sandbox Capabilities](./emdash-plugin-sandbox.md); and whether EmDash's auth has zero relationship to Better Auth internally, later confirmed directly in [EmDash Auth and User Model](./emdash-auth-model.md).
- **Low confidence / needs direct verification before decisions are made** — the media-library-to-Portable-Text image reference format, since the page 404'd, the separate "Architecture (internals)" page that was referenced but not located, and general ecosystem maturity signals — plugin marketplace depth, real-world production usage — which were outside the primary-source scope of this research pass.

## 7. Sources

- [Cloudflare Blog — Introducing EmDash](https://blog.cloudflare.com/emdash-wordpress/)
- [GitHub — emdash-cms/emdash](https://github.com/emdash-cms/emdash)
- [GitHub — demos/cloudflare/README.md](https://github.com/emdash-cms/emdash/blob/main/demos/cloudflare/README.md)
- [GitHub — docs/src/content/docs/concepts/content-model.mdx](https://github.com/emdash-cms/emdash/blob/main/docs/src/content/docs/concepts/content-model.mdx)
- [GitHub Issue #149 — Dynamic Workers requires paid plan](https://github.com/emdash-cms/emdash/issues/149)
- [docs.emdashcms.com](https://docs.emdashcms.com/)
- [docs.emdashcms.com/concepts/content-model/](https://docs.emdashcms.com/concepts/content-model/)
- [docs.emdashcms.com/deployment/cloudflare/](https://docs.emdashcms.com/deployment/cloudflare/)
- [docs.emdashcms.com/deployment/database/](https://docs.emdashcms.com/deployment/database/)
- [docs.emdashcms.com/guides/authentication/](https://docs.emdashcms.com/guides/authentication/)

[← Back to Explanation](./README.md)
