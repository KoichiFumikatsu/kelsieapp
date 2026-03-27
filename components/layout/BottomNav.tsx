'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/finance', label: 'Finanzas', emoji: '💸', color: 'var(--mod-finance)' },
  { href: '/chores', label: 'Tareas', emoji: '🧹', color: 'var(--mod-chores)' },
  { href: '/dashboard', label: 'Home', emoji: '🏠', color: 'var(--text-1)' },
  { href: '/tasks', label: 'Trabajo', emoji: '📋', color: 'var(--mod-tasks)' },
  { href: '/studies', label: 'Estudio', emoji: '🎓', color: 'var(--mod-studies)' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-10 flex h-16 items-center justify-around border-t border-muted/20 bg-surface">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-2 py-1 transition-colors"
          >
            <span
              className="text-xl transition-transform"
              style={{
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {item.emoji}
            </span>
            <span
              className="text-[10px] font-medium transition-colors"
              style={{
                color: isActive ? item.color : 'var(--text-3)',
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
