# Product Requirements Document — waneetabeach.ca <!-- omit in toc -->

This document captures the goals, scope, constraints, and key decisions for the waneetabeach.ca website. It is the authoritative reference for what is being built, for whom, and why. Implementation details live in the reference and how-to documentation.

## Table of Contents <!-- omit in toc -->

- [1. Background](#1-background)
- [2. Goals](#2-goals)
- [3. Audience](#3-audience)
  - [Public visitors](#public-visitors)
  - [Community members](#community-members)
  - [Site administrator](#site-administrator)
- [4. Scope](#4-scope)
  - [4.1. Public Site](#41-public-site)
  - [4.2. Members Portal](#42-members-portal)
  - [4.3. Out of Scope](#43-out-of-scope)
- [5. Functional Requirements](#5-functional-requirements)
  - [5.1. Public Site](#51-public-site)
  - [5.2. Members Portal](#52-members-portal)
  - [5.3. API Layer](#53-api-layer)
- [6. Non-Functional Requirements](#6-non-functional-requirements)
  - [6.1. Accessibility](#61-accessibility)
  - [6.2. Performance](#62-performance)
  - [6.3. Maintainability](#63-maintainability)
- [7. Technology Decisions](#7-technology-decisions)
  - [7.1. Stack Summary](#71-stack-summary)
  - [7.2. Key Rationale](#72-key-rationale)
- [8. Deferred Work](#8-deferred-work)

## 1. Background

Waneeta Beach is a small, private residential beach community on the north shore of Lake Erie in Ontario. It has a rich local history — including a significant 1976 storm — and a tight-knit community of under 20 households.

This site fills that gap. It is not a real estate advertisement. It is a community home on the web: part curiosity-satisfying public presence, part private members portal for day-to-day community communication.

## 2. Goals

- Give curious visitors an attractive, informative introduction to Waneeta Beach.
- Preserve and surface local history, including the 1976 storm, with contributions curated from older residents over time.
- Provide members with a simple, accessible private space to communicate about community matters (road maintenance, events, seasonal planning).
- Keep operational overhead near zero — no servers to manage, no databases to administer, no third-party SaaS dependencies beyond the Cloudflare platform.
- Establish a reusable, portable architecture for Better Auth as a separable identity bounded context, suitable for adoption in larger projects.

## 3. Audience

### Public visitors

Anyone who has looked up "Waneeta Beach" out of curiosity — prospective buyers, former residents, local historians. No account required. No interaction expected beyond reading.

### Community members

Fewer than 20 households. Roughly one-third are year-round residents; the rest are seasonal. A meaningful portion of the membership is older (60s–80s) and has limited digital experience. Simplicity of interaction is a hard requirement, not a nice-to-have. Message volume is anticipated to be very low — a few threads per year.

### Site administrator

A single technically proficient owner-operator (the site author) who manages accounts, curates history content, and maintains the codebase.

## 4. Scope

### 4.1. Public Site

Content is static, compiled by Gilbert, and served as assets from a Cloudflare Worker.

| Section              | Description                                                                                             |
| :------------------- | :------------------------------------------------------------------------------------------------------ |
| Introduction         | Welcome text and orientation to Waneeta Beach                                                           |
| Speed limit reminder | Community notice: 15 km/h private road                                                                  |
| History              | Written history of the community; the 1976 storm with photos (photos deferred pending asset collection) |
| Map                  | Location of Waneeta Beach                                                                               |
| Widget bar           | Current weather, next garbage day, and Catfish Creek water risk — fetched server-side via `/api/widgetdata` |

### 4.2. Members Portal

Requires authentication. Accessible only to members provisioned by the administrator.

| Feature             | Description                                                                          |
| :------------------ | :----------------------------------------------------------------------------------- |
| Thread board        | Flat threaded discussion organised into fixed categories                             |
| Categories          | Up to four pre-defined categories, set by the administrator, never user-configurable |
| Post & reply        | Any authenticated member can create a thread or reply                                |
| Email notifications | All members receive an email when a new post or reply is created; no opt-out in v1   |
| Account provisioning | Administrator creates accounts directly in Better Auth and sends a manual login link via email |
| Account management  | Administrator can deactivate accounts                                                |

### 4.3. Out of Scope

The following were considered and explicitly deferred or excluded:

- Direct messaging between members
- Snow budget tracking UI (deferred; manual JSON + redeploy is sufficient for now)
- History contribution submission form (deferred; administrator collects content directly from residents)
- Member self-registration
- Invite-link registration flow (removed; admin account creation + manual email is sufficient at this scale)
- R2 asset storage (deferred until photo volume is known)
- Real-time features (WebSockets, Durable Objects, Server-Sent Events)
- Snow budget admin interface
- Domain-level member identity table and ACL (deferred; auth claims are sufficient for current API needs)
- Casbin policy-based authorisation (deferred; a simple admin role check satisfies all current requirements)

## 5. Functional Requirements

### 5.1. Public Site

**Widget bar**

The home page displays three live-data widgets. All data is fetched from a single server-side endpoint `GET /api/widgetdata` which fans out to the three upstream sources and returns an aggregated JSON payload. The public page fetches this endpoint after paint and renders each widget independently.

- **Weather** — current temperature, conditions, and wind from the Open-Meteo API using the Waneeta Beach lat/long. No API key required.
- **Garbage day** — next scheduled pickup date and type (blue bin or cardboard) from the municipal schedule source.
- **Catfish Creek water risk** — latest watershed condition statement from the Catfish Creek Conservation Authority RSS feed; title, date, and link to the full report.

Each widget degrades gracefully if its upstream source is unavailable. Response caching is deferred to a follow-up.

**History**

- Static content authored in JSON, compiled by Gilbert.
- Photo gallery is a static image set committed to the repository.
- No lightbox JavaScript — native `<dialog>` if a full-size view is needed.

### 5.2. Members Portal

**Authentication**

Authentication is handled by a dedicated Better Auth Worker (`waneetabeach-auth`) with its own D1 database. It is never called directly by the browser. All auth traffic is proxied through the API Worker via a Cloudflare Service Binding.

- The auth Worker exposes an internal `GET /session` endpoint. Given a request's cookie headers it validates the session against D1 and returns a claims object: `{ userId, username, email, role }`.
- All other auth routes (`/api/auth/*`) are forwarded wholesale from the API Worker to the auth Worker via the Service Binding.
- Sessions are stored in the auth D1. The API Worker has no direct access to auth tables.
- The administrator creates member accounts directly via Better Auth's admin interface and sends a manual email with the login URL. No self-service registration path exists.
- All portal routes require a valid session. Unauthenticated requests to portal pages redirect to `/login`. Unauthenticated API requests return `401`.

**Authorisation**

A lightweight `enforce(claims, object, action)` function provides an authorisation seam with the same signature as Casbin's `enforce()`. The current implementation returns `true` if `claims.role === 'admin'` and `false` otherwise. This establishes the interface for a future Casbin adoption without requiring policy files at the current scale.

**Thread board**

- Threads belong to one of the fixed categories.
- Thread list shows: category, title, author, reply count, last activity date.
- Thread view shows the original post followed by replies in chronological order.
- No nesting. No pagination in v1 (volume does not warrant it).
- Any authenticated member can create a thread or reply.
- No editing or deletion in v1.

**Email notifications**

- On new thread or reply, the Worker sends an email to all active members via Cloudflare Email Send.
- Email contains: category, thread title, author name, post body (truncated at 500 characters), and a direct link to the thread.
- Sender address is a configured Cloudflare-verified domain address.

**Account management**

- Administrator can view the member list and deactivate accounts.
- Deactivated members cannot log in and are excluded from email notifications.
- No self-service account deletion in v1.

### 5.3. API Layer

Two Cloudflare Workers handle all dynamic behaviour. The auth Worker is internal-only; the API Worker is the public-facing entry point for all requests.

**Auth Worker — internal surface (Service Binding only)**

| Route      | Method | Description                                               |
| :--------- | :----- | :-------------------------------------------------------- |
| `/session` | GET    | Validates session cookie; returns `{userId, username, email, role}` or null |
| `/auth/*`  | ALL    | Better Auth handler — sign-in, sign-out, session management |

**API Worker — public surface**

| Route                       | Method | Auth     | Description                                     |
| :-------------------------- | :----- | :------- | :---------------------------------------------- |
| `/api/widgetdata`           | GET    | None     | Aggregated weather, garbage day, Catfish Creek  |
| `/api/auth/*`               | ALL    | —        | Proxied wholesale to auth Worker                |
| `/api/categories`           | GET    | Required | List all categories                             |
| `/api/threads`              | GET    | Required | List all threads                                |
| `/api/threads`              | POST   | Required | Create a thread                                 |
| `/api/threads/:id`          | GET    | Required | Get a single thread                             |
| `/api/threads/:id`          | PATCH  | Required | Edit a thread                                   |
| `/api/threads/:id`          | DELETE | Required | Delete a thread                                 |
| `/api/threads/:id/posts`    | GET    | Required | List posts for a thread                         |
| `/api/threads/:id/posts`    | POST   | Required | Create a post in a thread                       |
| `/api/posts/:id`            | PATCH  | Required | Edit a post                                     |
| `/api/posts/:id`            | DELETE | Required | Delete a post                                   |
| `/api/members`              | GET    | Admin    | List members                                    |
| `/api/members/:id`          | PATCH  | Admin    | Deactivate / reactivate a member                |

## 6. Non-Functional Requirements

### 6.1. Accessibility

The older demographic is a primary driver of accessibility standards. These are hard requirements:

- Body text minimum 18px.
- Interactive elements minimum 48px touch target height.
- All core flows (login, post, reply) are full pages — no modals or popovers for primary actions.
- High contrast between text and background; no meaning conveyed by colour alone.
- WCAG 2.1 AA as a baseline target.
- CSS over JS for all UI behaviour: animations, transitions, and microinteractions use modern CSS (`@starting-style`, `transition-behavior`, `view-transition-name`, native `dialog`/`popover`). No JavaScript for UI state.

### 6.2. Performance

- Static assets served from Cloudflare edge — target <1s LCP on a 4G connection.
- No render-blocking scripts. All JS is deferred or module-type.
- Widget data fetched client-side after paint from a single aggregated endpoint; each widget degrades independently.

### 6.3. Maintainability

- No CMS. Content is authored in static JSON files and compiled by Gilbert.
- No persistent infrastructure to operate — everything is serverless.
- Auth and API are independently deployable Workers. Each has its own `wrangler.json`, its own migrations directory, and its own D1 database.
- The auth Worker is the only service that touches Better Auth tables. The API Worker is the only service that touches application tables.

## 7. Technology Decisions

### 7.1. Stack Summary

| Concern              | Choice                                              |
| :------------------- | :-------------------------------------------------- |
| Hosting & compute    | Cloudflare Workers + Workers Assets                 |
| Worker communication | Cloudflare Service Bindings (Worker-to-Worker)      |
| Static site compiler | Gilbert                                             |
| API router           | itty-router                                         |
| Authentication       | Better Auth (auth Worker, own D1)                   |
| Application database | Cloudflare D1 — `categories`, `threads`, `posts`    |
| Auth database        | Cloudflare D1 — Better Auth identity tables         |
| Email                | Cloudflare Email Send (public beta)                 |
| CSS framework        | Pico CSS + vanilla CSS                              |
| JavaScript           | Vanilla ESM — no framework, no bundler for frontend |
| Weather API          | Open-Meteo (no key required)                        |
| External feeds       | Catfish Creek Conservation Authority RSS            |

### 7.2. Key Rationale

**Why build the message board rather than buy?**

All evaluated OSS options (Discourse, Flarum) require a persistent server, which is incompatible with the serverless constraint. SaaS embeds introduce third-party data ownership and ongoing pricing risk. Given the minimal requirements — flat threads, four categories, under 20 users — the build effort is estimated at two to three days. Building gives full control over UX, accessibility, and the deployment pipeline.

**Why itty-router over Hono?**

The site author has existing experience with itty-router and prefers it. The API surface is small enough that either would be appropriate.

**Why Pico CSS?**

Classless framework — semantic HTML renders well without class juggling. Strong accessibility baseline. Light/dark theme via CSS custom properties. No build step. Aligns with the CSS-over-JS philosophy.

**Why Better Auth as a separate bounded context?**

The project is a proving ground for a portable identity architecture. A larger DDD project currently uses AWS Cognito for authentication behind an anti-corruption layer, with domain-specific authorisation handled by Casbin. Better Auth as a self-contained Worker with its own D1 mirrors that pattern: it is an opaque external identity service called via Service Binding, exactly as Cognito is called via SDK. Successful implementation here validates the pattern before applying it to a higher-stakes project.

**Why `enforce(claims, object, action)` instead of role checks inline?**

The Casbin `enforce(subject, object, action)` signature is the standard seam for policy-based authorisation. Implementing a minimal version now — one that simply checks `claims.role === 'admin'` — establishes the interface at zero cost. When the larger project's Casbin patterns mature, the swap is a single-file change.

**Why no invite-link registration flow?**

The community has fewer than 20 members. The administrator creating accounts directly in Better Auth and sending a manual email is simpler, more reliable, and eliminates the KV dependency entirely. The complexity of a token-based invite flow is not justified at this scale.

**Why Cloudflare Email Send over a third party?**

Keeps the platform dependency count at one. The community volume (a handful of emails per thread) will never approach any rate limit. No additional billing relationship or API key management required.

## 8. Deferred Work

| Item                           | Trigger to revisit                                                                        |
| :----------------------------- | :---------------------------------------------------------------------------------------- |
| Widget data caching            | Page load times degrade noticeably or upstream sources show rate-limiting behaviour       |
| Snow budget admin UI           | Community requests a way to view running totals without contacting the administrator      |
| Photo gallery / R2             | Scanned photos are collected and volume is known                                          |
| History submission form        | Multiple residents express interest in contributing digitally                             |
| Post editing and deletion      | Members report needing it                                                                 |
| Email opt-out                  | Members complain about notification volume (unlikely at current scale)                    |
| Pagination                     | Thread count grows beyond ~50                                                             |
| Domain member identity / ACL   | A second consuming service needs to reference member identity without coupling to auth    |
| Casbin policy-based authorisation | Admin role check is insufficient; multiple roles or resource-level policies are needed |

[← Back to Explanation](./README.md)
