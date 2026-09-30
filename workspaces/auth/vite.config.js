// vite.config.js — Vite build for the auth Worker, driven by cf (`cf dev`, `cf build`, `cf deploy`)
//
// Worker settings and bindings live in cloudflare.config.ts; this file only wires the plugin.

// Third party dependencies
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [cloudflare({ types: { generate: false } })],
});
