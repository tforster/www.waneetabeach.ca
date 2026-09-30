// vite.config.js — Vite build for the api Worker, driven by cf (`cf dev`, `cf build`, `cf deploy`)
//
// Worker settings and bindings live in cloudflare.config.ts; this file only wires the plugin.
// The Gilbert-built static site is served as Worker assets via Vite's publicDir.

// Third party dependencies
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "../app/dist",
  // Fixed ports keep auth BASE_URL and the VS Code attach configs in .vscode/launch.json valid
  server: { port: 8787, strictPort: true },
  plugins: [cloudflare({ inspectorPort: 9230, types: { generate: false } })],
});
