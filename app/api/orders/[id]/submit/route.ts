import { NextRequest, NextResponse } from "next/server";
import {
  emailOrder,
  getOrderForUser,
  type CustomerOrder,
  type OrderEmailAttachment,
} from "../../../../../lib/order-server";
import {
  databaseRequest,
  emailConfigured,
  getSession, pricingDenied,
  sameOrigin,
} from "../../../../../lib/portal";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Order email delivery is not configured yet." },
      { status: 503 }
    );
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!session.pricingApproved) {
    return NextResponse.json(pricingDenied(session), {
      status: session.approvalStatus === "unavailable" ? 503 : 403,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
    });
  }

  const { id } = await context.params;
  const order = await getOrderForUser(
    session.user.id,
    id,
    session.accessToken
  ).catch(() => null);

  if (!order || order.status !== "draft") {
    return NextResponse.json({ error: "Draft order not found." }, { status: 404 });
  }
  if (!order.order_items?.length) {
    return NextResponse.json({ error: "Add at least one item before submitting." }, { status: 400 });
  }

  // The database atomically freezes submitted prices, the order and its CSV.
  // Do not email a draft or regenerate a second CSV with different dates or mapping.
  let prepared: OrderEmailAttachment & { order: CustomerOrder };
  try {
    const response = await databaseRequest("rpc/submit_website_order", session.accessToken, {
      method: "POST", body: JSON.stringify({ target_order_id: id }),
    });
    if (!response.ok) {
      return NextResponse.json({
        error: "Unable to submit this order. Check your order history before retrying; an item may no longer have an available price.",
      }, { status: 409 });
    }
    prepared = await response.json();
    if (prepared.order?.id !== id || prepared.order.status !== "submitted") throw new Error("Invalid order snapshot");
  } catch {
    return NextResponse.json({
      error: "Unable to confirm submission. Check your order history before retrying.",
    }, { status: 503 });
  }

  let emailSent = false;
  try {
    await emailOrder(prepared.order, prepared);
    emailSent = true;
  } catch {
    console.warn("Website order saved, email delivery unconfirmed", id);
  }

  // An email failure must not duplicate or discard a saved order.
  try {
    const response = await databaseRequest("rpc/record_website_order_email", session.accessToken, {
      method: "POST", body: JSON.stringify({ target_order_id: id, sent: emailSent }),
    });
    if (!response.ok) console.warn("Website order email status not recorded", id);
  } catch {
    console.warn("Website order email status not recorded", id);
  }

  return NextResponse.json({
    order: { ...prepared.order, email_status: emailSent ? "sent" : "failed" },
    emailSent,
    emailedTo: emailSent ? "csr@brownderby.ca" : null,
  });
}
