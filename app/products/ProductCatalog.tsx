"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  catalogProducts,
  getCatalogPrice,
  type CatalogProduct,
} from "../../lib/catalog";

type Product = CatalogProduct;

type PortalUser = {
  email: string;
  businessName: string;
  contactName: string;
};

type DraftOrder = {
  id: string;
  order_items?: Array<{
    product_id: string;
    quantity: number;
  }>;
};

const allProducts = catalogProducts;

const categoryDescriptions: Record<string, string> = {
  "Baking & Foodservice Ingredients":
    "Baking mixes, toppings, syrups, bulk ingredients, and kitchen staples for foodservice.",
  "Batteries & Convenience":
    "Batteries and everyday convenience items for counters, stores, and workplaces.",
  "Beverages":
    "Water, energy drinks, soft drinks, drink mixes, and other refreshment products.",
  "Candy & Chocolate":
    "Chocolate bars, candy, gum, novelty sweets, and other confectionery favourites.",
  "Cleaning & Janitorial":
    "Cleaning chemicals, paper products, janitorial supplies, and workplace sanitation essentials.",
  "Fishing Supplies":
    "Fishing tackle, accessories, and practical supplies for anglers and retailers.",
  "Food & Grocery":
    "Shelf-stable grocery items, sauces, condiments, canned goods, and everyday food products.",
  "Frozen & Refrigerated":
    "Frozen and chilled products that require temperature-controlled storage.",
  "General Merchandise":
    "A varied mix of everyday merchandise and convenience-store products.",
  "Health & Personal Care":
    "Personal care, hygiene, and everyday health-related convenience products.",
  "Industrial Oils & Lubricants":
    "Motor oils, lubricants, fluids, and related products for automotive and industrial use.",
  "Packaging & Disposables":
    "Bags, cups, containers, food packaging, disposable serviceware, and takeout supplies.",
  "Pet Supplies":
    "Food, treats, and everyday supplies for pets.",
  "Restaurant Equipment & Smallwares":
    "Kitchen tools, foodservice equipment, utensils, containers, and restaurant smallwares.",
  "Snacks":
    "Chips, crackers, cookies, nuts, and other packaged snack foods.",
  "Tobacco & Smoking":
    "Tobacco and smoking-related products available through Brown Derby Wholesale.",
};

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function ProductTable({
  items,
  showCategory = false,
  orderEnabled,
  quantities,
  savingProduct,
  onQuantityChange,
  onSave,
}: {
  items: Product[];
  showCategory?: boolean;
  orderEnabled: boolean;
  quantities: Record<string, number>;
  savingProduct: string;
  onQuantityChange: (productId: string, quantity: number) => void;
  onSave: (productId: string) => void;
}) {
  return (
    <div className="product-table-wrap">
      <table className="product-table">
        <thead>
          <tr>
            <th>Item #</th>
            <th>Product</th>
            {showCategory && <th>Category</th>}
            <th className="price-column">Price</th>
            {orderEnabled && <th className="order-column">Order qty</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((product) => (
            <tr key={product.id}>
              <td className="item-id">{product.id}</td>
              <td className="product-name-cell">{product.name}</td>
              {showCategory && <td>{product.category}</td>}
              <td className="price-column">{money.format(getCatalogPrice(product))}</td>
              {orderEnabled && (
                <td className="order-column">
                  <div className="catalog-quantity-control">
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      step={1}
                      aria-label={"Quantity for " + product.name}
                      value={quantities[product.id] ?? 0}
                      onChange={(event) =>
                        onQuantityChange(
                          product.id,
                          Math.max(
                            0,
                            Math.min(
                              9999,
                              Math.trunc(Number(event.target.value) || 0)
                            )
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() => onSave(product.id)}
                      disabled={savingProduct === product.id}
                    >
                      {savingProduct === product.id ? "Saving…" : "Save"}
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ProductCatalog() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [savingProduct, setSavingProduct] = useState("");
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of allProducts) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    return allProducts
      .filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.id.toLowerCase().includes(needle)
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [query]);

  const categoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return allProducts
      .filter((product) => product.category === selectedCategory)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCategory]);

  const hasSearch = query.trim().length > 0;
  const orderLineCount = Object.values(quantities).filter((quantity) => quantity > 0).length;

  function syncDraft(order: DraftOrder | null) {
    const next: Record<string, number> = {};
    for (const item of order?.order_items || []) {
      next[item.product_id] = item.quantity;
    }
    setQuantities(next);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPortalState() {
      try {
        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (!sessionResponse.ok) {
          if (!cancelled) setSessionChecked(true);
          return;
        }

        const sessionData = await sessionResponse.json();
        if (cancelled) return;
        setUser(sessionData.user);

        const draftResponse = await fetch("/api/orders/draft", { cache: "no-store" });
        if (draftResponse.ok) {
          const draftData = await draftResponse.json();
          if (!cancelled) syncDraft(draftData.order || null);
        }
      } catch {
        // The public catalog remains fully usable when portal services are unavailable.
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    }

    loadPortalState();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCategory(category: string) {
    setQuery("");
    setSelectedCategory(category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showCategories() {
    setSelectedCategory(null);
  }

  async function saveQuantity(productId: string) {
    const quantity = quantities[productId] ?? 0;
    setSavingProduct(productId);
    setOrderError("");
    setOrderMessage("");

    const response = await fetch("/api/orders/draft/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await response.json().catch(() => ({}));
    setSavingProduct("");

    if (!response.ok) {
      setOrderError(data.error || "Unable to update your order.");
      return;
    }

    syncDraft(data.order || null);
    setOrderMessage(
      quantity > 0
        ? "Item saved to your current order."
        : "Item removed from your current order."
    );
  }

  const tableProps = {
    orderEnabled: Boolean(user),
    quantities,
    savingProduct,
    onQuantityChange: (productId: string, quantity: number) =>
      setQuantities((current) => ({ ...current, [productId]: quantity })),
    onSave: saveQuantity,
  };

  return (
    <div className="catalog-browser">
      <label className="catalog-search">
        <span>Search the catalog</span>
        <div className="catalog-search-field">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedCategory(null);
            }}
            placeholder="Search by product name or item number"
          />
          {hasSearch && (
            <button type="button" onClick={() => setQuery("")}>
              Clear
            </button>
          )}
        </div>
      </label>

      {sessionChecked && (
        <div className={"catalog-order-bar " + (user ? "signed-in" : "")}>
          {user ? (
            <>
              <div>
                <strong>Ordering as {user.businessName || user.email}</strong>
                <span>
                  Enter a quantity beside any product and press Save. Use 0 to remove
                  an item.
                </span>
              </div>
              <Link href="/account">
                View order{orderLineCount ? " · " + orderLineCount + " items" : ""}
              </Link>
            </>
          ) : (
            <>
              <div>
                <strong>Want to place an order?</strong>
                <span>Sign in to add quantities directly from the catalog.</span>
              </div>
              <Link href="/login">Customer sign in →</Link>
            </>
          )}
        </div>
      )}

      {orderMessage && <div className="portal-message success compact">{orderMessage}</div>}
      {orderError && <div className="portal-message error compact">{orderError}</div>}

      {hasSearch ? (
        <section className="catalog-list-view">
          <div className="catalog-view-heading">
            <div>
              <p className="eyebrow">Search results</p>
              <h2>Results for “{query.trim()}”</h2>
            </div>
            <p>{searchResults.length.toLocaleString()} items</p>
          </div>

          {searchResults.length ? (
            <ProductTable items={searchResults} showCategory {...tableProps} />
          ) : (
            <div className="no-results">
              <h3>No products found</h3>
              <p>Try a different product name or item number.</p>
            </div>
          )}
        </section>
      ) : selectedCategory ? (
        <section className="catalog-list-view">
          <button className="back-to-categories" type="button" onClick={showCategories}>
            ← All categories
          </button>

          <div className="catalog-view-heading">
            <div>
              <p className="eyebrow">Product category</p>
              <h2>{selectedCategory}</h2>
              <p className="category-view-description">
                {categoryDescriptions[selectedCategory]}
              </p>
            </div>
            <p>{categoryProducts.length.toLocaleString()} items</p>
          </div>

          <ProductTable items={categoryProducts} {...tableProps} />
        </section>
      ) : (
        <section className="category-browser">
          <div className="catalog-view-heading category-heading">
            <div>
              <p className="eyebrow">Browse by category</p>
              <h2>What are you looking for?</h2>
            </div>
            <p>{allProducts.length.toLocaleString()} products</p>
          </div>

          <div className="category-card-grid">
            {categories.map(([category, count]) => (
              <button
                className="catalog-category-card"
                type="button"
                onClick={() => openCategory(category)}
                key={category}
              >
                <div className="category-card-content">
                  <h3>{category}</h3>
                  <p>
                    {categoryDescriptions[category] ??
                      "Browse products currently available in this category."}
                  </p>
                  <span className="category-count">{count.toLocaleString()} items</span>
                </div>
                <span className="category-arrow" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
