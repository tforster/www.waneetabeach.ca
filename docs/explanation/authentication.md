# Authentication Architecture <!-- omit in toc -->

How authentication works in waneetabeach.ca — why Better Auth was chosen, how it integrates with Cloudflare D1, and what the session lifecycle looks like.

## Table of Contents <!-- omit in toc -->

- [1. Background](#1-background)
- [2. How it works](#2-how-it-works)
- [3. Design decisions](#3-design-decisions)
- [4. Further reading](#4-further-reading)

## 1. Background

The members portal requires authentication. The community is small (<20 households), message volume is low, and many members are older with limited digital experience. The auth system needs to be invisible when it works and clear when it doesn't — no OAuth flows, no "sign in with Google", just email and password.

## 2. How it works

### Request flow

```text
Request
  │
  ├─ /api/health              → public, no auth check
  ├─ /api/auth/*              → delegated to Better Auth handler
  ├─ /api/invites/validate    → public (token is the credential)
  ├─ /api/invites/register    → public (token is the credential)
  ├─ /api/invites             POST, requireSession + requireAdmin
  ├─ /portal*                 → requireSession → redirect /login if no session
  └─ /api/*                   → requireSession → 401 JSON if no session
```

### Session middleware

`requireSession` in `workspaces/api/src/auth.js` runs before any protected route handler. It calls `auth.api.getSession()` which reads the session token from the request cookie and validates it against the `session` table in D1. If no valid session is found:

- Portal routes (`/portal*`) redirect to `/login` with a 302.
- API routes (`/api/*`) return `{"error":"Unauthorized"}` with a 401.

### Login flow

1. Member POSTs credentials to `/api/auth/sign-in/email`.
2. Better Auth validates against the `account` table (hashed password).
3. On success, Better Auth creates a row in `session` and sets a `Set-Cookie` header.
4. The Worker redirects the member to `/portal`.

### Logout flow

1. Member POSTs to `/api/auth/sign-out`.
2. Better Auth deletes the session row from D1 and clears the cookie.
3. The Worker redirects to `/`.

### Invite-link registration

1. Admin POSTs to `/api/invites` (requires `role: 'admin'` session).
2. Worker calls `generateInviteToken(env)` which stores `{createdAt}` in the `INVITES` KV namespace with a 24-hour TTL and returns a UUID token.
3. Worker returns `{inviteUrl: "https://waneetabeach.ca/register?token=<uuid>"}`. Admin sends this URL to the new member.
4. Member opens the URL. The static `/register` page uses JS to call `GET /api/invites/validate?token=<token>`. Valid token → form shown. Invalid/expired → error message shown.
5. Member submits the form. JS POSTs `{token, name, email, password}` to `POST /api/invites/register`.
6. Worker validates token, calls `auth.api.createUser`, then calls `consumeInviteToken` to delete it from KV.
7. Member is redirected to `/login`.

Tokens are single-use and expire automatically via KV TTL after 24 hours.

## 3. Design decisions

### Why Better Auth over rolling our own

Session management, secure password hashing, and cookie handling have well-known failure modes. Better Auth is a maintained library that handles all of these correctly. This project is intentionally a low-stakes proving ground for Better Auth before adopting it on larger projects.

### Why D1 directly — no Kysely or Drizzle

Better Auth ships a built-in `D1SqliteDialect` inside `@better-auth/kysely-adapter`. It detects a D1 binding by checking for `batch`, `exec`, and `prepare` on the object. Passing `env.DB` directly to `betterAuth({ database: env.DB })` works without any additional adapter packages.

### Why `active` is on the `user` table, not a separate `members` table

Better Auth supports `user.additionalFields`. Adding `active` there keeps identity and activation state together, avoids a join on every session check, and avoids a parallel `members` table that would duplicate Better Auth's user data.

### Why `createAuth(env)` is called per-request

Cloudflare Workers receive a fresh `env` binding per invocation. Better Auth must be initialised with the D1 binding from that specific invocation's `env`. A module-level singleton would capture a stale binding.

## 4. Further reading

- [Better Auth documentation](https://www.better-auth.com/docs)
- [Database Schema Reference](../reference/database-schema.md)
- [PRD §5.2 — Members Portal functional requirements](./prd.md#52-members-portal)

[← Back to Explanation](./README.md)
