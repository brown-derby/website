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
assert.equal(second.MEMO, 'Display "front"\nstack');
assert.equal(second.PRICE, "2.25");
assert.equal(csv, integration.generateIntacctOrderCsv(order, customer, "2026-11-25"), "Same order snapshot must yield same CSV");
assert.throws(() => integration.generateIntacctOrderCsv(order, customer, "2026-02-30"), /date is invalid/i);
assert.throws(() => integration.generateIntacctOrderCsv(order, customer, "11/25/2026"), /YYYY-MM-DD/i);
assert.throws(() => integration.generateIntacctOrderCsv({ ...order, status: "draft" }, customer, "2026-11-25"), /submitted/i);
assert.throws(() => integration.generateIntacctOrderCsv(order, { ...customer, term_name: null }, "2026-11-25"), /payment terms/i);
assert.throws(() => integration.generateIntacctOrderCsv({ ...order, order_items: [{ ...order.order_items[0], unit_price: 0 }] }, customer, "2026-11-25"), /invalid ID, quantity or price/i);

process.stdout.write("Intacct CSV generation regression checks passed.\n");
