// Integration tests use a local Auth/Data API fixture, never real customer credentials.
import http from "node:http";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";

const accountId = "11111111-1111-4111-8111-111111111111";
let status = "pending";
const emailRedirects = [];
const mock = http.createServer(async (req, res) => {
  let raw = ""; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  let data = {}; let code = 200;
  if (req.url.startsWith("/auth/v1/token")) {
    const role = body.email?.startsWith("admin") ? "admin" : "customer";
    data = { access_token: role, refresh_token: role, expires_in: 3600 };
  } else if (req.url.startsWith("/auth/v1/recover?") || req.url.startsWith("/auth/v1/signup?")) {
    emailRedirects.push(new URL(req.url, "http://localhost").searchParams.get("redirect_to"));
    data = {};
  } else if (req.url === "/auth/v1/user") {
    data = { id: accountId, email: `${token}@example.test`, email_confirmed_at: token === "unconfirmed" ? null : "2026-10-16T00:00:00Z", user_metadata: { business_name: "Test Business", approved: true, isAdmin: true } };
  } else if (req.url === "/rest/v1/rpc/portal_access") {
    if (token === "unavailable") code = 503;
    else data = { status: token === "admin" || token === "unconfirmed" ? "approved" : status, isAdmin: token === "admin" };
  } else if (req.url === "/rest/v1/rpc/review_customer_account") {
    assert.equal(token, "admin"); status = body.decision;
  } else if (req.url.startsWith("/rest/v1/customer_accounts")) {
    data = [{ user_id: "22222222-2222-4222-8222-222222222222", email: "customer@example.test", business_name: "Test Business", contact_name: "Test Customer", status, created_at: "2026-10-16T00:00:00Z" }];
  } else if (req.url.startsWith("/rest/v1/orders")) data = [];
  res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(data));
});
await new Promise(resolve => mock.listen(3198, "127.0.0.1", resolve));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3199", "-H", "127.0.0.1"], {
  env: { ...process.env, SUPABASE_URL: "http://127.0.0.1:3198", SUPABASE_ANON_KEY: "local-test-fixture", RESEND_API_KEY: "test", ORDER_EMAIL_FROM: "test@example.test" },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", chunk => process.stderr.write(chunk));
const base = "http://127.0.0.1:3199";
async function request(path, role, init = {}) {
  return fetch(base + path, { ...init, headers: { ...(role ? { Cookie: `bd_access_token=${role}` } : {}), ...init.headers } });
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + "/api/health")).ok) { ready = true; break; } } catch {}
    await delay(250);
  }
  assert.ok(ready, "Test server started");
  const login = await request("/api/auth/login", null, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: "customer@example.test", password: "local-test-password" }) });
  assert.equal(login.status, 200, "Browser-origin sign-in works behind the Next.js proxy");
  const reset = await request("/api/auth/reset", null, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: "customer@example.test" }) });
  assert.equal(reset.status, 200);
  const signup = await request("/api/auth/signup", null, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ email: "new@example.test", password: "local-test-password", businessName: "Test Business" }) });
  assert.equal(signup.status, 200);
  assert.deepEqual(emailRedirects, ["https://brownderby.ca/reset-password", "https://brownderby.ca/login?confirmed=1"], "Account emails use the public website even when the server sees localhost");
  assert.equal((await request("/api/catalog/prices")).status, 401);
  assert.equal((await request("/api/catalog/prices", "customer")).status, 403);
  assert.equal((await request("/api/catalog/prices", "unconfirmed")).status, 403);
  assert.equal((await request("/api/catalog/prices", "unavailable")).status, 503);
  for (const [path, method] of [["/api/orders", "GET"], ["/api/orders/draft", "GET"], ["/api/orders/draft", "PATCH"], ["/api/orders/draft/items", "POST"], [`/api/orders/${accountId}/submit`, "POST"], [`/api/orders/${accountId}/reorder`, "POST"]]) {
    const response = await request(path, "customer", { method });
    assert.equal(response.status, 403, `${method} ${path} denies pending customer`);
    assert.ok(!(await response.text()).includes("unit_price"));
  }
  assert.equal((await request("/api/admin/accounts", "customer")).status, 403);
  assert.equal((await request("/api/admin/accounts", "customer", { method: "PATCH" })).status, 403);
  assert.equal((await request("/api/admin/accounts", "admin")).status, 200);
  assert.equal((await request("/api/admin/accounts", "admin", { method: "PATCH", headers: { Origin: "https://unrelated.example" } })).status, 403);
  async function decide(decision) {
    const response = await request("/api/admin/accounts", "admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: accountId, decision }) });
    assert.equal(response.status, 200);
  }
  await decide("approved");
  const response = await request("/api/catalog/prices", "customer");
  assert.equal(response.status, 200); assert.ok(Object.keys((await response.json()).prices).length > 2500);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.equal((await request("/api/orders", "customer")).status, 200);
  await decide("declined");
  assert.equal((await request("/api/catalog/prices", "customer")).status, 403);
  await decide("pending");
  const session = await (await request("/api/auth/session", "customer")).json();
  assert.equal(session.pricingApproved, false); assert.equal(session.isAdmin, false);
  console.log("Account approval integration checks passed: email redirects, anonymous, pending, unconfirmed, approved, revoked, unavailable, order routes, admin authorization and CSRF.");
  if (process.argv.includes("--serve")) {
    console.log("Local QA: http://127.0.0.1:3199/login (admin@example.test or customer@example.test; any test password). Ctrl+C to stop.");
    await new Promise(resolve => process.once("SIGINT", resolve));
  }
} finally { server.kill(); mock.close(); }
