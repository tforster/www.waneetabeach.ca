/**
 * notify.integration.test.js — Integration test for email notifications.
 *
 * IMPORTANT: This test sends REAL emails via Cloudflare Email Routing.
 *
 * Setup before running:
 * 1. Set environment variables:
 *    - CLOUDFLARE_ACCOUNT_ID: Your Cloudflare account ID
 *    - CLOUDFLARE_API_TOKEN: Your Cloudflare API token with Email Routing scope
 *    - TEST_EMAIL_FROM: Sender address (must match wrangler.json allowed_sender_addresses)
 *    - TEST_EMAIL_TO: Recipient address (default: troy.forster@gmail.com)
 *
 * 2. Optional: Create .env.test file in workspace root:
 *    CLOUDFLARE_ACCOUNT_ID=abc123...
 *    CLOUDFLARE_API_TOKEN=v1.0...
 *    TEST_EMAIL_FROM=no-reply@waneetabeach.ca
 *    TEST_EMAIL_TO=troy.forster@gmail.com
 *
 * Run test:
 *   npm test -- tests/notify.integration.test.js
 *   Or with env vars: CLOUDFLARE_ACCOUNT_ID=... npm test -- tests/notify.integration.test.js
 *
 * Test will:
 * 1. Send a test email via Cloudflare Email Routing API
 * 2. Verify the API call succeeded (201 Created or 200 OK)
 * 3. Display the email tracking ID
 * 4. Check your inbox for the test email
 */

import { test, skip } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildEmailPayload } from "../workspaces/api/src/notify.js";
import { sendEmail } from "../workspaces/shared/email.js";

// Load environment variables from .env.test if it exists
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envTestPath = path.join(__dirname, "..", ".env.test");

if (fs.existsSync(envTestPath)) {
  const envContent = fs.readFileSync(envTestPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

const envVars = {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  TEST_EMAIL_FROM: process.env.TEST_EMAIL_FROM || "no-reply@waneetabeach.ca",
  TEST_EMAIL_TO: process.env.TEST_EMAIL_TO || "troy.forster@gmail.com",
};

// Skip all tests if credentials are not provided
const skipIfNoCredentials = (name, fn) => {
  if (!envVars.CLOUDFLARE_ACCOUNT_ID || !envVars.CLOUDFLARE_API_TOKEN) {
    skip(name);
    return;
  }
  test(name, fn);
};

/**
 * Send an email via Cloudflare Email API.
 *
 * @param {string} accountId
 * @param {string} apiToken
 * @param {object} payload
 * @returns {Promise<object>}
 */
async function sendEmailViaCloudflareAPI(accountId, apiToken, payload) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Cloudflare API error (${response.status}): ${data.errors?.[0]?.message || JSON.stringify(data)}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

skipIfNoCredentials("Email Integration: Send simple test email", async () => {
  const payload = {
    to: envVars.TEST_EMAIL_TO,
    from: envVars.TEST_EMAIL_FROM,
    subject: "Integration Test: Email Configuration Verification",
    html: `
      <h1>Email Configuration Test</h1>
      <p>This is a test email sent via Cloudflare Email Routing API.</p>
      <p>If you received this, your Cloudflare Email Routing is configured correctly.</p>
      <p>
        <strong>Test Details:</strong><br>
        From: ${envVars.TEST_EMAIL_FROM}<br>
        To: ${envVars.TEST_EMAIL_TO}<br>
        Sent at: ${new Date().toISOString()}
      </p>
    `,
  };

  const result = await sendEmailViaCloudflareAPI(envVars.CLOUDFLARE_ACCOUNT_ID, envVars.CLOUDFLARE_API_TOKEN, payload);

  // Verify API response
  assert.ok(result.success, "API call should succeed");
  console.log(`\n✓ Email sent successfully`);
  console.log(`  To: ${envVars.TEST_EMAIL_TO}`);
  console.log(`  From: ${envVars.TEST_EMAIL_FROM}`);
  if (result.result?.id) {
    console.log(`  Message ID: ${result.result.id}`);
  }
});

skipIfNoCredentials("Email Integration: Send thread notification via buildEmailPayload", async () => {
  // Use the actual buildEmailPayload function to test the payload structure
  const payload = buildEmailPayload(envVars.TEST_EMAIL_FROM, [envVars.TEST_EMAIL_TO], {
    category: "General",
    title: "Community Message: Welcome to waneetabeach.ca",
    authorName: "Admin",
    body: "Currently, this website is very light on functionality. I have ideas, but I want to hear from you and what you would like to see.",
    threadUrl: "https://waneetabeach.ca/forum#thread123",
  });

  console.log("\n✓ Testing buildEmailPayload + sendEmail:");
  console.log(`  To: ${payload.to}`);
  console.log(`  From: ${payload.from}`);
  console.log(`  Subject: ${payload.subject}`);
  console.log(`  BCC recipients: ${payload.bcc.join(", ")}`);

  // Use sendEmail from shared/email.js with a mock binding that calls the Cloudflare REST API
  const mockEmailBinding = {
    send: (msg) =>
      sendEmailViaCloudflareAPI(envVars.CLOUDFLARE_ACCOUNT_ID, envVars.CLOUDFLARE_API_TOKEN, msg).then((r) => {
        if (r.result?.id) console.log(`  Message ID: ${r.result.id}`);
      }),
  };

  await sendEmail(mockEmailBinding, payload);

  console.log(`✓ sendEmail dispatched successfully`);
});

skipIfNoCredentials("Email Integration: Check credentials are valid", async () => {
  assert.ok(envVars.CLOUDFLARE_ACCOUNT_ID, "CLOUDFLARE_ACCOUNT_ID environment variable should be set");
  assert.ok(envVars.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN environment variable should be set");
  console.log(`\n✓ Credentials loaded`);
  console.log(`  Account ID: ${envVars.CLOUDFLARE_ACCOUNT_ID.substring(0, 8)}...`);
  console.log(`  Token: ${envVars.CLOUDFLARE_API_TOKEN.substring(0, 8)}...`);
});

// Informational test that runs even without credentials
test("Email Integration: Setup instructions", async () => {
  if (!envVars.CLOUDFLARE_ACCOUNT_ID || !envVars.CLOUDFLARE_API_TOKEN) {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║  Email Integration Test: Setup Required                       ║
╚═══════════════════════════════════════════════════════════════╝

To run email integration tests, set environment variables:

1. Get your Cloudflare credentials:
   - Account ID: Log in to Cloudflare → Right sidebar "Manage Account"
   - API Token: https://dash.cloudflare.com/profile/api-tokens
     Create token with "Email Routing" scope

2. Create .env.test in workspace root:
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_API_TOKEN=your-api-token
   TEST_EMAIL_FROM=no-reply@waneetabeach.ca
   TEST_EMAIL_TO=troy.forster@gmail.com

3. Run test:
   npm test -- tests/notify.integration.test.js

Or set vars inline:
   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_API_TOKEN=... npm test -- tests/notify.integration.test.js
    `);
  } else {
    console.log(`\n✓ Credentials configured. Running email integration tests...`);
  }
});
