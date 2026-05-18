# Code Style <!-- omit in toc -->

A reference for code formatting and style standards enforced in this project.

## Table of Contents <!-- omit in toc -->

- [1. Formatting](#1-formatting)
- [2. Language](#2-language)
- [3. Naming Conventions](#3-naming-conventions)
- [4. Tooling](#4-tooling)

## 1. Formatting

| Rule | Value |
| :--- | :--- |
| Indentation | 2 spaces — no tabs |
| Line width | 132 characters maximum |
| Quotes | Double quotes |
| Trailing commas | ES5 style |
| Arrow parens | Always |
| Line endings | LF (Unix) |

## 2. Language

- Modern JavaScript (ESNext) — not TypeScript
- ES Modules (`import`/`export`) — no CommonJS `require`
- ES6 classes with `#` prefix for private members
- JSDoc required on all exported functions, classes, and methods

## 3. Naming Conventions

| Artefact | Convention | Example |
| :--- | :--- | :--- |
| Variables and instances | camelCase | `myVariable` |
| Classes | PascalCase | `MyClass` |
| Class files | PascalCase matching class name | `MyClass.js` |
| Non-class files | kebab-case | `config-utils.js` |

## 4. Tooling

- **ESLint** (`eslint.config.js`) — flat config covering JS, HTML, CSS, JSON, YAML, Markdown
- **Prettier** (`.prettierrc.yaml`) — auto-formats on save in VS Code
- Run `npm run lint` after every edit to verify compliance

[← Back to Reference](./README.md)
