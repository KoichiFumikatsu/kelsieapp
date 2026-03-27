export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6 lg:p-8">
      <div className="space-y-1">
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-7 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-md bg-[var(--surface-2)]" />
        ))}
      </div>
    </div>
  )
}
