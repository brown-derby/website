import LoginPortal from "./LoginPortal";

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
