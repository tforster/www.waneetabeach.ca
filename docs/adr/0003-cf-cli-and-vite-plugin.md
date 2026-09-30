# cf CLI and Vite plugin for the Workers

**Date:** 2026-09-30 **Status:** Accepted

Cloudflare launched the `cf` CLI in open beta on 2026-09-28. It covers the whole Cloudflare API and replaces Wrangler's build, dev and deploy commands with a pluggable dev server: `@cloudflare/vite-plugin` (recommended) or Wrangler (labelled legacy). Decided to move the `api` and `auth` Workers to `cf` with the Vite plugin, and remove Wrangler from the project entirely.

This is a deliberate early adoption. Vite adds nothing this project needs — Gilbert builds the front end, and the Workers bundle fine with esbuild — but this repo is the sandbox for tracking where Cloudflare's tooling is heading. Critical projects stay on Wrangler until `cf` and the Vite plugin leave beta.

## Consequences

- Worker settings and bindings live in `cloudflare.config.ts`; `wrangler.json` is gone. The former Wrangler `production` environment is selected with `--mode production`, which the `deploy` scripts pass. `cf` only discovers the `.ts` file name, which is acceptable for configuration (application code stays JavaScript)
- Each worker workspace declares `cf`, `vite` and `@cloudflare/vite-plugin` in its own `package.json`. `cf` does not resolve packages hoisted to the root `node_modules`
- `node_modules` is about 45 MB larger than with `cf` on Wrangler (537 MB vs 492 MB); Vite itself, with Rolldown and Lightning CSS, accounts for about 37 MB
- `cf d1` commands accept database IDs only, so local development uses fixed placeholder UUIDs, and local commands need `--persist-to .cloudflare/state` to reach the dev server's state
- Vite's host check blocks service-binding requests to placeholder hosts; `auth-service` is on the auth worker's `allowedHosts`
- Breakpoint debugging is unchanged: the inspector ports and `.vscode/launch.json` attach configurations work as before
- Deployment commands are documented in [How to Deploy the Worker Ecosystem](../how-to-guides/deploy-workers.md)

## Upkeep

The Vite plugin beta pins an older `miniflare` than `cf` does, which installs a second ~130 MB copy of workerd. The root `package.json` `overrides` pin `miniflare` and `workerd` to the versions `cf` uses. Whenever `cf` or `@cloudflare/vite-plugin` is upgraded:

1. Read `cf`'s pinned versions with `npm view cf@<version> dependencies.miniflare`, then `npm view miniflare@<that version> dependencies.workerd`
2. Update both `overrides` entries to match
3. Delete `node_modules/@cloudflare/vite-plugin/node_modules` and any `package-lock.json` entries beneath it, then run `npm install`
4. Check `npm ls workerd` shows a single version, then run `npm run serve` and the local verification in the deploy guide

Remove the overrides once the plugin and `cf` agree on a `miniflare` version.
