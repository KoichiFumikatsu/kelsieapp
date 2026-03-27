'use client'

import { useHousehold } from '@/hooks/useHousehold'
import { logout } from '@/app/actions/core/auth'
import { LogOut } from 'lucide-react'

export function Header() {
  const { profile, household, loading } = useHousehold()

  if (loading) {
    return (
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between glass px-4">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
      </header>
    )
  }

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between glass px-4">
      <span className="text-sm font-bold tracking-tight text-primary">
        {household?.name ?? 'Household OS'}
      </span>

      <div className="flex items-center gap-2.5">
        {profile && (
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded text-xs font-bold"
              style={{
                backgroundColor: profile.color_hex + '18',
                color: profile.color_hex,
                border: `1px solid ${profile.color_hex}30`,
              }}
            >
              {initial}
            </div>
            <span className="hidden text-xs font-medium text-secondary sm:inline">
              {profile.display_name}
            </span>
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-surface-2 hover:text-secondary"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} strokeWidth={1.8} />
          </button>
        </form>
      </div>
    </header>
  )
}
