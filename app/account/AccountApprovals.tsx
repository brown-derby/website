"use client";

import { useEffect, useState } from "react";

type Account = {
  user_id: string; email: string; business_name: string; contact_name: string;
  status: "pending" | "approved" | "declined"; created_at: string;
};

export default function AccountApprovals() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("pending");

  async function refresh() {
    setError("");
    try {
      const response = await fetch("/api/admin/accounts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load accounts.");
      setAccounts(data.accounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load accounts.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  async function review(account: Account, decision: Account["status"]) {
    setWorking(account.user_id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: account.user_id, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save approval.");
      setMessage(`${account.business_name || account.email}: ${decision}.`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save approval.");
    } finally { setWorking(""); }
  }

  return <section className="current-order-card" aria-labelledby="approvals-heading">
    <div className="current-order-heading">
      <div><p className="eyebrow">Account administration</p><h2 id="approvals-heading">Customer approvals</h2></div>
      <button type="button" className="button button-secondary" disabled={Boolean(working)} onClick={refresh}>Refresh accounts</button>
    </div>
    <p>Only approved customers can see wholesale pricing and place orders. Approvals take effect on their next page refresh.</p>
    <label className="approval-filter">Show accounts <select value={filter} onChange={e => setFilter(e.target.value)}>
      <option value="pending">Pending ({accounts.filter(a => a.status === "pending").length})</option>
      <option value="approved">Approved</option><option value="declined">Declined</option><option value="all">All accounts</option>
    </select></label>
    {error && <p role="alert" className="portal-message error">{error}</p>}
    {message && <p role="status" className="portal-message success">{message}</p>}
    {loading ? <p>Loading accounts…</p> : <div className="approval-list">
      {accounts.filter(a => filter === "all" || a.status === filter).map(account => <article className="approval-card" key={account.user_id}>
        <div><h3>{account.business_name || "Customer account"}</h3><p>{account.contact_name}</p><p>{account.email}</p>
          <small>Registered {new Date(account.created_at).toLocaleDateString("en-CA")} · {account.status}</small></div>
        <div className="approval-actions">
          {account.status !== "approved" && <button type="button" className="button button-primary" disabled={Boolean(working)} onClick={() => review(account, "approved")} aria-label={`Approve ${account.email}`}>Approve</button>}
          {account.status !== "declined" && <button type="button" className="button button-secondary" disabled={Boolean(working)} onClick={() => review(account, "declined")} aria-label={`Decline ${account.email}`}>{account.status === "approved" ? "Revoke access" : "Decline"}</button>}
          {account.status === "declined" && <button type="button" className="portal-text-button" disabled={Boolean(working)} onClick={() => review(account, "pending")}>Return to pending</button>}
        </div>
      </article>)}
      {!accounts.some(a => filter === "all" || a.status === filter) && <p>No {filter === "all" ? "customer" : filter} accounts.</p>}
    </div>}
  </section>;
}
