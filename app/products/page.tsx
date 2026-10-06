import ProductCatalog from "./ProductCatalog";

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero product-page-hero">
        <div className="shell">
          <p className="eyebrow">Products</p>
          <h1>Browse the Brown Derby catalog.</h1>
          <p>
            Search by product name or item number, or browse our catalog by category.
            Select a category to see its full price list.
          </p>
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
