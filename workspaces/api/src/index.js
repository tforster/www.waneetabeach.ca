import { AutoRouter, StatusError } from "itty-router";
import { requireSession } from "./session.js";
import { fetchWidgetData } from "./widgetdata.js";
import {
  getCategories,
  getThreads,
  getThread,
  getPosts,
  createThread,
  updateThread,
  deleteThread,
  createPost,
  updatePost,
  deletePost,
} from "./threads.js";

import { notifyNewThread, notifyNewPost } from "./notify.js";

/** @typedef {import('./session.js').AppRequest} AppRequest */

/**
 * Shared error handler for all uncaught route exceptions.
 * Logs to dev server output and returns a consistent JSON error response.
 *
 * @param {unknown} err
 * @param {import('itty-router').IRequest} req
 * @returns {Response}
 */
function onError(err, req) {
  console.error(err);
  const status = err instanceof StatusError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  console.error(`[api] ${req.method} ${req.url} → ${status}`, err);
  return Response.json({ error: message }, { status });
}

const router = AutoRouter({ catch: onError });

router
  // Unauthenticated endpoints
  .get("/api/health", () => ({ status: "ok" }))
  .get("/api/widgetdata", (_, env) => fetchWidgetData(fetch, env.POWER_API_URL))

  // Auth service proxy (forwards all /api/auth/* requests to the AUTH_SERVICE binding aka BetterAuth)
  .all("/api/auth/*", (request, env) =>
    env.AUTH_SERVICE.fetch(
      // redirect: manual is critical to prevent Auth worker from intercepting 302 responses and breaking the auth flow
      new Request(request.url, { method: request.method, headers: request.headers, body: request.body, redirect: "manual" }),
    ),
  )

  // Forum endpoints (require session)
  .get("/api/forum/categories", requireSession, (_, env) => getCategories(env.DB))
  .get("/api/forum/threads/:id/posts", requireSession, (/** @type {AppRequest} */ req, env) => getPosts(env.DB, req.params.id))
  .get("/api/forum/threads/:id", requireSession, (/** @type {AppRequest} */ req, env) => getThread(env.DB, req.params.id))
  .get("/api/forum/threads", requireSession, (_, env) => getThreads(env.DB))
  .post("/api/forum/threads", requireSession, async (/** @type {AppRequest} */ req, env) => {
    const thread = await createThread(env.DB, req.claims, await req.json());
    notifyNewThread(env, env.DB, thread).catch((err) => console.error("[notify]", err));
    return thread;
  })
  .patch("/api/forum/threads/:id", requireSession, async (/** @type {AppRequest} */ req, env) =>
    updateThread(env.DB, req.params.id, req.claims, await req.json()),
  )
  .delete("/api/forum/threads/:id", requireSession, (/** @type {AppRequest} */ req, env) =>
    deleteThread(env.DB, req.params.id, req.claims),
  )
  .post("/api/forum/threads/:id/posts", requireSession, async (/** @type {AppRequest} */ req, env) => {
    const post = await createPost(env.DB, req.claims, req.params.id, await req.json());
    notifyNewPost(env, env.DB, post, req.params.id).catch((err) => console.error("[notify]", err));
    return post;
  })
  .patch("/api/forum/posts/:id", requireSession, async (/** @type {AppRequest} */ req, env) =>
    updatePost(env.DB, req.params.id, req.claims, await req.json()),
  )
  .delete("/api/forum/posts/:id", requireSession, (/** @type {AppRequest} */ req, env) =>
    deletePost(env.DB, req.params.id, req.claims),
  )

  .all("/forum*", requireSession, () => ({ forum: true }))

  // API Catch-all: 501 for unimplemented endpoints
  .all("/api/*", requireSession, () => {
    throw new StatusError(501, "Not Implemented");
  })

  // Global catch-all: 404 for everything else
  .all("*", () => {
    throw new StatusError(404, "Not Found");
  });

export default { ...router };
