export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    </div>
  )
}
