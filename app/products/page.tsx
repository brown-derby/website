import Link from "next/link";

const catalogSteps = [
  {
    label: "Catalog structure",
    title: "Browse by product",
    text: "The website is ready to present Brown Derby's real items, descriptions, packaging, and product information.",
  },
  {
    label: "Next integration",
    title: "Live product data",
    text: "The next development step is connecting the catalog to Brown Derby's actual product list instead of inventing placeholder inventory.",
  },
  {
    label: "Future ordering",
    title: "Customer accounts",
    text: "Once the catalog is connected, we can add customer-specific pricing, saved carts, reordering, and order submission.",
  },
];

export default function ProductsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow">Products</p>
          <h1>The Brown Derby catalog.</h1>
          <p>
            This is where customers will browse what Brown Derby carries. The
            storefront is built; the next step is loading Brown Derby&apos;s real
            product data so this page reflects the actual inventory and product lines.
          </p>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <div className="catalog-notice">
            <div>
              <h2>Real catalog data comes next.</h2>
              <p>
                Rather than publish made-up products, this first storefront build keeps
                the catalog honest. We can populate it from an export, spreadsheet, or
                direct system integration.
              </p>
            </div>
            <Link className="button button-primary" href="/contact">
              Contact Brown Derby
            </Link>
          </div>

          <div className="catalog-grid">
            {catalogSteps.map((item) => (
              <article className="catalog-placeholder" key={item.title}>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
