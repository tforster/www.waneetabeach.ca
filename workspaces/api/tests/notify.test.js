import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmailPayload, notifyMembers, notifyNewThread, notifyNewPost } from "../src/notify.js";

const FROM = "no-reply@waneetabeach.ca";

// ── buildEmailPayload ─────────────────────────────────────────────────────────

test("buildEmailPayload — contains category, title, authorName, body, and threadUrl", () => {
  const payload = buildEmailPayload(FROM, ["a@example.com"], {
    category:   "Road & Maintenance",
    title:      "Pothole on Elm",
    authorName: "Troy Forster",
    body:       "There is a large pothole.",
    threadUrl:  "https://waneetabeach.ca/forum#thr_1",
  });

  assert.equal(payload.from,    FROM);
  assert.deepEqual(payload.bcc, ["a@example.com"]);
  assert.ok(payload.subject.includes("Pothole on Elm"),         "subject missing title");
  assert.ok(payload.text.includes("Road & Maintenance"),        "text missing category");
  assert.ok(payload.text.includes("Troy Forster"),              "text missing author");
  assert.ok(payload.text.includes("There is a large pothole."), "text missing body");
  assert.ok(payload.text.includes("https://waneetabeach.ca/forum#thr_1"), "text missing url");
  assert.ok(payload.html.includes("Pothole on Elm"),            "html missing title");
});

test("buildEmailPayload — body longer than 500 chars is truncated with ellipsis", () => {
  const long = "x".repeat(600);
  const payload = buildEmailPayload(FROM, ["a@example.com"], {
    category: "General", title: "T", authorName: "A", body: long,
    threadUrl: "https://waneetabeach.ca/forum#thr_1",
  });
  assert.ok(payload.text.includes("\u2026"), "missing ellipsis");
  assert.ok(!payload.text.includes(long),    "full body should not appear");
});

// ── notifyMembers ─────────────────────────────────────────────────────────────

function makeEnv({ users = [], sendThrows = false } = {}) {
  const calls = { auth: 0, send: [] };
  const env = {
    BASE_URL:     "https://waneetabeach.ca",
    FROM_ADDRESS: FROM,
    AUTH_SERVICE: {
      fetch: async () => { calls.auth++; return Response.json(users); },
    },
    EMAIL: {
      send: async (payload) => {
        if (sendThrows) throw Object.assign(new Error("rate limit"), { code: "E_RATE_LIMIT_EXCEEDED" });
        calls.send.push(payload);
        return { messageId: "msg_test" };
      },
    },
  };
  return { env, calls };
}

const PARAMS = { threadId: "thr_1", category: "General", title: "Hello", authorName: "Troy", body: "Hi." };

test("notifyMembers — calls AUTH_SERVICE.fetch to get active users", async () => {
  const { env, calls } = makeEnv({ users: [{ email: "a@example.com" }] });
  await notifyMembers(env, PARAMS);
  assert.equal(calls.auth, 1);
});

test("notifyMembers — sends one EMAIL.send call with all emails in bcc", async () => {
  const users = [{ email: "a@example.com" }, { email: "b@example.com" }];
  const { env, calls } = makeEnv({ users });
  await notifyMembers(env, PARAMS);
  assert.equal(calls.send.length, 1,                          "should be exactly one send call");
  assert.deepEqual(calls.send[0].bcc, ["a@example.com", "b@example.com"]);
  assert.equal(calls.send[0].from, FROM);
});

test("notifyMembers — EMAIL.send failure is swallowed, does not throw", async () => {
  const { env } = makeEnv({ users: [{ email: "a@example.com" }], sendThrows: true });
  await assert.doesNotReject(() => notifyMembers(env, PARAMS));
});

// ── notifyNewThread / notifyNewPost ────────────────────────────────────────

function makeDb({ categories = [], thread = null } = {}) {
  const stmt = {
    bind: () => stmt,
    all:   async () => ({ results: categories }),
    first: async () => thread,
  };
  return { prepare: () => stmt };
}

test("notifyNewThread — resolves category label from DB and calls EMAIL.send", async () => {
  const { env, calls } = makeEnv({ users: [{ email: "a@example.com" }] });
  const db     = makeDb({ categories: [{ id: "cat_road", label: "Road & Maintenance", sort_order: 1 }] });
  const thread = { id: "thr_1", category_id: "cat_road", title: "Pothole", author_name: "Troy", body: "Big one." };
  await notifyNewThread(env, db, thread);
  assert.equal(calls.send.length, 1);
  assert.ok(calls.send[0].text.includes("Road & Maintenance"));
});

test("notifyNewPost — resolves thread title and category from DB and calls EMAIL.send", async () => {
  const { env, calls } = makeEnv({ users: [{ email: "a@example.com" }] });
  const thread = { id: "thr_1", category_id: "cat_road", title: "Pothole", author_name: "Troy", body: "Big one." };
  const db     = makeDb({ categories: [{ id: "cat_road", label: "Road & Maintenance", sort_order: 1 }], thread });
  const post   = { id: "pst_1", thread_id: "thr_1", author_name: "Jane", body: "I saw it too." };
  await notifyNewPost(env, db, post, "thr_1");
  assert.equal(calls.send.length, 1);
  assert.ok(calls.send[0].text.includes("Pothole"),           "missing thread title");
  assert.ok(calls.send[0].text.includes("I saw it too."),      "missing post body");
  assert.ok(calls.send[0].text.includes("Road & Maintenance"), "missing category");
});
