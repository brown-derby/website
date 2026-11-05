import products from "../data/products.json";
import approvedImages from "../data/approved-product-images.json";
import { databaseRequest } from "./portal";

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
};

export const catalogProducts = products as CatalogProduct[];

// Public pages receive only product details; prices remain on the server.
export type PublicCatalogProduct = Pick<CatalogProduct, "id" | "name" | "category"> & {
  imageUrl?: string;
};

type ApprovedImage = {
  productId: string;
  productName: string;
  imageUrl: string;
  status: string;
  sha256: string;
  approvalId: string;
  matchConfirmed: boolean;
  usageConfirmed: boolean;
  approvalMethod?: string;
  imageConfirmed?: boolean;
};

const imagesById = approvedImages as Record<string, ApprovedImage>;

export function getPublicCatalogProducts(): PublicCatalogProduct[] {
  return catalogProducts.map(({ id, name, category }) => {
    const image = imagesById[id];
    // Exact ID AND name binding; candidate research never enters public props.
    const imageUrl = image?.status === "approved" && image.productId === id &&
      image.productName === name && image.matchConfirmed === true &&
      (image.usageConfirmed === true || (image.approvalMethod === "one_click_add" && image.imageConfirmed === true)) && Boolean(image.approvalId) &&
      /^[0-9a-f]{64}$/.test(image.sha256) &&
      new RegExp(`^/product-images/${image.sha256}\\.(jpg|png|webp)$`).test(image.imageUrl)
      ? image.imageUrl : undefined;
    return { id, name, category, ...(imageUrl ? { imageUrl } : {}) };
  });
}

const byId = new Map(catalogProducts.map((product) => [product.id, product]));

// Pricing is held in a private Supabase table, NOT in the public GitHub repo.
// Supabase checks the signed-in user and their verified, approved account
// before allowing this RPC to return any wholesale pricing.
export async function getCatalogPrices(
  accessToken: string
): Promise<Record<string, number>> {
  const response = await databaseRequest(
    "rpc/catalog_prices_for_customer",
    accessToken,
    { method: "POST", body: "{}" }
  );

  if (!response.ok) {
    throw new Error("Unable to load authorized catalogue pricing.");
  }

  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Catalogue pricing response was invalid.");
  }
  return result as Record<string, number>;
}

export function getCatalogPrice(
  product: CatalogProduct,
  prices: Record<string, number>
): number {
  const price = prices[product.id];
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("No valid price for " + product.id);
  }
  return price;
}

export function getCatalogProduct(id: string) {
  return byId.get(id) || null;
}

export function validQuantity(value: unknown) {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9999
  );
}
