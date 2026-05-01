import { requireAuth } from "@/lib/auth-helpers"
import CategoryForm from "@/components/admin/CategoryForm"

export default async function NewCategoryPage() {
  await requireAuth()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add New Category</h1>
        <p className="text-gray-600 mt-2">Create a new product category</p>
      </div>

      <CategoryForm />
    </div>
  )
}
