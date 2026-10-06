export default function ContactPage() {
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow">Contact</p>
          <h1>Talk to Brown Derby.</h1>
          <p>
            Questions about products, availability, becoming a customer, or an
            existing order? Reach our trade desk in Grand Falls-Windsor.
          </p>
        </div>
      </section>

      <section>
        <div className="shell contact-grid">
          <div className="contact-copy">
            <h2>We&apos;re here to help.</h2>
            <p>
              Whether you&apos;re already a Brown Derby customer or looking to open a
              trade account, our team can help with products, pricing, ordering, and
              route information.
            </p>
            <p>
              Our online catalog is available now, with more ordering features planned
              as the website grows.
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
                <dd>
                  142 Cromer Avenue<br />
                  Grand Falls-Windsor, NL A2A 1X3
                </dd>
              </div>
              <div>
                <dt>Trade desk</dt>
                <dd><a href="tel:+17094896000">(709) 489-6000</a></dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd><a href="mailto:trade@browndurby.ca">trade@browndurby.ca</a></dd>
              </div>
              <div>
                <dt>Hours</dt>
                <dd>
                  Monday–Friday · 7:00–5:00<br />
                  Saturday · 8:00–12:00
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
