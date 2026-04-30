'use client'

import { useHousehold } from '@/hooks/useHousehold'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/core/auth'
import { LogOut } from 'lucide-react'

const MODULE_LABELS: Record<string, string> = {
  '/dashboard': 'Inicio',
  '/finance':   'Finanzas',
  '/chores':    'Tareas hogar',
  '/tasks':     'Trabajo',
  '/medical':   'Salud',
  '/studies':   'Estudio',
  '/settings':  'Configuracion',
}

function useModuleLabel() {
  const pathname = usePathname()
  const match = Object.entries(MODULE_LABELS).find(([prefix]) => pathname.startsWith(prefix))
  return match ? match[1] : ''
}

export function Header() {
  const { profile, loading } = useHousehold()
  const moduleLabel = useModuleLabel()
  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <header
      className="sticky top-0 z-20 flex h-13 shrink-0 items-center justify-between px-4 gap-3"
      style={{ background: 'var(--s1)', borderBottom: '1px solid var(--b1)' }}
    >
      {/* Left — brand (mobile) + module label (tablet+) */}
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="text-base font-black italic tracking-tight sm:hidden"
          style={{ color: 'var(--t1)', letterSpacing: '-.04em' }}
        >
          <span style={{ color: 'var(--y)' }}>K</span>elsie
        </span>
        {moduleLabel && (
          <span
            className="hidden text-sm font-extrabold uppercase tracking-widest sm:block"
            style={{ color: 'var(--t1)', letterSpacing: '.10em' }}
          >
            {moduleLabel}
          </span>
        )}
      </div>

      {/* Right — avatar + logout */}
      <div className="flex items-center gap-2 shrink-0">
        {!loading && profile && (
          <div
            className="flex h-7.5 w-7.5 items-center justify-center rounded text-xs font-black"
            style={{
              background: `${profile.color_hex}18`,
              color: profile.color_hex,
              border: `1px solid ${profile.color_hex}30`,
              borderRadius: 'var(--rs)',
            }}
          >
            {initial}
          </div>
        )}
        {loading && (
          <div className="h-7.5 w-7.5 animate-pulse rounded" style={{ background: 'var(--s2)', borderRadius: 'var(--rs)' }} />
        )}
        <form action={logout}>
          <button
            type="submit"
            className="icon-btn"
            aria-label="Cerrar sesion"
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </header>
  )
}
