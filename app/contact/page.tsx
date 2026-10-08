import BusinessSchema from "../components/BusinessSchema";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(
  "Contact Brown Derby in Grand Falls-Windsor",
  "Contact Brown Derby Wholesale at 22 Hardy Avenue, Grand Falls-Windsor, NL A2A 2P9. Call 709-489-2299 for products, availability and wholesale ordering.",
  "/contact"
);

export default function ContactPage() {
  return (
    <>
      <BusinessSchema />
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow">Contact</p>
          <h1>Talk to Brown Derby.</h1>
          <p>
            Questions about products, pricing, availability, becoming a customer, or
            an existing order? Get in touch with Brown Derby Wholesale in
            Grand Falls-Windsor.
          </p>
        </div>
      </section>

      <section>
        <div className="shell contact-grid">
          <div className="contact-copy">
            <h2>We&apos;re here to help.</h2>
            <p>
              Whether you&apos;re already a Brown Derby customer or looking to become
              one, our team can help with products, pricing, and ordering.
            </p>
            <p>
              Visit us on Hardy Avenue, call during business hours, or send us an
              email and we&apos;ll help point you in the right direction.
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
                  22 Hardy Avenue<br />
                  Grand Falls-Windsor, NL A2A 2P9
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd><a href="tel:+17094892299">(709) 489-2299</a></dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd><a href="mailto:csr@brownderby.ca">csr@brownderby.ca</a></dd>
              </div>
              <div>
                <dt>Hours</dt>
                <dd>
                  Monday–Friday · 8:00–5:00<br />
                  Saturday–Sunday · Closed
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
