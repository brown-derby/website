// Run with: node --experimental-strip-types scripts/check-approval-email.mjs
// Pure fixture: no customer records are changed and no external email is sent.
import assert from "node:assert/strict";
import { buildApprovalEmail, sendApprovalEmail } from "../lib/approval-email.ts";

const account = {
  user_id: "22222222-2222-4222-8222-222222222222",
  email: "customer@example.test",
  business_name: "Example & Co",
  contact_name: '<script>alert("x")</script>',
};
const message = buildApprovalEmail(account);
assert.equal(message.subject, "Your Brown Derby Wholesale account is approved");
assert.match(message.html, /https:\/\/brownderby\.ca\/login/);
assert.ok(!message.html.includes("<script>"), "Customer-entered fields must not become HTML");
assert.match(message.html, /&lt;script&gt;/);
assert.match(message.text, /Forgot your password\?/);
assert.match(message.text, /email address/);

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.RESEND_API_KEY;
const originalFrom = process.env.ORDER_EMAIL_FROM;
let calls = 0;
try {
  process.env.RESEND_API_KEY = "fixture-key";
  process.env.ORDER_EMAIL_FROM = "Brown Derby Wholesale <csr@brownderby.ca>";
  globalThis.fetch = async (url, init) => {
    calls += 1;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.method, "POST");
    assert.equal(init.headers["Idempotency-Key"], "brown-derby-test-approval");
    const body = JSON.parse(init.body);
    assert.equal(body.to[0], account.email);
    assert.equal(body.reply_to, "csr@brownderby.ca");
    assert.equal(body.from, process.env.ORDER_EMAIL_FROM);
    assert.equal(body.subject, message.subject);
    assert.equal(body.html, message.html);
    assert.equal(body.text, message.text);
    return new Response(JSON.stringify({ id: "fixture-email-id" }), { status: 200 });
  };
  await sendApprovalEmail(account, "brown-derby-test-approval");
  assert.equal(calls, 1);

  globalThis.fetch = async () => new Response('{"error":"invalid sender"}', { status: 422 });
  await assert.rejects(sendApprovalEmail(account, "brown-derby-test-bad-sender"), /rejected/);

  delete process.env.RESEND_API_KEY;
  await assert.rejects(sendApprovalEmail(account, "brown-derby-test-missing-key"), /not configured/);
} finally {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = originalApiKey;
  if (originalFrom === undefined) delete process.env.ORDER_EMAIL_FROM;
  else process.env.ORDER_EMAIL_FROM = originalFrom;
}
console.log("Approval email checks passed: branded sign-in link, HTML escaping, provider payload, failures, and missing configuration.");
