import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import { SideNav } from '@/components/layout/SideNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      <SideNav />
      <div className="relative z-10 flex flex-1 flex-col" style={{ marginLeft: 'var(--sw)' }}>
        <Header />
        <main className="flex-1 pb-[70px] sm:pb-0">{children}</main>
        <BottomNav />
      </div>
    </div>
  )
}
