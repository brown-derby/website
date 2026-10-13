import products from "../data/products.json";
import programPrices from "../data/program-prices.json";
import approvedImages from "../data/approved-product-images.json";

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  websitePrice: number;
};

type ProgramPrice = {
  price: number;
  toDate: string;
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
const programById = programPrices as Record<string, ProgramPrice>;

function newfoundlandDateKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/St_Johns",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getCatalogPrice(product: CatalogProduct, at = new Date()) {
  const program = programById[product.id];
  if (program && newfoundlandDateKey(at) <= program.toDate) {
    return program.price;
  }
  return product.websitePrice;
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
