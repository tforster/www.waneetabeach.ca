// vite.config.js — Vite build for the api Worker, driven by cf (`cf dev`, `cf build`, `cf deploy`)
//
// Worker settings and bindings live in cloudflare.config.ts; this file only wires the plugin.
// The Gilbert-built static site is served as Worker assets via Vite's publicDir.

// Third party dependencies
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "../app/dist",
  plugins: [cloudflare({ types: { generate: false } })],
});
