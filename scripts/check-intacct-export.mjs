import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

function loadTypeScript(path, requireFn) {
  const source = readFileSync(path, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", js)(requireFn, mod, mod.exports);
  return mod.exports;
}

const template = loadTypeScript("lib/intacct-template.ts", () => {
  throw new Error("Unexpected module import");
});
const integration = loadTypeScript("lib/intacct.ts", name => {
  assert.equal(name, "./intacct-template");
  return template;
});

const orderId = "12345678-1234-4567-890a-123456789abc";
const order = {
  id: orderId,
  user_id: "irrelevant-test-user",
  status: "submitted",
  submitted_at: "2026-11-22T23:10:00Z",
  notes: "Ship when ready, please",
  order_items: [
    { product_id: "00017", product_name: "Sample item", quantity: 3, unit_price: "1.20", item_notes: "No damage" },
    { product_id: "0200", product_name: "Sample #2", quantity: 2, unit_price: "2.25", item_notes: 'Display "front"\nstack' },
  ],
};
const customer = {
  customer_id: "0001",
  customer_name: "Example test account",
  term_name: "NET7",
  email: null,
  secondary_email: null,
  city: null,
  province: null,
  postal_code: null,
};
const csv = integration.generateIntacctOrderCsv(order, customer, "2026-11-25");
const records = integration.parseCsv(csv);
const headers = records[0];
assert.deepEqual(headers, [...template.INTACCT_ORDER_ENTRY_HEADERS]);
assert.equal(headers.length, 139);
assert.equal(records.length, 3);
const entry = Object.fromEntries(headers.map((header, index) => [header, records[1][index]]));
const second = Object.fromEntries(headers.map((header, index) => [header, records[2][index]]));
assert.equal(entry.TRANSACTIONTYPE, "Sales Order");
assert.equal(entry.DATE, "11/22/2026");
assert.equal(entry.DATEDUE, "11/25/2026");
assert.equal(entry.TERMNAME, "NET7");
assert.equal(entry.DOCUMENTNO, "");
assert.equal(entry.CUSTOMER_ID, "0001");
assert.equal(entry.WAREHOUSEID, "WH001");
assert.equal(entry.QUANTITY, "3");
assert.equal(entry.UNIT, "Each");
assert.equal(entry.PRICE, "1.20");
assert.equal(entry.STATE, "Draft");
assert.equal(entry.REFERENCENO, "WEB-1234567812344567890a123456789abc");
assert.equal(entry.LINE, "1");
assert.equal(second.LINE, "2");
for (const field of ["TRANSACTIONTYPE", "DATE", "DOCUMENTNO", "CUSTOMER_ID", "TERMNAME", "DATEDUE", "REFERENCENO", "MESSAGE", "STATE"]) {
  assert.equal(second[field], "", "Continuation row must leave " + field + " blank");
}
assert.equal(second.ITEMID, "0200");
assert.equal(second.QUANTITY, "2");
assert.equal(second.WAREHOUSEID, "WH001");
assert.equal(second.UNIT, "Each");

const manyLines = Array.from({ length: 20 }, (_, i) => ({ ...order.order_items[0], product_id: String(i + 1).padStart(5, "0") }));
const manyRecords = integration.parseCsv(integration.generateIntacctOrderCsv({ ...order, order_items: manyLines }, customer, "2026-11-25"));
assert.equal(manyRecords.length, 21);
for (const [i, row] of manyRecords.slice(1).entries()) {
  assert.equal(row[headers.indexOf("LINE")], String(i + 1));
  assert.equal(row[headers.indexOf("TRANSACTIONTYPE")], i === 0 ? "Sales Order" : "");
  assert.equal(row[headers.indexOf("REFERENCENO")], i === 0 ? entry.REFERENCENO : "");
}

assert.equal(second.MEMO, 'Display "front"\nstack');
assert.equal(second.PRICE, "2.25");
assert.equal(csv, integration.generateIntacctOrderCsv(order, customer, "2026-11-25"), "Same order snapshot must yield same CSV");
assert.throws(() => integration.generateIntacctOrderCsv(order, customer, "2026-02-30"), /date is invalid/i);
assert.throws(() => integration.generateIntacctOrderCsv(order, customer, "11/25/2026"), /YYYY-MM-DD/i);
assert.throws(() => integration.generateIntacctOrderCsv({ ...order, status: "draft" }, customer, "2026-11-25"), /submitted/i);
assert.throws(() => integration.generateIntacctOrderCsv(order, { ...customer, term_name: null }, "2026-11-25"), /payment terms/i);
assert.throws(() => integration.generateIntacctOrderCsv({ ...order, order_items: [{ ...order.order_items[0], unit_price: 0 }] }, customer, "2026-11-25"), /invalid ID, quantity or price/i);

const email = loadTypeScript("lib/intacct-email.ts", () => { throw new Error("Unexpected email dependency"); });
const previousFrom = process.env.ORDER_EMAIL_FROM;
const previousKey = process.env.RESEND_API_KEY;
process.env.ORDER_EMAIL_FROM = "Brown Derby <test@example.invalid>";
process.env.RESEND_API_KEY = "test-only";
const mailInput = { orderId, customerId: customer.customer_id, shipDate: "2026-11-25", csv };
try {
  let called = 0;
  const status = await email.sendIntacctCsvEmail(mailInput, async (url, options) => {
    called++;
    assert.equal(url, "https://api.resend.com/emails");
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.to, ["csr@brownderby.ca"]);
    assert.equal(payload.attachments.length, 1);
    assert.equal(payload.attachments[0].filename, entry.REFERENCENO + ".csv");
    assert.equal(Buffer.from(payload.attachments[0].content, "base64").toString("utf8"), csv);
    assert.equal(options.headers["Idempotency-Key"], "brown-derby-intacct-csv-" + orderId);
    assert.equal(payload.reply_to, undefined);
    return new Response(JSON.stringify({ id: "mock-email" }), { status: 200 });
  });
  assert.equal(called, 1);
  assert.equal(status, "accepted");
  assert.equal(await email.sendIntacctCsvEmail(mailInput, async () => new Response("", { status: 400 })), "failed");
  assert.equal(await email.sendIntacctCsvEmail(mailInput, async () => { throw new Error("Network failure"); }), "unknown");
  assert.equal(await email.sendIntacctCsvEmail(mailInput, async () => new Response("", { status: 503 })), "unknown");
} finally {
  if (previousFrom === undefined) delete process.env.ORDER_EMAIL_FROM; else process.env.ORDER_EMAIL_FROM = previousFrom;
  if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
}
process.stdout.write("Intacct CSV and internal attachment regression checks passed.\n");

const migration = readFileSync("supabase/intacct-server-submission.sql", "utf8");
assert.ok(migration.includes("'" + headers.join(",") + "'"), "Server-side header order must match Sage template");
const orderEmail = loadTypeScript("lib/order-server.ts", name => {
  if (name === "./catalog") return {};
  if (name === "./portal") return { emailConfigured: () => true, orderRecipient: () => "test@example.invalid" };
  throw new Error("Unexpected module " + name);
});
const previousFetch = globalThis.fetch;
try {
  process.env.ORDER_EMAIL_FROM = "Brown Derby <test@example.invalid>";
  process.env.RESEND_API_KEY = "test-only";
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.to, ["csr@brownderby.ca"]);
    assert.equal(payload.reply_to, "customer@example.invalid");
    assert.equal(options.headers["Idempotency-Key"], "brown-derby-order-" + orderId);
    assert.match(payload.html, /Sample item/);
    if (calls === 1) {
      assert.equal(payload.attachments.length, 1);
      assert.equal(payload.attachments[0].filename, entry.REFERENCENO + ".csv");
      assert.equal(Buffer.from(payload.attachments[0].content, "base64").toString("utf8"), csv);
      assert.match(payload.html, /Draft Sales Order/);
    } else {
      assert.equal(payload.attachments, undefined);
      assert.match(payload.html, /Sage CSV needs review/);
    }
    return new Response(JSON.stringify({ id: "mock-email" }), { status: 200 });
  };
  const mailOrder = { ...order, customer_email: "customer@example.invalid", customer_business_name: "Test business", customer_contact_name: "Test contact" };
  await orderEmail.emailOrder(mailOrder, { csv, reference: entry.REFERENCENO, warning: null });
  await orderEmail.emailOrder(mailOrder, { csv: null, reference: entry.REFERENCENO, warning: "Match customer first" });
  assert.equal(calls, 2);
  globalThis.fetch = async () => new Response("mock failure", { status: 500 });
  await assert.rejects(orderEmail.emailOrder(mailOrder, { csv, reference: entry.REFERENCENO, warning: null }), /Email delivery failed/);
} finally {
  globalThis.fetch = previousFetch;
  if (previousFrom === undefined) delete process.env.ORDER_EMAIL_FROM; else process.env.ORDER_EMAIL_FROM = previousFrom;
  if (previousKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = previousKey;
}
process.stdout.write("Single order email attachment and missing mapping fallback checks passed.\n");
