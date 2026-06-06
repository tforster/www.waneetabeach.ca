/**
 * email.js — Generic email sender for Cloudflare Workers.
 *
 * Thin wrapper over the Cloudflare send_email binding that enforces the
 * validated payload structure. Import into any worker that has an EMAIL
 * binding configured in its wrangler.json.
 *
 * @see https://developers.cloudflare.com/email-service/api/send-emails/
 */

/**
 * @typedef {{
 *   to: string,
 *   from: string,
 *   subject: string,
 *   html: string,
 *   bcc?: string[],
 *   text?: string,
 * }} EmailMessage
 */

/**
 * Sends an email via the worker's Cloudflare send_email binding.
 *
 * @param {{ send: (msg: EmailMessage) => Promise<void> }} emailBinding - env.EMAIL
 * @param {EmailMessage} message
 * @returns {Promise<void>}
 */
export async function sendEmail(emailBinding, message) {
  await emailBinding.send(message);
}
