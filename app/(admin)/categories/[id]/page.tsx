import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import CategoryForm from "@/components/admin/CategoryForm"
import { notFound } from "next/navigation"

interface EditCategoryPageProps {
  params: { id: string }
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  await requireAuth()

  const category = await db.category.findUnique({
    where: { id: params.id },
  })

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Category</h1>
        <p className="text-gray-600 mt-2">Update category information</p>
      </div>

      <CategoryForm category={category} />
    </div>
  )
}
