// Exercise the password reset API against a local Supabase Auth fixture.
// Run only after "npm run build". No real customers or passwords are touched.
import http from "node:http";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const auth = http.createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};

  let status = 200;
  let response = { id: "fixture-user" };

  if (req.url !== "/auth/v1/user" || req.method !== "PUT") {
    status = 404;
    response = { error: "Unrecognized fixture request" };
  } else if (req.headers.authorization !== "Bearer valid-recovery-token") {
    status = 401;
    response = { code: "bad_jwt", message: "Invalid recovery token" };
  } else if (body.password === "current-password") {
    status = 422;
    response = { code: "same_password", message: "New password should be different from the old password." };
  } else if (body.password === "weak") {
    status = 422;
    response = { code: "weak_password", message: "Password does not meet the security requirements." };
  }

  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(response));
});
await new Promise((resolve) => auth.listen(3268, "127.0.0.1", resolve));
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3269", "-H", "127.0.0.1"], {
  env: {
    ...process.env,
    SUPABASE_URL: "http://127.0.0.1:3268",
    SUPABASE_ANON_KEY: "fixture-anon-key",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (chunk) => process.stderr.write(chunk));
const origin = "http://127.0.0.1:3269";
async function update(password, accessToken = "valid-recovery-token", extraHeaders = {}) {
  return fetch(origin + "/api/auth/update-password", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({ password, accessToken }),
  });
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      if ((await fetch(origin + "/login")).ok) { ready = true; break; }
    } catch {}
    await delay(250);
  }
  assert.ok(ready, "Next.js server started");

  const current = await update("current-password");
  assert.equal(current.status, 200);
  assert.deepEqual(await current.json(), { ok: true, unchanged: true }, "Existing password remains usable");

  const previous = await update("previously-used-password");
  assert.equal(previous.status, 200);
  assert.deepEqual(await previous.json(), { ok: true }, "Previously used (not current) password is accepted");

  const weak = await update("weak");
  assert.equal(weak.status, 400);
  assert.match((await weak.json()).error, /security requirements/);

  const invalidToken = await update("different-password", "expired-token");
  assert.equal(invalidToken.status, 400);
  assert.match((await invalidToken.json()).error, /invalid or has expired/);

  const blank = await update("", "");
  assert.equal(blank.status, 400);

  const crossSite = await update("current-password", "valid-recovery-token", { Origin: "https://unrelated.example" });
  assert.equal(crossSite.status, 403);

  console.log("Password recovery checks passed: current password, previous password, weak password, invalid token, input validation, and CSRF.");
} finally {
  server.kill();
  await new Promise((resolve) => auth.close(resolve));
}
