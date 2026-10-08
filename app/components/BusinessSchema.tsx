import { SITE_NAME, SITE_URL, canonicalUrl } from "../../lib/seo";

export const businessStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["LocalBusiness", "Organization"],
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: "Brown Derby Wholesale Ltd.",
      url: canonicalUrl("/"),
      logo: canonicalUrl("/brown-derby-logo.svg"),
      telephone: "+1-709-489-2299",
      address: {
        "@type": "PostalAddress",
        streetAddress: "22 Hardy Avenue",
        addressLocality: "Grand Falls-Windsor",
        addressRegion: "NL",
        postalCode: "A2A 2P9",
        addressCountry: "CA",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: canonicalUrl("/"),
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function BusinessSchema() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(businessStructuredData).replace(/</g, "\\u003c"),
      }}
    />
  );
}
