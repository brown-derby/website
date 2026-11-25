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

type SubmittedOrder = ExportOrder & { customer_business_name?: string; email_status?: "sent" | "failed" | "not_sent" };
type ExportAudit = {
  order_id: string;
  customer_id: string;
  reference_no: string;
  exported_at: string;
  imported_at: string | null;
  intacct_document_no: string | null;
  ship_date: string | null;
  legacy_reviewed_at: string | null;
  csv_email_status: "sending" | "accepted" | "failed" | "unknown" | null;
  csv_email_updated_at: string | null;
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

const legacyCutoff = Date.parse("2026-11-23T03:30:00Z"); // midnight in Newfoundland
const todayNewfoundland = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/St_Johns", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

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
  const [orderSearch, setOrderSearch] = useState("");
  const [orderPage, setOrderPage] = useState(0);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [documentNos, setDocumentNos] = useState<Record<string, string>>({});
  const [shipDates, setShipDates] = useState<Record<string, string>>({});
  const [legacyConfirmations, setLegacyConfirmations] = useState<Record<string, boolean>>({});

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
  const history = orders.filter(order => {
    const account = accounts.find(a => a.user_id === order.user_id);
    const audit = exports.find(record => record.order_id === order.id);
    const customer = customers.find(c => c.customer_id === (audit?.customer_id || account?.intacct_customer_id));
    const searchable = [order.customer_business_name, account?.business_name, account?.email,
      customer?.customer_id, customer?.customer_name, order.id, order.id.replace(/-/g, ""),
      audit?.reference_no, audit?.intacct_document_no, order.submitted_at].join(" ").toLowerCase();
    return orderSearch.trim().toLowerCase().split(/\s+/).every(term => searchable.includes(term));
  });
  const pageSize = 15;
  const page = Math.min(orderPage, Math.max(0, Math.ceil(history.length / pageSize) - 1));
  const pageOrders = history.slice(page * pageSize, (page + 1) * pageSize);
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
      .toLowerCase().includes(customerFilter.toLowerCase())
  ).slice(0, 79);
  const chosen = customers.find(customer => customer.customer_id === selectedCustomer);
  if (chosen && !visibleCustomers.some(customer => customer.customer_id === chosen.customer_id)) {
    visibleCustomers.push(chosen);
  }

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

  async function exportOrder(orderId: string, redownload = false) {
    const audit = exports.find(record => record.order_id === orderId);
    if (redownload && audit?.imported_at && !window.confirm(
      "This order has a recorded Sage Sales Order number. Download the original CSV for reference only; do not import it again."
    )) return;
    setWorking(orderId); setError(""); setNotice("");
    try {
      const response = await post(redownload
        ? { action: "redownloadOrder", orderId }
        : {
            action: "exportOrder", orderId,
            shipDate: shipDates[orderId] || (orders.find(o => o.id === orderId)?.submitted_at ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/St_Johns", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(orders.find(o => o.id === orderId)!.submitted_at!)) : todayNewfoundland()),
            reviewedLegacy: legacyConfirmations[orderId] === true,
          });
      if (!(response instanceof Response)) throw new Error("CSV download was not returned.");
      const csv = await response.blob();
      const url = URL.createObjectURL(csv);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "WEB-" + orderId.replace(/-/g, "") + ".csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      const mail = response.headers.get("X-Intacct-CSV-Email");
      setNotice(redownload
        ? "The original CSV was downloaded again. Check Sage before importing so you do not duplicate this order."
        : "Order CSV prepared. Import as a Draft only after checking for an existing WEB reference." +
          (mail === "accepted" ? " The internal attachment email was accepted for sending." :
            " CSV attachment email not confirmed; use this download if needed."));
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
      setNotice("Sage Sales Order number recorded. The original CSV remains available for reference.");
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
      <p className={styles.intro}>Customer matching and website order history. Orders are imported into Sage manually.</p>
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
            <h3>Website Order History</h3>
            <p>Find a previous order or download its original Sage CSV. Check Sage before re-importing.</p>
            <div className={styles.historyToolbar}>
              <input aria-label="Search website order history" type="search"
                placeholder="Search customer, order reference or Sales Order #"
                value={orderSearch} onChange={event => { setOrderSearch(event.target.value); setOrderPage(0); }} />
              <small>{history.length} of {orders.length} recent orders{orders.length === 300 ? " (latest 300)" : ""}</small>
            </div>
            {pageOrders.length === 0 ? <p>{orders.length === 0 ? "No submitted orders yet." : "No matching orders."}</p> : (
              <div className={styles.historyList}>
                <div className={styles.historyHead} aria-hidden="true">
                  <span>Customer / order</span><span>Date</span><span>Subtotal</span><span>CSV</span>
                </div>
                {pageOrders.map(order => {
                  const account = accounts.find(a => a.user_id === order.user_id);
                  const audit = exports.find(record => record.order_id === order.id);
                  const customer = customers.find(c => c.customer_id === (audit?.customer_id || account?.intacct_customer_id));
                  const terms = customer?.term_name || "";
                  const ready = account?.status === "approved" && Boolean(customer &&
                    /^NET[0-9]{1,3}$/i.test(terms) && Number(terms.slice(3)) <= 365);
                  const legacy = Boolean(order.submitted_at && Date.parse(order.submitted_at) < legacyCutoff);
                  const expanded = expandedOrders[order.id] === true;
                  const total = (order.order_items || []).reduce((sum, item) => sum + Number(item.unit_price) * item.quantity, 0);
                  const money = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(total);
                  const date = order.submitted_at ? new Date(order.submitted_at).toLocaleDateString("en-CA", { timeZone: "America/St_Johns" }) : "Unknown";
                  const reference = audit?.reference_no || "WEB-" + order.id.replace(/-/g, "");
                  const toggle = () => setExpandedOrders(current => ({ ...current, [order.id]: !expanded }));
                  return (
                    <article key={order.id} className={styles.historyEntry}>
                      <div className={styles.historyRow}>
                        <div className={styles.historyCustomer}>
                          <strong>{order.customer_business_name || account?.business_name || "Customer order"}</strong>
                          <small>#{order.id.slice(0, 8).toUpperCase()} · {order.order_items?.length || 0} items
                            {audit?.imported_at ? " · " + (audit.intacct_document_no || "Recorded in Sage") : ""}</small>
                          {order.email_status && order.email_status !== "sent" && <small className={styles.historyWarning}>Order email not confirmed</small>}
                          {!audit && !ready && <small className={styles.historyWarning}>Customer match or terms need review</small>}
                        </div>
                        <span className={styles.historyDate}>{date}</span>
                        <strong className={styles.historyTotal}>{money}</strong>
                        <div className={styles.historyActions}>
                          {audit ? (
                            <button type="button" className="button button-secondary" disabled={Boolean(working)}
                              onClick={() => void exportOrder(order.id, true)}>{working === order.id ? "Working…" : "Download CSV"}</button>
                          ) : (
                            <button type="button" className="button button-secondary" disabled={Boolean(working)}
                              onClick={() => setExpandedOrders(current => ({ ...current, [order.id]: true }))}>
                              {ready ? "Prepare CSV" : "Review"}
                            </button>
                          )}
                          <button type="button" className={styles.historyDetailsButton} aria-expanded={expanded}
                            aria-controls={"history-" + order.id} onClick={toggle}>{expanded ? "Hide details" : "Details"}</button>
                        </div>
                      </div>
                      {expanded && <div className={styles.historyDetails} id={"history-" + order.id}>
                        <div className={styles.historyMeta}>
                          <small>Reference: {reference}</small>
                          <small>Intacct customer: {audit?.customer_id || customer?.customer_id || "Not matched"}{customer ? " — " + customer.customer_name : ""}</small>
                          <small>{audit ? "Original CSV prepared" + (audit.ship_date ? " · Ship date " + audit.ship_date : "") : "CSV not prepared"}</small>
                          {audit?.csv_email_status && <small>CSV email: {audit.csv_email_status === "accepted" ? "Accepted by email provider" : "Not confirmed — check CSR mailbox"}</small>}
                        </div>
                        <div className={styles.historyItems}>
                          {(order.order_items || []).map(item => <div key={item.product_id}>
                            <span>{item.product_id} — {item.product_name}{item.item_notes ? " · " + item.item_notes : ""}</span>
                            <span>{item.quantity} × {new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(item.unit_price))}</span>
                          </div>)}
                          {order.notes && <p><strong>Order notes:</strong> {order.notes}</p>}
                        </div>
                        {!audit ? (
                          <div className={styles.confirm}>
                            {!ready && <p className={styles.help}>Confirm the customer match and valid payment terms using the customer matching section above.</p>}
                            <label htmlFor={"intacct-ship-" + order.id}>Due/Ship date</label>
                            <input id={"intacct-ship-" + order.id} type="date"
                              value={shipDates[order.id] || (order.submitted_at ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/St_Johns", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(order.submitted_at)) : todayNewfoundland())}
                              onChange={event => setShipDates(current => ({ ...current, [order.id]: event.target.value }))} />
                            {legacy && <label className={styles.help}>
                              <input type="checkbox" checked={legacyConfirmations[order.id] === true}
                                onChange={event => setLegacyConfirmations(current => ({ ...current, [order.id]: event.target.checked }))} />
                              I checked Sage and confirmed this older order has not already been entered.
                            </label>}
                            <button type="button" className="button button-secondary"
                              disabled={!ready || Boolean(working) || (legacy && !legacyConfirmations[order.id])}
                              onClick={() => void exportOrder(order.id)}>Prepare and download CSV</button>
                          </div>
                        ) : audit.imported_at ? (
                          <span className={styles.done}>Sage Sales Order recorded: {audit.intacct_document_no}</span>
                        ) : (
                          <div className={styles.confirm}>
                            <label htmlFor={"intacct-doc-" + order.id}>Sage Sales Order # (optional)</label>
                            <input id={"intacct-doc-" + order.id} placeholder="e.g. SO0268"
                              value={documentNos[order.id] || ""}
                              onChange={event => setDocumentNos(current => ({ ...current, [order.id]: event.target.value }))} />
                            <button type="button" className="button button-secondary"
                              disabled={Boolean(working) || !(documentNos[order.id] || "").trim()}
                              onClick={() => void confirmImport(order.id)}>Record Sales Order</button>
                          </div>
                        )}
                      </div>}
                    </article>
                  );
                })}
              </div>
            )}
            {history.length > pageSize && <div className={styles.historyPagination}>
              <button className="button button-secondary" type="button" disabled={page === 0}
                onClick={() => setOrderPage(page - 1)}>Previous</button>
              <small>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, history.length)} of {history.length}</small>
              <button className="button button-secondary" type="button" disabled={(page + 1) * pageSize >= history.length}
                onClick={() => setOrderPage(page + 1)}>Next</button>
            </div>}
          </div>
        </>
      )}
    </section>
  );
}
