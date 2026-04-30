import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics } from '@/app/actions/core/dashboard'
import { formatCOP } from '@/lib/utils/format'
import {
  Wallet, Sparkles, ListChecks, HeartPulse, GraduationCap, Settings,
  TrendingDown, TrendingUp, CreditCard,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { InviteLinkCard } from '@/components/ui/InviteLinkCard'

type ModuleEntry = { name: string; icon: LucideIcon; color: string; href: string; desc: string }

const MODULES: ModuleEntry[] = [
  { name: 'Finanzas',      icon: Wallet,        color: 'var(--c-fin)',  href: '/finance',  desc: 'Quincenas y presupuesto' },
  { name: 'Tareas hogar',  icon: Sparkles,      color: 'var(--c-chor)', href: '/chores',   desc: 'Tareas del hogar' },
  { name: 'Trabajo',       icon: ListChecks,    color: 'var(--c-task)', href: '/tasks',    desc: 'Tareas de trabajo' },
  { name: 'Salud',         icon: HeartPulse,    color: 'var(--c-med)',  href: '/medical',  desc: 'Medicamentos y salud' },
  { name: 'Estudio',       icon: GraduationCap, color: 'var(--c-stu)',  href: '/studies',  desc: 'Metas de estudio' },
  { name: 'Config',        icon: Settings,      color: 'var(--t3)',     href: '/settings/household', desc: 'Configuracion' },
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
  const saldo = fin?.saldoActual ?? 0
  const ingresos = fin?.totalIngresos ?? 0
  const gastos = fin?.totalGastos ?? 0
  const deuda = fin?.deudaCreditoAcumulada ?? 0
  const dias = fin?.diasParaCorte ?? 99
  const pct = ingresos > 0 ? Math.min(gastos / ingresos, 1) : 0
  const circumference = 2 * Math.PI * 36
  const dashOffset = circumference * (1 - pct)
  const creditUrgent = deuda > 0 && dias >= 0 && dias <= 5
  const creditWarning = deuda > 0 && dias > 5 && dias <= 15

  return (
    <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Featured KPI card ── */}
      {fin && (
        <div
          className="featured-card"
          style={{
            background: 'var(--s1)',
            border: '1px solid var(--b1)',
            borderRadius: 'var(--rl)',
            position: 'relative',
          }}
        >
          {/* Corner brackets */}
          <span style={{ position:'absolute', top:10, left:10, width:16, height:16, borderTop:'2px solid var(--y)', borderLeft:'2px solid var(--y)' }} />
          <span style={{ position:'absolute', bottom:10, right:10, width:16, height:16, borderBottom:'2px solid var(--y)', borderRight:'2px solid var(--y)' }} />

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px 10px' }}>
            <div style={{ fontSize:'.68em', fontWeight:900, textTransform:'uppercase', letterSpacing:'.14em', color:'var(--y)', fontStyle:'italic' }}>
              ◆ Finanzas
            </div>
            <Link href="/finance" style={{ fontSize:'.65em', fontWeight:800, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em' }}>
              Ver detalle
            </Link>
          </div>

          {/* Visual area */}
          <div style={{ margin:'0 16px', background:'var(--s2)', border:'1px solid var(--b1)', borderRadius:'var(--rm)', padding:'18px 20px', display:'flex', alignItems:'center', gap:20 }}>
            {/* Gauge */}
            <div style={{ position:'relative', width:86, height:86, flexShrink:0 }}>
              <svg width="86" height="86" style={{ transform:'rotate(-90deg)' }}>
                <circle cx="43" cy="43" r="36" fill="none" stroke="var(--s3)" strokeWidth="8" />
                <circle
                  cx="43" cy="43" r="36" fill="none"
                  stroke={pct > 0.85 ? 'var(--r)' : 'var(--y)'}
                  strokeWidth="8" strokeLinecap="square"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ filter: pct > 0.85 ? 'drop-shadow(0 0 6px rgba(240,112,112,.5))' : 'drop-shadow(0 0 6px rgba(236,199,0,.4))' }}
                />
              </svg>
              <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                <span className="num" style={{ fontSize:'1.1em', fontWeight:900, color: pct > 0.85 ? 'var(--r)' : 'var(--y)', lineHeight:1 }}>
                  {Math.round(pct * 100)}%
                </span>
                <span style={{ fontSize:'.55em', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>usado</span>
              </div>
            </div>

            {/* Stats */}
            <div style={{ flex:1, minWidth:0 }}>
              <div className="num" style={{ fontSize:'1.5em', fontWeight:900, color:'var(--t1)', letterSpacing:'-.04em', lineHeight:1, marginBottom:2 }}>
                {formatCOP(saldo)}
              </div>
              <div style={{ fontSize:'.62em', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:10 }}>
                Saldo disponible
              </div>
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div className="num" style={{ fontSize:'.85em', fontWeight:800, color:'var(--g)' }}>{formatCOP(ingresos)}</div>
                  <div style={{ fontSize:'.58em', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Ingresos</div>
                </div>
                <div>
                  <div className="num" style={{ fontSize:'.85em', fontWeight:800, color:'var(--r)' }}>{formatCOP(gastos)}</div>
                  <div style={{ fontSize:'.58em', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>Gastos</div>
                </div>
                {deuda > 0 && (
                  <div>
                    <div className="num" style={{ fontSize:'.85em', fontWeight:800, color:'var(--pu)' }}>{formatCOP(deuda)}</div>
                    <div style={{ fontSize:'.58em', fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.06em' }}>TC</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Credit alert footer */}
          {deuda > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px 12px' }}>
              <CreditCard size={12} style={{ color: creditUrgent ? 'var(--r)' : creditWarning ? 'var(--y)' : 'var(--pu)', flexShrink:0 }} />
              <span style={{ fontSize:'.68em', fontWeight:700, color:'var(--t3)' }}>
                Deuda TC: <span className="num" style={{ color: creditUrgent ? 'var(--r)' : creditWarning ? 'var(--y)' : 'var(--pu)' }}>{formatCOP(deuda)}</span>
              </span>
              <span style={{ marginLeft:'auto', fontSize:'.65em', fontWeight:800, color: creditUrgent ? 'var(--r)' : 'var(--t3)' }}>
                {dias === 0 ? 'Corte HOY' : dias > 0 ? `Corte en ${dias}d` : 'Corte pasado'}
              </span>
            </div>
          )}
          {!deuda && (
            <div style={{ height:8 }} />
          )}
        </div>
      )}

      {/* ── Status row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
        <StatusCard href="/chores" icon={<Sparkles size={14} />} color="var(--c-chor)" title="Tareas hogar"
          lines={[
            metrics.choresPending > 0 ? `${metrics.choresPending} pendiente${metrics.choresPending > 1 ? 's' : ''}` : 'Todo listo',
            metrics.choresDone > 0 ? `${metrics.choresDone} hecha${metrics.choresDone > 1 ? 's' : ''} hoy` : null,
          ]}
          alert={metrics.choresPending > 0}
        />
        <StatusCard href="/tasks" icon={<ListChecks size={14} />} color="var(--c-task)" title="Trabajo"
          lines={[
            `${metrics.openTasks} abierta${metrics.openTasks !== 1 ? 's' : ''}`,
            metrics.urgentTasks > 0 ? `${metrics.urgentTasks} urgente${metrics.urgentTasks > 1 ? 's' : ''}` : null,
          ]}
          alert={metrics.urgentTasks > 0}
        />
        <StatusCard href="/medical" icon={<HeartPulse size={14} />} color="var(--c-med)" title="Salud"
          lines={[
            metrics.activeMeds > 0 ? `${metrics.activeMeds} med${metrics.activeMeds > 1 ? 's' : ''} activo${metrics.activeMeds > 1 ? 's' : ''}` : 'Sin medicamentos',
            metrics.nextMed ? `Prox: ${metrics.nextMed.nombre}` : null,
          ]}
        />
        <StatusCard href="/studies" icon={<GraduationCap size={14} />} color="var(--c-stu)" title="Estudio"
          lines={[
            metrics.studyStreak > 0 ? `Racha: ${metrics.studyStreak}d` : 'Sin racha',
            metrics.activeGoals > 0 ? `${metrics.activeGoals} meta${metrics.activeGoals > 1 ? 's' : ''}` : null,
          ]}
        />
      </div>

      {/* ── Module grid ── */}
      <div>
        <div className="zdivider">
          <span className="zdivider-star">◆</span>
          <span className="zdivider-label">Modulos</span>
          <span className="zdivider-line" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8 }}>
          {MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <Link
                key={mod.name}
                href={mod.href}
                className="mod-card"
                style={{
                  '--accent': mod.color,
                  display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
                } as React.CSSProperties}
              >
                <div style={{ width:32, height:32, borderRadius:'var(--rs)', background:`color-mix(in srgb, ${mod.color} 14%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon size={15} strokeWidth={1.8} style={{ color: mod.color }} />
                </div>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'.8em', fontWeight:800, color:'var(--t1)', lineHeight:1.2 }}>{mod.name}</div>
                  <div style={{ fontSize:'.62em', color:'var(--t3)', marginTop:2 }}>{mod.desc}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {inviteCode && <InviteLinkCard code={inviteCode} />}
    </div>
  )
}

function StatusCard({ href, icon, color, title, lines, alert }: {
  href: string; icon: React.ReactNode; color: string; title: string
  lines: (string | null)[]; alert?: boolean
}) {
  const filtered = lines.filter(Boolean) as string[]
  return (
    <Link href={href} className="mod-card" style={{ '--accent': color, display:'flex', gap:10, padding:'12px 14px' } as React.CSSProperties}>
      <div style={{ width:28, height:28, borderRadius:'var(--rs)', background:`color-mix(in srgb, ${color} 14%, transparent)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color }}>
        {icon}
      </div>
      <div style={{ minWidth:0, flex:1 }}>
        <div style={{ fontSize:'.78em', fontWeight:800, color:'var(--t1)', marginBottom:2 }}>{title}</div>
        {filtered.map((line, i) => (
          <div key={i} style={{ fontSize:'.65em', color: i === 0 && alert ? 'var(--y)' : 'var(--t3)', fontWeight: i === 0 && alert ? 700 : 500 }}>
            {line}
          </div>
        ))}
      </div>
    </Link>
  )
}
