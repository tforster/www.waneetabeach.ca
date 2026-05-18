import { test } from "node:test";
import assert from "node:assert/strict";
import { handleGetUsers, handlePatchUser } from "../src/handlers.js";

const mockMeta = { duration: 0, last_row_id: 0, changes: 0, served_by: "test", internal_stats: null };

function makeDB(rows = []) {
  const statement = {
    all: async () => ({ results: rows, success: true, meta: mockMeta }),
    run: async () => ({ success: true, meta: mockMeta }),
    bind: function () { return this; },
  };
  return { prepare: () => statement };
}

const activeUsers = [
  { id: "u1", name: "Alice",   email: "alice@example.com" },
  { id: "u2", name: "Bob",     email: "bob@example.com"   },
];

test("handleGetUsers — returns active users as [{ userId, username, email }]", async () => {
  const env = { AUTH_DB: makeDB(activeUsers) };
  const request = new Request("https://example.com/users");
  const response = await handleGetUsers(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, [
    { userId: "u1", username: "Alice", email: "alice@example.com" },
    { userId: "u2", username: "Bob",   email: "bob@example.com"   },
  ]);
});

test("handleGetUsers?active=true — returns same active-only shape", async () => {
  const env = { AUTH_DB: makeDB(activeUsers) };
  const request = new Request("https://example.com/users?active=true");
  const response = await handleGetUsers(request, env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.length, 2);
  assert.ok(body.every((u) => u.userId && u.username && u.email));
});

test("handlePatchUser — valid body returns 200 { updated: true }", async () => {
  const env = { AUTH_DB: makeDB() };
  const request = new Request("https://example.com/api/auth/users/u1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active: 0 }),
  });
  const response = await handlePatchUser(request, env, { id: "u1" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { updated: true });
});

test("handlePatchUser — empty body returns 400", async () => {
  const env = { AUTH_DB: makeDB() };
  const request = new Request("https://example.com/api/auth/users/u1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const response = await handlePatchUser(request, env, { id: "u1" });
  assert.equal(response.status, 400);
});
