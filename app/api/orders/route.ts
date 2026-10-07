import { NextResponse } from "next/server";
import { getOrdersForUser } from "../../../lib/order-server";
import { getSession, portalConfigured } from "../../../lib/portal";

export async function GET() {
  if (!portalConfigured()) {
    return NextResponse.json({ error: "Customer portal is not configured." }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const orders = await getOrdersForUser(session.user.id);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Unable to load orders." }, { status: 502 });
  }
}
