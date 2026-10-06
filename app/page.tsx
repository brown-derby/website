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

          <div className="hero-logo-panel">
            <img
              src="/brown-derby-logo.svg"
              alt="Brown Derby Wholesale"
              className="hero-logo"
            />
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <span>Brown Derby Wholesale Ltd.</span>
          <span>Serving business customers from Central Newfoundland</span>
          <span>Serving Central Newfoundland since 1943</span>
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
              Browse Brown Derby&apos;s current published catalog by category, search
              by product name or item number, and see pricing for more than 2,500
              products.
            </p>
          </div>
          <Link className="button button-light" href="/products">
            Open catalog
          </Link>
        </div>
      </section>

      <section className="section heritage-section">
        <div className="shell heritage-grid">
          <div className="heritage-date">1943</div>
          <div>
            <p className="eyebrow">Our roots</p>
            <h2>Born from supplying local businesses.</h2>
            <p>
              Brown Derby Wholesale was established in Grand Falls-Windsor in 1943 and has spent
              more than 80 years supplying businesses throughout Central Newfoundland.
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
