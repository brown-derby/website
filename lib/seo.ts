import type { Metadata } from "next";

export const SITE_URL = "https://brownderby.ca";
export const SITE_NAME = "Brown Derby Wholesale";

export function canonicalUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

/** Keep each page's canonical and sharing metadata tied to its public URL. */
export function pageMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const url = canonicalUrl(path);
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "en_CA",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description,
    },
  };
}
