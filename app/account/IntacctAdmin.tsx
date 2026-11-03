"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExportOrder, IntacctCustomer } from "../../lib/intacct";
import styles from "./IntacctAdmin.module.css";

type Account = {
  user_id: string;
  email: string;
  business_name: string;
  contact_name: string;
  status: "approved" | "pending" | "declined";
  intacct_customer_id: string | null;
};

type SubmittedOrder = ExportOrder & { customer_business_name?: string };
type ExportAudit = {
  order_id: string;
  customer_id: string;
  reference_no: string;
  exported_at: string;
  imported_at: string | null;
  intacct_document_no: string | null;
};

type Data = {
  accounts: Account[];
  customers: IntacctCustomer[];
  orders: SubmittedOrder[];
  exports: ExportAudit[];
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function IntacctAdmin() {
  const [data, setData] = useState<Data | null>(null);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentNos, setDocumentNos] = useState<Record<string, string>>({});

  async function refresh() {
    const res = await fetch("/api/admin/intacct", { cache: "no-store" });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Unable to load Intacct integration.");
    setData(payload as Data);
  }

  useEffect(() => {
    void refresh().catch(e => setError(e instanceof Error ? e.message : "Could not load Intacct data."));
  }, []);

  const accounts = data?.accounts || [];
  const customers = data?.customers || [];
  const orders = data?.orders || [];
  const exports = data?.exports || [];
  const selectedAccount = accounts.find(account => account.user_id === selectedUser);
  const matched = accounts.filter(account => account.status === "approved" && account.intacct_customer_id);
  const unmatched = accounts.filter(account => account.status === "approved" && !account.intacct_customer_id);
  const displayedAccounts = accounts.filter(account =>
    (account.business_name + " " + account.email + " " + account.intacct_customer_id)
      .toLowerCase().includes(accountFilter.toLowerCase())
  );
  const suggestions = useMemo(() => {
    if (!selectedAccount) return [];
    const email = selectedAccount.email.trim().toLowerCase();
    const name = normalize(selectedAccount.business_name);
    return customers.filter(customer =>
      (email && [customer.email, customer.secondary_email].some(
        address => address?.trim().toLowerCase() === email
      )) || (name && normalize(customer.customer_name) === name)
    ).slice(0, 8);
  }, [selectedAccount, customers]);
  const visibleCustomers = customers.filter(customer =>
    (customer.customer_id + " " + customer.customer_name + " " + (customer.email || ""))
      .toLowerCase().includes(customerFilter.toLowerCase()) ||
    customer.customer_id === selectedCustomer
  ).slice(0, 80);

  function chooseAccount(account: Account) {
    setSelectedUser(account.user_id);
    setSelectedCustomer(account.intacct_customer_id || "");
    setCustomerFilter("");
    setError("");
    setNotice("");
  }

  async function post(action: Record<string, unknown>) {
    const response = await fetch("/api/admin/intacct", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action),
    });
    if (response.headers.get("content-type")?.includes("text/csv")) return response;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to save changes.");
    return payload;
  }

  async function saveMatch() {
    if (!selectedAccount || selectedAccount.status !== "approved") return;
    setWorking("match"); setError(""); setNotice("");
    try {
      await post({
        action: "saveMatch", userId: selectedAccount.user_id,
        customerId: selectedCustomer || null,
      });
      setNotice(selectedCustomer ? "Customer mapping confirmed." : "Customer mapping removed.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save customer mapping.");
    } finally { setWorking(""); }
  }

  async function importCustomers() {
    if (!file) return;
    setWorking("import"); setError(""); setNotice("");
    try {
      if (file.size > 2_000_000) throw new Error("Choose a customer CSV smaller than 2 MB.");
      const result = await post({ action: "importCustomers", csv: await file.text() });
      setNotice(String(result.imported) + " Intacct customer records imported or refreshed. Existing confirmed matches were kept.");
      await refresh();
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to import Intacct customers.");
    } finally { setWorking(""); }
  }

  async function exportOrder(orderId: string) {
    setWorking(orderId); setError(""); setNotice("");
    try {
      const response = await post({ action: "exportOrder", orderId });
      if (!(response instanceof Response)) throw new Error("CSV download was not returned.");
      const csv = await response.blob();
      const url = URL.createObjectURL(csv);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "BrownDerby-WebOrder-" + orderId.slice(0, 8) + ".csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setNotice("Order export generated. Import it into Intacct and record the resulting Sales Order number below.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to export the order.");
      await refresh().catch(() => null);
    } finally { setWorking(""); }
  }

  async function confirmImport(orderId: string) {
    const documentNo = (documentNos[orderId] || "").trim();
    if (!documentNo) { setError("Enter the Sales Order number shown in Intacct."); return; }
    setWorking(orderId); setError(""); setNotice("");
    try {
      await post({ action: "confirmImport", orderId, documentNo });
      setNotice("Intacct Sales Order number recorded. This order will not be offered for export again.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm import.");
    } finally { setWorking(""); }
  }

  return (
    <section className={"current-order-card " + styles.section} aria-labelledby="intacct-heading">
      <div className="current-order-heading">
        <div>
          <p className="eyebrow">Internal administration</p>
          <h2 id="intacct-heading">Sage Intacct integration</h2>
        </div>
        <button type="button" className="button button-secondary"
          onClick={() => void refresh().catch(e => setError(String(e)))} disabled={Boolean(working)}>
          Refresh
        </button>
      </div>
      <p className={styles.intro}>Customer matching and controlled Sales Order CSV exports. Nothing is posted to Intacct automatically at this stage.</p>
      {error && <p role="alert" className="portal-message error">{error}</p>}
      {notice && <p role="status" className="portal-message success">{notice}</p>}
      {!data ? <p>Loading Intacct administration…</p> : (
        <>
          <div className={styles.stats}>
            <div><strong>{customers.length}</strong><span>Intacct customers</span></div>
            <div><strong>{matched.length}</strong><span>Approved accounts matched</span></div>
            <div><strong>{unmatched.length}</strong><span>Approved accounts unmatched</span></div>
            <div><strong>{orders.length}</strong><span>Submitted website orders</span></div>
          </div>

          <div className={styles.panel}>
            <h3>Refresh Intacct customer records</h3>
            <p>Export customers from Sage Intacct as CSV. Importing updates names, terms and emails by the exact Customer ID; it does not approve or change account matches.</p>
            <div className={styles.formRow}>
              <input aria-label="Intacct customer CSV" type="file" accept=".csv,text/csv"
                onChange={event => setFile(event.target.files?.[0] || null)} />
              <button className="button button-secondary" type="button"
                disabled={!file || Boolean(working)} onClick={() => void importCustomers()}>
                {working === "import" ? "Importing…" : "Import customer CSV"}
              </button>
            </div>
          </div>

          <div className={styles.panel}>
            <h3>Match website accounts to Intacct customers</h3>
            <p>Suggestions are based on matching email or business name. They are never confirmed automatically.</p>
            <div className={styles.grid}>
              <div className={styles.accountList}>
                <label htmlFor="intacct-account-search">Find a website account</label>
                <input id="intacct-account-search" type="search" placeholder="Business or email"
                  value={accountFilter} onChange={event => setAccountFilter(event.target.value)} />
                <div className={styles.scroll}>
                  {displayedAccounts.map(account => (
                    <button type="button" key={account.user_id}
                      className={styles.account + (selectedUser === account.user_id ? " " + styles.active : "")}
                      onClick={() => chooseAccount(account)}>
                      <strong>{account.business_name || account.email}</strong>
                      <small>{account.email}</small>
                      <small>{account.intacct_customer_id ?
                        "Intacct " + account.intacct_customer_id :
                        account.status === "approved" ? "Not matched" : account.status}</small>
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.matchPanel}>
                {!selectedAccount ? <p>Select a website account to review its Intacct match.</p> : (
                  <>
                    <h4>{selectedAccount.business_name || selectedAccount.email}</h4>
                    <p>{selectedAccount.email} · {selectedAccount.status}</p>
                    {selectedAccount.status !== "approved" ?
                      <p>Only approved accounts can be mapped to Intacct.</p> : (
                      <>
                        {suggestions.length > 0 && (
                          <>
                            <strong>Possible matches — verify before confirming</strong>
                            <div className={styles.suggestions}>{suggestions.map(customer => (
                              <button key={customer.customer_id} type="button"
                                onClick={() => { setSelectedCustomer(customer.customer_id); setCustomerFilter(""); }}>
                                {customer.customer_id} · {customer.customer_name}
                                {customer.email ? " · " + customer.email : ""}
                              </button>
                            ))}</div>
                          </>
                        )}
                        <label htmlFor="intacct-customer-search">Find an Intacct customer</label>
                        <input id="intacct-customer-search" type="search" value={customerFilter}
                          placeholder="Customer ID, name or email"
                          onChange={event => setCustomerFilter(event.target.value)} />
                        <select className={styles.customerSelect} size={6}
                          aria-label="Select confirmed Intacct customer ID" value={selectedCustomer}
                          onChange={event => setSelectedCustomer(event.target.value)}>
                          <option value="">No customer mapping</option>
                          {visibleCustomers.map(customer => (
                            <option key={customer.customer_id} value={customer.customer_id}>
                              {customer.customer_id} — {customer.customer_name}
                              {customer.term_name ? " (" + customer.term_name + ")" : " (terms missing)"}
                            </option>
                          ))}
                        </select>
                        {selectedCustomer && (
                          <p className={styles.help}>
                            Payment terms: {customers.find(c => c.customer_id === selectedCustomer)?.term_name || "Missing — review required"}
                          </p>
                        )}
                        <button type="button" className="button button-primary" disabled={Boolean(working)}
                          onClick={() => void saveMatch()}>
                          {selectedCustomer ? "Confirm customer match" : "Remove customer match"}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <h3>Website Sales Orders waiting for Intacct</h3>
            <p>Existing orders may already have been entered manually. Verify each order in Intacct before downloading a CSV. An export is recorded to prevent duplicate downloads.</p>
            {orders.length === 0 ? <p>No submitted orders yet.</p> : (
              <div className={styles.orderList}>
                {orders.map(order => {
                  const account = accounts.find(a => a.user_id === order.user_id);
                  const customer = customers.find(c => c.customer_id === account?.intacct_customer_id);
                  const audit = exports.find(record => record.order_id === order.id);
                  const ready = account?.status === "approved" &&
                    Boolean(customer && /^NET[0-9]{1,3}$/i.test(customer.term_name || ""));
                  return (
                    <article key={order.id} className={styles.orderRow}>
                      <div>
                        <strong>{order.customer_business_name || account?.business_name || "Customer order"}</strong>
                        <small>Website order {order.id.slice(0, 8).toUpperCase()} · {order.submitted_at ?
                          new Date(order.submitted_at).toLocaleDateString("en-CA") : "Unknown date"}
                          {" · "}{order.order_items?.length || 0} items</small>
                        <small>Intacct customer: {customer ? customer.customer_id + " — " + customer.customer_name : "Not matched"}</small>
                        <small>{audit?.imported_at ? "Imported: " + audit.intacct_document_no :
                          audit ? "CSV exported " + new Date(audit.exported_at).toLocaleString("en-CA") :
                          ready ? "Ready for controlled export" : "Match customer and verify terms first"}</small>
                      </div>
                      {!audit ? (
                        <button type="button" className="button button-secondary"
                          disabled={!ready || Boolean(working)} onClick={() => void exportOrder(order.id)}>
                          {working === order.id ? "Exporting…" : "Download Intacct CSV"}
                        </button>
                      ) : !audit.imported_at ? (
                        <div className={styles.confirm}>
                          <label htmlFor={"intacct-doc-" + order.id}>Intacct Sales Order #</label>
                          <input id={"intacct-doc-" + order.id} placeholder="e.g. SO0268"
                            value={documentNos[order.id] || ""}
                            onChange={event => setDocumentNos(current => ({ ...current, [order.id]: event.target.value }))} />
                          <button type="button" className="button button-secondary"
                            disabled={Boolean(working)} onClick={() => void confirmImport(order.id)}>
                            Mark imported
                          </button>
                        </div>
                      ) : <span className={styles.done}>Confirmed</span>}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
