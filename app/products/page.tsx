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
          <h1>Wholesale products</h1>
          <p>
            Search by product name or item number, or browse by category.
            Sign in to see wholesale prices and add products to your order.
          </p>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <ProductCatalog products={getPublicCatalogProducts()} />
        </div>
      </section>
      <section className="catalog-category-guides">
        <div className="shell">
          <h2>Explore wholesale categories</h2>
          <nav aria-label="Wholesale category guides">
            <CategoryLinks />
          </nav>
        </div>
      </section>
    </>
  );
}
