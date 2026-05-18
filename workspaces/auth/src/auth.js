import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";

/**
 * Creates a Better Auth instance bound to the current request's AUTH_DB.
 * Called per-request so the D1 binding is always fresh.
 *
 * @param {object} env - Worker env (AUTH_DB, AUTH_SECRET, BASE_URL)
 */
export function createAuth(env) {
  return betterAuth({
    basePath: "/api/auth",
    database: env.AUTH_DB,
    secret: env.AUTH_SECRET,
    baseURL: env.BASE_URL,
    emailAndPassword: { enabled: true },
    plugins: [admin()],
    user: {
      additionalFields: {
        active: { type: "boolean", defaultValue: true, required: false },
      },
    },
  });
}
