import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics } from '@/app/actions/core/dashboard'
import { formatCOP } from '@/lib/utils/format'
import {
  Wallet,
  Sparkles,
  ListChecks,
  HeartPulse,
  GraduationCap,
  Settings,
  Flame,
  Pill,
  CreditCard,
  CalendarClock,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { InviteLinkCard } from '@/components/ui/InviteLinkCard'

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

  const [profileRes, metrics] = await Promise.all([
    supabase.from('profiles').select('display_name, household_id').eq('id', user!.id).single(),
    getDashboardMetrics(),
  ])
  const profile = profileRes.data

  let inviteCode: string | null = null
  if (profile?.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('invite_code')
      .eq('id', profile.household_id)
      .single()
    inviteCode = household?.invite_code ?? null
  }

  const fin = metrics.finance
  const deuda = fin ? fin.deudaCreditoAcumulada : 0
  const dias = fin ? fin.diasParaCorte : 99
  const creditUrgent = deuda > 0 && dias >= 0 && dias <= 5
  const creditWarning = deuda > 0 && dias > 5 && dias <= 15

  return (
    <div className="p-4 space-y-5 md:p-6 lg:p-8">
      {/* Greeting */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-3)]">Bienvenido</p>
        <h1 className="mt-1 text-xl font-bold text-[var(--text-1)] md:text-2xl">{profile?.display_name}</h1>
      </div>

      {/* Finance summary */}
      {fin && (
        <Link href="/finance" className="block space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <MiniKPI icon={<Wallet size={13} />} label="Saldo" value={formatCOP(fin.saldoActual)} color={fin.saldoActual >= 0 ? 'var(--income)' : 'var(--expense)'} />
            <MiniKPI icon={<TrendingUp size={13} />} label="Ingresos" value={formatCOP(fin.totalIngresos)} color="var(--income)" />
            <MiniKPI icon={<TrendingDown size={13} />} label="Gastos" value={formatCOP(fin.totalGastos)} color="var(--expense)" />
          </div>
          {deuda > 0 && (
            <div className={`flex items-center gap-2 rounded px-3 py-2 text-xs ${
              creditUrgent
                ? 'border border-[var(--expense)]/30 bg-[color-mix(in_srgb,var(--expense)_5%,transparent)]'
                : creditWarning
                  ? 'border border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_5%,transparent)]'
                  : 'border border-[var(--credit)]/20 bg-[color-mix(in_srgb,var(--credit)_3%,transparent)]'
            }`}>
              <CreditCard size={13} className={creditUrgent ? 'text-[var(--expense)]' : creditWarning ? 'text-[var(--warn)]' : 'text-[var(--credit)]'} />
              <span className="font-medium text-[var(--text-2)]">Deuda TC: <span className="num font-bold text-[var(--credit)]">{formatCOP(deuda)}</span></span>
              <span className="ml-auto text-[var(--text-3)]">
                {dias === 0 ? 'Corte HOY' : dias > 0 ? `Corte en ${dias}d` : 'Corte pasado'}
              </span>
            </div>
          )}
        </Link>
      )}

      {/* Quick status row */}
      <div className="grid grid-cols-2 gap-2">
        <StatusCard
          href="/chores"
          icon={<Sparkles size={15} />}
          color="var(--mod-chores)"
          title="Tareas hogar"
          lines={[
            metrics.choresPending > 0
              ? `${metrics.choresPending} pendiente${metrics.choresPending > 1 ? 's' : ''}`
              : 'Todo listo',
            metrics.choresDone > 0 ? `${metrics.choresDone} completada${metrics.choresDone > 1 ? 's' : ''} hoy` : null,
          ]}
          alert={metrics.choresPending > 0}
        />
        <StatusCard
          href="/tasks"
          icon={<ListChecks size={15} />}
          color="var(--mod-tasks)"
          title="Trabajo"
          lines={[
            `${metrics.openTasks} abierta${metrics.openTasks !== 1 ? 's' : ''}`,
            metrics.urgentTasks > 0 ? `${metrics.urgentTasks} urgente${metrics.urgentTasks > 1 ? 's' : ''}` : null,
            metrics.tasksDueToday > 0 ? `${metrics.tasksDueToday} vence${metrics.tasksDueToday > 1 ? 'n' : ''} hoy` : null,
          ]}
          alert={metrics.urgentTasks > 0 || metrics.tasksDueToday > 0}
        />
        <StatusCard
          href="/medical"
          icon={<HeartPulse size={15} />}
          color="var(--mod-medical)"
          title="Salud"
          lines={[
            metrics.activeMeds > 0 ? `${metrics.activeMeds} med${metrics.activeMeds > 1 ? 's' : ''} activo${metrics.activeMeds > 1 ? 's' : ''}` : 'Sin medicamentos',
            metrics.nextMed ? `Prox: ${metrics.nextMed.nombre}` : null,
          ]}
        />
        <StatusCard
          href="/studies"
          icon={<GraduationCap size={15} />}
          color="var(--mod-studies)"
          title="Estudio"
          lines={[
            metrics.studyStreak > 0 ? `Racha: ${metrics.studyStreak} dia${metrics.studyStreak > 1 ? 's' : ''}` : 'Sin racha',
            metrics.activeGoals > 0 ? `${metrics.activeGoals} meta${metrics.activeGoals > 1 ? 's' : ''} activa${metrics.activeGoals > 1 ? 's' : ''}` : null,
          ]}
        />
      </div>

      {/* Module grid — quick access */}
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Modulos</p>
        <div className="grid grid-cols-3 gap-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.name}
                href={mod.href}
                className="mod-card flex items-center gap-2.5 p-3"
                style={{ '--accent': mod.color } as React.CSSProperties}
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${mod.color} 12%, transparent)`,
                    color: mod.color,
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <span className="text-xs font-semibold text-[var(--text-1)]">{mod.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Invite link */}
      {inviteCode && <InviteLinkCard code={inviteCode} />}
    </div>
  )
}

function MiniKPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="num mt-0.5 text-xs font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

function StatusCard({ href, icon, color, title, lines, alert }: {
  href: string
  icon: React.ReactNode
  color: string
  title: string
  lines: (string | null)[]
  alert?: boolean
}) {
  const filtered = lines.filter(Boolean) as string[]
  return (
    <Link
      href={href}
      className="mod-card flex gap-2.5 p-3"
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[var(--text-1)]">{title}</p>
        {filtered.map((line, i) => (
          <p key={i} className={`text-[10px] ${i === 0 && alert ? 'font-medium text-[var(--warn)]' : 'text-[var(--text-3)]'}`}>
            {line}
          </p>
        ))}
      </div>
    </Link>
  )
}
