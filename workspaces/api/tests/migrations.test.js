import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

function buildDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("workspaces/api/migrations/0001_schema.sql", "utf8"));
  db.exec(readFileSync("workspaces/api/migrations/0002_seed_categories.sql", "utf8"));
  return db;
}

function columns(db, table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name);
}

let db;

before(() => { db = buildDb(); });

test("domain tables exist — categories, threads, posts", () => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  for (const t of ["categories", "threads", "posts"]) {
    assert.ok(tables.includes(t), `missing table: ${t}`);
  }
});

test("categories table has expected columns", () => {
  const cols = columns(db, "categories");
  for (const c of ["id", "slug", "label", "sort_order"]) {
    assert.ok(cols.includes(c), `categories missing column: ${c}`);
  }
});

test("threads table has expected columns", () => {
  const cols = columns(db, "threads");
  for (const c of ["id", "category_id", "author_id", "title", "body", "created_at"]) {
    assert.ok(cols.includes(c), `threads missing column: ${c}`);
  }
});

test("posts table has expected columns", () => {
  const cols = columns(db, "posts");
  for (const c of ["id", "thread_id", "author_id", "body", "created_at"]) {
    assert.ok(cols.includes(c), `posts missing column: ${c}`);
  }
});

test("seed data contains exactly 4 categories with correct slugs", () => {
  const rows = db.prepare("SELECT slug FROM categories ORDER BY sort_order").all();
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.slug), [
    "road-maintenance", "events", "snow-removal", "general",
  ]);
});
