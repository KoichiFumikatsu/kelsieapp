'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, GraduationCap, Timer, Trash2, ExternalLink } from 'lucide-react'

import { getStudyGoals, createStudyGoal, updateGoalStatus, deleteStudyGoal } from '@/app/actions/studies/goals'
import { createStudySession, getStudyStreak } from '@/app/actions/studies/sessions'
import { CircularProgress } from '@/components/ui/Progress'
import { StreakCounter } from '@/components/modules/studies/StreakCounter'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/Modal'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { StudyGoal, StudyGoalStatus } from '@/lib/types/modules.types'

const CATEGORY_LABELS: Record<string, string> = {
  curso: 'Curso',
  libro: 'Libro',
  certificacion: 'Certificacion',
  idioma: 'Idioma',
  habilidad: 'Habilidad',
}

const STATUS_LABELS: Record<StudyGoalStatus, { label: string; color: string }> = {
  not_started: { label: 'Sin iniciar', color: 'var(--text-3)' },
  in_progress: { label: 'En progreso', color: 'var(--info)' },
  completed: { label: 'Completado', color: 'var(--income)' },
  paused: { label: 'Pausado', color: 'var(--warn)' },
}

export function StudiesClient() {
  const [goals, setGoals] = useState<StudyGoal[]>([])
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [sessionGoal, setSessionGoal] = useState<StudyGoal | null>(null)

  const loadData = useCallback(async () => {
    const [goalsRes, streakRes] = await Promise.all([
      getStudyGoals(),
      getStudyStreak(),
    ])
    if (goalsRes.ok) setGoals(goalsRes.data)
    if (streakRes.ok) setStreak(streakRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDelete(id: string) {
    await deleteStudyGoal(id)
    loadData()
  }

  async function handleTogglePause(goal: StudyGoal) {
    const newStatus: StudyGoalStatus = goal.status === 'paused' ? 'in_progress' : 'paused'
    await updateGoalStatus(goal.id, newStatus)
    loadData()
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded bg-[var(--surface-2)]" />
        ))}
      </div>
    )
  }

  const activeGoals = goals.filter((g) => g.status !== 'completed')
  const completedGoals = goals.filter((g) => g.status === 'completed')

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <StreakCounter days={streak} />
        <div className="text-right">
          <p className="num text-lg font-bold text-[var(--mod-studies)]">{activeGoals.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">Metas activas</p>
        </div>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <GraduationCap size={40} className="text-[var(--mod-studies)]" />
          <p className="text-sm text-[var(--text-2)]">No hay metas de estudio.</p>
          <p className="text-xs text-[var(--text-3)]">Agrega cursos, libros o certificaciones que quieras completar.</p>
          <Button onClick={() => setShowAddGoal(true)}>Crear primera meta</Button>
        </div>
      ) : (
        <>
          {/* Active goals */}
          {activeGoals.length > 0 && (
            <div className="space-y-2">
              <div className="section-bar" style={{ '--accent': 'var(--mod-studies)' } as React.CSSProperties}>
                <span>En curso</span>
              </div>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onSessionClick={() => setSessionGoal(goal)}
                  onDelete={() => handleDelete(goal.id)}
                  onTogglePause={() => handleTogglePause(goal)}
                />
              ))}
            </div>
          )}

          {/* Completed goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-2">
              <div className="section-bar" style={{ '--accent': 'var(--income)' } as React.CSSProperties}>
                <span>Completadas <span className="num ml-1 text-xs">{completedGoals.length}</span></span>
              </div>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={() => handleDelete(goal.id)}
                  completed
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowAddGoal(true)}
        className="fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mod-studies)] text-white shadow-lg transition-transform active:scale-90 md:bottom-6"
      >
        <Plus size={24} />
      </button>

      {/* Add Goal Sheet */}
      <AddGoalSheet open={showAddGoal} onClose={() => { setShowAddGoal(false); loadData() }} />

      {/* Session Sheet */}
      {sessionGoal && (
        <AddSessionSheet
          open={!!sessionGoal}
          onClose={() => { setSessionGoal(null); loadData() }}
          goal={sessionGoal}
        />
      )}
    </div>
  )
}

/* ── GoalCard ── */
function GoalCard({
  goal,
  onSessionClick,
  onDelete,
  onTogglePause,
  completed = false,
}: {
  goal: StudyGoal
  onSessionClick?: () => void
  onDelete: () => void
  onTogglePause?: () => void
  completed?: boolean
}) {
  const progress = goal.total_unidades > 0 ? goal.unidades_completadas / goal.total_unidades : 0
  const stCfg = STATUS_LABELS[goal.status]

  return (
    <div className={`rounded-md border bg-[var(--surface)] p-3 ${completed ? 'opacity-60' : 'border-[var(--border)]'}`}>
      <div className="flex items-start gap-3">
        <CircularProgress value={progress} size={48} strokeWidth={4}>
          <span className="num text-xs font-bold text-[var(--mod-studies)]">
            {Math.round(progress * 100)}%
          </span>
        </CircularProgress>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-1)] line-clamp-1">{goal.titulo}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge color="var(--mod-studies)">{CATEGORY_LABELS[goal.categoria] ?? goal.categoria}</Badge>
            <Badge color={stCfg.color}>{stCfg.label}</Badge>
            {goal.plataforma && <Badge color="var(--text-3)">{goal.plataforma}</Badge>}
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-3)]">
            <span className="num">{goal.unidades_completadas}</span>/{goal.total_unidades} unidades
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {!completed && onSessionClick && (
            <button
              onClick={onSessionClick}
              className="rounded bg-[color-mix(in_srgb,var(--mod-studies)_10%,transparent)] p-1.5 text-[var(--mod-studies)] transition-colors hover:bg-[color-mix(in_srgb,var(--mod-studies)_20%,transparent)]"
              title="Registrar sesion"
            >
              <Timer size={14} />
            </button>
          )}
          {!completed && onTogglePause && (
            <button
              onClick={onTogglePause}
              className="rounded p-1.5 text-[var(--text-3)] text-[10px] hover:text-[var(--text-2)]"
              title={goal.status === 'paused' ? 'Reanudar' : 'Pausar'}
            >
              {goal.status === 'paused' ? '>' : '||'}
            </button>
          )}
          {goal.url && (
            <a
              href={goal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1.5 text-[var(--text-3)] hover:text-[var(--info)]"
              title="Abrir enlace"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-[var(--text-3)] hover:text-[var(--expense)]"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── AddGoalSheet ── */
function AddGoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await createStudyGoal(form)
    setPending(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva meta de estudio">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">{error}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="titulo" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Titulo</label>
          <input id="titulo" name="titulo" type="text" required placeholder="Curso de Next.js, libro de TypeScript..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="categoria" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Categoria</label>
            <select id="categoria" name="categoria" required className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              <option value="curso">Curso</option>
              <option value="libro">Libro</option>
              <option value="certificacion">Certificacion</option>
              <option value="idioma">Idioma</option>
              <option value="habilidad">Habilidad</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="total_unidades" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Total unidades</label>
            <input id="total_unidades" name="total_unidades" type="number" min="1" defaultValue="10" className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="plataforma" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Plataforma (opcional)</label>
          <input id="plataforma" name="plataforma" type="text" placeholder="Udemy, Coursera, YouTube..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="url" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">URL (opcional)</label>
          <input id="url" name="url" type="url" placeholder="https://..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="fecha_inicio" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Inicio</label>
            <input id="fecha_inicio" name="fecha_inicio" type="date" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="fecha_meta" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Meta</label>
            <input id="fecha_meta" name="fecha_meta" type="date" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Crear meta'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── AddSessionSheet ── */
function AddSessionSheet({ open, onClose, goal }: { open: boolean; onClose: () => void; goal: StudyGoal }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    form.set('goal_id', goal.id)
    const result = await createStudySession(form)
    setPending(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Sesion: ${goal.titulo}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="minutos" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Minutos</label>
            <input id="minutos" name="minutos" type="number" min="1" required defaultValue="30" className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="unidades_avanzadas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Unidades avanzadas</label>
            <input id="unidades_avanzadas" name="unidades_avanzadas" type="number" min="0" defaultValue="1" className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <p className="text-xs text-[var(--text-3)]">
          Progreso actual: <span className="num font-medium">{goal.unidades_completadas}</span>/{goal.total_unidades} unidades
        </p>

        <div className="space-y-1">
          <label htmlFor="nota" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nota (opcional)</label>
          <textarea id="nota" name="nota" rows={2} placeholder="Que aprendiste hoy..." className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Registrando...' : 'Registrar sesion'}
        </Button>
      </form>
    </BottomSheet>
  )
}
