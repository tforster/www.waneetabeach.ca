import { createAuth } from "./auth.js";

/**
 * GET /session
 * Validates the session cookie via Better Auth. Returns a claims object if the session is valid, or 401 if not.
 *
 * @param {Request} request
 * @param {object} env - Worker env (AUTH_DB, AUTH_SECRET, BASE_URL)
 * @returns {Promise<Response>}
 */
export async function handleSession(request, env) {
  const auth = createAuth(env);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response(null, { status: 401 });
  const user = /** @type {typeof session.user & { role?: string | null }} */ (session.user);
  return Response.json({
    userId: user.id,
    username: user.name,
    email: user.email,
    role: user.role ?? null,
  });
}

/**
 * GET /users
 * Returns all users where active = 1. Accepts optional ?active=true filter (same behaviour — only active users are ever returned by
 * this endpoint).
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<Response>}
 */
export async function handleGetUsers(request, env) {
  const { results } = await env.AUTH_DB.prepare(
    `SELECT id, name, email FROM "user" WHERE active = 1`
  ).all();
  return Response.json(
    results.map((u) => ({ userId: u.id, username: u.name, email: u.email }))
  );
}

/**
 * PATCH /users/:id
 * Updates a user record in the auth D1. Accepts a JSON body with any subset of updatable fields (name, email, active, role, 
 * banned).
 *
 * @param {Request} request
 * @param {object} env
 * @param {{ id: string }} params - Route params injected by itty-router
 * @returns {Promise<Response>}
 */
export async function handlePatchUser(request, env, { id }) {
  const body = await request.json().catch(() => null);
  if (!body || Object.keys(body).length === 0) {
    return Response.json({ error: "Empty or invalid body" }, { status: 400 });
  }

  const allowed = ["name", "email", "active", "role", "banned", "banReason", "banExpires"];
  const fields = Object.keys(body).filter((k) => allowed.includes(k));
  if (fields.length === 0) {
    return Response.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const set = fields.map((k) => `${k} = ?`).join(", ");
  const values = fields.map((k) => body[k]);

  await env.AUTH_DB.prepare(`UPDATE "user" SET ${set}, updatedAt = ? WHERE id = ?`)
    .bind(...values, new Date().toISOString(), id)
    .run();

  return Response.json({ updated: true });
}
