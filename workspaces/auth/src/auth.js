import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins/admin";
import { sendEmail } from "../../shared/email.js";

/**
 * Creates a Better Auth instance bound to the current request's AUTH_DB.
 * Called per-request so the D1 binding is always fresh.
 *
 * @param {object} env - Worker env (AUTH_DB, AUTH_SECRET, BASE_URL, EMAIL)
 */
export function createAuth(env) {
  return betterAuth({
    basePath: "/api/auth",
    database: env.AUTH_DB,
    secret: env.AUTH_SECRET,
    baseURL: env.BASE_URL,
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(env.EMAIL, {
          to: user.email,
          from: "no-reply@waneetabeach.ca",
          subject: "Reset Your Password",
          html: `
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password. Click the link below to set a new password:</p>
            <p><a href="${url}">Reset Password</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <p>— Waneeta Beach</p>
          `,
        });
      },
      revokeSessionsOnPasswordReset: true,
    },
    plugins: [admin()],
    user: {
      additionalFields: {
        active: { type: "boolean", defaultValue: true, required: false },
      },
    },
  });
}
