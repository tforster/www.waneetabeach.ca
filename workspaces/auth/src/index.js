import { AutoRouter, StatusError } from "itty-router";
import { createAuth } from "./auth.js";
import { handleSession, handleGetUsers, handlePatchUser } from "./handlers.js";

/**
 * Shared error handler for all uncaught route exceptions.
 * Logs to wrangler output and returns a consistent JSON error response.
 *
 * @param {unknown} err
 * @param {import('itty-router').IRequest} req
 * @returns {Response}
 */
function onError(err, req) {
  const status  = err instanceof StatusError ? err.status : 500;
  const message = err instanceof Error       ? err.message : "Internal Server Error";
  console.error(`[auth] ${req.method} ${req.url} → ${status}`, err);
  return Response.json({ error: message }, { status });
}

const router = AutoRouter({ catch: onError });

router
  .get("/api/auth/session",      handleSession)
  .get("/api/auth/users",        handleGetUsers)
  .patch("/api/auth/users/:id",  (request, env) => handlePatchUser(request, env, /** @type {{ id: string }} */ (request.params)))
  .all("/api/auth/*", async (request, env) => {
    const res = await createAuth(env).handler(request);
    if (res.status >= 500) {
      console.error(`[auth] ${request.method} ${request.url} → ${res.status}`, await res.clone().text());
    }
    return res;
  })
  .all("*", () => { throw new StatusError(404, "Not Found"); });

export default { ...router };
