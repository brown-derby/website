import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryLandingPage } from "../../../lib/categories";
import { pageMetadata } from "../../../lib/seo";
import CategoryLinks from "../../components/CategoryLinks";
import BreadcrumbSchema from "../../components/BreadcrumbSchema";
import ProductCatalog from "../ProductCatalog";
import { getPublicCatalogProducts } from "../../../lib/catalog";

// Render category pages at request time, without including private prices in public HTML.
export const dynamic = "force-dynamic";

type CategoryPageProps = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = getCategoryLandingPage(slug);
  if (!category) notFound();
  return pageMetadata(category.title, category.description, `/products/${category.slug}`);
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = getCategoryLandingPage(slug);
  if (!category) notFound();

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
          { name: category.category, path: `/products/${category.slug}` },
        ]}
      />
      <section className="page-hero category-page-hero">
        <div className="shell">
          <nav aria-label="Breadcrumb" className="category-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/products">Products</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{category.category}</span>
          </nav>
          <p className="eyebrow">Brown Derby Wholesale · Grand Falls-Windsor</p>
          <h1>{category.heading}</h1>
          <p>{category.intro}</p>
        </div>
      </section>

      <section className="catalog-shell">
        <div className="shell">
          <ProductCatalog key={category.slug} initialCategory={category.category} products={getPublicCatalogProducts()} />
        </div>
      </section>

      <section className="section category-ordering">
        <div className="shell">
          <div className="section-heading">
            <h2>{category.buyingHeading}</h2>
            <p>{category.buyingAdvice}</p>
            <p>
              <Link href="/login">Sign in</Link> to add quantities and save your
              order, or <Link href="/contact">contact Brown Derby</Link> for help.
            </p>
          </div>
          <h3>Explore more wholesale categories</h3>
          <CategoryLinks excludeSlug={category.slug} />
        </div>
      </section>
    </>
  );
}
