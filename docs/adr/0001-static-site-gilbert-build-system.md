# Static site with Gilbert build system

**Date:** 2026-05-11 **Status:** Accepted

The project needs a simple, low-maintenance website with no backend for the public-facing pages. Decided to use a statically generated site compiled by the Gilbert streams-based build system, with content sourced from a dedicated `content` branch in the GitHub repository.

## Consequences

- No runtime server costs for public pages
- Content editors use Git — no CMS UI required at launch
- Build must be re-triggered to publish content changes
