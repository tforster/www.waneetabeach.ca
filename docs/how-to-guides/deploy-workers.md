# How to Deploy the Worker Ecosystem <!-- omit in toc -->

Deploy and run the Waneeta Beach Cloudflare Worker ecosystem — including applying database migrations and starting or deploying each worker in dependency order.

This guide covers both local development and remote (production) deployment. It is updated as new workers are introduced; each section is clearly marked with the worker it covers. Workers are built and run with the `cf` CLI and Vite — see [ADR 0003](../adr/0003-cf-cli-and-vite-plugin.md) for why.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Ecosystem Overview](#2-ecosystem-overview)
- [3. Local Deployment](#3-local-deployment)
  - [3.1. Apply Migrations](#31-apply-migrations)
  - [3.2. Start Both Workers](#32-start-both-workers)
  - [3.3. Seed the First Admin User](#33-seed-the-first-admin-user)
- [4. Remote Deployment](#4-remote-deployment)
  - [4.1. Auth Worker](#41-auth-worker)
    - [4.1.1. First-time Setup](#411-first-time-setup)
    - [4.1.2. Apply Migrations](#412-apply-migrations)
    - [4.1.3. Deploy the Worker](#413-deploy-the-worker)
    - [4.1.4. Set the AUTH_SECRET Secret](#414-set-the-auth_secret-secret)
  - [4.2. API Worker](#42-api-worker)
    - [4.2.1. Set up Email Sending (first-time only)](#421-set-up-email-sending-first-time-only)
    - [4.2.2. First-time Setup](#422-first-time-setup)
    - [4.2.3. Apply Migrations](#423-apply-migrations)
    - [4.2.4. Deploy the Worker](#424-deploy-the-worker)
  - [4.3. Seed the First Admin User](#43-seed-the-first-admin-user)
- [5. Verification](#5-verification)
  - [5.1. Local](#51-local)
  - [5.2. Remote](#52-remote)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Prerequisites

- Node.js v24+ and npm v10+
- Dependencies installed (`npm install` from the project root) — this installs `cf`, Vite and `@cloudflare/vite-plugin` into each worker workspace
- `cf` authenticated with `npx cf auth login` — remote steps only. If `CLOUDFLARE_API_TOKEN` is set in your shell it takes precedence over the OAuth login

## 2. Ecosystem Overview

The ecosystem is composed of multiple Cloudflare Workers. Workers with database dependencies must have their migrations applied before they are started or deployed. Workers that depend on other workers via Service Bindings must be deployed after their dependencies.

Current deployment order:

| Order | Worker | Config | Database | Depends on |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Auth | `workspaces/auth/cloudflare.config.ts` | `AUTH_DB` (D1) | — |
| 2 | API  | `workspaces/api/cloudflare.config.ts`  | `DB` (D1)      | Auth (`AUTH_SERVICE`), Email Service (`EMAIL`) |

Each worker workspace also has a `vite.config.js` that fixes its dev and inspector ports, and a `package.json` with `dev`, `deploy` and `migrate:local` scripts.

As subsequent workers are added (e.g. App) they will appear in this table with their dependencies noted.

## 3. Local Deployment

All commands in this guide are run from the **project root**. `cf` commands that operate on a single worker must run from that worker's directory, so the guide uses `npm run <script> -w workspaces/<worker>` or `cd` into the workspace.

Local deployment uses Miniflare's built-in D1 simulator. No Cloudflare account is required. Local state lives in each workspace's `.cloudflare/state/` folder, which is gitignored.

### 3.1. Apply Migrations

```bash
npm run migrate:local
```

This applies pending migrations for the auth worker, then the API worker. The local database IDs in `cloudflare.config.ts` are fixed placeholder UUIDs (`…0001` for API, `…0002` for auth) because `cf d1` commands only accept database IDs, not names.

> [!IMPORTANT]
> `cf d1` commands default to a global state folder (`~/.config/cloudflare/state`), but the Vite dev server reads `.cloudflare/state/` inside the workspace. Always pass `--persist-to .cloudflare/state` to local `cf d1` commands, as the `migrate:local` scripts do, or the dev server will not see your changes.

### 3.2. Start Both Workers

```bash
npm run serve
```

This runs `devops/serve.sh`, which starts both workers with `cf dev`. `Ctrl-C` stops both.

| Worker | URL | Inspector |
| :--- | :--- | :--- |
| Auth | <http://localhost:8788> | `9229` |
| API | <http://localhost:8787> | `9230` |

The API worker is the public entry point. The auth worker is internal — all browser traffic enters via the API worker. To attach the VS Code debugger, run the **Debug: Auth + API Workers** compound launch configuration once both workers are running.

To start a single worker instead, run `npm run dev -w workspaces/auth` or `npm run dev -w workspaces/api`.

**Email sending in local development:**

By default, `cf dev` simulates the `EMAIL` binding locally. Calls to `env.EMAIL.send()` do **not** send real emails.

To send real emails during local development (for example, to end-to-end test a notification flow), add `dev: { remote: true }` to the `EMAIL` binding in `workspaces/api/cloudflare.config.ts`:

```ts
EMAIL: bindings.sendEmail({
  allowedSenderAddresses: ["no-reply@waneetabeach.ca"],
  dev: { remote: true },
}),
```

Remove `dev: { remote: true }` before committing — it is a local-only override and has no effect in deployed Workers, but leaving it committed causes confusion about intent.

### 3.3. Seed the First Admin User

Better Auth's admin plugin requires an existing admin to grant admin privileges via its API, so the first admin cannot be created through the API alone. The solution is to register normally — letting Better Auth handle password hashing — then promote the user to admin directly via SQL.

Both workers must be running (section 3.2) before executing step 1. Admin sign-up goes through the API worker, which proxies to the auth worker.

**Step 1 — Register the user:**

```bash
curl -s -X POST http://localhost:8787/api/auth/sign-up/email \
  -H "Origin: http://localhost:8787" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"<password>"}'
```

**Step 2 — Promote to admin:**

```bash
cd workspaces/auth
npx cf d1 raw 00000000-0000-4000-8000-000000000002 --local --persist-to .cloudflare/state \
  --sql "UPDATE \"user\" SET role = 'admin' WHERE email = 'admin@example.com'"
```

Use `cf d1 raw` for local SQL — `cf d1 query` has no local equivalent.

## 4. Remote Deployment

Remote deployment publishes workers to Cloudflare and applies migrations to live D1 databases. Follow the steps in the same order as the ecosystem table in section 2.

Production settings are selected with `cf`'s `--mode production` flag, which each workspace's `deploy` script passes. In `cloudflare.config.ts`, `ctx.mode === "production"` switches the D1 database IDs and, for the auth worker, `BASE_URL` to `https://waneetabeach.ca`. Every other mode — including `cf dev` — uses the local settings.

`npm run deploy` builds the static site and deploys auth then API in one step.

### 4.1. Auth Worker

#### 4.1.1. First-time Setup

Create the D1 database:

```bash
npx cf d1 create --name waneetabeach-auth
```

The production database already exists. When recreating it, copy the database `uuid` from the output into the production branch of the `id` in `workspaces/auth/cloudflare.config.ts`:

```ts
AUTH_DB: bindings.d1({
  name: "waneetabeach-auth",
  id: isProduction ? "<paste-id-here>" : "00000000-0000-4000-8000-000000000002",
}),
```

Commit the updated files so all contributors share the same database ID.

#### 4.1.2. Apply Migrations

```bash
cd workspaces/auth
npx cf d1 migrations apply 493bbb5a-9da4-4baa-bf8f-09c037902386
```

#### 4.1.3. Deploy the Worker

```bash
npm run deploy -w workspaces/auth
```

#### 4.1.4. Set the AUTH_SECRET Secret

Better Auth uses `BASE_URL` to construct callback and redirect URLs. It is the API worker's public origin — not the auth worker's, since the auth worker has no public URL — and is set per mode in `cloudflare.config.ts`, so it needs no secret.

Set the auth secret, used by Better Auth to sign sessions and tokens. Use a strong random value of at least 32 characters. Reading it into a variable keeps it out of your shell history:

```bash
npx cf workers secrets update AUTH_SECRET --worker waneetabeach-auth --type secret_text
```


### 4.2. API Worker

#### 4.2.1. Set up Email Sending (first-time only)

The API worker sends member notifications via Cloudflare Email Service. Before deploying for the first time, the sending domain must be onboarded in the Cloudflare dashboard.

1. In the Cloudflare dashboard, go to **Email Sending** → [open Email Sending ↗](https://dash.cloudflare.com/?to=/:account/email-service/sending).
2. Select **Onboard Domain** and choose `waneetabeach.ca`.
3. Select **Add records and onboard**. Cloudflare adds the following DNS records automatically:
   - MX records on `cf-bounce.waneetabeach.ca` for bounce handling
   - TXT record for SPF
   - TXT record for DKIM
   - TXT record for DMARC on `_dmarc.waneetabeach.ca`
4. Wait for DNS propagation (typically 5–15 minutes on Cloudflare DNS).

This step is only required once. Subsequent deploys do not repeat it.

#### 4.2.2. First-time Setup

Create the D1 database:

```bash
npx cf d1 create --name waneetabeach
```

The production database already exists. When recreating it, copy the database `uuid` from the output into the production branch of the `id` in `workspaces/api/cloudflare.config.ts`:

```ts
DB: bindings.d1({
  name: "waneetabeach",
  id: isProduction ? "<paste-id-here>" : "00000000-0000-4000-8000-000000000001",
}),
```

Commit the updated files.

#### 4.2.3. Apply Migrations

```bash
cd workspaces/api
npx cf d1 migrations apply 380ecce7-af1b-423d-b092-02b21c8f51f8
```

#### 4.2.4. Deploy the Worker

The API worker serves the Gilbert-built site from `workspaces/app/dist/` as Worker assets, so build the site first:

```bash
npm run build
npm run deploy -w workspaces/api
```

### 4.3. Seed the First Admin User

Both workers must be deployed before seeding. Sign-up goes through the API worker's public URL — the auth worker has no public URL in production.

**Step 1 — Register the user:**

```bash
curl -s -X POST https://waneetabeach.ca/api/auth/sign-up/email \
  -H "Origin: https://waneetabeach.ca" \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"troy.forster@gmail.com","password":"<password>"}'
```

**Step 2 — Promote to admin:**

```bash
npx cf d1 query 493bbb5a-9da4-4baa-bf8f-09c037902386 \
  --sql "UPDATE \"user\" SET role = 'admin' WHERE email = 'troy.forster@gmail.com'"
```

**Step 3 — Verify:**

```bash
npx cf d1 query 493bbb5a-9da4-4baa-bf8f-09c037902386 --sql "SELECT email, role FROM \"user\""
```

## 5. Verification

### 5.1. Local

Confirm the auth schema was applied:

```bash
cd workspaces/auth
npx cf d1 raw 00000000-0000-4000-8000-000000000002 --local --persist-to .cloudflare/state \
  --sql "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected tables include `account`, `session`, `user`, `verification`.

Confirm the API worker is responding and auth proxying works:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/auth/session
```

Expected responses: `{ "status": "ok" }` and `401 Unauthorized`.

### 5.2. Remote

Confirm auth schema:

```bash
npx cf d1 query 493bbb5a-9da4-4baa-bf8f-09c037902386 \
  --sql "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Confirm the API worker is live:

```bash
curl https://waneetabeach.ca/api/health
curl https://waneetabeach.ca/api/auth/session
```

Expected responses are the same as local.

## 6. Troubleshooting

**`Expected a D1 database ID`:** `cf d1` commands do not accept database names or binding names. Pass the UUID from `cloudflare.config.ts`.

**Dev server reports `no such table`:** Migrations were applied to the global `~/.config/cloudflare/state` instead of the workspace. Re-run `npm run migrate:local`, which passes `--persist-to .cloudflare/state`.

**`Blocked request. This host is not allowed` in worker logs:** Vite rejects requests whose `Host` header is not on its allow-list. The API worker calls the auth worker via the placeholder host `auth-service`, which is allowed in `workspaces/auth/vite.config.js`. Add any new placeholder host there.

**Port conflict on 8787, 8788, 9229 or 9230:** Ports are fixed with `strictPort` in each `vite.config.js`, so a clash fails fast instead of silently moving. Usually an orphaned Vite or workerd process from an earlier run holds the port — find it with `ss -ltnp | grep 878` and stop it.

**`wrangler is declared … but is not installed` or `A project must declare exactly one of the following`:** `cf` looks for its dev server package in the worker workspace's own `package.json`. Each worker must declare `@cloudflare/vite-plugin` and must not also declare `wrangler`.

**`CLOUDFLARE_API_TOKEN` is set and takes precedence:** `cf` uses an API token from the environment before the OAuth login. Unset it, or make sure it is valid.

**Migration already applied:** `cf` tracks applied migrations in a `d1_migrations` table (wire-compatible with Wrangler) and skips files that have already run. Re-running the apply command is safe.

**`E_SENDER_DOMAIN_NOT_AVAILABLE` in worker logs:** The `waneetabeach.ca` domain has not been onboarded with Cloudflare Email Service. Follow the steps in section 4.2.1. Until the domain is onboarded, notification emails are silently dropped (the error is caught and logged, thread and post creation still succeed).

**`E_RATE_LIMIT_EXCEEDED` or `E_DAILY_LIMIT_EXCEEDED` in worker logs:** The account has hit Cloudflare Email Service sending quotas. Notifications are dropped for the affected requests. Contact Cloudflare to request a limit increase if this occurs in normal operation.

[← Back to How-To Guides](./README.md)
