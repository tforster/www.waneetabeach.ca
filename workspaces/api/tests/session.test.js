import { test } from "node:test";
import assert from "node:assert/strict";
import { requireSession } from "../src/session.js";

const claims = { userId: "u1", username: "Alice", email: "alice@example.com", role: "member" };

function makeAuthService(status, body = null) {
  return {
    fetch: async () =>
      body
        ? Response.json(body, { status })
        : new Response(null, { status }),
  };
}

test("requireSession — AUTH_SERVICE 401 on /api/* returns 401", async () => {
  const env = { AUTH_SERVICE: makeAuthService(401) };
  const request = new Request("https://example.com/api/threads");
  const response = await requireSession(request, env);
  assert.equal(response.status, 401);
});

test("requireSession — AUTH_SERVICE 401 on /forum/* returns 302 to /login", async () => {
  const env = { AUTH_SERVICE: makeAuthService(401) };
  const request = new Request("https://example.com/forum/dashboard");
  const response = await requireSession(request, env);
  assert.equal(response.status, 302);
  assert.equal(new URL(response.headers.get("location")).pathname, "/login");
});

test("requireSession — AUTH_SERVICE 200 attaches claims to request", async () => {
  const env = { AUTH_SERVICE: makeAuthService(200, claims) };
  const request = new Request("https://example.com/api/threads");
  const response = await requireSession(request, env);
  assert.equal(response, undefined);
  assert.deepEqual(request.claims, claims);
});
