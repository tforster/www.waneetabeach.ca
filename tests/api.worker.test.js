import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../workspaces/api/src/index.js";

// AUTH_SERVICE mock — all requests return 401 (unauthenticated by default)
const mockAuthService = {
  fetch: async () => new Response(null, { status: 401 }),
};

const mockEnv = {
  AUTH_SERVICE: mockAuthService,
  BASE_URL: "https://example.com",
};

const fetch = (path, init) =>
  worker.fetch(new Request(`https://example.com${path}`, init), mockEnv, {});

test("GET /api/health → 200 { status: ok }", async () => {
  const res = await fetch("/api/health");
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: "ok" });
});

test("POST /api/auth/sign-in/email → proxied to AUTH_SERVICE, not 404", async () => {
  const env = {
    ...mockEnv,
    AUTH_SERVICE: {
      fetch: async () => new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 }),
    },
  };
  const res = await worker.fetch(
    new Request("https://example.com/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
    }),
    env,
    {}
  );
  assert.notEqual(res.status, 404);
});

test("GET /api/threads unauthenticated → 401", async () => {
  const res = await fetch("/api/threads");
  assert.equal(res.status, 401);
});

test("GET /forum unauthenticated → 302 to /login", async () => {
  const res = await fetch("/forum");
  assert.equal(res.status, 302);
  assert.equal(new URL(res.headers.get("location")).pathname, "/login");
});

test("GET /api/invites/validate authenticated → 501 (no special invite handling)", async () => {
  const env = {
    ...mockEnv,
    AUTH_SERVICE: {
      fetch: async () => Response.json(
        { userId: "u1", username: "Alice", email: "alice@example.com", role: "member" }
      ),
    },
  };
  const res = await worker.fetch(
    new Request("https://example.com/api/invites/validate"),
    env,
    {}
  );
  assert.equal(res.status, 501);
});

test("GET /api/widgetdata → 200 with no auth required", async () => {
  const env = {
    ...mockEnv,
    POWER_API_URL: undefined,
  };
  const res = await worker.fetch(
    new Request("https://example.com/api/widgetdata"),
    env,
    {}
  );
  assert.equal(res.status, 200);
});

test("GET /api/widgetdata → body has weather, garbage, catfish, power keys", async () => {
  const env = {
    ...mockEnv,
    POWER_API_URL: undefined,
  };
  const res = await worker.fetch(
    new Request("https://example.com/api/widgetdata"),
    env,
    {}
  );
  const body = await res.json();
  assert.ok("weather" in body);
  assert.ok("garbage" in body);
  assert.ok("catfish" in body);
  assert.ok("power" in body);
});

test("GET /api/forum/categories unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/categories");
  assert.equal(res.status, 401);
});

test("GET /api/forum/threads unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads");
  assert.equal(res.status, 401);
});

test("GET /api/forum/threads/:id unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads/thread_1");
  assert.equal(res.status, 401);
});

test("GET /api/forum/threads/:id/posts unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads/thread_1/posts");
  assert.equal(res.status, 401);
});

test("POST /api/forum/threads unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads", { method: "POST" });
  assert.equal(res.status, 401);
});

test("PATCH /api/forum/threads/:id unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads/thr_1", { method: "PATCH" });
  assert.equal(res.status, 401);
});

test("DELETE /api/forum/threads/:id unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads/thr_1", { method: "DELETE" });
  assert.equal(res.status, 401);
});

test("POST /api/forum/threads/:id/posts unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/threads/thr_1/posts", { method: "POST" });
  assert.equal(res.status, 401);
});

test("PATCH /api/forum/posts/:id unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/posts/pst_1", { method: "PATCH" });
  assert.equal(res.status, 401);
});

test("DELETE /api/forum/posts/:id unauthenticated → 401", async () => {
  const res = await fetch("/api/forum/posts/pst_1", { method: "DELETE" });
  assert.equal(res.status, 401);
});

test("GET /api/forum/categories authenticated → 200 with category rows", async () => {
  const categories = [
    { id: "cat_road",    slug: "road-maintenance", label: "Road & Maintenance", sort_order: 1 },
    { id: "cat_events",  slug: "events",           label: "Events",             sort_order: 2 },
    { id: "cat_snow",    slug: "snow-removal",     label: "Snow Removal",       sort_order: 3 },
    { id: "cat_general", slug: "general",          label: "General",            sort_order: 4 },
  ];
  const stmt = { bind: () => stmt, all: async () => ({ results: categories }), first: async () => null };
  const env = {
    AUTH_SERVICE: { fetch: async () => Response.json({ userId: "u1", role: "member" }) },
    DB: { prepare: () => stmt },
  };
  const res = await worker.fetch(new Request("https://example.com/api/forum/categories"), env, {});
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), categories);
});

test("POST /api/forum/threads authenticated → 200 with new thread", async () => {
  const stmt = { bind: () => stmt, all: async () => ({ results: [] }), first: async () => null, run: async () => ({ meta: { changes: 1 } }) };
  const env = {
    AUTH_SERVICE: { fetch: async () => Response.json({ userId: "u_1", role: "member" }) },
    DB: { prepare: () => stmt },
  };
  const res = await worker.fetch(
    new Request("https://example.com/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category_id: "cat_road", title: "Pothole on Elm", body: "Big one." }),
    }),
    env, {}
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.author_id, "u_1");
  assert.equal(body.title, "Pothole on Elm");
});

test("unknown route → 404", async () => {
  const res = await fetch("/not-a-real-path");
  assert.equal(res.status, 404);
});
