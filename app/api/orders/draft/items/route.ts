import { NextRequest, NextResponse } from "next/server";
import { getCatalogProduct, validQuantity } from "../../../../../lib/catalog";
import { setDraftItem, updateDraftItemNote } from "../../../../../lib/order-server";
import { getSession, pricingDenied, sameOrigin } from "../../../../../lib/portal";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
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

  const body = await request.json().catch(() => null);
  const productId =
    typeof body?.productId === "string" ? body.productId.trim() : "";
  const quantity = body?.quantity;

  if (!productId || !getCatalogProduct(productId)) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  if (quantity !== 0 && !validQuantity(quantity)) {
    return NextResponse.json(
      { error: "Quantity must be a whole number between 1 and 9,999." },
      { status: 400 }
    );
  }

  try {
    const order = await setDraftItem(
      session.user,
      session.accessToken,
      productId,
      quantity
    );
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to update the order." }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
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

  const body = await request.json().catch(() => null);
  const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
  if (!productId || typeof body?.notes !== "string" || body.notes.length > 500) {
    return NextResponse.json(
      { error: "Choose an order item and enter up to 500 characters." },
      { status: 400 }
    );
  }

  try {
    const order = await updateDraftItemNote(
      session.user.id,
      session.accessToken,
      productId,
      body.notes.trim()
    );
    if (!order) {
      return NextResponse.json({ error: "Item not found in your draft order." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to save the item note." }, { status: 502 });
  }
}
