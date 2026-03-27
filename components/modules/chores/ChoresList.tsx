'use client'

import { Check, SkipForward, Clock, User } from 'lucide-react'
import { StatusBadge } from '@/components/ui/Badge'
import { UserAvatar } from '@/components/ui/UserAvatar'
import type { ChoreInstanceWithTemplate, ChoreStatus } from '@/lib/types/modules.types'

interface ChoresListProps {
  instances: ChoreInstanceWithTemplate[]
  onComplete: (id: string) => void
  onSkip: (id: string) => void
  completing?: string | null
}

function statusLabel(status: ChoreStatus, dueDate: string): ChoreStatus | 'overdue' {
  if (status === 'pending') {
    const today = new Date().toISOString().split('T')[0]
    if (dueDate < today) return 'overdue'
  }
  return status
}

const FREQ_LABELS: Record<string, string> = {
  diaria: 'Diaria',
  semanal: 'Semanal',
  quincenal: 'Quincenal',
  mensual: 'Mensual',
  unica: 'Unica',
}

export function ChoresList({ instances, onComplete, onSkip, completing }: ChoresListProps) {
  if (instances.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-[var(--text-3)]">
        No hay tareas pendientes. Buen trabajo.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {instances.map((inst) => {
        const tpl = inst.chore_templates
        const displayStatus = statusLabel(inst.status, inst.due_date)
        const isCompleting = completing === inst.id
        const isDone = inst.status === 'done'
        const isSkipped = inst.status === 'skipped'

        return (
          <div
            key={inst.id}
            className={`group relative overflow-hidden rounded-md border bg-[var(--surface)] transition-all ${
              isDone ? 'border-[var(--income)]/30 opacity-60' :
              isSkipped ? 'border-[var(--text-3)]/30 opacity-50' :
              displayStatus === 'overdue' ? 'border-[var(--expense)]/30' :
              'border-[var(--border)]'
            } ${isCompleting ? 'animate-[pulse-expand_0.4s_ease-out]' : ''}`}
          >
            {/* Accent bar */}
            <div
              className="absolute left-0 top-0 h-full w-1"
              style={{ backgroundColor: isDone ? 'var(--income)' : displayStatus === 'overdue' ? 'var(--expense)' : 'var(--mod-chores)' }}
            />

            <div className="flex items-center gap-3 p-3 pl-4">
              {/* Complete / Skip buttons */}
              {!isDone && !isSkipped ? (
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onComplete(inst.id)}
                    disabled={isCompleting}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--mod-chores)] text-[var(--mod-chores)] transition-colors hover:bg-[var(--mod-chores)] hover:text-white active:scale-90"
                    title="Completar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => onSkip(inst.id)}
                    className="flex h-6 w-6 items-center justify-center self-center rounded-full text-[var(--text-3)] transition-colors hover:text-[var(--text-2)]"
                    title="Saltar"
                  >
                    <SkipForward size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center">
                  {isDone ? (
                    <Check size={16} className="text-[var(--income)]" />
                  ) : (
                    <SkipForward size={14} className="text-[var(--text-3)]" />
                  )}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isDone ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
                    {tpl?.nombre ?? 'Tarea'}
                  </span>
                  <StatusBadge status={displayStatus} />
                </div>

                <div className="mt-1 flex items-center gap-3 text-[10px] text-[var(--text-3)]">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {FREQ_LABELS[tpl?.frecuencia ?? ''] ?? tpl?.frecuencia}
                  </span>
                  {inst.profiles && (
                    <span className="flex items-center gap-1">
                      <User size={10} />
                      {inst.profiles.display_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <span className="num text-sm font-bold" style={{ color: isDone ? 'var(--income)' : 'var(--mod-chores)' }}>
                  {isDone ? `+${inst.puntos_earned}` : tpl?.puntos ?? 10}
                </span>
                <p className="text-[9px] uppercase tracking-widest text-[var(--text-3)]">pts</p>
              </div>
            </div>

            {/* Floating points animation */}
            {isCompleting && (
              <div className="absolute right-4 top-2 animate-[float-up_0.8s_ease-out_forwards] text-sm font-bold text-[var(--income)]">
                +{tpl?.puntos ?? 10}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
