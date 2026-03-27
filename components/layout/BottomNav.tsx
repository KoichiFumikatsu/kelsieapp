'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Wallet,
  Sparkles,
  LayoutGrid,
  ListChecks,
  GraduationCap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  color: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/finance', label: 'Finanzas', icon: Wallet, color: 'var(--mod-finance)' },
  { href: '/chores', label: 'Tareas', icon: Sparkles, color: 'var(--mod-chores)' },
  { href: '/dashboard', label: 'Home', icon: LayoutGrid, color: 'var(--text-1)' },
  { href: '/tasks', label: 'Trabajo', icon: ListChecks, color: 'var(--mod-tasks)' },
  { href: '/studies', label: 'Estudio', icon: GraduationCap, color: 'var(--mod-studies)' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-10 flex h-14 items-center justify-around glass md:hidden">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5"
          >
            {isActive && (
              <span
                className="absolute -top-px left-1/2 h-[2px] w-6 -translate-x-1/2"
                style={{ background: item.color }}
              />
            )}
            <Icon
              size={20}
              strokeWidth={isActive ? 2.2 : 1.5}
              style={{ color: isActive ? item.color : 'var(--text-3)' }}
              className="transition-colors"
            />
            <span
              className="text-[10px] font-semibold tracking-wide transition-colors"
              style={{ color: isActive ? item.color : 'var(--text-3)' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
