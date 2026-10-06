export default function AboutPage() {
  const stats = [
    { value: "1954", label: "Established" },
    { value: "9,000+", label: "Products stocked" },
    { value: "14", label: "Active routes" },
    { value: "320+", label: "Trade partners" },
  ];

  return (
    <>
      <section className="page-hero about-page-hero">
        <div className="shell">
          <p className="eyebrow">Our history</p>
          <h1>Seven decades of honest trade in Central Newfoundland.</h1>
          <p>
            Brown Derby Wholesale has served merchants, restaurants, convenience
            stores, and institutions from Grand Falls-Windsor since 1954.
          </p>
        </div>
      </section>

      <section className="about-story-section">
        <div className="shell about-story-grid">
          <aside className="about-year-card">
            <span>Since</span>
            <strong>1954</strong>
            <p>A family-run wholesale business built around long-term relationships.</p>
          </aside>

          <div className="about-story-copy">
            <p>
              Brown Derby Wholesale opened its doors in Grand Falls-Windsor in 1954,
              founded on a simple conviction: that the merchants and restaurateurs of
              Central Newfoundland deserved a supplier who knew them by name.
            </p>
            <p>
              Three generations later, that conviction still anchors every decision we
              make — from the relationships we cultivate with growers and manufacturers,
              to the routes our drivers run each week from Twillingate to Buchans,
              Glenwood to Springdale.
            </p>
            <p>
              Today we stock over nine thousand SKUs across pantry provisions,
              beverages, sanitary supplies, general merchandise, and other wholesale
              categories — all at the trade prices our partners depend on to help their
              own businesses thrive.
            </p>
          </div>
        </div>
      </section>

      <section className="about-stats-section">
        <div className="shell about-stats-grid">
          {stats.map((stat) => (
            <div className="about-stat-block" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section about-values-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">How we work</p>
            <h2>Built around relationships, reliability, and practical service.</h2>
            <p>
              Brown Derby Wholesale remains focused on the same thing that built the
              business in the first place: knowing our customers, carrying the products
              they rely on, and being dependable when they need us.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
