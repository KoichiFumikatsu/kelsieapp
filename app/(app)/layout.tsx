import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { SideNav } from '@/components/layout/SideNav'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-base">
      {/* Sidebar — desktop only */}
      <SideNav />

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:ml-56">
        <Header />
        <main className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto">{children}</main>
        {/* Bottom nav — mobile only */}
        <BottomNav />
      </div>
    </div>
  )
}
