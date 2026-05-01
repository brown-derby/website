import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import ProductForm from "@/components/admin/ProductForm"
import { notFound } from "next/navigation"

interface EditProductPageProps {
  params: { id: string }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  await requireAuth()

  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id: params.id },
      include: {
        variants: true,
      },
    }),
    db.category.findMany({
      orderBy: { name: "asc" },
    }),
  ])

  if (!product) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-gray-600 mt-2">Update product information</p>
      </div>

      <ProductForm product={product} categories={categories} />
    </div>
  )
}
