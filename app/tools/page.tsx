import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tools",
  description: "Brown Derby Wholesale internal utilities.",
};

const tools = [
  {
    name: "PDF Splitter",
    description:
      "Split a PDF into individual pages or selected page ranges without leaving the Brown Derby hub.",
    status: "Next",
  },
  {
    name: "Batch File Renamer",
    description:
      "Apply consistent bookkeeping-friendly file names to groups of documents quickly.",
    status: "Next",
  },
  {
    name: "Document Prep",
    description:
      "Prepare incoming documents for filing, upload, or accounting workflows with fewer manual steps.",
    status: "Planned",
  },
  {
    name: "Accounting Workflow Helpers",
    description:
      "Small guided tools for repeatable Sage and bookkeeping procedures that are easy to get wrong.",
    status: "Planned",
  },
];

export default function ToolsPage() {
  return (
    <section className="section tools-page">
      <div className="shell">
        <div className="page-heading">
          <p className="kicker">Toolbox</p>
          <h1>Small tools that remove recurring work.</h1>
          <p>
            This page will become the launchpad for Brown Derby&apos;s internal
            utilities. The first utilities will focus on document-heavy bookkeeping
            tasks.
          </p>
        </div>

        <div className="tool-grid">
          {tools.map((tool) => (
            <article className="tool-card" key={tool.name}>
              <div className="tool-icon" aria-hidden="true">
                ↗
              </div>
              <div>
                <div className="card-topline">
                  <h2>{tool.name}</h2>
                  <span className="pill">{tool.status}</span>
                </div>
                <p>{tool.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="callout">
          <div>
            <p className="kicker">Build principle</p>
            <h2>When a task repeats, it becomes a candidate for a tool.</h2>
          </div>
          <p>
            We&apos;ll prioritize utilities by time saved, frequency, and how much
            they reduce mistakes—not by how impressive they look.
          </p>
        </div>
      </div>
    </section>
  );
}
