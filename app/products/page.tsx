import ProductCatalog from "./ProductCatalog";

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero product-page-hero">
        <div className="shell">
          <p className="eyebrow">Products</p>
          <h1>Browse the Brown Derby catalog.</h1>
          <p>
            Search our product list or browse by category. Prices shown are the
            prices currently present in Brown Derby&apos;s supplied price list.
          </p>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <div className="pricing-note">
            <strong>About pricing</strong>
            <p>
              Most items have one clear price. Where the source file contains two
              different price records, both are shown while we confirm which price
              should be published as the current customer price.
            </p>
          </div>
          <ProductCatalog />
        </div>
      </section>
    </>
  );
}
