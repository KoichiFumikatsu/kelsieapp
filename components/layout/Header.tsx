'use client'

import { useHousehold } from '@/hooks/useHousehold'
import { logout } from '@/app/actions/core/auth'

export function Header() {
  const { profile, household, loading } = useHousehold()

  if (loading) {
    return (
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-muted/20 bg-surface px-4">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-2" />
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-muted/20 bg-surface px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-primary">
          {household?.name ?? 'Household OS'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {profile && (
          <div className="flex items-center gap-1.5">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm"
              style={{ backgroundColor: profile.color_hex + '20', color: profile.color_hex }}
            >
              {profile.avatar_emoji}
            </span>
            <span className="hidden text-sm font-medium text-secondary sm:inline">
              {profile.display_name}
            </span>
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-secondary"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  )
}
