import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brown Derby Wholesale",
    template: "%s | Brown Derby Wholesale",
  },
  description:
    "Brown Derby Wholesale — a long-standing wholesale supplier based in Grand Falls-Windsor, Newfoundland and Labrador.",
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
          <div className="shell header-inner">
            <Link className="brand" href="/" aria-label="Brown Derby Wholesale home">
              <span className="brand-seal" aria-hidden="true">BD</span>
              <span className="brand-copy">
                <strong>Brown Derby</strong>
                <small>Wholesale</small>
              </span>
            </Link>

            <nav className="main-nav" aria-label="Main navigation">
              <Link href="/products">Products</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </nav>

            <Link className="header-cta" href="/contact">
              Become a customer
            </Link>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="shell footer-grid">
            <div>
              <div className="footer-brand">Brown Derby Wholesale</div>
              <p>Wholesale supply from Grand Falls-Windsor, Newfoundland and Labrador.</p>
            </div>

            <div className="footer-links">
              <Link href="/products">Products</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>

            <div className="footer-address">
              <span>22 Hardy Avenue</span>
              <span>Grand Falls-Windsor, NL</span>
              <span>A2A 2P9</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
