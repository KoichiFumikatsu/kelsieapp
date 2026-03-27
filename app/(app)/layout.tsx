import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-base">
      <Header />
      <main className="flex-1 overflow-y-auto">{children}</main>
      <BottomNav />
    </div>
  )
}
