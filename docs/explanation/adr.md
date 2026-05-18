# Architecture Decision Records <!-- omit in toc -->

A log of significant architectural decisions made during the development of Waneeta Beach, including the context, options considered, and the decision taken.

## Table of Contents <!-- omit in toc -->

- [ADR-001: Static site with Gilbert build system](#adr-001-static-site-with-gilbert-build-system)
- [ADR-002: Cloudflare Pages for hosting](#adr-002-cloudflare-pages-for-hosting)

## ADR-001: Static site with Gilbert build system

**Date:** 2026-05-11 **Status:** Accepted

### Context

The project needs a simple, low-maintenance website with no backend for the public-facing pages.

### Decision

Use a statically generated site compiled by the Gilbert streams-based build system, with content sourced from a dedicated `content` branch in the GitHub repository.

### Consequences

- No runtime server costs for public pages
- Content editors use Git — no CMS UI required at launch
- Build must be re-triggered to publish content changes

## ADR-002: Cloudflare Pages for hosting

**Date:** 2026-05-11 **Status:** Accepted

### Context

The project needs reliable, low-cost global hosting suitable for a small community association.

### Decision

Deploy to Cloudflare Pages. Static assets are served from the global Cloudflare CDN with a generous free tier.

### Consequences

- Zero server management
- Automatic HTTPS and custom domain support
- Workers can be added later for the members message board API

[← Back to Explanation](./README.md)
