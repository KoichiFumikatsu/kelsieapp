'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Lock, GripVertical, Trash2, ChevronDown, ChevronRight, Pencil, AlertTriangle, Calendar, CheckSquare, Square, X } from 'lucide-react'

import { getAllWorkTasks, createWorkTask, updateWorkTask, updateTaskStatus, deleteWorkTask } from '@/app/actions/tasks/tasks'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/Modal'
import type { WorkTask, TaskStatus, TaskPriority, Subtask } from '@/lib/types/modules.types'

const COLUMNS: { key: TaskStatus; label: string; color: string }[] = [
  { key: 'backlog', label: 'Backlog', color: 'var(--text-3)' },
  { key: 'in_progress', label: 'En progreso', color: 'var(--info)' },
  { key: 'done', label: 'Hecho', color: 'var(--income)' },
  { key: 'cancelled', label: 'Cancelado', color: 'var(--text-3)' },
]

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'var(--text-3)',
  mid: 'var(--info)',
  high: 'var(--warn)',
  urgent: 'var(--expense)',
}

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  mid: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export function TasksClient() {
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingTask, setEditingTask] = useState<WorkTask | null>(null)
  const [quickAdd, setQuickAdd] = useState('')
  const [collapsedCols, setCollapsedCols] = useState<Set<TaskStatus>>(new Set(['cancelled']))

  const loadTasks = useCallback(async () => {
    const result = await getAllWorkTasks()
    if (result.ok) setTasks(result.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function handleQuickAdd() {
    if (!quickAdd.trim()) return
    const form = new FormData()
    form.set('titulo', quickAdd.trim())
    form.set('prioridad', 'mid')
    const result = await createWorkTask(form)
    if (result.ok) {
      setQuickAdd('')
      loadTasks()
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    await updateTaskStatus(taskId, newStatus)
    loadTasks()
  }

  async function handleDelete(taskId: string) {
    await deleteWorkTask(taskId)
    loadTasks()
  }

  function toggleCollapse(col: TaskStatus) {
    setCollapsedCols((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status)

  const openCount = tasks.filter((t) => t.status === 'backlog' || t.status === 'in_progress').length
  const overdueCount = tasks.filter((t) => {
    const isDone = t.status === 'done' || t.status === 'cancelled'
    return !isDone && t.due_date && new Date(t.due_date + 'T23:59:59') < new Date()
  }).length
  const urgentCount = tasks.filter((t) => t.prioridad === 'urgent' && t.status !== 'done' && t.status !== 'cancelled').length
  const doneThisWeek = (() => {
    const now = new Date()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    return tasks.filter((t) => t.status === 'done' && new Date(t.updated_at) >= monday).length
  })()

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded bg-[var(--surface-2)]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Private indicator */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
        <Lock size={12} />
        <span>Vista privada — solo tu puedes ver estas tareas</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Abiertas</p>
          <p className="num mt-1 text-sm font-bold text-[var(--info)]">{openCount}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Atrasadas</p>
          <p className={`num mt-1 text-sm font-bold ${overdueCount > 0 ? 'text-[var(--expense)]' : 'text-[var(--text-3)]'}`}>{overdueCount}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Urgentes</p>
          <p className={`num mt-1 text-sm font-bold ${urgentCount > 0 ? 'text-[var(--warn)]' : 'text-[var(--text-3)]'}`}>{urgentCount}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Semana</p>
          <p className="num mt-1 text-sm font-bold text-[var(--income)]">{doneThisWeek}</p>
        </div>
      </div>

      {/* Suggestions */}
      {overdueCount > 0 && (
        <p className="text-xs text-[var(--expense)]">
          {overdueCount === 1 ? 'Tienes 1 tarea atrasada.' : `Tienes ${overdueCount} tareas atrasadas.`} Considera redistribuir prioridades.
        </p>
      )}
      {urgentCount > 0 && overdueCount === 0 && (
        <p className="text-xs text-[var(--warn)]">
          {urgentCount === 1 ? 'Hay 1 tarea urgente pendiente.' : `Hay ${urgentCount} tareas urgentes pendientes.`}
        </p>
      )}

      {/* Quick add */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
          placeholder="Agregar tarea rapido..."
          className="flex-1 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--mod-tasks)]"
        />
        <button
          onClick={handleQuickAdd}
          disabled={!quickAdd.trim()}
          className="flex h-9 w-9 items-center justify-center rounded border border-[var(--mod-tasks)] text-[var(--mod-tasks)] transition-colors hover:bg-[var(--mod-tasks)] hover:text-white disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Kanban columns */}
      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 lg:grid-cols-4">
      {COLUMNS.map((col) => {
        const colTasks = tasksByStatus(col.key)
        const collapsed = collapsedCols.has(col.key)

        return (
          <div key={col.key} className="space-y-2">
            <button
              onClick={() => toggleCollapse(col.key)}
              className="section-bar w-full"
              style={{ '--accent': col.color } as React.CSSProperties}
            >
              <span className="flex items-center gap-2">
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                {col.label}
                <span className="num text-xs opacity-60">{colTasks.length}</span>
              </span>
            </button>

            {!collapsed && (
              <div className="space-y-1.5">
                {colTasks.length === 0 && (
                  <p className="py-3 text-center text-xs text-[var(--text-3)]">Sin tareas</p>
                )}
                {colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    onEdit={(t) => setEditingTask(t)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mod-tasks)] text-white shadow-lg transition-transform active:scale-90 md:bottom-6"
      >
        <Plus size={24} />
      </button>

      {/* Add task sheet */}
      <AddTaskSheet open={showAdd} onClose={() => { setShowAdd(false); loadTasks() }} />
      <EditTaskSheet
        open={!!editingTask}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSaved={() => { setEditingTask(null); loadTasks() }}
      />
    </div>
  )
}

/* ── TaskCard ── */
function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onEdit,
}: {
  task: WorkTask
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
  onEdit: (task: WorkTask) => void
}) {
  const borderColor = PRIORITY_COLORS[task.prioridad]
  const isDone = task.status === 'done' || task.status === 'cancelled'

  const isOverdue = !isDone && task.due_date && new Date(task.due_date + 'T23:59:59') < new Date()

  const subtasks: Subtask[] = task.subtasks ?? []
  const subtasksDone = subtasks.filter((s) => s.done).length

  const nextStatus: Record<TaskStatus, TaskStatus> = {
    backlog: 'in_progress',
    in_progress: 'done',
    done: 'backlog',
    cancelled: 'backlog',
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border bg-[var(--surface)] transition-all ${
        isDone ? 'opacity-60' : ''
      } ${isOverdue ? 'border-[var(--expense)]' : ''}`}
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
    >
      <div className="flex items-start gap-2 p-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
            {task.titulo}
          </p>
          {task.descripcion && (
            <p className="mt-0.5 text-xs text-[var(--text-3)] line-clamp-2">{task.descripcion}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge color={PRIORITY_COLORS[task.prioridad]}>
              {PRIORITY_LABELS[task.prioridad]}
            </Badge>
            {isOverdue && (
              <Badge color="var(--expense)">
                <AlertTriangle size={10} /> Atrasada
              </Badge>
            )}
            {task.due_date && (
              <Badge color={isOverdue ? 'var(--expense)' : 'var(--text-2)'}>
                <Calendar size={10} /> {task.due_date}
              </Badge>
            )}
            {subtasks.length > 0 && (
              <Badge color="var(--mod-tasks)">
                {subtasksDone}/{subtasks.length} subtareas
              </Badge>
            )}
            {task.tags.map((tag) => (
              <Badge key={tag} color="var(--mod-tasks)">{tag}</Badge>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => onEdit(task)}
            className="rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
            title="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onStatusChange(task.id, nextStatus[task.status])}
            className="rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
            title={`Mover a ${nextStatus[task.status]}`}
          >
            <GripVertical size={14} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded p-1 text-[var(--text-3)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── AddTaskSheet ── */
function AddTaskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const result = await createWorkTask(form)
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva tarea">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="titulo" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Titulo</label>
          <input id="titulo" name="titulo" type="text" required placeholder="Que necesitas hacer..."
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="descripcion" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Descripcion (opcional)</label>
          <textarea id="descripcion" name="descripcion" rows={2} placeholder="Detalles..."
            className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="prioridad" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Prioridad</label>
            <select id="prioridad" name="prioridad" defaultValue="mid"
              className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              <option value="low">Baja</option>
              <option value="mid">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="due_date" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha limite</label>
            <input id="due_date" name="due_date" type="date"
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="tags" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Tags (separados por coma)</label>
          <input id="tags" name="tags" type="text" placeholder="trabajo, informe, cliente..."
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Crear tarea'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── EditTaskSheet ── */
function EditTaskSheet({
  open,
  task,
  onClose,
  onSaved,
}: {
  open: boolean
  task: WorkTask | null
  onClose: () => void
  onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [subtasks, setSubtasks] = useState<Subtask[]>([])
  const [newSub, setNewSub] = useState('')

  useEffect(() => {
    if (task) setSubtasks(task.subtasks ?? [])
  }, [task])

  if (!task) return null

  function addSubtask() {
    const text = newSub.trim()
    if (!text) return
    setSubtasks((prev) => [...prev, { text, done: false }])
    setNewSub('')
  }

  function toggleSubtask(idx: number) {
    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, done: !s.done } : s)))
  }

  function removeSubtask(idx: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('subtasks', JSON.stringify(subtasks))
    const result = await updateWorkTask(task!.id, formData)
    setPending(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar tarea">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="edit-titulo" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Titulo</label>
          <input id="edit-titulo" name="titulo" type="text" required defaultValue={task.titulo}
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-descripcion" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Descripcion (opcional)</label>
          <textarea id="edit-descripcion" name="descripcion" rows={2} defaultValue={task.descripcion ?? ''}
            className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit-prioridad" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Prioridad</label>
            <select id="edit-prioridad" name="prioridad" defaultValue={task.prioridad}
              className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              <option value="low">Baja</option>
              <option value="mid">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="edit-due_date" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha limite</label>
            <input id="edit-due_date" name="due_date" type="date" defaultValue={task.due_date ?? ''}
              className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit-tags" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Tags (separados por coma)</label>
          <input id="edit-tags" name="tags" type="text" defaultValue={task.tags.join(', ')}
            className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        {/* Subtasks */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Subtareas</p>
          {subtasks.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button type="button" onClick={() => toggleSubtask(idx)} className="text-[var(--mod-tasks)]">
                {s.done ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <span className={`flex-1 text-sm ${s.done ? 'line-through text-[var(--text-3)]' : 'text-[var(--text-1)]'}`}>
                {s.text}
              </span>
              <button type="button" onClick={() => removeSubtask(idx)} className="text-[var(--text-3)] hover:text-[var(--expense)]">
                <X size={14} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask() } }}
              placeholder="Nueva subtarea..."
              className="flex-1 rounded border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 text-sm outline-none focus:border-[var(--mod-tasks)]"
            />
            <button type="button" onClick={addSubtask} disabled={!newSub.trim()}
              className="rounded border border-[var(--mod-tasks)] px-2 py-1.5 text-xs text-[var(--mod-tasks)] transition-colors hover:bg-[var(--mod-tasks)] hover:text-white disabled:opacity-30">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </BottomSheet>
  )
}
