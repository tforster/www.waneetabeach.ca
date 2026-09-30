// vite.config.js — Vite build for the auth Worker, driven by cf (`cf dev`, `cf build`, `cf deploy`)
//
// Worker settings and bindings live in cloudflare.config.ts; this file only wires the plugin.

// Third party dependencies
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  // Fixed ports keep auth BASE_URL and the VS Code attach configs in .vscode/launch.json valid
  // api reaches this Worker via its service binding using the placeholder host `auth-service`, which Vite blocks by default
  server: { port: 8788, strictPort: true, allowedHosts: ["auth-service"] },
  plugins: [cloudflare({ inspectorPort: 9229, types: { generate: false } })],
});
