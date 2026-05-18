# www.waneetabeach.ca <!-- omit in toc -->

![Waneeta Beach Sign](workspaces/app/src/files/waneeta-beach-entrance-signx800.jpg)

Waneeta Beach — community website and private members message board.

## Table of Contents <!-- omit in toc -->

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installing dependencies](#installing-dependencies)
  - [Configuration](#configuration)
- [Usage](#usage)
- [Running tests](#running-tests)
- [High Level Architecture Overview](#high-level-architecture-overview)
- [Policies and Procedures](#policies-and-procedures)
- [Author](#author)
- [License](#license)

## Getting Started

These instructions will give you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js v24+](https://nodejs.org/) and npm v10+
- [Cloudflare Wrangler](https://github.com/cloudflare/workers-sdk) — installed as a project
  devDependency via `npm install`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — required for running
  PlantUML and other utilities
- [Git v2.34+](https://git-scm.com/)
- A `GITHUB_TOKEN` environment variable set in `.env` (required for Gilbert content fetching)

### Installing dependencies

1. Clone the repository

   ```bash git clone git@github.com:TroyForster/waneetabeach.ca.git ```

2. `cd` into the new directory and install all dependencies

   ```bash npm install ```

3. Copy the environment template and fill in your secrets

   ```bash cp .env.example .env ```

4. Generate service configuration files for local development

   ```bash node devops/config.js dev ```

### Configuration

Environment configuration is generated — not static. Run `node devops/config.js dev` to produce `workspaces/app/src/scripts/config.js` from `config.json` and `.env`. See [docs/reference/build-commands.md](docs/reference/build-commands.md) for full details.

## Usage

Several npm scripts are provided for common tasks:

- `npm run build` — Build the static site into `dist/`
- `npm run serve` — Start the full development stack
- `npm run dev app` — Start only the `app` service in the foreground
- `npm test` — Run all tests

## Running tests

```bash
# Node.js unit tests
node --test

# Playwright browser tests
npx playwright test
```

## High Level Architecture Overview

See [docs/explanation/](docs/explanation/) for architecture documentation.

## Policies and Procedures

- [CONTRIBUTING.md](CONTRIBUTING.md) — code of conduct and pull-request process
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — contributor expectations
- [CHANGELOG.md](CHANGELOG.md) — version history

## Author

Troy Forster

## License

This project is private and unlicensed.
