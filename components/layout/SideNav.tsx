'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, Sparkles, LayoutGrid, ListChecks, GraduationCap, HeartPulse, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'Inicio',        icon: LayoutGrid,    color: 'var(--t2)' },
  { href: '/finance',             label: 'Finanzas',      icon: Wallet,        color: 'var(--c-fin)' },
  { href: '/chores',              label: 'Tareas hogar',  icon: Sparkles,      color: 'var(--c-chor)' },
  { href: '/tasks',               label: 'Agenda',        icon: ListChecks,    color: 'var(--c-task)' },
  { href: '/medical',             label: 'Salud',         icon: HeartPulse,    color: 'var(--c-med)' },
  { href: '/studies',             label: 'Estudio',       icon: GraduationCap, color: 'var(--c-stu)' },
  { href: '/settings/household',  label: 'Config',        icon: Settings,      color: 'var(--t3)' },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden flex-col sm:flex"
      style={{
        width: 'var(--sw)',
        background: 'var(--s1)',
        borderRight: '1px solid var(--b1)',
      }}
    >
      {/* Brand */}
      <div
        className="flex shrink-0 items-center justify-center border-b py-4"
        style={{ borderColor: 'var(--b0)', minHeight: 56 }}
      >
        {/* Icon-only on tablet (640-1023px) */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded lg:hidden"
          style={{ background: 'var(--y)', borderRadius: 'var(--rs)' }}
        >
          <span className="text-sm font-black italic" style={{ color: 'var(--yt)' }}>K</span>
        </div>
        {/* Full brand on desktop */}
        <span className="hidden text-lg font-black italic tracking-tight lg:block" style={{ color: 'var(--t1)', letterSpacing: '-.04em' }}>
          <span style={{ color: 'var(--y)' }}>K</span>elsie
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 transition-all lg:px-3"
              style={{
                background: isActive ? 'rgba(236,199,0,.10)' : 'transparent',
                border: `1px solid ${isActive ? 'rgba(236,199,0,.15)' : 'transparent'}`,
                color: isActive ? 'var(--y)' : 'var(--t3)',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--s2)'
                  e.currentTarget.style.color = 'var(--t2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--t3)'
                }
              }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.2 : 1.6}
                className="shrink-0"
                style={{ color: isActive ? 'var(--y)' : undefined }}
              />
              <span
                className="hidden text-xs font-bold uppercase tracking-widest lg:block"
                style={{ letterSpacing: '.06em', color: isActive ? 'var(--y)' : undefined }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
