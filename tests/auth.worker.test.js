import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../workspaces/auth/src/index.js";

const mockMeta = { duration: 0, last_row_id: 0, changes: 0, served_by: "test", internal_stats: null };
const mockStatement = {
  first: async () => null,
  all: async () => ({ results: [], success: true, meta: mockMeta }),
  run: async () => ({ success: true, meta: mockMeta }),
  bind: function () { return this; },
};
const mockDB = {
  prepare: () => mockStatement,
  batch: async (stmts) => stmts.map(() => ({ results: [], success: true, meta: mockMeta })),
  exec: async () => ({ count: 0, duration: 0 }),
};

const mockEnv = {
  AUTH_DB: mockDB,
  AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
  BASE_URL: "https://example.com",
};

const fetch = (path, init) =>
  worker.fetch(new Request(`https://example.com${path}`, init), mockEnv, {});

test("GET /api/auth/session no cookie → 401", async () => {
  const res = await fetch("/api/auth/session");
  assert.equal(res.status, 401);
});

test("POST /api/auth/sign-in/email → not 404 (Better Auth handler mounted)", async () => {
  const res = await fetch("/api/auth/sign-in/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
  });
  assert.notEqual(res.status, 404);
});

test("GET /api/auth/users → 200 with array body", async () => {
  const res = await fetch("/api/auth/users");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});

test("PATCH /api/auth/users/:id → 200", async () => {
  const res = await fetch("/api/auth/users/u1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: 0 }),
  });
  assert.equal(res.status, 200);
});

test("unknown route → 404", async () => {
  const res = await fetch("/not-a-real-path");
  assert.equal(res.status, 404);
});
