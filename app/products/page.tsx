import ProductCatalog from "./ProductCatalog";
import CategoryLinks from "../components/CategoryLinks";
import { pageMetadata } from "../../lib/seo";

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
            Newfoundland. Select a category to see its full price list.
          </p>
          <nav aria-label="Wholesale category guides">
            <CategoryLinks />
          </nav>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <ProductCatalog />
        </div>
      </section>
    </>
  );
}
