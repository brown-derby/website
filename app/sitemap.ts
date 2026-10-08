import type { MetadataRoute } from "next";
import { categoryLandingPages } from "../lib/categories";
import { canonicalUrl } from "../lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only curated public pages belong here; portal and catalog query URLs do not.
  const paths = [
    "/",
    "/products",
    "/about",
    "/contact",
    ...categoryLandingPages.map(({ slug }) => `/products/${slug}`),
  ];

  return paths.map((path) => ({ url: canonicalUrl(path) }));
}
