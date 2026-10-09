import Link from "next/link";
import BusinessSchema from "./components/BusinessSchema";
import CategoryLinks from "./components/CategoryLinks";
import { pageMetadata } from "../lib/seo";

export const metadata = pageMetadata(
  "Newfoundland Wholesale Supplier",
  "Brown Derby Wholesale supplies food, beverages, candy, packaging and janitorial products to Central Newfoundland businesses from Grand Falls-Windsor.",
  "/"
);

const highlights = [
  {
    number: "01",
    title: "Wholesale supply",
    text: "Food, grocery, beverages, candy, snacks, packaging and cleaning supplies for the products your business uses and resells.",
  },
  {
    number: "02",
    title: "Local experience",
    text: "Brown Derby has deep roots in Grand Falls-Windsor and generations of experience serving business customers.",
  },
  {
    number: "03",
    title: "A better way to order",
    text: "Customer accounts make it easier to build orders, reorder previous purchases, and manage online submissions.",
  },
];

export default function HomePage() {
  return (
    <>
      <BusinessSchema />
      <section className="hero">
        <div className="shell hero-layout">
          <div className="hero-copy-block">
            <p className="eyebrow">Grand Falls-Windsor · Newfoundland & Labrador</p>
            <h1>Your wholesale supplier in Newfoundland.</h1>
            <p className="hero-lede">
              Brown Derby Wholesale supplies businesses throughout Central Newfoundland
              from Grand Falls-Windsor. Browse food, beverages, candy and snacks,
              janitorial supplies, disposables and restaurant smallwares, then sign in
              to build your order online.
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
              src="/brown-derby-hero.webp"
              alt="Brown Derby Wholesale emblem"
              width={680}
              height={680}
              fetchPriority="high"
              className="hero-logo"
            />
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <span>Brown Derby Wholesale Ltd.</span>
          <span>Serving business customers from Central Newfoundland</span>
          <span>Connors family roots in Grand Falls-Windsor since 1905</span>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Wholesale, made easier</p>
            <h2>Local supply for your everyday business needs.</h2>
            <p>
              Browse the catalog publicly, then sign in to add quantities, save a
              current order, submit it to Brown Derby, and review past online orders.
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

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Wholesale categories</p>
            <h2>Supplies for your shelves, kitchen and workplace.</h2>
            <p>
              Explore our wholesale categories, compare product descriptions and
              pack sizes, and contact our Grand Falls-Windsor team for help with
              availability or becoming a customer.
            </p>
          </div>
          <nav aria-label="Wholesale categories"><CategoryLinks /></nav>
        </div>
      </section>

      <section className="section heritage-section">
        <div className="shell heritage-grid">
          <div className="heritage-date">1943</div>
          <div>
            <p className="eyebrow">Our roots</p>
            <h2>Born from supplying local businesses.</h2>
            <p>
              The Brown Derby story began with a Windsor Main Street restaurant in the
              1940s. The Connors family moved into wholesale in 1961, helping supply
              neighbouring shops in Central Newfoundland.
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
