import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Brown Derby Wholesale",
    template: "%s | Brown Derby Wholesale",
  },
  description:
    "Brown Derby Wholesale — family-run wholesale distribution serving Central Newfoundland since 1954.",
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
            </nav>

            <Link className="header-cta" href="/contact">
              Become a customer
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
              <p className="footer-tagline">A handshake you can rely on since 1954.</p>
              <p>
                Family-run wholesale distribution serving grocers, restaurants,
                convenience stores, and institutions across Central Newfoundland.
              </p>
            </div>

            <div className="footer-info-column">
              <h3>Visit</h3>
              <address>
                142 Cromer Avenue<br />
                Grand Falls-Windsor, NL<br />
                A2A 1X3
              </address>
            </div>

            <div className="footer-info-column">
              <h3>Trade desk</h3>
              <div className="footer-hours">
                <span>Mon–Fri · 7:00–5:00</span>
                <span>Sat · 8:00–12:00</span>
              </div>
              <a href="tel:+17094896000">(709) 489-6000</a>
              <a href="mailto:trade@browndurby.ca">trade@browndurby.ca</a>
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
            <Link href="/contact">Apply for an account</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
