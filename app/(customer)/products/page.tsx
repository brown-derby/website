import { db } from "@/lib/db"
import ProductList from "@/components/customer/ProductList"
import CategoryFilter from "@/components/customer/CategoryFilter"

interface ProductsPageProps {
  searchParams: { categoryId?: string }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const categoryId = searchParams.categoryId

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: {
        category: true,
        images: {
          orderBy: { order: "asc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Our Products</h1>
        <p className="text-gray-600">Browse our selection of quality wholesale products</p>
      </div>

      <CategoryFilter categories={categories} />

      <ProductList products={products} />
    </div>
  )
}
