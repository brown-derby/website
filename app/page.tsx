import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Brown Derby Wholesale
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your trusted partner for quality wholesale products
        </p>
        <Link href="/products">
          <Button size="lg">Browse Products</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Quality Products</CardTitle>
            <CardDescription>
              We offer a wide selection of high-quality wholesale products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Browse our extensive catalog of products carefully selected for quality and value.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitive Pricing</CardTitle>
            <CardDescription>
              Best prices in the market for wholesale buyers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              We work directly with manufacturers to bring you the best prices on all our products.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reliable Service</CardTitle>
            <CardDescription>
              Trusted by businesses for over a decade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Our commitment to customer service and reliable delivery sets us apart.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
