import { test } from "node:test";
import assert from "node:assert/strict";
import { handleSession } from "../src/handlers.js";

// Minimal D1 mock — returns null for all lookups, simulating no valid session.
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

test("handleSession — no cookie returns 401", async () => {
  const request = new Request("https://example.com/api/auth/session");
  const response = await handleSession(request, mockEnv);
  assert.equal(response.status, 401);
});

test("handleSession — expired/unknown session returns 401", async () => {
  const request = new Request("https://example.com/api/auth/session", {
    headers: { cookie: "better-auth.session_token=invalid-token" },
  });
  const response = await handleSession(request, mockEnv);
  assert.equal(response.status, 401);
});
