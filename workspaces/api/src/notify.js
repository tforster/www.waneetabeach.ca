/**
 * notify.js — Email notifications for new threads and posts.
 *
 * Sends a single bcc email to all active members when content is created.
 * Non-fatal: errors are logged but never thrown to callers.
 */

import { getCategories, getThread } from "./threads.js";

const TRUNCATE_AT = 500;

// ---------------------------------------------------------------------------
// buildEmailPayload
// ---------------------------------------------------------------------------

/**
 * Builds the email payload object for env.EMAIL.send().
 * Pure function — no I/O, fully unit-testable.
 *
 * @param {string}   from
 * @param {string[]} bcc
 * @param {{ category: string, title: string, authorName: string, body: string, threadUrl: string }} params
 * @returns {{ from: string, bcc: string[], subject: string, text: string, html: string }}
 */
export function buildEmailPayload(from, bcc, { category, title, authorName, body, threadUrl }) {
  const snippet = body.length > TRUNCATE_AT ? body.slice(0, TRUNCATE_AT) + "\u2026" : body;
  const subject = `[Waneeta Beach] ${title}`;
  const text = `${authorName} posted in ${category} — ${title}:\n\n${snippet}\n\nRead the full thread: ${threadUrl}`;
  const html = `<p><strong>${escHtml(authorName)}</strong> posted in <em>${escHtml(category)}</em>:</p>`
             + `<p>${escHtml(snippet)}</p>`
             + `<p><a href="${threadUrl}">Read the full thread: ${escHtml(title)}</a></p>`;
  return { from, bcc, subject, text, html };
}

// ---------------------------------------------------------------------------
// notifyMembers
// ---------------------------------------------------------------------------

/**
 * Fetches all active members from the auth service and sends a single bcc email.
 *
 * @param {object} env - Worker env (AUTH_SERVICE, EMAIL, BASE_URL, FROM_ADDRESS)
 * @param {{ threadId: string, category: string, title: string, authorName: string, body: string }} params
 * @returns {Promise<void>}
 */
export async function notifyMembers(env, { threadId, category, title, authorName, body }) {
  const res = await env.AUTH_SERVICE.fetch(
    new Request("https://auth-service/api/auth/users", { method: "GET" })
  );
  if (!res.ok) return;

  /** @type {{ email: string }[]} */
  const users = await res.json();
  const bcc   = users.map((u) => u.email).filter(Boolean);
  if (bcc.length === 0) return;

  const threadUrl = `${env.BASE_URL}/forum#${threadId}`;
  const payload   = buildEmailPayload(env.FROM_ADDRESS, bcc, { category, title, authorName, body, threadUrl });

  try {
    await env.EMAIL.send(payload);
  } catch (err) {
    console.error("[notify] EMAIL.send failed:", err);
  }
}

// ---------------------------------------------------------------------------
// notifyNewThread / notifyNewPost
// ---------------------------------------------------------------------------

/**
 * @param {object} env
 * @param {object} db
 * @param {{ id: string, category_id: string, title: string, author_name: string, body: string }} thread
 * @returns {Promise<void>}
 */
export async function notifyNewThread(env, db, thread) {
  const cats     = await getCategories(db);
  const cat      = cats.find((c) => c.id === thread.category_id);
  return notifyMembers(env, {
    threadId:   thread.id,
    category:   cat?.label ?? thread.category_id,
    title:      thread.title,
    authorName: thread.author_name,
    body:       thread.body,
  });
}

/**
 * @param {object} env
 * @param {object} db
 * @param {{ id: string, thread_id: string, author_name: string, body: string }} post
 * @param {string} threadId
 * @returns {Promise<void>}
 */
export async function notifyNewPost(env, db, post, threadId) {
  const thread = await getThread(db, threadId);
  const cats   = await getCategories(db);
  const cat    = cats.find((c) => c.id === thread.category_id);
  return notifyMembers(env, {
    threadId:   thread.id,
    category:   cat?.label ?? thread.category_id,
    title:      thread.title,
    authorName: post.author_name,
    body:       post.body,
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {string} s */
function escHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
