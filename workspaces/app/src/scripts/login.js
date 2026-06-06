/**
 * login.js — Login form behaviour.
 *
 * Intercepts the form submit, POSTs credentials as JSON to the auth worker,
 * and redirects to /forum on success. Displays an inline error on failure
 * without a page reload.
 */

/**
 * Handles the login form submission.
 *
 * @param {SubmitEvent} e
 * @returns {Promise<void>}
 */
async function handleSignIn(e) {
  e.preventDefault();
  const form   = /** @type {HTMLFormElement}    */ (e.target);
  const error  = /** @type {HTMLParagraphElement} */ (document.getElementById("login-error"));
  const button = /** @type {HTMLButtonElement}  */ (form.querySelector("button[type=submit]"));

  error.hidden = true;
  button.setAttribute("aria-busy", "true");
  button.disabled = true;

  try {
    const res = await fetch("/api/auth/sign-in/email", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    if (res.ok) {
      window.location.replace("/");
      return;
    }

    const body = await res.json().catch(() => ({}));
    error.textContent = body.message ?? "Invalid email or password.";
    error.hidden = false;
  } catch {
    error.textContent = "Could not reach the server. Please try again.";
    error.hidden = false;
  } finally {
    button.removeAttribute("aria-busy");
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("login-form")?.addEventListener("submit", handleSignIn);
});
