import { createClient } from '@/lib/supabase/server'
import {
  Wallet,
  Sparkles,
  ListChecks,
  HeartPulse,
  GraduationCap,
  Settings,
  Copy,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

type ModuleCard = {
  name: string
  icon: LucideIcon
  color: string
  href: string
}

const MODULES: ModuleCard[] = [
  { name: 'Finanzas', icon: Wallet, color: 'var(--mod-finance)', href: '/finance' },
  { name: 'Tareas hogar', icon: Sparkles, color: 'var(--mod-chores)', href: '/chores' },
  { name: 'Trabajo', icon: ListChecks, color: 'var(--mod-tasks)', href: '/tasks' },
  { name: 'Salud', icon: HeartPulse, color: 'var(--mod-medical)', href: '/medical' },
  { name: 'Estudio', icon: GraduationCap, color: 'var(--mod-studies)', href: '/studies' },
  { name: 'Settings', icon: Settings, color: 'var(--text-2)', href: '/settings/household' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, household_id')
    .eq('id', user!.id)
    .single()

  let inviteCode: string | null = null
  if (profile?.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('invite_code')
      .eq('id', profile.household_id)
      .single()
    inviteCode = household?.invite_code ?? null
  }

  return (
    <div className="p-4 space-y-6">
      {/* Greeting — clean, no emoji */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Bienvenido</p>
        <h1 className="mt-1 text-xl font-bold text-primary">{profile?.display_name}</h1>
      </div>

      {/* Module grid — Arknights operator-card style */}
      <div className="grid grid-cols-2 gap-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.name}
              href={mod.href}
              className="mod-card flex items-center gap-3 p-4"
              style={{ '--accent': mod.color } as React.CSSProperties}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded"
                style={{
                  backgroundColor: `color-mix(in srgb, ${mod.color} 12%, transparent)`,
                  color: mod.color,
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
              </div>
              <span className="text-sm font-semibold text-primary">{mod.name}</span>
            </Link>
          )
        })}
      </div>

      {/* Invite code — tactical panel */}
      {inviteCode && (
        <div className="mod-card p-4" style={{ '--accent': 'var(--mod-chores)' } as React.CSSProperties}>
          <p className="text-xs font-medium uppercase tracking-widest text-muted">
            Código de invitación
          </p>
          <p className="mt-2 flex items-center gap-2 font-mono text-lg font-bold text-primary">
            {inviteCode}
            <Copy size={14} className="text-muted" />
          </p>
          <p className="mt-2 text-xs text-muted">
            Comparte este código con tu pareja para que se una al hogar.
          </p>
        </div>
      )}
    </div>
  )
}
