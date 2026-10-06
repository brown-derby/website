export default function AboutPage() {
  return (
    <>
      <section className="page-hero">
        <div className="shell">
          <p className="eyebrow">About Brown Derby</p>
          <h1>A wholesale business with deep local roots.</h1>
          <p>
            Brown Derby Wholesale grew from the original Brown Derby business in
            Grand Falls-Windsor and has been part of the local business community for
            generations.
          </p>
        </div>
      </section>

      <section>
        <div className="shell about-grid">
          <aside className="about-stat">
            <strong>1940s</strong>
            <span>Roots of the Brown Derby wholesale story</span>
          </aside>

          <div className="about-copy">
            <p>
              The Brown Derby story began in Grand Falls-Windsor in the 1940s. The
              original business brought products in to serve its own customers, and
              that buying activity eventually expanded into supplying other local
              businesses.
            </p>
            <p>
              That wholesale operation became Brown Derby Wholesale — a business built
              around sourcing products and serving business customers from Central
              Newfoundland.
            </p>
            <p>
              This website is the next step in that story: making it easier for
              customers to discover what Brown Derby carries and, over time, order
              directly online.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
