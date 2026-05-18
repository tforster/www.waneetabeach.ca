import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

function buildDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync("workspaces/auth/migrations/0001_better_auth.sql", "utf8"));
  db.exec(readFileSync("workspaces/auth/migrations/0002_admin_plugin.sql", "utf8"));
  return db;
}

function columns(db, table) {
  return db.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name);
}

let db;

before(() => { db = buildDb(); });

test("all four auth tables exist", () => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((r) => r.name);
  for (const t of ["user", "session", "account", "verification"]) {
    assert.ok(tables.includes(t), `missing table: ${t}`);
  }
});

test("user table has all expected columns", () => {
  const cols = columns(db, "user");
  for (const c of ["id", "name", "email", "emailVerified", "image", "createdAt", "updatedAt", "active", "role", "banned", "banReason", "banExpires"]) {
    assert.ok(cols.includes(c), `user missing column: ${c}`);
  }
});

test("session table has all expected columns", () => {
  const cols = columns(db, "session");
  for (const c of ["id", "token", "userId", "expiresAt", "createdAt", "updatedAt", "ipAddress", "userAgent", "impersonatedBy"]) {
    assert.ok(cols.includes(c), `session missing column: ${c}`);
  }
});
