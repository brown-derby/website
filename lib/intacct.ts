import { INTACCT_ORDER_ENTRY_HEADERS } from "./intacct-template";

export type IntacctCustomer = {
  customer_id: string;
  customer_name: string;
  term_name: string | null;
  email: string | null;
  secondary_email: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
};

export type ImportCustomer = {
  customer_id: string;
  customer_name: string;
  term_name: string;
  email: string;
  secondary_email: string;
  city: string;
  province: string;
  postal_code: string;
};

export type ExportOrder = {
  id: string;
  status: string;
  submitted_at: string | null;
  user_id: string;
  notes: string;
  order_items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: string | number;
    item_notes: string;
  }>;
};

/** Handles CRLF, quoted commas, escaped quotes, and multiline quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { value += '"'; i++; }
      else if (!quoted && value === "") quoted = true;
      else if (quoted) quoted = false;
      else throw new Error("Unexpected quotation mark in CSV.");
    } else if (c === "," && !quoted) {
      row.push(value); value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(value); value = "";
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else {
      value += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted CSV field.");
  if (value || row.length) {
    row.push(value);
    if (row.some(cell => cell.trim())) rows.push(row);
  }
  return rows;
}

export function parseCustomerExport(text: string): ImportCustomer[] {
  if (text.length > 2_000_000) throw new Error("Customer CSV is too large.");
  const records = parseCsv(text);
  if (records.length < 2 || records.length > 5001) {
    throw new Error("Customer CSV must contain 1–5,000 records.");
  }
  const headers = records[0].map(h => h.trim().toLowerCase());
  const at = (header: string) => headers.indexOf(header.toLowerCase());
  if (at("Customer ID") < 0 || at("Customer name") < 0) {
    throw new Error("This is not an Intacct Customer export: ID or name column is missing.");
  }
  const get = (cells: string[], key: string) => {
    const index = at(key);
    return index < 0 ? "" : (cells[index] || "").trim();
  };
  const seen = new Set<string>();
  return records.slice(1).map((cells, index) => {
    const customer_id = get(cells, "Customer ID");
    const customer_name = get(cells, "Customer name");
    if (!customer_id || !customer_name || customer_id.length > 21) {
      throw new Error("Invalid customer ID or name on row " + (index + 2) + ".");
    }
    if (seen.has(customer_id)) {
      throw new Error("Duplicate customer ID " + customer_id + " in the uploaded file.");
    }
    seen.add(customer_id);
    const first = get(cells, "Email address") || get(cells, "Bill-to contact: Email 1") ||
      get(cells, "Contact: Email 1");
    const second = get(cells, "Secondary email address") ||
      get(cells, "Bill-to contact: Email 2") || get(cells, "Contact: Email 2");
    return {
      customer_id, customer_name,
      term_name: get(cells, "Term"),
      email: first, secondary_email: second,
      city: get(cells, "City"),
      province: get(cells, "State or territory"),
      postal_code: get(cells, "ZIP or postal code")
    };
  });
}

export function orderReference(orderId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("Invalid order ID.");
  return "WEB-" + orderId.replace(/-/g, "").toLowerCase();
}

function dateInNewfoundland(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Order date is invalid.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/St_Johns", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function shortDate(date: Date) {
  return (date.getUTCMonth() + 1) + "/" + date.getUTCDate() + "/" + date.getUTCFullYear();
}

function safeCsvCell(raw: string) {
  // Prevent a free-text customer note from becoming a formula if staff open the CSV in Excel.
  const value = /^[=+@\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + value.replace(/"/g, '""') + '"';
}

export function generateIntacctOrderCsv(order: ExportOrder, customer: IntacctCustomer) {
  if (order.status !== "submitted" || !order.submitted_at) {
    throw new Error("Only submitted orders can be exported.");
  }
  if (!customer.customer_id || !order.order_items?.length) {
    throw new Error("Customer mapping or order lines are missing.");
  }
  const match = /^NET([0-9]{1,3})$/i.exec(customer.term_name || "");
  if (!match) throw new Error("Review this customer's payment terms before export.");
  const termDays = Number(match[1]);
  if (termDays > 365) throw new Error("Unusually long terms require manual review.");

  const submitted = dateInNewfoundland(order.submitted_at);
  const transactionDate = new Date(Date.UTC(submitted.year, submitted.month - 1, submitted.day));
  const dueDate = new Date(transactionDate.getTime() + termDays * 86_400_000);
  const reference = orderReference(order.id);

  const header = INTACCT_ORDER_ENTRY_HEADERS.join(",");
  const lines = order.order_items.map((item, index) => {
    const unitPrice = Number(item.unit_price);
    if (!item.product_id || !Number.isInteger(item.quantity) || item.quantity < 1 ||
      item.quantity > 9999 || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("An item has an invalid ID, quantity or price.");
    }
    const values: Record<string, string> = {};
    for (const field of INTACCT_ORDER_ENTRY_HEADERS) values[field] = "";
    values.TRANSACTIONTYPE = "Sales Order";
    values.DATE = shortDate(transactionDate);
    values.DOCUMENTNO = ""; // Intacct's configured Sales Order numbering sequence
    values.CUSTOMER_ID = customer.customer_id;
    values.TERMNAME = customer.term_name || "";
    values.DATEDUE = shortDate(dueDate);
    values.REFERENCENO = reference;
    values.MESSAGE = (order.notes || "").trim().slice(0, 1000);
    values.STATE = "Draft";
    values.LINE = String(index + 1);
    values.ITEMID = item.product_id;
    values.WAREHOUSEID = "WH001";
    values.QUANTITY = String(item.quantity);
    values.UNIT = "Each";
    values.PRICE = unitPrice.toFixed(2);
    values.MEMO = (item.item_notes || "").trim().slice(0, 4000);
    // TAXABLE and tax/surcharge fields are deliberately left for Intacct's item/transaction defaults.
    return INTACCT_ORDER_ENTRY_HEADERS.map(field => safeCsvCell(values[field])).join(",");
  });
  return "\uFEFF" + [header, ...lines].join("\r\n") + "\r\n";
}
