import { NextRequest, NextResponse } from "next/server";
import { setDraftItem, getOrderForUser } from "../../../../../lib/order-server";
import { getSession, sameOrigin } from "../../../../../lib/portal";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await context.params;
  const order = await getOrderForUser(session.user.id, id).catch(() => null);

  if (!order || order.status !== "submitted") {
    return NextResponse.json({ error: "Submitted order not found." }, { status: 404 });
  }

  try {
    let draft = null;
    for (const item of order.order_items || []) {
      draft = await setDraftItem(session.user, item.product_id, item.quantity);
    }
    return NextResponse.json({ order: draft });
  } catch {
    return NextResponse.json({ error: "Unable to create the reorder draft." }, { status: 502 });
  }
}
