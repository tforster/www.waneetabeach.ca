# How to Deploy the Worker Ecosystem <!-- omit in toc -->

Deploy and run the Waneeta Beach Cloudflare Worker ecosystem — including applying database migrations and starting or deploying each worker in dependency order.

This guide covers both local development and remote (production) deployment. It is updated as new workers are introduced; each section is clearly marked with the worker it covers.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Ecosystem Overview](#2-ecosystem-overview)
- [3. Local Deployment](#3-local-deployment)
  - [3.1 Auth Worker](#31-auth-worker)
  - [3.2 API Worker](#32-api-worker)
  - [3.3 Seed the First Admin User](#33-seed-the-first-admin-user)
- [4. Remote Deployment](#4-remote-deployment)
  - [4.1 Auth Worker](#41-auth-worker)
  - [4.2 API Worker](#42-api-worker)
    - [Set up email sending (first-time only)](#set-up-email-sending-first-time-only)
    - [First-time setup](#first-time-setup-1)
    - [Apply migrations](#apply-migrations-1)
    - [Deploy the worker](#deploy-the-worker-1)
  - [4.3 Seed the First Admin User](#43-seed-the-first-admin-user)
- [5. Verification](#5-verification)
- [6. Troubleshooting](#6-troubleshooting)

## 1. Prerequisites

- Node.js v24+ and npm v10+
- Dependencies installed (`npm install` from the project root)
- Wrangler authenticated with `npx wrangler login` — remote steps only

## 2. Ecosystem Overview

The ecosystem is composed of multiple Cloudflare Workers. Workers with database dependencies must have their migrations applied before they are started or deployed. Workers that depend on other workers via Service Bindings must be deployed after their dependencies.

Current deployment order:

| Order | Worker | Config | Database | Depends on |
| :---: | :--- | :--- | :--- | :--- |
| 1 | Auth | `workspaces/auth/wrangler.json` | `AUTH_DB` (D1) | — |
| 2 | API  | `workspaces/api/wrangler.json`  | `DB` (D1)      | Auth (`AUTH_SERVICE`), Email Service (`EMAIL`) |

As subsequent workers are added (e.g. App) they will appear in this table with their dependencies noted.

## 3. Local Deployment

All commands in this guide are run from the **project root**. The `--config` flag tells Wrangler where to find each worker's config, and Wrangler resolves all paths within that config (migrations, entry point) relative to the config file's directory — not the working directory.

Local deployment uses Wrangler's built-in D1 simulator. No Cloudflare account is required.

### 3.1 Auth Worker

The auth worker runs on port 8788, leaving 8787 for the API worker which is the public entry point.

**Apply migrations:**

```bash
npx wrangler d1 migrations apply waneetabeach-auth \
  --local \
  --config workspaces/auth/wrangler.json
```

**Start the worker:**

```bash
npx wrangler dev --config workspaces/auth/wrangler.json --port 8788
```

The auth worker is available internally at <http://localhost:8788>. It is not the public entry point — all browser traffic enters via the API worker.

### 3.2 API Worker

**Apply migrations:**

```bash
npx wrangler d1 migrations apply waneetabeach \
  --local \
  --config workspaces/api/wrangler.json
```

**Start the worker:**

```bash
npx wrangler dev --config workspaces/api/wrangler.json
```

The API worker is available at <http://localhost:8787>.

**Email sending in local development:**

By default, `wrangler dev` simulates the `EMAIL` binding locally. Calls to `env.EMAIL.send()` do **not** send real emails — instead, Wrangler logs the email content to the console and writes text and HTML bodies to temporary files for inspection.

To send real emails during local development (for example, to end-to-end test a notification flow), add `"remote": true` to the `send_email` binding in `workspaces/api/wrangler.json`:

```json
"send_email": [
  {
    "name": "EMAIL",
    "allowed_sender_addresses": ["no-reply@waneetabeach.ca"],
    "remote": true
  }
]
```

Remove `"remote": true` before committing — it is a local-only override and has no effect in deployed Workers, but leaving it committed causes confusion about intent.

### 3.3 Seed the First Admin User

Better Auth's admin plugin requires an existing admin to grant admin privileges via its API, so the first admin cannot be created through the API alone. The solution is to register normally — letting Better Auth handle password hashing — then promote the user to admin directly via SQL.

Both workers must be running (sections 3.1 and 3.2) before executing step 1. Admin sign-up goes through the API worker, which proxies to the auth worker. The auth worker has no public URL.

**Step 1 — Register the user:**

```bash
curl -s -X POST http://localhost:8787/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"<password>"}'
```

**Step 2 — Promote to admin:**

```bash
npx wrangler d1 execute waneetabeach-auth \
  --local \
  --config workspaces/auth/wrangler.json \
  --command "UPDATE \"user\" SET role = 'admin' WHERE email = 'admin@example.com'"
```

## 4. Remote Deployment

Remote deployment publishes workers to Cloudflare and applies migrations to live D1 databases. Follow the steps in the same order as the ecosystem table in section 2.

### 4.1 Auth Worker

#### First-time setup

Create the D1 database:

```bash
npx wrangler d1 create waneetabeach-auth
```

Copy the `database_id` from the output and update `workspaces/auth/wrangler.json`:

```json
{
  "d1_databases": [
    {
      "binding": "AUTH_DB",
      "database_name": "waneetabeach-auth",
      "database_id": "<paste-id-here>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Commit the updated `wrangler.json` so all contributors share the same database ID.

#### Apply migrations

```bash
npx wrangler d1 migrations apply waneetabeach-auth \
  --remote \
  --config workspaces/auth/wrangler.json
```

#### Deploy the worker

```bash
npx wrangler deploy --config workspaces/auth/wrangler.json
```

#### Set the BASE_URL and AUTH_SECRET secrets

Better Auth uses `BASE_URL` to construct callback and redirect URLs. Set it to the API worker's public origin — not the auth worker's, since the auth worker has no public URL:

```bash
npx wrangler secret put BASE_URL --config workspaces/auth/wrangler.json
```

Wrangler will prompt for the value. Enter the API worker's public URL (e.g. `https://waneetabeach-ca.your-subdomain.workers.dev`).

Also set the auth secret, used by Better Auth to sign sessions and tokens:

```bash
npx wrangler secret put AUTH_SECRET --config workspaces/auth/wrangler.json
```

Use a strong random value of at least 32 characters. Secrets take precedence over the `vars` block in `wrangler.json`, which is local dev only.

### 4.2 API Worker

#### Set up email sending (first-time only)

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

#### First-time setup

Create the D1 database:

```bash
npx wrangler d1 create waneetabeach
```

Copy the `database_id` from the output and update `workspaces/api/wrangler.json`:

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "waneetabeach",
      "database_id": "<paste-id-here>",
      "migrations_dir": "migrations"
    }
  ]
}
```

Commit the updated `wrangler.json`.

#### Apply migrations

```bash
npx wrangler d1 migrations apply waneetabeach \
  --remote \
  --config workspaces/api/wrangler.json
```

#### Deploy the worker

```bash
npx wrangler deploy --config workspaces/api/wrangler.json
```

### 4.3 Seed the First Admin User

Both workers must be deployed before seeding. Sign-up goes through the API worker's public URL — the auth worker has no public URL in production.

**Step 1 — Register the user:**

```bash
curl -s -X POST https://<your-api-worker-url>/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"<password>"}'
```

**Step 2 — Promote to admin:**

```bash
npx wrangler d1 execute waneetabeach-auth \
  --remote \
  --config workspaces/auth/wrangler.json \
  --command "UPDATE \"user\" SET role = 'admin' WHERE email = 'admin@example.com'"
```

## 5. Verification

### 5.1 Local

Confirm the auth schema was applied:

```bash
npx wrangler d1 execute waneetabeach-auth \
  --local \
  --config workspaces/auth/wrangler.json \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Expected tables: `account`, `session`, `user`, `verification`.

Confirm the API worker is responding and auth proxying works:

```bash
curl http://localhost:8787/api/health
curl http://localhost:8787/api/auth/session
```

Expected responses: `{ "status": "ok" }` and `401 Unauthorized`.

### 5.2 Remote

Confirm auth schema:

```bash
npx wrangler d1 execute waneetabeach-auth \
  --remote \
  --config workspaces/auth/wrangler.json \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

Confirm the API worker is live:

```bash
curl https://<your-api-worker-url>/api/health
curl https://<your-api-worker-url>/api/auth/session
```

Expected responses are the same as local.

## 6. Troubleshooting

**`database_id` is still `local-dev-placeholder`:** Remote commands will fail. Follow the first-time setup in the relevant section to create the database and update the config.

**Migration already applied:** Wrangler tracks applied migrations in a `d1_migrations` table and skips files that have already run. Re-running the apply command is safe.

**Port conflict on 8787:** The auth worker defaults to port 8787. Always start it with `--port 8788` as shown in section 3.1, or both workers will fail to bind.

**`wrangler: command not found`:** Wrangler is a project dev dependency. Run `npm install` from the project root and retry.

**`E_SENDER_DOMAIN_NOT_AVAILABLE` in worker logs:** The `waneetabeach.ca` domain has not been onboarded with Cloudflare Email Service. Follow the "Set up email sending" steps in section 4.2. Until the domain is onboarded, notification emails are silently dropped (the error is caught and logged, thread and post creation still succeed).

**`E_RATE_LIMIT_EXCEEDED` or `E_DAILY_LIMIT_EXCEEDED` in worker logs:** The account has hit Cloudflare Email Service sending quotas. Notifications are dropped for the affected requests. Contact Cloudflare to request a limit increase if this occurs in normal operation.

[← Back to How-To Guides](./README.md)
