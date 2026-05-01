import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ProductDetailPageProps {
  params: { id: string }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const product = await db.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      variants: {
        orderBy: { name: "asc" },
      },
      images: {
        orderBy: { order: "asc" },
      },
    },
  })

  if (!product) {
    notFound()
  }

  const mainImage = product.images && product.images.length > 0 
    ? product.images[0].url 
    : "/placeholder-product.jpg"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="relative w-full h-96 bg-gray-200 rounded-lg overflow-hidden mb-4">
            {mainImage !== "/placeholder-product.jpg" ? (
              <Image
                src={mainImage}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                No Image Available
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image, index) => (
                <div key={image.id} className="relative w-full h-20 bg-gray-200 rounded overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.alt || `${product.name} ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{product.name}</h1>
          {product.category && (
            <p className="text-lg text-gray-600 mb-4">{product.category.name}</p>
          )}
          <p className="text-3xl font-bold text-gray-900 mb-6">
            ${product.basePrice.toFixed(2)}
          </p>

          {product.description && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Available Variants</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Inventory</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.name}</TableCell>
                        <TableCell>${variant.price.toFixed(2)}</TableCell>
                        <TableCell>{variant.sku || "N/A"}</TableCell>
                        <TableCell>
                          <span className={variant.inventory < 10 ? "text-red-600 font-semibold" : ""}>
                            {variant.inventory}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
