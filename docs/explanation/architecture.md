# Architecture Overview <!-- omit in toc -->

An explanation of the technology choices, build pipeline, and deployment architecture for the Waneeta Beach project.

## Table of Contents <!-- omit in toc -->

- [1. Goals](#1-goals)
- [2. Technology Choices](#2-technology-choices)
- [3. Build Pipeline](#3-build-pipeline)

## 1. Goals

- Simple, fast, publicly accessible community website at `www.waneetabeach.ca`
- Private members-only message board for residents and property owners
- Minimal operational overhead — no servers to manage
- Low cost for a non-commercial community association

## 2. Technology Choices

| Concern            | Choice                      | Rationale                                  |
| :----------------- | :-------------------------- | :----------------------------------------- |
| Hosting            | Cloudflare Pages/Workers    | Global CDN, generous free tier, no servers |
| Build system       | Gilbert (streams-based)     | Custom, lightweight, no framework overhead |
| Templating         | Handlebars (`.hbs`)         | Simple, logic-free templates               |
| Styles             | Vanilla CSS                 | No pre-processor complexity at this scale  |
| Content management | GitHub `content` branch     | Git-native, no CMS dependency              |
| Members auth       | Cloudflare Access (planned) | Zero-Trust, no auth server to maintain     |

## 3. Build Pipeline

The build is orchestrated by `devops/build.js` using the Gilbert streaming library:

1. Gilbert merges data from src/cms into templates using Handlebars
1. Static assets (CSS, JS, fonts, files) are copied verbatim
1. Output lands in `dist/` and is deployed to Cloudflare Pages


[← Back to Explanation](./README.md)
