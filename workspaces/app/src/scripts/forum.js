/**
 * forum.js — Members portal: forum thread list + thread detail views.
 *
 * Single-page behaviour driven by fetch. No page navigation required.
 * Handles authentication checks and shows CTA to login if not authenticated.
 */

/**
 *
 * @typedef {{ id: string, category_id: string, category_label: string,
 *             title: string, author_id: string, author_name: string, created_at: string,
 *             post_count: number, last_activity: string | null }} Thread
 *
 * @typedef {{ id: string, thread_id: string, author_id: string, author_name: string,
 *             body: string, created_at: string }} Post
 */

/** @type {string | null} */
let currentThreadId = null;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * GET a JSON resource from the API. Throws on non-2xx responses.
 *
 * @param {string} path
 * @returns {Promise<unknown>}
 */
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${res.status} ${path}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Thread list
// ---------------------------------------------------------------------------

/**
 * Fetches threads and renders the full list view.
 *
 * @returns {Promise<void>}
 */
async function loadThreadList() {
  const threads = /** @type {Thread[]} */ (await apiGet("/api/forum/threads"));
  renderThreadRows(threads);
}

/**
 * Renders the thread table body from the supplied thread list.
 *
 * @param {Thread[]} threads
 * @returns {void}
 */
function renderThreadRows(threads) {
  const tbody = document.getElementById("thread-rows");
  if (!tbody) return;

  if (!threads.length) {
    tbody.innerHTML = '<tr><td colspan="4">No threads yet.</td></tr>';
    return;
  }

  tbody.innerHTML = threads
    .map(
      (t) => `<tr>
        <td><a href="#" class="thread-link" data-id="${t.id}">${escHtml(t.title)}</a></td>
        <td>${escHtml(t.author_name)}</td>
        <td>${t.post_count ?? 0}</td>
        <td>${t.last_activity ? t.last_activity.slice(0, 10) : t.created_at.slice(0, 10)}</td>
      </tr>`,
    )
    .join("");

  /** @type {NodeListOf<HTMLAnchorElement>} */ (tbody.querySelectorAll(".thread-link")).forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showThread(a.dataset.id);
    }),
  );
}

// ---------------------------------------------------------------------------
// New thread form
// ---------------------------------------------------------------------------

/**
 * Handles submission of the new-thread form.
 * POSTs to `/api/forum/threads`, resets the form and reloads the list on success.
 *
 * @param {SubmitEvent} e
 * @returns {Promise<void>}
 */
async function handleNewThread(e) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  const data = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch("/api/forum/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(String(res.status));
    /** @type {HTMLFormElement} */ (form).reset();
    // Scroll back to top and reload
    window.scrollTo({ top: 0, behavior: "smooth" });
    await loadThreadList();
  } catch {
    alert("Could not post message. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// Reply form
// ---------------------------------------------------------------------------

/**
 * Handles submission of the reply form.
 * POSTs to `/api/forum/threads/:id/posts` and reloads the thread detail on success.
 *
 * @param {SubmitEvent} e
 * @returns {Promise<void>}
 */
async function handleReply(e) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  const { body } = Object.fromEntries(new FormData(form));
  try {
    const res = await fetch(`/api/forum/threads/${currentThreadId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error(String(res.status));
    /** @type {HTMLFormElement} */ (form).reset();
    await showThread(currentThreadId);
  } catch {
    alert("Could not post reply. Please try again.");
  }
}

// ---------------------------------------------------------------------------
// Thread detail
// ---------------------------------------------------------------------------

/**
 * Switches to the thread detail view and loads the thread and its posts.
 *
 * @param {string | null | undefined} threadId
 * @returns {Promise<void>}
 */
async function showThread(threadId) {
  currentThreadId = threadId ?? null;
  $id("thread-list").hidden = true;
  $id("thread-detail").hidden = false;
  $id("thread-title").textContent = "Loading…";
  $id("thread-posts").innerHTML = "";

  const [thread, posts] = /** @type {[Thread, Post[]]} */ (
    await Promise.all([apiGet(`/api/forum/threads/${threadId}`), apiGet(`/api/forum/threads/${threadId}/posts`)])
  );

  $id("thread-title").textContent = thread.title;
  $id("thread-meta").textContent = `${thread.category_id} · ${thread.created_at.slice(0, 10)}`;

  const container = $id("thread-posts");
  const originalPost = `<article>
    <header>
      <strong>${escHtml(thread.author_name)}</strong>
      <small>${thread.created_at.slice(0, 10)} · original post</small>
    </header>
    <p>${escHtml(thread.body)}</p>
  </article>`;

  const repliesHtml = posts
    .map(
      (p) => `<article>
        <header>
          <strong>${escHtml(p.author_name)}</strong>
          <small>${p.created_at.slice(0, 10)}</small>
        </header>
        <p>${escHtml(p.body)}</p>
      </article>`,
    )
    .join("");

  container.innerHTML = originalPost + repliesHtml;
}

/**
 * Switches back to the thread list view.
 *
 * @returns {void}
 */
function showList() {
  $id("thread-detail").hidden = true;
  $id("thread-list").hidden = false;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Escapes a string for safe insertion into HTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Returns an element that is guaranteed to exist on this page.
 * Use only for elements that are part of the static portal shell.
 *
 * @template {HTMLElement} T
 * @param {string} id
 * @returns {T}
 */
function $id(id) {
  return /** @type {T} */ (/** @type {unknown} */ (document.getElementById(id)));
}

/**
 * Checks if the user is authenticated.
 * Attempts to fetch the current user; shows auth CTA if 401 is returned.
 *
 * @returns {Promise<boolean>}
 */
async function checkAuthentication() {
  try {
    const res = await fetch("/api/auth/session");
    if (res.status === 401) {
      showAuthCTA();
      return false;
    }
    if (!res.ok) throw new Error(String(res.status));
    return true;
  } catch {
    // Network error or other issue — assume not authenticated for safety
    showAuthCTA();
    return false;
  }
}

/**
 * Shows the authentication required CTA and hides the forum content.
 *
 * @returns {void}
 */
function showAuthCTA() {
  const authRequired = $id("auth-required");
  const threadList = $id("thread-list");
  const threadDetail = $id("thread-detail");
  authRequired.hidden = false;
  threadList.hidden = true;
  threadDetail.hidden = true;
}

/**
 * Shows the forum content (hides auth CTA).
 *
 * @returns {void}
 */
function showForumContent() {
  const authRequired = $id("auth-required");
  authRequired.hidden = true;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("back-to-list")?.addEventListener("click", () => {
    showList();
    // Reset form when returning to list
    const form = document.getElementById("new-thread-form");
    if (form) /** @type {HTMLFormElement} */ (form).reset();
  });
  document.getElementById("new-message-btn")?.addEventListener("click", () => {
    const subjectField = document.getElementById("new-thread-title");
    if (subjectField) {
      subjectField.focus();
      // Scroll to the form
      subjectField.closest(".forum-new-message")?.scrollIntoView({ behavior: "smooth" });
    }
  });
  document.getElementById("new-thread-form")?.addEventListener("submit", handleNewThread);
  document.getElementById("reply-form")?.addEventListener("submit", handleReply);

  // Check authentication before loading threads
  checkAuthentication().then((isAuthenticated) => {
    if (isAuthenticated) {
      showForumContent();
      loadThreadList().catch(() => {
        const tbody = document.getElementById("thread-rows");
        if (tbody) tbody.innerHTML = '<tr><td colspan="5">Could not load threads.</td></tr>';
      });
    }
  });
});
