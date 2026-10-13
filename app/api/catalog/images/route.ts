import { NextResponse } from "next/server";
import { getPublicCatalogProducts } from "../../../../lib/catalog";

// The private review desk can verify publication without customer pricing,
// reviewer identities, candidate research, or privileged credentials.
export function GET() {
  const products = getPublicCatalogProducts().filter((product) => product.imageUrl);
  return NextResponse.json(
    { application: "brown-derby-published-images", products },
    { headers: { "Cache-Control": "no-store" } },
  );
}
