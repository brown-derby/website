import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">About Brown Derby Wholesale</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Our Story</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Brown Derby Wholesale has been serving businesses across the region for over a decade.
            We started with a simple mission: to provide high-quality wholesale products at
            competitive prices while maintaining exceptional customer service.
          </p>
          <p className="text-gray-600">
            Today, we continue to build on that foundation, expanding our product catalog and
            strengthening our relationships with both suppliers and customers. We believe in
            building long-term partnerships that benefit everyone involved.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Our Values</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Quality:</strong> We carefully select every product in our catalog to ensure it meets our high standards.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Integrity:</strong> We conduct business with honesty and transparency in all our dealings.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Service:</strong> Our team is committed to providing exceptional customer service and support.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span><strong>Value:</strong> We work hard to offer the best prices while maintaining quality standards.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            For inquiries about our products or services, please reach out to us. We&apos;re here
            to help you find exactly what you need for your business.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
