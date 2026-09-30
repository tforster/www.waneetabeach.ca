# Build Commands <!-- omit in toc -->

A complete reference for all build and development commands available in this project.

## Table of Contents <!-- omit in toc -->

- [1. npm Scripts](#1-npm-scripts)
- [2. devops/build.js](#2-devopsbuildjs)
- [3. devops/config.js](#3-devopsconfigjs)
- [4. devops/dev.js](#4-devopsdevjs)

## 1. npm Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| `npm run build` | `node devops/build.js` | Build the static site to `dist/` |
| `npm run build watch` | `node devops/build.js watch` | Build and watch for changes |
| `npm run dev` | `node devops/dev.js` | Start all services in a Tmux session |
| `npm run dev app` | `node devops/dev.js app` | Start the `app` service only |
| `npm run serve` | `./devops/serve.sh` | Start the auth and API workers under `cf dev` (ports 8788 and 8787) |
| `npm run migrate:local` | `npm run migrate:local -w …` | Apply pending D1 migrations locally for auth, then API |
| `npm run deploy` | `npm run build && npm run deploy -w …` | Build the site, then deploy auth, then API, with `cf deploy` |

Each worker workspace (`workspaces/api`, `workspaces/auth`) has its own scripts. Run them with `npm run <script> -w workspaces/<worker>`:

| Script | Command | Description |
| :--- | :--- | :--- |
| `dev` | `cf dev` | Start the worker with Vite and `@cloudflare/vite-plugin` |
| `deploy` | `cf deploy --mode production` | Build and deploy the worker with production bindings |
| `migrate:local` | `cf d1 migrations apply <id> --local --persist-to .cloudflare/state` | Apply pending D1 migrations to the local database the dev server uses |

See [How to Deploy the Worker Ecosystem](../how-to-guides/deploy-workers.md) for the full workflow.

## 2. devops/build.js

Entry point for the Gilbert build pipeline.

```bash
node --env-file=.env devops/build.js          # Single build
node --env-file=.env devops/build.js watch    # Watch mode
```

Requires `GITHUB_TOKEN` in `.env` for content fetching from GitHub.

## 3. devops/config.js

Generates environment-specific `config.js` files from `config.json` + `.env`.

```bash
node devops/config.js dev         # Generate dev configs for all services
node devops/config.js dev app     # Generate dev config for the app workspace only
node devops/config.js stage       # Set Wrangler secrets for stage
node devops/config.js prod        # Set Wrangler secrets for production
node devops/config.js ports       # Display port assignments
```

## 4. devops/dev.js

Development environment orchestrator.

```bash
node devops/dev.js                # Start full stack in Tmux
node devops/dev.js app            # Start app service in foreground (port 8780)
node devops/dev.js --list         # List available services and ports
node devops/dev.js --help         # Show help
```

[← Back to Reference](./README.md)
