import { StatusError } from "itty-router";
import { enforce } from "./enforce.js";

/**
 * threads.js — D1 query helpers for the thread board.
 *
 * Each function accepts a D1 database binding and returns plain objects. All SQL is read-only; writes land in a future story.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function getCategories(db) {
  const { results } = await db.prepare(
    "SELECT * FROM categories ORDER BY sort_order"
  ).all();
  return results;
}

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------

export async function getThreads(db) {
  const { results } = await db.prepare(`
    SELECT
      t.id,
      t.category_id,
      c.label  AS category_label,
      t.title,
      t.author_id,
      t.author_name,
      t.created_at,
      COUNT(p.id)         AS post_count,
      MAX(p.created_at)   AS last_activity
    FROM threads t
    JOIN  categories c ON c.id = t.category_id
    LEFT JOIN posts  p ON p.thread_id = t.id
    GROUP BY t.id
    ORDER BY COALESCE(MAX(p.created_at), t.created_at) DESC
  `).all();
  return results;
}

export async function getThread(db, id) {
  const thread = await db.prepare(
    "SELECT * FROM threads WHERE id = ?"
  ).bind(id).first();
  if (!thread) throw new StatusError(404, "Thread not found");
  return thread;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createThread(db, claims, { category_id, title, body }) {
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db.prepare(
    "INSERT INTO threads (id, category_id, author_id, author_name, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, category_id, claims.userId, claims.username, title, body, created_at).run();
  return { id, category_id, author_id: claims.userId, author_name: claims.username, title, body, created_at };
}

export async function updateThread(db, id, claims, updates) {
  const thread = await getThread(db, id);
  if (thread.author_id !== claims.userId && !enforce(claims)) {
    throw new StatusError(403, "Forbidden");
  }
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  const result = await db.prepare(`UPDATE threads SET ${fields} WHERE id = ?`)
    .bind(...Object.values(updates), id).run();
  if (result.meta.changes === 0) throw new StatusError(404, "Thread not found");
  return { ...thread, ...updates };
}

export async function deleteThread(db, id, claims) {
  const thread = await getThread(db, id);
  if (thread.author_id !== claims.userId && !enforce(claims)) {
    throw new StatusError(403, "Forbidden");
  }
  await db.prepare("DELETE FROM threads WHERE id = ?").bind(id).run();
  return { deleted: true };
}

export async function createPost(db, claims, threadId, { body }) {
  await getThread(db, threadId);
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db.prepare(
    "INSERT INTO posts (id, thread_id, author_id, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, threadId, claims.userId, claims.username, body, created_at).run();
  return { id, thread_id: threadId, author_id: claims.userId, author_name: claims.username, body, created_at };
}

export async function updatePost(db, id, claims, updates) {
  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
  if (!post) throw new StatusError(404, "Post not found");
  if (post.author_id !== claims.userId && !enforce(claims)) {
    throw new StatusError(403, "Forbidden");
  }
  const fields = Object.keys(updates).map((k) => `${k} = ?`).join(", ");
  await db.prepare(`UPDATE posts SET ${fields} WHERE id = ?`)
    .bind(...Object.values(updates), id).run();
  return { ...post, ...updates };
}

export async function deletePost(db, id, claims) {
  const post = await db.prepare("SELECT * FROM posts WHERE id = ?").bind(id).first();
  if (!post) throw new StatusError(404, "Post not found");
  if (post.author_id !== claims.userId && !enforce(claims)) {
    throw new StatusError(403, "Forbidden");
  }
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return { deleted: true };
}

export async function getPosts(db, threadId) {
  const { results } = await db.prepare(
    "SELECT id, thread_id, author_id, author_name, body, created_at FROM posts WHERE thread_id = ? ORDER BY created_at ASC"
  ).bind(threadId).all();
  return results;
}
