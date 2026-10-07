import ResetPasswordClient from "./ResetPasswordClient";

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
