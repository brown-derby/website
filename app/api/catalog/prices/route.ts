import { NextResponse } from "next/server";
import { catalogProducts, getCatalogPrice } from "../../../../lib/catalog";
import { getSession } from "../../../../lib/portal";

// Customer pricing must never be cached by shared proxies.
export const dynamic = "force-dynamic";
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Sign in required." },
        { status: 401, headers: privateHeaders }
      );
    }

    const prices = Object.fromEntries(
      catalogProducts.map((product) => [product.id, getCatalogPrice(product)])
    );
    return NextResponse.json({ prices }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "Unable to load pricing." },
      { status: 503, headers: privateHeaders }
    );
  }
}
