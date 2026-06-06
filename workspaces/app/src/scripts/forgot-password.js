/**
 * forgot-password.js — Request password reset email.
 * Calls /api/auth/request-password-reset endpoint provided by better-auth.
 *
 * @typedef {{ email: string, redirectTo: string }} ResetRequest
 * @typedef {{ message?: string }} ResetResponse
 */

/**
 * Handles submission of the forgot password form.
 * Sends an email with a password reset link to the provided address.
 *
 * @param {SubmitEvent} e - The form submit event
 * @returns {Promise<void>}
 */
async function handleForgotPasswordSubmit(e) {
  e.preventDefault();
  const form = /** @type {HTMLFormElement} */ (e.target);
  const formError = document.getElementById("form-error");
  const successMessage = document.getElementById("success-message");

  if (!formError || !successMessage) return;

  formError.hidden = true;

  const email = document.getElementById("email");
  if (!email || !(email instanceof HTMLInputElement)) return;

  const emailValue = email.value.trim();

  try {
    const res = await fetch("/api/auth/request-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailValue,
        redirectTo: `${window.location.origin}/reset-password`,
      }),
    });

    if (!res.ok) {
      const data = /** @type {ResetResponse} */ (await res.json());
      throw new Error(data.message || "Failed to send reset link");
    }

    // Show success state
    form.hidden = true;
    successMessage.hidden = false;
  } catch (err) {
    formError.textContent = err instanceof Error ? err.message : "An error occurred";
    formError.hidden = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  if (!form || !(form instanceof HTMLFormElement)) return;
  form.addEventListener("submit", handleForgotPasswordSubmit);
});
