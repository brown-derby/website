import { getCatalogProduct } from "./catalog";
import {
  customerSnapshot,
  databaseRequest,
  emailConfigured,
  orderRecipient,
  type PortalUser,
} from "./portal";

export type OrderItem = {
  id?: number;
  product_id: string;
  product_name: string;
  category: string;
  unit_price: number | string;
  quantity: number;
};

export type CustomerOrder = {
  id: string;
  user_id: string;
  customer_email: string;
  customer_business_name: string;
  customer_contact_name: string;
  status: "draft" | "submitted";
  notes: string;
  email_status: "not_sent" | "sent" | "failed";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

const orderSelect =
  "id,user_id,customer_email,customer_business_name,customer_contact_name,status,notes,email_status,submitted_at,created_at,updated_at,order_items(id,product_id,product_name,category,unit_price,quantity)";

async function jsonOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Database request failed: " + response.status + " " + detail);
  }
  return (await response.json()) as T;
}

export async function getOrdersForUser(userId: string, accessToken: string) {
  const response = await databaseRequest(
    "orders?select=" +
      encodeURIComponent(orderSelect) +
      "&user_id=eq." +
      encodeURIComponent(userId) +
      "&order=created_at.desc",
    accessToken
  );
  return jsonOrThrow<CustomerOrder[]>(response);
}

export async function getDraftForUser(userId: string, accessToken: string) {
  const response = await databaseRequest(
    "orders?select=" +
      encodeURIComponent(orderSelect) +
      "&user_id=eq." +
      encodeURIComponent(userId) +
      "&status=eq.draft&limit=1",
    accessToken
  );
  const rows = await jsonOrThrow<CustomerOrder[]>(response);
  return rows[0] || null;
}

export async function getOrderForUser(userId: string, orderId: string, accessToken: string) {
  const response = await databaseRequest(
    "orders?select=" +
      encodeURIComponent(orderSelect) +
      "&user_id=eq." +
      encodeURIComponent(userId) +
      "&id=eq." +
      encodeURIComponent(orderId) +
      "&limit=1",
    accessToken
  );
  const rows = await jsonOrThrow<CustomerOrder[]>(response);
  return rows[0] || null;
}

export async function ensureDraft(user: PortalUser, accessToken: string) {
  const existing = await getDraftForUser(user.id, accessToken);
  if (existing) return existing;

  const customer = customerSnapshot(user);
  const response = await databaseRequest("orders", accessToken, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: user.id,
      customer_email: customer.email,
      customer_business_name: customer.businessName,
      customer_contact_name: customer.contactName,
      status: "draft",
      notes: "",
      email_status: "not_sent",
    }),
  });

  const rows = await jsonOrThrow<CustomerOrder[]>(response);
  return rows[0];
}

export async function setDraftItem(
  user: PortalUser,
  accessToken: string,
  productId: string,
  quantity: number
) {
  const product = getCatalogProduct(productId);
  if (!product) throw new Error("Product not found.");

  const draft = await ensureDraft(user, accessToken);

  if (quantity === 0) {
    const response = await databaseRequest(
      "order_items?order_id=eq." +
        encodeURIComponent(draft.id) +
        "&product_id=eq." +
        encodeURIComponent(productId),
      accessToken,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error("Unable to remove the item.");
    return getDraftForUser(user.id, accessToken);
  }

  const response = await databaseRequest(
    "order_items?on_conflict=order_id,product_id",
    accessToken,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        order_id: draft.id,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        unit_price: product.websitePrice,
        quantity,
      }),
    }
  );

  await jsonOrThrow<OrderItem[]>(response);
  return getDraftForUser(user.id, accessToken);
}

export async function updateDraftNotes(userId: string, accessToken: string, notes: string) {
  const draft = await getDraftForUser(userId, accessToken);
  if (!draft) return null;

  const response = await databaseRequest(
    "orders?id=eq." +
      encodeURIComponent(draft.id) +
      "&user_id=eq." +
      encodeURIComponent(userId) +
      "&status=eq.draft",
    accessToken,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ notes }),
    }
  );

  const rows = await jsonOrThrow<CustomerOrder[]>(response);
  return rows[0] || null;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] || character
  );
}

function money(value: number | string) {
  const number = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(Number.isFinite(number) ? number : 0);
}

export async function emailOrder(order: CustomerOrder) {
  if (!emailConfigured()) {
    throw new Error("Order email is not configured.");
  }

  const items = order.order_items || [];
  const total = items.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0
  );
  const rows = items
    .map(
      (item) =>
        "<tr>" +
        "<td style=\"padding:8px;border-bottom:1px solid #ddd\">" +
        escapeHtml(item.product_id) +
        "</td>" +
        "<td style=\"padding:8px;border-bottom:1px solid #ddd\">" +
        escapeHtml(item.product_name) +
        "</td>" +
        "<td style=\"padding:8px;border-bottom:1px solid #ddd;text-align:right\">" +
        item.quantity +
        "</td>" +
        "<td style=\"padding:8px;border-bottom:1px solid #ddd;text-align:right\">" +
        money(item.unit_price) +
        "</td>" +
        "<td style=\"padding:8px;border-bottom:1px solid #ddd;text-align:right\">" +
        money(Number(item.unit_price) * item.quantity) +
        "</td>" +
        "</tr>"
    )
    .join("");

  const shortId = order.id.slice(0, 8).toUpperCase();
  const subject =
    "Website order " +
    shortId +
    " — " +
    (order.customer_business_name || order.customer_email);

  const html =
    "<div style=\"font-family:Arial,sans-serif;color:#2a1a12;max-width:800px\">" +
    "<h1 style=\"font-family:Georgia,serif\">New Brown Derby website order</h1>" +
    "<p><strong>Order:</strong> " +
    shortId +
    "</p>" +
    "<p><strong>Business:</strong> " +
    escapeHtml(order.customer_business_name || "Not supplied") +
    "<br><strong>Contact:</strong> " +
    escapeHtml(order.customer_contact_name || "Not supplied") +
    "<br><strong>Email:</strong> " +
    escapeHtml(order.customer_email) +
    "</p>" +
    "<table style=\"width:100%;border-collapse:collapse\">" +
    "<thead><tr>" +
    "<th style=\"padding:8px;text-align:left;border-bottom:2px solid #6a3a21\">Item #</th>" +
    "<th style=\"padding:8px;text-align:left;border-bottom:2px solid #6a3a21\">Product</th>" +
    "<th style=\"padding:8px;text-align:right;border-bottom:2px solid #6a3a21\">Qty</th>" +
    "<th style=\"padding:8px;text-align:right;border-bottom:2px solid #6a3a21\">Price</th>" +
    "<th style=\"padding:8px;text-align:right;border-bottom:2px solid #6a3a21\">Line total</th>" +
    "</tr></thead><tbody>" +
    rows +
    "</tbody></table>" +
    "<p style=\"text-align:right;font-size:18px\"><strong>Order total: " +
    money(total) +
    "</strong></p>" +
    (order.notes
      ? "<p><strong>Customer notes:</strong><br>" +
        escapeHtml(order.notes).replace(/\n/g, "<br>") +
        "</p>"
      : "") +
    "<p style=\"color:#655247\">Prices are based on the website catalog at the time the customer submitted the order.</p>" +
    "</div>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.RESEND_API_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": "brown-derby-order-" + order.id,
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM,
      to: [orderRecipient()],
      reply_to: order.customer_email || undefined,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Email delivery failed: " + response.status + " " + detail);
  }

  return response.json();
}
