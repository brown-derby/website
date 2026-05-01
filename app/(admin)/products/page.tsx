import { db } from "@/lib/db"
import { requireAuth } from "@/lib/auth-helpers"
import ProductTable from "@/components/admin/ProductTable"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function ProductsPage() {
  await requireAuth()

  const products = await db.product.findMany({
    include: {
      category: true,
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-2">Manage your product catalog</p>
        </div>
        <Link href="/products/new">
          <Button>Add New Product</Button>
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  )
}
