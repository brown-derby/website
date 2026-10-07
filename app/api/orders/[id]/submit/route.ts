import { NextRequest, NextResponse } from "next/server";
import {
  emailOrder,
  getOrderForUser,
  type CustomerOrder,
} from "../../../../../lib/order-server";
import {
  databaseRequest,
  emailConfigured,
  getSession,
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

  try {
    await emailOrder(order);

    const submittedAt = new Date().toISOString();
    const response = await databaseRequest(
      "orders?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(session.user.id),
      session.accessToken,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          status: "submitted",
          submitted_at: submittedAt,
          email_status: "sent",
        }),
      }
    );

    if (!response.ok) throw new Error("Unable to finalize order.");
    const rows = (await response.json()) as CustomerOrder[];

    return NextResponse.json({ order: rows[0], emailedTo: "csr@brownderby.ca" });
  } catch {
    await databaseRequest(
      "orders?id=eq." + encodeURIComponent(id) + "&user_id=eq." + encodeURIComponent(session.user.id),
      session.accessToken,
      {
        method: "PATCH",
        body: JSON.stringify({ email_status: "failed" }),
      }
    ).catch(() => null);

    return NextResponse.json(
      { error: "The order could not be emailed. Please try again before considering it submitted." },
      { status: 502 }
    );
  }
}
