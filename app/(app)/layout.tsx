export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — se implementará en Fase 1 */}
      <main className="flex-1">{children}</main>
      {/* BottomNav — se implementará en Fase 1 */}
    </div>
  )
}
