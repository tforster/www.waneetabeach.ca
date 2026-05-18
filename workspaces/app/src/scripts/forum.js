/**
 * forum.js — Members portal: forum thread list + thread detail views.
 *
 * Single-page behaviour driven by fetch. No page navigation required.
 * The API redirects unauthenticated requests to /login before this runs.
 */

/**
 * @typedef {{ id: string, slug: string, label: string, sort_order: number }} Category
 *
 * @typedef {{ id: string, category_id: string, category_label: string,
 *             title: string, author_id: string, author_name: string, created_at: string,
 *             post_count: number, last_activity: string | null }} Thread
 *
 * @typedef {{ id: string, thread_id: string, author_id: string, author_name: string,
 *             body: string, created_at: string }} Post
 */

/** @type {Thread[]} */
let allThreads = [];

/** @type {string | null} */
let activeCategory = null;

/** @type {string | null} */
let currentThreadId = null;

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

/**
 * GET a JSON resource from the API. Throws on non-2xx responses.
 *
 * @param {string} path
 * @returns {Promise<any>}
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
 * Fetches categories and threads in parallel and renders the full list view.
 *
 * @returns {Promise<void>}
 */
async function loadThreadList() {
  const [categories, threads] = await Promise.all([
    apiGet("/api/forum/categories"),
    apiGet("/api/forum/threads"),
  ]);

  allThreads = threads;
  renderCategoryFilter(categories);
  renderThreadRows(threads);
  populateCategorySelect(categories);
}

/**
 * Renders the category filter button bar above the thread table.
 *
 * @param {Category[]} categories
 * @returns {void}
 */
function renderCategoryFilter(categories) {
  const nav = document.getElementById("category-filter");
  if (!nav) return;

  const all = document.createElement("button");
  all.className = "outline category-btn";
  all.dataset.category = "";
  all.textContent = "All";
  all.setAttribute("aria-pressed", "true");
  all.addEventListener("click", () => setCategory(null, all));
  nav.append(all);

  for (const cat of categories) {
    const btn = document.createElement("button");
    btn.className = "outline category-btn";
    btn.dataset.category = cat.id;
    btn.textContent = cat.label;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => setCategory(cat.id, btn));
    nav.append(btn);
  }
}

/**
 * Sets the active category filter and re-renders the thread rows.
 *
 * @param {string | null} categoryId - null means "All"
 * @param {HTMLButtonElement} activeBtn - the button that was clicked
 * @returns {void}
 */
function setCategory(categoryId, activeBtn) {
  activeCategory = categoryId;
  document.querySelectorAll(".category-btn").forEach((b) => {
    b.setAttribute("aria-pressed", b === activeBtn ? "true" : "false");
  });
  const filtered = categoryId
    ? allThreads.filter((t) => t.category_id === categoryId)
    : allThreads;
  renderThreadRows(filtered);
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
    tbody.innerHTML = "<tr><td colspan=\"5\">No threads yet.</td></tr>";
    return;
  }

  tbody.innerHTML = threads
    .map(
      (t) => `<tr>
        <td>${escHtml(t.category_label)}</td>
        <td><a href="#" class="thread-link" data-id="${t.id}">${escHtml(t.title)}</a></td>
        <td>${escHtml(t.author_name)}</td>
        <td>${t.post_count ?? 0}</td>
        <td>${t.last_activity ? t.last_activity.slice(0, 10) : t.created_at.slice(0, 10)}</td>
      </tr>`
    )
    .join("");

  /** @type {NodeListOf<HTMLAnchorElement>} */ (tbody.querySelectorAll(".thread-link")).forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      showThread(a.dataset.id);
    })
  );
}

// ---------------------------------------------------------------------------
// New thread form
// ---------------------------------------------------------------------------

/**
 * Populates the category <select> in the new-thread form.
 *
 * @param {Category[]} categories
 * @returns {void}
 */
function populateCategorySelect(categories) {
  const select = document.getElementById("new-thread-category");
  if (!select) return;
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.label;
    select.append(opt);
  }
}

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
    form.reset();
    /** @type {HTMLDetailsElement} */ (form.closest("details")).open = false;
    await loadThreadList();
  } catch {
    alert("Could not post thread. Please try again.");
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
    form.reset();
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

  const [thread, posts] = /** @type {[Thread, Post[]]} */ (await Promise.all([
    apiGet(`/api/forum/threads/${threadId}`),
    apiGet(`/api/forum/threads/${threadId}/posts`),
  ]));

  $id("thread-title").textContent = thread.title;
  $id("thread-meta").textContent = `${thread.category_id} · ${thread.created_at.slice(0, 10)}`;

  const container = $id("thread-posts");
  container.innerHTML = posts
    .map(
      (p, i) => `<article>
        <header>
          <strong>${escHtml(p.author_name)}</strong>
          <small>${p.created_at.slice(0, 10)}${i === 0 ? " · original post" : ""}</small>
        </header>
        <p>${escHtml(p.body)}</p>
      </article>`
    )
    .join("");
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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("back-to-list")?.addEventListener("click", showList);
  document.getElementById("new-thread-form")?.addEventListener("submit", handleNewThread);
  document.getElementById("reply-form")?.addEventListener("submit", handleReply);
  loadThreadList().catch(() => {
    const tbody = document.getElementById("thread-rows");
    if (tbody) tbody.innerHTML = "<tr><td colspan=\"5\">Could not load threads.</td></tr>";
  });
});
