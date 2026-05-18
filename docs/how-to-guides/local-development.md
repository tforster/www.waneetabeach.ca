# Local Development Setup <!-- omit in toc -->

A practical guide to getting the Waneeta Beach project running on your local workstation.

## Table of Contents <!-- omit in toc -->

- [1. Prerequisites](#1-prerequisites)
- [2. Steps](#2-steps)
- [3. Verification](#3-verification)
- [4. Troubleshooting](#4-troubleshooting)

## 1. Prerequisites

- Node.js v24+ and npm v10+
- Git v2.34+
- A GitHub personal access token with `repo` scope (for content fetching)
- Tmux (optional, for the full development stack)

## 2. Steps

### 2.1 Clone the repository

```bash
git clone git@github.com:TroyForster/waneetabeach.ca.git
cd waneetabeach.ca
```

### 2.2 Install dependencies

```bash
npm install
```

### 2.3 Configure secrets

Copy the environment template and add your `GITHUB_TOKEN`:

```bash
cp .env.example .env
# Edit .env and set GITHUB_TOKEN=<your token>
```

### 2.4 Generate service configuration

```bash
node devops/config.js dev
```

This generates `workspaces/app/src/scripts/config.js` from `config.json`.

### 2.5 Start the development server

```bash
npm run dev app
```

The app is served at <http://localhost:8780>.

## 3. Verification

Navigate to <http://localhost:8780> — you should see the Waneeta Beach home page.

## 4. Troubleshooting

**Missing GITHUB_TOKEN:** Ensure `.env` contains a valid `GITHUB_TOKEN`. The build will fail silently if the token is absent or expired.

**Port already in use:** Edit `config.json` → `environments.dev.app.port` to use a different port, then re-run `node devops/config.js dev`.

[← Back to How-To Guides](./README.md)
