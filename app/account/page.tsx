import PortalClient from "./PortalClient";

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
