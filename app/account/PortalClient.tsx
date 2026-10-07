"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id?: number;
  product_id: string;
  product_name: string;
  category: string;
  unit_price: number | string;
  quantity: number;
};

type Order = {
  id: string;
  status: "draft" | "submitted";
  notes: string;
  email_status: "not_sent" | "sent" | "failed";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
};

type User = {
  email: string;
  businessName: string;
  contactName: string;
};

const money = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

function orderTotal(order: Order) {
  return (order.order_items || []).reduce(
    (total, item) => total + Number(item.unit_price) * item.quantity,
    0
  );
}

function prettyDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function PortalClient() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const draft = useMemo(
    () => orders.find((order) => order.status === "draft") || null,
    [orders]
  );
  const submitted = useMemo(
    () => orders.filter((order) => order.status === "submitted"),
    [orders]
  );

  function syncDraftInputs(order: Order | null) {
    const next: Record<string, number> = {};
    for (const item of order?.order_items || []) {
      next[item.product_id] = item.quantity;
    }
    setQuantities(next);
    setNotes(order?.notes || "");
  }

  async function loadPortal() {
    setLoading(true);
    setError("");

    const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
    if (!sessionResponse.ok) {
      window.location.replace("/login");
      return;
    }
    const sessionData = await sessionResponse.json();
    setUser(sessionData.user);

    const orderResponse = await fetch("/api/orders", { cache: "no-store" });
    const orderData = await orderResponse.json().catch(() => ({}));

    if (!orderResponse.ok) {
      setError(orderData.error || "Unable to load your orders.");
      setLoading(false);
      return;
    }

    const loaded = orderData.orders || [];
    setOrders(loaded);
    syncDraftInputs(loaded.find((order: Order) => order.status === "draft") || null);
    setLoading(false);
  }

  useEffect(() => {
    loadPortal().catch(() => {
      setError("Unable to load the customer portal.");
      setLoading(false);
    });
  }, []);

  async function logout() {
    setWorking("logout");
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.assign("/");
  }

  async function updateItem(productId: string) {
    const quantity = quantities[productId] ?? 0;
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 9999) {
      setError("Quantity must be a whole number between 0 and 9,999.");
      return;
    }

    setWorking("item:" + productId);
    setError("");
    setMessage("");
    const response = await fetch("/api/orders/draft/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      setError(data.error || "Unable to update the order.");
      return;
    }

    const nextOrders = draft
      ? orders.map((order) => (order.id === draft.id ? data.order : order))
      : [data.order, ...orders];
    setOrders(nextOrders);
    syncDraftInputs(data.order);
    setMessage(quantity === 0 ? "Item removed." : "Quantity updated.");
  }

  async function saveNotes() {
    setWorking("notes");
    setError("");
    setMessage("");
    const response = await fetch("/api/orders/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      setError(data.error || "Unable to save your notes.");
      return;
    }
    if (data.order && draft) {
      setOrders(
        orders.map((order) =>
          order.id === draft.id ? { ...order, notes } : order
        )
      );
    }
    setMessage("Order notes saved.");
  }

  async function submitOrder() {
    if (!draft) return;
    if (!window.confirm("Send this order to Brown Derby now?")) return;

    setWorking("submit");
    setError("");
    setMessage("");

    const notesResponse = await fetch("/api/orders/draft", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (!notesResponse.ok) {
      setWorking("");
      setError("Unable to save the order notes before submitting.");
      return;
    }

    const response = await fetch("/api/orders/" + draft.id + "/submit", {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      setError(data.error || "Unable to submit the order.");
      return;
    }

    setMessage("Order sent to Brown Derby at csr@brownderby.ca.");
    await loadPortal();
  }

  async function reorder(orderId: string) {
    setWorking("reorder:" + orderId);
    setError("");
    setMessage("");
    const response = await fetch("/api/orders/" + orderId + "/reorder", {
      method: "POST",
    });
    const data = await response.json().catch(() => ({}));
    setWorking("");

    if (!response.ok) {
      setError(data.error || "Unable to create the reorder.");
      return;
    }

    setMessage("Items copied into your current editable order.");
    await loadPortal();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) {
    return <div className="portal-loading">Loading your account…</div>;
  }

  return (
    <div className="account-portal">
      <div className="account-toolbar">
        <div>
          <span>Signed in as</span>
          <strong>{user?.businessName || user?.email}</strong>
          {user?.businessName && <small>{user.email}</small>}
        </div>
        <button type="button" className="portal-text-button" onClick={logout} disabled={working === "logout"}>
          Sign out
        </button>
      </div>

      {message && <div className="portal-message success">{message}</div>}
      {error && <div className="portal-message error">{error}</div>}

      <section className="current-order-card">
        <div className="current-order-heading">
          <div>
            <p className="eyebrow">Current order</p>
            <h2>{draft ? "Review your draft" : "Start a new order"}</h2>
          </div>
          <Link href="/products" className="button button-secondary">
            Browse products
          </Link>
        </div>

        {!draft || !(draft.order_items || []).length ? (
          <div className="empty-order">
            <h3>Your order is empty.</h3>
            <p>
              Open the product catalog and enter quantities beside the products you
              would like to order.
            </p>
            <Link className="button button-primary" href="/products">
              Shop the catalog
            </Link>
          </div>
        ) : (
          <>
            <div className="portal-order-table-wrap">
              <table className="portal-order-table">
                <thead>
                  <tr>
                    <th>Item #</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Line total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.order_items || []).map((item) => (
                    <tr key={item.product_id}>
                      <td className="item-id">{item.product_id}</td>
                      <td>{item.product_name}</td>
                      <td>
                        <input
                          className="portal-qty-input"
                          type="number"
                          min={0}
                          max={9999}
                          step={1}
                          value={quantities[item.product_id] ?? item.quantity}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [item.product_id]: Math.max(
                                0,
                                Math.min(9999, Math.trunc(Number(event.target.value) || 0))
                              ),
                            }))
                          }
                        />
                      </td>
                      <td>{money.format(Number(item.unit_price))}</td>
                      <td>{money.format(Number(item.unit_price) * item.quantity)}</td>
                      <td>
                        <button
                          className="small-action-button"
                          type="button"
                          onClick={() => updateItem(item.product_id)}
                          disabled={working === "item:" + item.product_id}
                        >
                          {working === "item:" + item.product_id ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="order-notes-total">
              <label className="order-notes">
                <span>Order notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={2000}
                  placeholder="Add any delivery, pickup, or order notes here."
                />
                <button
                  className="portal-text-button"
                  type="button"
                  onClick={saveNotes}
                  disabled={working === "notes"}
                >
                  {working === "notes" ? "Saving…" : "Save notes"}
                </button>
              </label>
              <div className="order-total-box">
                <span>Estimated total</span>
                <strong>{money.format(orderTotal(draft))}</strong>
                <small>Final availability and pricing are confirmed by Brown Derby.</small>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={submitOrder}
                  disabled={working === "submit"}
                >
                  {working === "submit" ? "Sending order…" : "Submit order"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="order-history-section">
        <div className="portal-section-heading">
          <p className="eyebrow">Order history</p>
          <h2>Previously submitted</h2>
          <p>
            Submitted orders are kept as a record. To make changes to an older order,
            copy it into your current order and edit the new draft before submitting.
          </p>
        </div>

        {submitted.length === 0 ? (
          <div className="empty-history">No submitted online orders yet.</div>
        ) : (
          <div className="order-history-list">
            {submitted.map((order) => (
              <article className="history-order-card" key={order.id}>
                <div className="history-order-heading">
                  <div>
                    <span>Order #{order.id.slice(0, 8).toUpperCase()}</span>
                    <strong>{prettyDate(order.submitted_at || order.created_at)}</strong>
                  </div>
                  <div className="history-order-total">
                    {money.format(orderTotal(order))}
                  </div>
                </div>
                <div className="history-items">
                  {(order.order_items || []).map((item) => (
                    <div key={item.product_id}>
                      <span>{item.quantity} × {item.product_name}</span>
                      <small>{item.product_id}</small>
                    </div>
                  ))}
                </div>
                {order.notes && <p className="history-notes">Notes: {order.notes}</p>}
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => reorder(order.id)}
                  disabled={working === "reorder:" + order.id}
                >
                  {working === "reorder:" + order.id ? "Copying…" : "Reorder / make changes"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
