import products from "../data/products.json";
import programPrices from "../data/program-prices.json";

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
