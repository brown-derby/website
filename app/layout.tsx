import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brown Derby Wholesale",
    template: "%s | Brown Derby Wholesale",
  },
  description: "Brown Derby Wholesale operations and automation hub.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell nav">
            <Link className="brand" href="/">
              <span className="brand-mark">BD</span>
              <span>
                <strong>Brown Derby Wholesale</strong>
                <small>Operations Hub</small>
              </span>
            </Link>

            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/tools">Tools</Link>
              <a href="/api/health">Health</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="shell footer-inner">
            <span>Brown Derby Wholesale</span>
            <span>Built to reduce repetitive work.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
