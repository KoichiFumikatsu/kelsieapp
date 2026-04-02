'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trophy, ListChecks, History, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getChoreTemplates } from '@/app/actions/chores/templates'
import { getChoreInstances, getTodayInstances, generateTodayInstances, completeChore, skipChore } from '@/app/actions/chores/instances'
import { getScoreboard } from '@/app/actions/chores/rewards'
import { ChoresList } from '@/components/modules/chores/ChoresList'
import { AddChoreSheet } from '@/components/modules/chores/AddChoreSheet'
import { ScoreCard } from '@/components/modules/chores/ScoreCard'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Modal'
import type { ChoreTemplate, ChoreInstanceWithTemplate, ChoreScoreboard } from '@/lib/types/modules.types'

type Tab = 'today' | 'all' | 'done' | 'calendar'

export function ChoresClient() {
  const [templates, setTemplates] = useState<ChoreTemplate[]>([])
  const [instances, setInstances] = useState<ChoreInstanceWithTemplate[]>([])
  const [scoreboard, setScoreboard] = useState<ChoreScoreboard[]>([])
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')
  const [showAddChore, setShowAddChore] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)
  const [completingFor, setCompletingFor] = useState<string | null>(null)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1)
  const [calInstances, setCalInstances] = useState<ChoreInstanceWithTemplate[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    const [tplRes, scoreRes] = await Promise.all([
      getChoreTemplates(),
      getScoreboard(),
    ])

    if (tplRes.ok) setTemplates(tplRes.data)
    if (scoreRes.ok) {
      setScoreboard(scoreRes.data)
      setMembers(scoreRes.data.map((s) => ({ id: s.userId, display_name: s.displayName })))
    }

    // Auto-generate today's instances
    await generateTodayInstances()

    // Load instances based on current tab
    await loadInstances()
    setLoading(false)
  }, [])

  const loadInstances = useCallback(async () => {
    let result
    if (tab === 'today') {
      result = await getTodayInstances()
    } else if (tab === 'done') {
      result = await getChoreInstances('done')
    } else if (tab === 'calendar') {
      // Calendar loads its own data, skip
      return
    } else {
      // 'all' tab: pending from today onward (hide overdue)
      const today = new Date().toISOString().split('T')[0]
      result = await getChoreInstances('pending', today)
    }
    if (result.ok) setInstances(result.data)
  }, [tab])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadInstances() }, [loadInstances])

  // Load calendar instances when month/year/tab changes
  useEffect(() => {
    if (tab !== 'calendar') return
    const from = `${calYear}-${String(calMonth).padStart(2, '0')}-01`
    const lastDay = new Date(calYear, calMonth, 0).getDate()
    const to = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    getChoreInstances('all', from, to).then((r) => {
      if (r.ok) setCalInstances(r.data)
    })
  }, [tab, calYear, calMonth])

  // Realtime subscription for chore_instances
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const channel = supabase
      .channel('chores-instances')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chore_instances' },
        () => {
          loadInstances()
          getScoreboard().then((r) => { if (r.ok) setScoreboard(r.data) })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadInstances])

  async function handleComplete(instanceId: string) {
    // If multiple members, ask who did it
    if (members.length > 1) {
      setCompletingFor(instanceId)
      return
    }
    // Single member: complete directly
    doComplete(instanceId)
  }

  async function doComplete(instanceId: string, completedByUserId?: string) {
    setCompleting(instanceId)
    setCompletingFor(null)
    await completeChore(instanceId, completedByUserId)
    setTimeout(() => {
      setCompleting(null)
      loadInstances()
      if (tab === 'calendar') {
        const from = `${calYear}-${String(calMonth).padStart(2, '0')}-01`
        const lastDay = new Date(calYear, calMonth, 0).getDate()
        const to = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
        getChoreInstances('all', from, to).then((r) => { if (r.ok) setCalInstances(r.data) })
      }
      getScoreboard().then((r) => { if (r.ok) setScoreboard(r.data) })
    }, 500)
  }

  async function handleSkip(instanceId: string) {
    await skipChore(instanceId)
    loadInstances()
  }

  async function handleRefresh() {
    setLoading(true)
    await generateTodayInstances()
    await loadData()
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-[var(--surface-2)]" />
          ))}
        </div>
      </div>
    )
  }

  // No templates — onboarding
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <ListChecks size={40} className="text-[var(--mod-chores)]" />
        <p className="text-sm text-[var(--text-2)]">No hay tareas del hogar creadas.</p>
        <p className="text-xs text-[var(--text-3)]">Crea plantillas de tareas y se generaran automaticamente segun su frecuencia.</p>
        <Button onClick={() => setShowAddChore(true)}>Crear primera tarea</Button>

        <AddChoreSheet
          open={showAddChore}
          onClose={() => { setShowAddChore(false); loadData() }}
          members={members}
        />
      </div>
    )
  }

  const allToday = instances.filter(() => tab === 'today')
  const pendingCount = instances.filter((i) => i.status === 'pending').length
  const doneCount = instances.filter((i) => i.status === 'done').length
  const totalToday = pendingCount + doneCount
  const completionRate = totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Pendientes</p>
          <p className="num mt-1 text-sm font-bold text-[var(--mod-chores)]">{pendingCount}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Completadas</p>
          <p className="num mt-1 text-sm font-bold text-[var(--income)]">{doneCount}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Tasa</p>
          <p className={`num mt-1 text-sm font-bold ${completionRate === 100 ? 'text-[var(--income)]' : completionRate >= 50 ? 'text-[var(--warn)]' : 'text-[var(--expense)]'}`}>{completionRate}%</p>
        </div>
      </div>

      {/* Suggestion */}
      {pendingCount > 0 && tab === 'today' && (
        <p className="text-xs text-[var(--text-3)]">
          {pendingCount === 1 ? 'Te falta 1 tarea por completar hoy.' : `Te faltan ${pendingCount} tareas por completar hoy.`}
          {completionRate >= 80 && ' Ya casi terminas!'}
        </p>
      )}
      {pendingCount === 0 && doneCount > 0 && tab === 'today' && (
        <p className="text-xs text-[var(--income)]">Todas las tareas de hoy completadas.</p>
      )}

      {/* Scoreboard */}
      {scoreboard.length >= 2 && (
        <ScoreCard
          players={[
            { name: scoreboard[0].displayName, colorHex: scoreboard[0].colorHex, points: scoreboard[0].totalPuntos },
            { name: scoreboard[1].displayName, colorHex: scoreboard[1].colorHex, points: scoreboard[1].totalPuntos },
          ]}
        />
      )}
      {scoreboard.length === 1 && (
        <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-[var(--mod-chores)]" />
              <span className="text-sm font-medium text-[var(--text-1)]">{scoreboard[0].displayName}</span>
            </div>
            <span className="num text-lg font-bold" style={{ color: scoreboard[0].colorHex }}>
              {scoreboard[0].totalPuntos} pts
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-md bg-[var(--surface-2)] p-1">
        {([
          { key: 'today' as Tab, label: 'Hoy', icon: ListChecks },
          { key: 'all' as Tab, label: 'Pendientes', icon: RefreshCw },
          { key: 'done' as Tab, label: 'Hechas', icon: History },
          { key: 'calendar' as Tab, label: 'Calendario', icon: CalendarDays },
          { key: 'done' as Tab, label: 'Completadas', icon: History },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === key
                ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm'
                : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {tab !== 'calendar' && (
        <div className="section-bar" style={{ '--accent': 'var(--mod-chores)' } as React.CSSProperties}>
          <span>
            {tab === 'today' ? 'Tareas de hoy' : tab === 'all' ? 'Pendientes' : 'Completadas'}
            {tab !== 'done' && pendingCount > 0 && (
              <span className="ml-2 num text-[var(--mod-chores)]">{pendingCount}</span>
            )}
            {tab === 'done' && (
              <span className="ml-2 num text-[var(--income)]">{doneCount}</span>
            )}
          </span>
          <button onClick={handleRefresh} className="text-[var(--text-3)] hover:text-[var(--text-1)]" title="Regenerar tareas">
            <RefreshCw size={14} />
          </button>
        </div>
      )}

      {/* Chores list */}
      {tab !== 'calendar' && (
        <ChoresList
          instances={instances}
          onComplete={handleComplete}
          onSkip={handleSkip}
          completing={completing}
        />
      )}

      {/* Calendar view */}
      {tab === 'calendar' && (
        <ChoresCalendar
          year={calYear}
          month={calMonth}
          instances={calInstances}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPrevMonth={() => {
            if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1) }
            else setCalMonth(calMonth - 1)
            setSelectedDay(null)
          }}
          onNextMonth={() => {
            if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1) }
            else setCalMonth(calMonth + 1)
            setSelectedDay(null)
          }}
          onComplete={handleComplete}
          onSkip={handleSkip}
          completing={completing}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddChore(true)}
        className="fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mod-chores)] text-white shadow-lg transition-transform active:scale-90 md:bottom-6"
      >
        <Plus size={24} />
      </button>

      {/* Add chore sheet */}
      <AddChoreSheet
        open={showAddChore}
        onClose={() => { setShowAddChore(false); loadData() }}
        members={members}
      />

      {/* Who did it? */}
      <BottomSheet open={!!completingFor} onClose={() => setCompletingFor(null)} title="Quien lo hizo?">
        <div className="space-y-2">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => doComplete(completingFor!, m.id)}
              className="flex w-full items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-left text-sm font-medium text-[var(--text-1)] transition-colors hover:border-[var(--mod-chores)] hover:bg-[color-mix(in_srgb,var(--mod-chores)_5%,transparent)]"
            >
              {m.display_name}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

/* ── Calendar View ── */
function ChoresCalendar({ year, month, instances, selectedDay, onSelectDay, onPrevMonth, onNextMonth, onComplete, onSkip, completing }: {
  year: number
  month: number
  instances: ChoreInstanceWithTemplate[]
  selectedDay: number | null
  onSelectDay: (day: number | null) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  completing: string | null
}) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()

  // Group instances by day
  const byDay: Record<number, ChoreInstanceWithTemplate[]> = {}
  for (const inst of instances) {
    const d = new Date(inst.due_date + 'T12:00:00').getDate()
    if (!byDay[d]) byDay[d] = []
    byDay[d].push(inst)
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  const dayInstances = selectedDay ? (byDay[selectedDay] ?? []) : []

  return (
    <div className="space-y-3">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={onPrevMonth} className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]">
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold capitalize text-[var(--text-1)]">{monthName}</p>
        <button onClick={onNextMonth} className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px text-center">
        {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
          <div key={d} className="py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dayStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayChores = byDay[day] ?? []
          const pendingCount = dayChores.filter((c) => c.status === 'pending').length
          const doneCount = dayChores.filter((c) => c.status === 'done').length
          const hasOverdue = dayChores.some((c) => c.status === 'pending' && dayStr < todayStr)
          const isToday = isCurrentMonth && day === today.getDate()
          const isSelected = selectedDay === day

          return (
            <button
              key={day}
              onClick={() => onSelectDay(isSelected ? null : day)}
              className={`flex aspect-square flex-col items-center justify-center rounded transition-colors ${
                isSelected
                  ? 'bg-[var(--mod-chores)] text-white'
                  : isToday
                    ? 'bg-[color-mix(in_srgb,var(--mod-chores)_12%,transparent)] text-[var(--text-1)]'
                    : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <span className={`text-xs font-medium ${isSelected ? 'text-white' : ''}`}>{day}</span>
              {dayChores.length > 0 && (
                <div className="mt-0.5 flex items-center gap-0.5">
                  {pendingCount > 0 && (
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${hasOverdue ? 'bg-[var(--expense)]' : isSelected ? 'bg-white/70' : 'bg-[var(--mod-chores)]'}`} />
                  )}
                  {doneCount > 0 && (
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-[var(--income)]'}`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDay !== null && (
        <div className="space-y-2">
          <p className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]" style={{ '--accent': 'var(--mod-chores)' } as React.CSSProperties}>
            {selectedDay} de {monthName}
          </p>
          {dayInstances.length === 0 ? (
            <p className="py-4 text-center text-xs text-[var(--text-3)]">Sin tareas este dia.</p>
          ) : (
            <ChoresList instances={dayInstances} onComplete={onComplete} onSkip={onSkip} completing={completing} />
          )}
        </div>
      )}
    </div>
  )
}
