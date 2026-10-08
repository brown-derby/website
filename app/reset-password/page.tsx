import type { Metadata } from "next";
import { pageMetadata } from "../../lib/seo";
import ResetPasswordClient from "./ResetPasswordClient";

export const metadata: Metadata = {
  ...pageMetadata(
    "Reset Your Password",
    "Choose a new password for your Brown Derby Wholesale customer account and return to the customer portal.",
    "/reset-password",
  ),
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return (
    <>
      <section className="page-hero portal-page-hero">
        <div className="shell">
          <p className="eyebrow">Customer portal</p>
          <h1>Choose a new password.</h1>
        </div>
      </section>
      <section className="portal-section">
        <div className="shell portal-narrow">
          <ResetPasswordClient />
        </div>
      </section>
    </>
  );
}
