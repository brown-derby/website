import Link from "next/link";
import { categoryLandingPages } from "../../lib/categories";

export default function CategoryLinks({ excludeSlug }: { excludeSlug?: string }) {
  return (
    <ul className="category-landing-links">
      {categoryLandingPages
        .filter((category) => category.slug !== excludeSlug)
        .map((category) => (
          <li key={category.slug}>
            <Link href={`/products/${category.slug}`}>{category.category} →</Link>
          </li>
        ))}
    </ul>
  );
}
