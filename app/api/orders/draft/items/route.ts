import { NextRequest, NextResponse } from "next/server";
import { getCatalogProduct, validQuantity } from "../../../../../lib/catalog";
import { setDraftItem } from "../../../../../lib/order-server";
import { getSession, sameOrigin } from "../../../../../lib/portal";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 403 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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
    const order = await setDraftItem(session.user, productId, quantity);
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unable to update the order." }, { status: 502 });
  }
}
