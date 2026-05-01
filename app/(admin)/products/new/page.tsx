import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import ProductForm from "@/components/admin/ProductForm"

export default async function NewProductPage() {
  await requireAuth()

  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Product</h1>
        <p className="text-gray-600 mt-2">Create a new product in your catalog</p>
      </div>

      <ProductForm categories={categories} />
    </div>
  )
}
