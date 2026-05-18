import { test } from "node:test";
import assert from "node:assert/strict";
import { getCategories, getThreads, getThread, getPosts,
         createThread, updateThread, deleteThread,
         createPost, updatePost, deletePost } from "../src/threads.js";

// D1 mock — returns the rows you give it.
// Supports .all(), .bind(...).first(), and .bind(...).run().
function mockDb(rows = [], { changes = 1 } = {}) {
  const stmt = {
    bind: () => stmt,
    all:   async () => ({ results: rows }),
    first: async () => rows[0] ?? null,
    run:   async () => ({ meta: { changes } }),
  };
  return { prepare: () => stmt };
}

// ---------------------------------------------------------------------------
// updatePost
// ---------------------------------------------------------------------------

test("updatePost — author can update their post", async () => {
  const post = { id: "pst_1", thread_id: "thr_1", author_id: "u_1", body: "Original.", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_1", role: "member" };
  const result = await updatePost(mockDb([post]), "pst_1", claims, { body: "Edited." });
  assert.equal(result.body, "Edited.");
});

test("updatePost — non-author throws 403", async () => {
  const post = { id: "pst_1", thread_id: "thr_1", author_id: "u_1", body: "B", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_2", role: "member" };
  await assert.rejects(() => updatePost(mockDb([post]), "pst_1", claims, { body: "X" }), { status: 403 });
});

test("updatePost — not found throws 404", async () => {
  const claims = { userId: "u_1", role: "member" };
  await assert.rejects(() => updatePost(mockDb([]), "pst_missing", claims, { body: "X" }), { status: 404 });
});

// ---------------------------------------------------------------------------
// deletePost
// ---------------------------------------------------------------------------

test("deletePost — author can delete their post", async () => {
  const post = { id: "pst_1", thread_id: "thr_1", author_id: "u_1", body: "B", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_1", role: "member" };
  assert.deepEqual(await deletePost(mockDb([post]), "pst_1", claims), { deleted: true });
});

test("deletePost — non-author throws 403", async () => {
  const post = { id: "pst_1", thread_id: "thr_1", author_id: "u_1", body: "B", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_2", role: "member" };
  await assert.rejects(() => deletePost(mockDb([post]), "pst_1", claims), { status: 403 });
});

test("deletePost — not found throws 404", async () => {
  const claims = { userId: "u_1", role: "member" };
  await assert.rejects(() => deletePost(mockDb([]), "pst_missing", claims), { status: 404 });
});

// ---------------------------------------------------------------------------
// deleteThread
// ---------------------------------------------------------------------------

test("deleteThread — author can delete their thread", async () => {
  const thread = { id: "thr_1", author_id: "u_1", title: "T", body: "B", category_id: "cat_road", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_1", role: "member" };
  assert.deepEqual(await deleteThread(mockDb([thread]), "thr_1", claims), { deleted: true });
});

test("deleteThread — non-author throws 403", async () => {
  const thread = { id: "thr_1", author_id: "u_1", title: "T", body: "B", category_id: "cat_road", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_2", role: "member" };
  await assert.rejects(() => deleteThread(mockDb([thread]), "thr_1", claims), { status: 403 });
});

test("deleteThread — not found throws 404", async () => {
  const claims = { userId: "u_1", role: "member" };
  await assert.rejects(() => deleteThread(mockDb([]), "thr_missing", claims), { status: 404 });
});

// ---------------------------------------------------------------------------
// updateThread
// ---------------------------------------------------------------------------

test("updateThread — author can update their thread", async () => {
  const thread = { id: "thr_1", author_id: "u_1", title: "Old title", body: "B", category_id: "cat_road", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_1", role: "member" };
  const result = await updateThread(mockDb([thread]), "thr_1", claims, { title: "New title" });
  assert.equal(result.title, "New title");
});

test("updateThread — non-author throws 403", async () => {
  const thread = { id: "thr_1", author_id: "u_1", title: "T", body: "B", category_id: "cat_road", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_2", role: "member" };
  await assert.rejects(() => updateThread(mockDb([thread]), "thr_1", claims, { title: "X" }), { status: 403 });
});

test("updateThread — not found throws 404", async () => {
  const claims = { userId: "u_1", role: "member" };
  await assert.rejects(() => updateThread(mockDb([]), "thr_missing", claims, { title: "X" }), { status: 404 });
});

// ---------------------------------------------------------------------------
// createPost
// ---------------------------------------------------------------------------

test("createPost — success returns the new post with author_id from claims", async () => {
  const thread = { id: "thr_1", author_id: "u_1", title: "T", body: "B", category_id: "cat_road", created_at: "2026-05-01T10:00:00" };
  const claims = { userId: "u_2", username: "jane", role: "member" };
  const result = await createPost(mockDb([thread]), claims, "thr_1", { body: "A reply." });
  assert.equal(result.thread_id, "thr_1");
  assert.equal(result.author_id, "u_2");
  assert.equal(result.author_name, "jane");
  assert.equal(result.body, "A reply.");
  assert.ok(result.id);
});

test("createPost — thread not found throws 404", async () => {
  const claims = { userId: "u_1", role: "member" };
  await assert.rejects(() => createPost(mockDb([]), claims, "thr_missing", { body: "Hi" }), { status: 404 });
});

// ---------------------------------------------------------------------------
// createThread
// ---------------------------------------------------------------------------

test("createThread — sets author_id from claims and returns the new thread", async () => {
  const claims = { userId: "u_1", username: "troy", role: "member" };
  const db = mockDb();
  const result = await createThread(db, claims, { category_id: "cat_road", title: "Pothole on Elm", body: "Big one." });
  assert.equal(result.author_id, "u_1");
  assert.equal(result.author_name, "troy");
  assert.equal(result.category_id, "cat_road");
  assert.equal(result.title, "Pothole on Elm");
  assert.equal(result.body, "Big one.");
  assert.ok(result.id, "id should be set");
  assert.ok(result.created_at, "created_at should be set");
});

// ---------------------------------------------------------------------------
// getCategories
// ---------------------------------------------------------------------------

test("getCategories — returns all rows from DB", async () => {
  const rows = [
    { id: "cat_road",    slug: "road-maintenance", label: "Road & Maintenance", sort_order: 1 },
    { id: "cat_events",  slug: "events",           label: "Events",             sort_order: 2 },
    { id: "cat_snow",    slug: "snow-removal",     label: "Snow Removal",       sort_order: 3 },
    { id: "cat_general", slug: "general",          label: "General",            sort_order: 4 },
  ];
  assert.deepEqual(await getCategories(mockDb(rows)), rows);
});

// ---------------------------------------------------------------------------
// getPosts
// ---------------------------------------------------------------------------

test("getPosts — returns posts in chronological order", async () => {
  const rows = [
    { id: "pst_1", thread_id: "thr_1", author_id: "u_1", author_name: "troy", body: "Original post.",  created_at: "2026-05-01T10:00:00" },
    { id: "pst_2", thread_id: "thr_1", author_id: "u_2", author_name: "jane", body: "First reply.",   created_at: "2026-05-02T09:00:00" },
  ];
  assert.deepEqual(await getPosts(mockDb(rows), "thr_1"), rows);
});

// ---------------------------------------------------------------------------
// getThread
// ---------------------------------------------------------------------------

test("getThread — returns the matching thread", async () => {
  const row = {
    id: "thr_1",
    category_id: "cat_road",
    title: "Pothole on Elm",
    author_id: "u_1",
    body: "There is a large pothole at the corner of Elm and 2nd.",
    created_at: "2026-05-01T10:00:00",
  };
  assert.deepEqual(await getThread(mockDb([row]), "thr_1"), row);
});

test("getThread — throws 404 when id not found", async () => {
  await assert.rejects(() => getThread(mockDb([]), "thr_missing"), { status: 404 });
});

test("getThreads — returns rows with join fields", async () => {
  const rows = [
    {
      id: "thr_1",
      category_id: "cat_road",
      category_label: "Road & Maintenance",
      title: "Pothole on Elm",
      author_id: "u_1",
      author_name: "troy",
      created_at: "2026-05-01T10:00:00",
      post_count: 2,
      last_activity: "2026-05-03T08:00:00",
    },
  ];
  assert.deepEqual(await getThreads(mockDb(rows)), rows);
});
