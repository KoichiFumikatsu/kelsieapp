import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_emoji, household_id')
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
      <div>
        <h1 className="text-2xl font-bold text-primary">
          Hola {profile?.avatar_emoji} {profile?.display_name}
        </h1>
        <p className="mt-1 text-sm text-secondary">Bienvenido a Household OS</p>
      </div>

      {/* Grid de módulos — placeholder para Fase 8 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: 'Finanzas', emoji: '💸', color: 'var(--mod-finance)', href: '/finance' },
          { name: 'Tareas hogar', emoji: '🧹', color: 'var(--mod-chores)', href: '/chores' },
          { name: 'Trabajo', emoji: '📋', color: 'var(--mod-tasks)', href: '/tasks' },
          { name: 'Salud', emoji: '🏥', color: 'var(--mod-medical)', href: '/medical' },
          { name: 'Estudio', emoji: '🎓', color: 'var(--mod-studies)', href: '/studies' },
          { name: 'Settings', emoji: '⚙️', color: 'var(--text-2)', href: '/settings/household' },
        ].map((mod) => (
          <a
            key={mod.name}
            href={mod.href}
            className="flex flex-col items-center gap-2 rounded-xl border border-muted/20 bg-surface p-4 transition-shadow hover:shadow-md"
          >
            <span className="text-3xl">{mod.emoji}</span>
            <span className="text-sm font-medium" style={{ color: mod.color }}>
              {mod.name}
            </span>
          </a>
        ))}
      </div>

      {/* Código de invitación */}
      {inviteCode && (
        <div className="rounded-xl border border-muted/20 bg-surface p-4">
          <p className="text-sm text-secondary">Invita a tu pareja con este código:</p>
          <p className="mt-1 font-mono text-lg font-bold text-mod-chores">{inviteCode}</p>
          <p className="mt-2 text-xs text-muted">
            Enlace: {typeof window !== 'undefined' ? window.location.origin : ''}/join/{inviteCode}
          </p>
        </div>
      )}
    </div>
  )
}
