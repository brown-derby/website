import Link from "next/link";
import { pageMetadata } from "../../lib/seo";

export const metadata = pageMetadata(
  "Brown Derby History & the Connors Family in Grand Falls-Windsor",
  "Explore the Connors family's history in Grand Falls-Windsor: from the Brown Derby restaurant in the 1940s to Brown Derby Wholesale, established in 1961.",
  "/about"
);

const historySource = "https://www.communitystories.ca/v2/main-street-merchants-windsor_marchands-a-windsor/story/wrigleys-chewing-gum-and-camel-cigarettes-at-the-brown-derby/";

export default function AboutPage() {
  return (
    <>
      <section className="page-hero about-page-hero">
        <div className="shell">
          <p className="eyebrow">Our history</p>
          <h1>From Windsor&apos;s Main Street to wholesale supply across Central Newfoundland.</h1>
          <p>
            Brown Derby&apos;s roots reach back to the 1940s, but the Connors family&apos;s
            story in Grand Falls-Windsor began decades earlier. Today, Brown Derby
            Wholesale carries on that connection to local businesses.
          </p>
        </div>
      </section>

      <section className="about-story-section">
        <div className="shell about-story-grid">
          <aside className="about-year-card">
            <span>Our roots</span>
            <strong>1943</strong>
            <p>
              The beginning of the Brown Derby story. The restaurant later became
              Brown Derby Wholesale in 1961.
            </p>
          </aside>

          <div className="about-story-copy">
            <h2>The Connors family and Windsor&apos;s railway beginnings</h2>
            <p>
              In an oral-history interview preserved by Heritage NL, John Connors
              recalled how his grandfather P. J. Connors came to the area in 1905
              to work for the Reid Newfoundland Railway and helped establish the
              station serving the growing community.
            </p>
            <p>
              John&apos;s father, Gerald Connors, later operated taxi and trucking
              businesses and the Crystal Springs beverage business before
              turning his attention to a restaurant on Windsor&apos;s Main Street.
            </p>
          </div>
        </div>
      </section>

      <section className="section about-values-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">1943–1961</p>
            <h2>How the Brown Derby restaurant became a wholesaler</h2>
          </div>
          <div className="about-story-copy">
            <h3>1943–1944: A restaurant on Main Street</h3>
            <p>
              In 1943, Gerald Connors set out to establish a restaurant inspired
              by a Brown Derby restaurant he had seen while travelling in New
              York. The Brown Derby opened in 1944. In November that year,
              a major fire destroyed much of Windsor&apos;s Main Street, including
              the restaurant. It was rebuilt afterward.
            </p>
            <h3>From buying in bulk to supplying neighbouring stores</h3>
            <p>
              The restaurant brought in products such as chocolate bars and
              chewing gum from outside Newfoundland. John Connors explained
              that these goods arrived in quantities larger than one restaurant
              could use. Supplying nearby family-owned stores in Windsor,
              Grand Falls and Bishop&apos;s Falls became a natural next step.
            </p>
            <h3>1961: Brown Derby Wholesale</h3>
            <p>
              Heritage NL&apos;s history records that Gerald Connors and business
              partner R. D. Stroud operated the restaurant until 1961, when
              they switched to wholesale. The business moved from Main Street
              to Hardy Avenue in the 1980s.
            </p>
            <p>
              These details are documented in the
              {" "}
              <a href={historySource}>
                Heritage NL and Grand Falls-Windsor Heritage Society oral-history exhibit
              </a>
              , which includes recollections from John Connors and archival
              photographs of the original Brown Derby.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">Brown Derby today</p>
            <h2>Wholesale supply with a local connection</h2>
            <p>
              From 22 Hardy Avenue in Grand Falls-Windsor, Brown Derby Wholesale
              continues serving business customers in Central Newfoundland.
              Our catalog includes
              {" "}<Link href="/products/food-grocery">food and grocery</Link>,
              {" "}<Link href="/products/beverages">beverages</Link>,
              {" "}<Link href="/products/candy-chocolate">confectionery</Link>,
              {" "}<Link href="/products/packaging-disposables">packaging</Link>,
              {" "}and <Link href="/products/cleaning-janitorial">cleaning supplies</Link>.
            </p>
            <p>
              <Link href="/products">Explore our wholesale catalog</Link> or
              {" "}<Link href="/contact">contact the team</Link> to learn more
              about ordering for your business.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
