import products from "../data/products.json";

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  websitePrice: number;
};

export const catalogProducts = products as CatalogProduct[];

const byId = new Map(catalogProducts.map((product) => [product.id, product]));

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
