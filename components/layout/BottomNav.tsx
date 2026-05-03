'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, Sparkles, LayoutGrid, ListChecks, GraduationCap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/finance',   label: 'Finanzas', icon: Wallet },
  { href: '/chores',    label: 'Tareas',   icon: Sparkles },
  { href: '/dashboard', label: 'Inicio',   icon: LayoutGrid },
  { href: '/tasks',     label: 'Agenda',   icon: ListChecks },
  { href: '/studies',   label: 'Estudio',  icon: GraduationCap },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex h-14.5 items-center justify-around sm:hidden"
      style={{ background: 'var(--s1)', borderTop: '1px solid var(--b1)' }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex flex-col items-center gap-0.5 px-4 py-2"
          >
            {isActive && (
              <span
                className="absolute -top-px left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-b"
                style={{ background: 'var(--y)' }}
              />
            )}
            <Icon
              size={20}
              strokeWidth={isActive ? 2.2 : 1.5}
              style={{ color: isActive ? 'var(--y)' : 'var(--t3)' }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ color: isActive ? 'var(--y)' : 'var(--t3)', letterSpacing: '.06em' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
