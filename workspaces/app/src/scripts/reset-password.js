/**
 * reset-password.js — Reset password with token verification.
 * Calls /api/auth/reset-password endpoint provided by better-auth.
 *
 * @typedef {{ newPassword: string, token: string }} PasswordResetRequest
 * @typedef {{ message?: string }} PasswordResetResponse
 */

/**
 * Handles submission of the reset password form.
 * Updates user password using the reset token from the URL.
 *
 * @param {SubmitEvent} e - The form submit event
 * @param {string} token - The password reset token from URL query params
 * @returns {Promise<void>}
 */
async function handleResetPasswordSubmit(e, token) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  const resetError = document.getElementById("reset-error");
  const passwordMismatch = document.getElementById("password-mismatch");
  const successMessage = document.getElementById("success-message");

  if (!resetError || !passwordMismatch || !successMessage) return;

  resetError.hidden = true;
  passwordMismatch.hidden = true;

  const passwordInput = document.getElementById("password");
  const confirmInput = document.getElementById("confirm-password");

  if (!passwordInput || !(passwordInput instanceof HTMLInputElement)) return;
  if (!confirmInput || !(confirmInput instanceof HTMLInputElement)) return;

  const password = passwordInput.value;
  const confirm = confirmInput.value;

  // Client-side validation
  if (password !== confirm) {
    passwordMismatch.hidden = false;
    return;
  }

  try {
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: password, token }),
    });

    if (!res.ok) {
      const data = /** @type {PasswordResetResponse} */ (await res.json());
      throw new Error(data.message || "Failed to reset password");
    }

    // Show success state
    form.hidden = true;
    successMessage.hidden = false;
  } catch (err) {
    resetError.textContent = err instanceof Error ? err.message : "An error occurred";
    resetError.hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const error = urlParams.get("error");

  const invalidToken = document.getElementById("invalid-token");
  const form = document.getElementById("reset-password-form");

  if (!invalidToken || !form || !(form instanceof HTMLFormElement)) return;

  // Show error if token is invalid or missing
  if (!token || error === "INVALID_TOKEN") {
    invalidToken.hidden = false;
    return;
  }

  // Show form if token is present
  form.hidden = false;
  form.addEventListener("submit", (e) => handleResetPasswordSubmit(e, token ?? ""));
});
