import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";
import LoginPortal from "./LoginPortal";

export const metadata: Metadata = {
  ...pageMetadata(
    "Customer Sign In",
    "Sign in to your Brown Derby Wholesale customer account to browse the catalog, build an order, and review submitted orders.",
    "/login",
  ),
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <>
      <section className="page-hero portal-page-hero">
        <div className="shell">
          <p className="eyebrow">Customer portal</p>
          <h1>Sign in to order online.</h1>
          <p>
            Access your Brown Derby order, browse the catalog, update quantities,
            and review previously submitted orders.
          </p>
        </div>
      </section>
      <section className="portal-section">
        <div className="shell">
          <LoginPortal />
        </div>
      </section>
    </>
  );
}
