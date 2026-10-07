import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brown Derby Wholesale",
    template: "%s | Brown Derby Wholesale",
  },
  description:
    "Brown Derby Wholesale — serving Central Newfoundland from Grand Falls-Windsor since 1943.",
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
            <Link className="brand-logo-link" href="/" aria-label="Brown Derby Wholesale home">
              <img
                src="/brown-derby-logo.svg"
                alt="Brown Derby Wholesale"
                className="site-logo"
              />
            </Link>

            <nav className="main-nav" aria-label="Main navigation">
              <Link href="/products">Products</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/account">Customer portal</Link>
            </nav>

            <Link className="header-cta" href="/account">
              Customer portal
            </Link>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="shell footer-grid">
            <div className="footer-brand-column">
              <Link className="footer-logo-link" href="/" aria-label="Brown Derby Wholesale home">
                <img
                  src="/brown-derby-logo.svg"
                  alt="Brown Derby Wholesale"
                  className="footer-logo"
                />
              </Link>
              <p className="footer-tagline">Serving Central Newfoundland since 1943.</p>
              <p>
                Wholesale products and dependable service from Grand Falls-Windsor,
                Newfoundland and Labrador.
              </p>
            </div>

            <div className="footer-info-column">
              <h3>Visit</h3>
              <address>
                22 Hardy Avenue<br />
                Grand Falls-Windsor, NL<br />
                A2A 2P9
              </address>
            </div>

            <div className="footer-info-column">
              <h3>Contact & hours</h3>
              <div className="footer-hours">
                <span>Mon–Fri · 8:00–5:00</span>
                <span>Sat–Sun · Closed</span>
              </div>
              <a href="tel:+17094892299">(709) 489-2299</a>
              <a href="mailto:csr@brownderby.ca">csr@brownderby.ca</a>
            </div>

            <div className="footer-info-column footer-links">
              <h3>Explore</h3>
              <Link href="/products">Products</Link>
              <Link href="/about">Our history</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div className="shell footer-bottom">
            <span>© {new Date().getFullYear()} Brown Derby Wholesale Ltd. · Newfoundland & Labrador</span>
            <Link href="/contact">Become a customer</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
