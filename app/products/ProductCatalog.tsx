"use client";

import { useMemo, useState } from "react";
import products from "../../data/products.json";

type Product = {
  id: string;
  name: string;
  category: string;
  glGroup: string;
  itemType: string;
  websitePrice: number | null;
  observedPrice1: number | null;
  observedPrice2: number | null;
  priceStatus: string;
  storefrontStatus: string;
};

const allProducts = (products as Product[]).filter(
  (product) => product.storefrontStatus !== "Exclude from storefront"
);

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function Price({ product }: { product: Product }) {
  if (product.websitePrice !== null) {
    return (
      <div className="product-price">
        <strong>{money.format(product.websitePrice)}</strong>
        <span>case / listed unit</span>
      </div>
    );
  }

  if (
    product.observedPrice1 !== null &&
    product.observedPrice2 !== null &&
    product.observedPrice1 !== product.observedPrice2
  ) {
    return (
      <div className="product-price product-price-review">
        <strong>
          {money.format(product.observedPrice1)} / {money.format(product.observedPrice2)}
        </strong>
        <span>two price records — confirming current price</span>
      </div>
    );
  }

  return (
    <div className="product-price product-price-review">
      <strong>Contact for price</strong>
      <span>current price needs confirmation</span>
    </div>
  );
}

export default function ProductCatalog() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [visible, setVisible] = useState(60);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of allProducts) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allProducts.filter((product) => {
      const categoryMatch = category === "All products" || product.category === category;
      const searchMatch =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.id.toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [query, category]);

  const shown = filtered.slice(0, visible);

  function chooseCategory(value: string) {
    setCategory(value);
    setVisible(60);
  }

  return (
    <div className="catalog-browser">
      <div className="catalog-toolbar">
        <label className="search-box">
          <span>Search products</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(60);
            }}
            placeholder="Search by product name or item ID"
          />
        </label>

        <label className="category-select">
          <span>Category</span>
          <select value={category} onChange={(e) => chooseCategory(e.target.value)}>
            <option>All products</option>
            {categories.map(([name, count]) => (
              <option value={name} key={name}>
                {name} ({count})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="category-chips" aria-label="Product categories">
        <button
          className={category === "All products" ? "active" : ""}
          onClick={() => chooseCategory("All products")}
        >
          All <span>{allProducts.length}</span>
        </button>
        {categories.map(([name, count]) => (
          <button
            className={category === name ? "active" : ""}
            onClick={() => chooseCategory(name)}
            key={name}
          >
            {name} <span>{count}</span>
          </button>
        ))}
      </div>

      <div className="catalog-results-heading">
        <div>
          <p className="eyebrow">Catalog</p>
          <h2>{category}</h2>
        </div>
        <p>{filtered.length.toLocaleString()} products</p>
      </div>

      {shown.length ? (
        <>
          <div className="real-product-grid">
            {shown.map((product) => (
              <article className="real-product-card" key={product.id}>
                <div className="product-card-meta">
                  <span>{product.category}</span>
                  <span>#{product.id}</span>
                </div>
                <h3>{product.name}</h3>
                <Price product={product} />
              </article>
            ))}
          </div>

          {visible < filtered.length && (
            <div className="load-more-wrap">
              <button className="button button-secondary" onClick={() => setVisible(v => v + 60)}>
                Show more products
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="no-results">
          <h3>No products found</h3>
          <p>Try another search or category.</p>
        </div>
      )}
    </div>
  );
}
