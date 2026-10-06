export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow">Contact</p>
          <h1>Talk to Brown Derby.</h1>
          <p>
            Questions about products, availability, becoming a customer, or an
            existing order? Reach Brown Derby Wholesale in Grand Falls-Windsor.
          </p>
        </div>
      </section>

      <section>
        <div className="shell contact-grid">
          <div className="contact-copy">
            <h2>We&apos;re here to help.</h2>
            <p>
              The online catalog and ordering experience are being built now. Until
              those tools are fully connected, customers can continue to contact Brown
              Derby directly.
            </p>
          </div>

          <div className="contact-card">
            <dl>
              <div>
                <dt>Business</dt>
                <dd>Brown Derby Wholesale Ltd.</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>22 Hardy Avenue<br />Grand Falls-Windsor, NL A2A 2P9</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd><a href="tel:+17094892299">709-489-2299</a></dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
