# Directory Structure <!-- omit in toc -->

A reference map of every significant folder and file in the `www.waneetabeach.ca` repository.

## Table of Contents <!-- omit in toc -->

- [1. Root](#1-root)
- [2. devops/](#2-devops)
- [3. workspaces/app/](#3-workspacesapp)
- [4. docs/](#4-docs)

## 1. Root

| Path | Purpose |
| :--- | :--- |
| `package.json` | Root workspace manifest; declares npm workspaces and shared devDependencies |
| `wrangler.json` | Cloudflare Worker configuration — entry point, D1 binding, Workers Assets |
| `eslint.config.js` | Flat ESLint configuration (JS, HTML, CSS, JSON, YAML, Markdown) |
| `.gitignore` | Git ignore rules |

## 2. devops/

| Path | Purpose |
| :--- | :--- |
| `devops/build.js` | Root build orchestrator — image optimisation then Gilbert static site compile |
| `devops/serve.sh` | Development convenience script — runs `wrangler dev` |

## 3. migrations/

| Path | Purpose |
| :--- | :--- |
| `migrations/0001_schema.sql` | Creates `categories`, `threads`, `posts` tables |
| `migrations/0002_seed_categories.sql` | Seeds the four fixed categories |
| `migrations/0003_better_auth.sql` | Better Auth identity tables |
| `migrations/0004_admin_plugin.sql` | Admin plugin columns (`role`, `banned`, `impersonatedBy`) |

## 4. tests/

| Path | Purpose |
| :--- | :--- |
| `tests/build.test.js` | Build output tests — HTML structure, CSS tokens, image presence |
| `tests/worker.test.js` | Worker route tests — health check, 404, auth middleware, Better Auth routing |
| `tests/migrations.test.js` | Schema and seed data tests via `node:sqlite` |

## 5. workspaces/app/

| Path | Purpose |
| :--- | :--- |
| `src/cms/` | JSON content files consumed by Gilbert |
| `src/files/` | Source media assets (original, unoptimised) |
| `src/scripts/main.js` | Browser entry point — DOM initialisation |
| `src/stylesheets/main.css` | Lake Erie Shore design system — tokens, Pico CSS overrides, components |
| `src/templates/components/head.hbs` | `<head>` partial — fonts, Pico CSS, main.css |
| `src/templates/components/header.hbs` | Site header with glassmorphism nav |
| `src/templates/components/footer.hbs` | Site footer with nav and script tag |
| `src/templates/home.hbs` | Home page — hero, speed limit notice, card grid |
| `src/templates/login.hbs` | Member login page |
| `src/templates/register.hbs` | Invite-link registration page |
| `src/templates/404.hbs` | 404 error page |
| `dist/` | Gilbert build output — served by the Worker via Workers Assets |
| `devops/build.js` | Gilbert compile script (run from within this workspace) |

## 6. workspaces/api/

| Path | Purpose |
| :--- | :--- |
| `src/worker.js` | Cloudflare Worker entry point — itty-router, all API routes |
| `src/auth.js` | Better Auth instance factory, `requireSession`, and `requireAdmin` middleware |
| `src/invites.js` | Invite token generation, validation, and consumption (pure KV operations) |

## 7. docs/

| Path | Purpose |
| :--- | :--- |
| `docs/tutorial/` | Learning-oriented guides |
| `docs/how-to-guides/` | Task-oriented guides |
| `docs/reference/` | Technical reference (this folder) |
| `docs/explanation/` | Architecture and design decisions |
| `docs/images/` | Screenshots and diagrams |

[← Back to Reference](./README.md)
