'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Trophy, ListChecks, History } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getChoreTemplates } from '@/app/actions/chores/templates'
import { getChoreInstances, getTodayInstances, generateTodayInstances, completeChore, skipChore } from '@/app/actions/chores/instances'
import { getScoreboard } from '@/app/actions/chores/rewards'
import { ChoresList } from '@/components/modules/chores/ChoresList'
import { AddChoreSheet } from '@/components/modules/chores/AddChoreSheet'
import { ScoreCard } from '@/components/modules/chores/ScoreCard'
import { Button } from '@/components/ui/Button'
import type { ChoreTemplate, ChoreInstanceWithTemplate, ChoreScoreboard } from '@/lib/types/modules.types'

type Tab = 'today' | 'all' | 'done'

export function ChoresClient() {
  const [templates, setTemplates] = useState<ChoreTemplate[]>([])
  const [instances, setInstances] = useState<ChoreInstanceWithTemplate[]>([])
  const [scoreboard, setScoreboard] = useState<ChoreScoreboard[]>([])
  const [members, setMembers] = useState<{ id: string; display_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('today')
  const [showAddChore, setShowAddChore] = useState(false)
  const [completing, setCompleting] = useState<string | null>(null)

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
    } else {
      result = await getChoreInstances('pending')
    }
    if (result.ok) setInstances(result.data)
  }, [tab])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadInstances() }, [loadInstances])

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
    setCompleting(instanceId)
    await completeChore(instanceId)
    // Brief delay for animation
    setTimeout(() => {
      setCompleting(null)
      loadInstances()
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
      <div className="space-y-4 p-4">
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

  const pendingCount = instances.filter((i) => i.status === 'pending').length
  const doneCount = instances.filter((i) => i.status === 'done').length

  return (
    <div className="space-y-4 p-4">
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

      {/* Chores list */}
      <ChoresList
        instances={instances}
        onComplete={handleComplete}
        onSkip={handleSkip}
        completing={completing}
      />

      {/* FAB */}
      <button
        onClick={() => setShowAddChore(true)}
        className="fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
        style={{ backgroundColor: 'var(--mod-chores)', color: 'white', maxWidth: '430px' }}
      >
        <Plus size={24} />
      </button>

      {/* Add chore sheet */}
      <AddChoreSheet
        open={showAddChore}
        onClose={() => { setShowAddChore(false); loadData() }}
        members={members}
      />
    </div>
  )
}
