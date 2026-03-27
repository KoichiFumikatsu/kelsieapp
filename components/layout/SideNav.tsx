'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wallet,
  Sparkles,
  LayoutGrid,
  ListChecks,
  GraduationCap,
  HeartPulse,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: LayoutGrid, color: 'var(--text-1)' },
  { href: '/finance', label: 'Finanzas', icon: Wallet, color: 'var(--mod-finance)' },
  { href: '/chores', label: 'Tareas hogar', icon: Sparkles, color: 'var(--mod-chores)' },
  { href: '/tasks', label: 'Trabajo', icon: ListChecks, color: 'var(--mod-tasks)' },
  { href: '/medical', label: 'Salud', icon: HeartPulse, color: 'var(--mod-medical)' },
  { href: '/studies', label: 'Estudio', icon: GraduationCap, color: 'var(--mod-studies)' },
  { href: '/settings/household', label: 'Settings', icon: Settings, color: 'var(--text-2)' },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex">
      {/* Brand */}
      <div className="flex h-12 items-center px-5">
        <span className="text-sm font-bold tracking-tight text-[var(--text-1)]">
          Household OS
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--surface-2)] text-[var(--text-1)]'
                  : 'text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]'
              }`}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r"
                  style={{ background: item.color }}
                />
              )}
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ color: isActive ? item.color : undefined }}
                className="shrink-0"
              />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
