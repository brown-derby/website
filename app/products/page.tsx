import ProductCatalog from "./ProductCatalog";
import CategoryLinks from "../components/CategoryLinks";
import { pageMetadata } from "../../lib/seo";
import { getPublicCatalogProducts } from "../../lib/catalog";

export const metadata = pageMetadata(
  "Wholesale Products in Newfoundland",
  "Browse Brown Derby's wholesale food, beverages, candy, packaging, cleaning and restaurant supplies. View our catalog from Grand Falls-Windsor, Newfoundland.",
  "/products"
);

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero product-page-hero">
        <div className="shell">
          <p className="eyebrow">Products</p>
          <h1>Browse the Brown Derby catalog.</h1>
          <p>
            Search by product name or item number, or browse our catalog by category.
            Brown Derby supplies wholesale food, beverages, confectionery, packaging,
            cleaning products and restaurant supplies from Grand Falls-Windsor,
            Newfoundland. Sign in to see wholesale pricing and place an order.
          </p>
          <nav aria-label="Wholesale category guides">
            <CategoryLinks />
          </nav>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <ProductCatalog products={getPublicCatalogProducts()} />
        </div>
      </section>
    </>
  );
}
