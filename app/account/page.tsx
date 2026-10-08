import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";
import PortalClient from "./PortalClient";

export const metadata: Metadata = {
  ...pageMetadata(
    "Customer Portal",
    "Manage your Brown Derby Wholesale order, update quantities, and review previously submitted orders in the customer portal.",
    "/account",
  ),
  robots: { index: false, follow: true },
};

export default function AccountPage() {
  return (
    <>
      <section className="page-hero account-page-hero">
        <div className="shell">
          <p className="eyebrow">Customer portal</p>
          <h1>My orders.</h1>
          <p>
            Build your current order, make changes before submitting, and review
            orders you have already sent to Brown Derby.
          </p>
        </div>
      </section>
      <section className="portal-section account-section">
        <div className="shell">
          <PortalClient />
        </div>
      </section>
    </>
  );
}
