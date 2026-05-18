/**
 * @typedef {{ userId: string, username: string, email: string, role: string | null }} Claims
 * @typedef {import('itty-router').IRequest & { claims?: Claims }} AppRequest
 */

/**
 * requireSession — itty-router middleware.
 *
 * Forwards the request's cookie headers to the auth Worker via the AUTH_SERVICE Service Binding. On a valid session the claims
 * object is attached to request.claims and execution continues. On 401:
 *   - /api/* routes return 401 JSON
 *   - /forum/* routes redirect to /login
 *
 * @param {AppRequest} request
 * @param {object} env - Worker env (AUTH_SERVICE Service Binding)
 * @returns {Promise<Response|undefined>}
 */
export async function requireSession(request, env) {
  const response = await env.AUTH_SERVICE.fetch(
    new Request("https://auth-service/api/auth/session", { headers: request.headers })
  );

  if (response.status === 401) {
    if (new URL(request.url).pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.redirect(new URL("/login", request.url).toString(), 302);
  }

  request.claims = await response.json();
}
