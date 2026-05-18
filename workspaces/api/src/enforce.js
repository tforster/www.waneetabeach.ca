/**
 * enforce(claims, object, action) — Casbin-style authorisation check.
 * Current policy: only admin role is permitted on any object/action.
 *
 * @param {{ role: string }|null} claims
 * @param {string} [_object]
 * @param {string} [_action]
 * @returns {boolean}
 */
export function enforce(claims, _object, _action) {
  return claims?.role === "admin";
}
