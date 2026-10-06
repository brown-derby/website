import Link from "next/link";

const workstreams = [
  {
    eyebrow: "Minitools",
    title: "Fast utilities for everyday work",
    description:
      "PDF splitting, file renaming, document cleanup, and other small tools that remove repetitive bookkeeping steps.",
    status: "Building",
  },
  {
    eyebrow: "Accounting",
    title: "Workflow support around Sage",
    description:
      "Turn recurring bookkeeping procedures into clear, repeatable workflows and automation opportunities.",
    status: "Planned",
  },
  {
    eyebrow: "Operations",
    title: "One place to run Brown Derby",
    description:
      "A growing internal home for tools, process knowledge, integrations, and operational shortcuts.",
    status: "Foundation",
  },
];

export default function HomePage() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <p className="kicker">Brown Derby Wholesale · Internal Operations</p>
            <h1>Less clicking. Less repetition. More work done.</h1>
            <p className="hero-copy">
              This is the home base for the tools and workflows we build to simplify
              Brown Derby&apos;s day-to-day operations.
            </p>
            <div className="button-row">
              <Link className="button primary" href="/tools">
                Open tools
              </Link>
              <a className="button secondary" href="/api/health">
                Check system health
              </a>
            </div>
          </div>

          <aside className="status-panel" aria-label="Deployment status">
            <div className="status-heading">
              <span className="status-dot" />
              <span>Foundation online</span>
            </div>
            <dl className="status-list">
              <div>
                <dt>Application</dt>
                <dd>Next.js</dd>
              </div>
              <div>
                <dt>Production source</dt>
                <dd>main</dd>
              </div>
              <div>
                <dt>Build</dt>
                <dd>{commit}</dd>
              </div>
            </dl>
            <p>
              Production will deploy from <code>main</code>. Feature work will be
              reviewed in preview deployments before it is promoted.
            </p>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="kicker">Current direction</p>
              <h2>One platform, built a useful piece at a time.</h2>
            </div>
            <p>
              We&apos;re starting with a dependable deployment foundation, then adding
              the tools that save the most time.
            </p>
          </div>

          <div className="card-grid">
            {workstreams.map((item) => (
              <article className="card" key={item.title}>
                <div className="card-topline">
                  <span>{item.eyebrow}</span>
                  <span className="pill">{item.status}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted">
        <div className="shell split">
          <div>
            <p className="kicker">How we ship</p>
            <h2>Production stays stable while the platform keeps moving.</h2>
          </div>
          <div className="steps">
            <div>
              <span>01</span>
              <p>
                <strong>Build on a branch.</strong> New work stays isolated from production.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Verify the preview.</strong> CI and Vercel previews catch problems early.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Merge to main.</strong> Stable work becomes the production version.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
