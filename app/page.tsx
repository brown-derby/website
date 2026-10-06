import Link from "next/link";

const highlights = [
  {
    number: "01",
    title: "Wholesale supply",
    text: "A practical source for businesses that need dependable access to the products they use and resell.",
  },
  {
    number: "02",
    title: "Local experience",
    text: "Brown Derby has deep roots in Grand Falls-Windsor and generations of experience serving business customers.",
  },
  {
    number: "03",
    title: "A better way to order",
    text: "We are building this site into a full online catalog so customers can browse, reorder, and manage purchases more easily.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-layout">
          <div className="hero-copy-block">
            <p className="eyebrow">Grand Falls-Windsor · Newfoundland & Labrador</p>
            <h1>Wholesale, made easier.</h1>
            <p className="hero-lede">
              Brown Derby Wholesale is building a better way for customers to discover
              products, check what we carry, and eventually place orders online.
            </p>

            <div className="hero-actions">
              <Link className="button button-primary" href="/products">
                Browse products
              </Link>
              <Link className="button button-secondary" href="/contact">
                Talk to our team
              </Link>
            </div>
          </div>

          <div className="hero-mark" aria-hidden="true">
            <div className="hero-mark-inner">
              <span>BD</span>
              <small>Wholesale</small>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <span>Brown Derby Wholesale Ltd.</span>
          <span>Serving business customers from Central Newfoundland</span>
          <span>Roots dating back to the 1940s</span>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">What we&apos;re building</p>
            <h2>A customer website that becomes more useful over time.</h2>
            <p>
              The first goal is a clear, branded catalog. From there, the site can
              grow into customer accounts, pricing, saved orders, and online checkout.
            </p>
          </div>

          <div className="feature-grid">
            {highlights.map((item) => (
              <article className="feature-card" key={item.number}>
                <span className="feature-number">{item.number}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="catalog-band">
        <div className="shell catalog-band-grid">
          <div>
            <p className="eyebrow light">Product catalog</p>
            <h2>See what Brown Derby carries.</h2>
            <p>
              The catalog structure is live now. The next step is connecting Brown
              Derby&apos;s real product data so customers can browse actual items,
              categories, and availability.
            </p>
          </div>
          <Link className="button button-light" href="/products">
            Open catalog
          </Link>
        </div>
      </section>

      <section className="section heritage-section">
        <div className="shell heritage-grid">
          <div className="heritage-date">1940s</div>
          <div>
            <p className="eyebrow">Our roots</p>
            <h2>Born from supplying local businesses.</h2>
            <p>
              Brown Derby&apos;s wholesale story grew out of the original Brown Derby
              business in Grand Falls-Windsor. What began with bringing products in
              for the business expanded into supplying other local stores.
            </p>
            <Link className="text-link" href="/about">
              Read our story →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
