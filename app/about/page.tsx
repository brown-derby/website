export default function AboutPage() {
  const stats = [
    { value: "1943", label: "Established" },
    { value: "3,000+", label: "Items carried" },
  ];

  return (
    <>
      <section className="page-hero about-page-hero">
        <div className="shell">
          <p className="eyebrow">Our history</p>
          <h1>Serving Central Newfoundland since 1943.</h1>
          <p>
            Brown Derby Wholesale has been part of the Grand Falls-Windsor business
            community for more than 80 years, supplying local businesses with the
            products they rely on every day.
          </p>
        </div>
      </section>

      <section className="about-story-section">
        <div className="shell about-story-grid">
          <aside className="about-year-card">
            <span>Since</span>
            <strong>1943</strong>
            <p>
              Decades of wholesale experience, dependable service, and strong local
              business relationships.
            </p>
          </aside>

          <div className="about-story-copy">
            <p>
              Brown Derby Wholesale was established in Grand Falls-Windsor in 1943.
              Since then, the business has grown alongside the customers and
              communities it serves throughout Central Newfoundland.
            </p>
            <p>
              Today, Brown Derby carries more than 3,000 items across a wide range of
              wholesale categories, including food and grocery, beverages, candy and
              snacks, packaging and disposables, cleaning and janitorial supplies,
              restaurant smallwares, general merchandise, and more.
            </p>
            <p>
              While the business has changed over the years, the goal remains simple:
              make it easier for customers to get the products they need at dependable
              wholesale pricing, backed by practical, responsive service.
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
            <h2>Dependable wholesale supply with a local connection.</h2>
            <p>
              Brown Derby Wholesale is focused on knowing its customers, carrying the
              products they need, and providing straightforward service from its
              Grand Falls-Windsor location.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
