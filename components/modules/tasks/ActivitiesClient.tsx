'use client'

import { useState, useCallback, useEffect } from 'react'
import { Plus, Pencil, Trash2, CalendarPlus } from 'lucide-react'
import { getAllWorkTasks, createWorkTask, updateWorkTask, updateTaskStatus, deleteWorkTask } from '@/app/actions/tasks/tasks'
import { BottomSheet } from '@/components/ui/Modal'
import type { WorkTask, TaskCategoria, TaskPriority, TaskStatus, Subtask } from '@/lib/types/modules.types'

/* ─ constants ─────────────────────────────────────────── */
type Tab = 'todas' | 'trabajo' | 'proyecto' | 'hogar'

const PRIO_PTS: Record<TaskPriority, number> = { urgent: 300, high: 150, mid: 100, low: 50 }
const DAILY_GOAL = 400
const MILESTONES = [100, 200, 300, 400]

const CAT_TAG: Record<TaskCategoria, string> = { trabajo: 'task', proyecto: 'pm', hogar: 'chor' }
const CAT_LABEL: Record<TaskCategoria, string> = { trabajo: 'Trabajo', proyecto: 'Proyecto', hogar: 'Hogar' }
const PRIO_LABEL: Record<TaskPriority, string> = { low: 'Baja', mid: 'Media', high: 'Alta', urgent: 'Urgente' }
const STATUS_LABEL: Record<TaskStatus, string> = { backlog: 'Pendiente', in_progress: 'En curso', done: 'Hecho', cancelled: 'Cancelado' }

function gcalUrl(task: WorkTask): string {
  const title = encodeURIComponent(task.titulo)
  const details = encodeURIComponent(task.descripcion ?? '')
  if (task.due_date) {
    const d = task.due_date.replace(/-/g, '')
    if (task.due_time) {
      const t = task.due_time.replace(/:/g, '').slice(0, 4)
      const end = String(Number(t.slice(0, 2)) + 1).padStart(2, '0') + t.slice(2)
      return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${d}T${t}00/${d}T${end}00&details=${details}`
    }
    return `https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${d}/${d}&details=${details}`
  }
  return `https://calendar.google.com/calendar/r/eventedit?text=${title}&details=${details}`
}

function getWeeks(refDate: Date): { label: string; start: Date; end: Date }[] {
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const weeks: { label: string; start: Date; end: Date }[] = []
  for (let w = 0; w < 4; w++) {
    const start = new Date(year, month, 1 + w * 7)
    const end = new Date(year, month, Math.min(7 + w * 7, new Date(year, month + 1, 0).getDate()))
    const fmt = (d: Date) => `${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
    weeks.push({ label: `Semana ${w + 1}`, start, end })
    void fmt
  }
  return weeks
}

function fmt(d: Date) {
  return `${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`
}

function dateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function formatDue(task: WorkTask): string {
  if (!task.due_date) return 'Sin fecha'
  const today = todayStr()
  const diff = Math.round((new Date(task.due_date).getTime() - new Date(today).getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Manana'
  if (diff === -1) return 'Ayer'
  if (diff < 0) return `Vencio hace ${-diff} dias`
  return `${task.due_date.slice(5).replace('-', '/')}`
}

/* ─ main component ────────────────────────────────────── */
export function ActivitiesClient() {
  const [tasks, setTasks] = useState<WorkTask[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('todas')
  const [selectedWeek, setSelectedWeek] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<WorkTask | null>(null)

  const load = useCallback(async () => {
    const res = await getAllWorkTasks()
    if (res.ok) setTasks(res.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* points */
  const today = todayStr()
  const ptsToday = tasks
    .filter(t => t.status === 'done' && t.updated_at?.slice(0, 10) === today)
    .reduce((s, t) => s + PRIO_PTS[t.prioridad], 0)
  const ptsPct = Math.min(ptsToday / DAILY_GOAL, 1)

  /* filtered active tasks */
  const activeTasks = tasks.filter(t =>
    t.status !== 'cancelled' &&
    (tab === 'todas' || t.categoria === tab)
  )
  const cardTasks = activeTasks.filter(t => t.status !== 'done')
  const doneTasks = activeTasks.filter(t => t.status === 'done').slice(0, 3)

  /* weeks */
  const weeks = getWeeks(new Date())
  const week = weeks[selectedWeek]
  const weekTasks = tasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date + 'T12:00:00')
    return d >= week.start && d <= week.end &&
      (tab === 'todas' || t.categoria === tab)
  }).sort((a, b) => {
    const pa = a.prioridad === 'urgent' ? 0 : a.prioridad === 'high' ? 1 : 2
    const pb = b.prioridad === 'urgent' ? 0 : b.prioridad === 'high' ? 1 : 2
    return pa - pb
  })

  /* current week index */
  useEffect(() => {
    const todayDate = new Date()
    const idx = weeks.findIndex(w => todayDate >= w.start && todayDate <= w.end)
    if (idx >= 0) setSelectedWeek(idx)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[60, 120, 200].map((h, i) => (
          <div key={i} className="animate-pulse" style={{ height: h, background: 'var(--s2)', borderRadius: 'var(--rm)' }} />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Milestone bar */}
      <div className="milestone-wrap">
        <div className="milestone-hdr">
          <div className="milestone-title">★ Actividad hoy ★</div>
          <div className="milestone-max">★ {ptsToday} / {DAILY_GOAL} pts</div>
        </div>
        <div className="milestone-track">
          <div className="milestone-fill" style={{ width: `${ptsPct * 100}%` }} />
          <div className="milestone-nodes">
            {MILESTONES.map((m) => {
              const done = ptsToday >= m
              const active = !done && ptsToday >= m - 100
              return (
                <div key={m} className={`mnode${done ? ' done' : active ? ' active' : ''}`}>
                  <div className="mnode-circle">{done ? '✓' : active ? '●' : ''}</div>
                  <div className="mnode-val">{m}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="activity-subtabs">
        {([['todas', 'Todas'], ['trabajo', 'Trabajo'], ['proyecto', 'Proyectos ★'], ['hogar', 'Hogar']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={`atab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 96 }}>

        {/* Active task cards */}
        <div>
          <div className="zdivider">
            <span className="zdivider-star">◆</span>
            <span className="zdivider-label">Tareas activas</span>
            <span className="zdivider-line" />
            <span style={{ fontSize: '.72em', color: 'var(--t3)', fontWeight: 700 }}>{cardTasks.length}</span>
          </div>

          {cardTasks.length === 0 ? (
            <p style={{ fontSize: '.82em', color: 'var(--t3)', padding: '16px 0' }}>
              {tab === 'todas' ? 'Sin tareas activas' : `Sin tareas de ${CAT_LABEL[tab as TaskCategoria]}`}
            </p>
          ) : (
            <div className="task-cards-scroll">
              <div className="task-cards">
                {cardTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={() => setEditing(task)}
                    onStatusChange={async (s) => { await updateTaskStatus(task.id, s); load() }}
                    onDelete={async () => { if (!confirm('Eliminar actividad?')) return; await deleteWorkTask(task.id); load() }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done today */}
          {doneTasks.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {doneTasks.map(task => (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', background: 'var(--s1)',
                  border: '1px solid var(--b1)', borderRadius: 'var(--rm)', opacity: 0.65
                }}>
                  <span style={{ color: 'var(--g)', fontSize: '.8em' }}>✓</span>
                  <span className={`ztag ${CAT_TAG[task.categoria]}`}>{CAT_LABEL[task.categoria]}</span>
                  <span style={{ flex: 1, fontSize: '.85em', fontWeight: 700, color: 'var(--t2)', textDecoration: 'line-through' }}>{task.titulo}</span>
                  <span style={{ fontSize: '.72em', color: 'var(--y)', fontWeight: 800, fontStyle: 'italic' }}>★ {PRIO_PTS[task.prioridad]} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weekly schedule */}
        <div>
          <div className="zdivider">
            <span className="zdivider-star">◆</span>
            <span className="zdivider-label">Cronograma semanal</span>
            <span className="zdivider-line" />
          </div>

          <div className="schedule-weeks">
            {weeks.map((w, i) => (
              <div
                key={i}
                className={`sweek${selectedWeek === i ? ' active' : ''}`}
                onClick={() => setSelectedWeek(i)}
              >
                {w.label}
                <div className="sweek-dates">{fmt(w.start)}–{fmt(w.end)}</div>
              </div>
            ))}
          </div>

          <div className="schedule-rows">
            {weekTasks.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: '.82em', color: 'var(--t3)' }}>
                Sin actividades para esta semana
              </div>
            ) : (
              weekTasks.map(task => (
                <div
                  key={task.id}
                  className={`srow${task.prioridad === 'urgent' ? ' featured' : ''}`}
                  onClick={() => setEditing(task)}
                >
                  <div className="srow-name">
                    {task.prioridad === 'urgent' && '★ '}{task.titulo}
                  </div>
                  <div className="srow-chips">
                    {task.tags.slice(0, 2).map(tag => (
                      <div key={tag} className="srow-chip">{tag.slice(0, 2).toUpperCase()}</div>
                    ))}
                    {task.due_time && <div className="srow-chip" style={{ fontSize: '.55em', width: 32, borderRadius: 'var(--rs)' }}>{task.due_time.slice(0,5)}</div>}
                    <div className="srow-chip" style={{ background: 'none', border: 'none', color: 'var(--t3)' }}>›</div>
                  </div>
                  <a
                    href={gcalUrl(task)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    title="Agregar a Google Calendar"
                    style={{ color: 'var(--t3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <CalendarPlus size={14} strokeWidth={2} />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '11px 20px', borderRadius: 'var(--rm)',
          background: 'var(--y)', color: 'var(--yt)',
          fontSize: '.85em', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em',
          boxShadow: '0 4px 22px rgba(236,199,0,.45)',
          cursor: 'pointer',
        }}
        className="sm:bottom-6! sm:right-6!"
      >
        <Plus size={16} strokeWidth={2.5} /> Nueva
      </button>

      {showAdd && (
        <ActivitySheet
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}

      {editing && (
        <ActivitySheet
          task={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
          onDelete={async () => {
            if (!confirm('Eliminar actividad?')) return
            await deleteWorkTask(editing.id)
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

/* ─ TaskCard ──────────────────────────────────────────── */
function TaskCard({ task, onEdit, onStatusChange, onDelete }: {
  task: WorkTask
  onEdit: () => void
  onStatusChange: (s: TaskStatus) => void
  onDelete: () => void
}) {
  const done = task.status === 'done'
  const subtotalDone = task.subtasks.filter(s => s.done).length
  const subtotal = task.subtasks.length
  const pts = PRIO_PTS[task.prioridad]
  const isUrgent = task.prioridad === 'urgent'

  return (
    <div className={`task-card${isUrgent ? ' starred' : ''}${done ? ' done-card' : ''}`} onClick={onEdit}>
      <div className="task-card-hdr">
        <div className="task-card-progress">
          Prog: <em>{subtotalDone}/{Math.max(subtotal, 1)}</em>
        </div>
        {isUrgent && <div className="task-star">★</div>}
      </div>
      <div className="task-card-body">
        <div className="task-card-tag">
          <span className={`ztag ${CAT_TAG[task.categoria]}`}>{CAT_LABEL[task.categoria]}</span>
        </div>
        <div className="task-card-desc">{task.titulo}</div>
        <div className="task-card-sub">
          {done ? 'Completado' : `${formatDue(task)} · ${PRIO_LABEL[task.prioridad]}`}
        </div>
      </div>
      <div className="task-card-footer" onClick={e => e.stopPropagation()}>
        {done ? (
          <div className="task-completed">✓ Completado</div>
        ) : (
          <>
            <div className="task-reward">★ {pts} pts</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className="zbtn-go"
                onClick={(e) => { e.stopPropagation(); onStatusChange(task.status === 'backlog' ? 'in_progress' : 'done') }}
              >
                {task.status === 'backlog' ? 'Ir' : 'Hecho'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ background: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 2 }}>
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ─ ActivitySheet ─────────────────────────────────────── */
function ActivitySheet({ task, onClose, onSaved, onDelete }: {
  task?: WorkTask
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const [titulo, setTitulo] = useState(task?.titulo ?? '')
  const [descripcion, setDescripcion] = useState(task?.descripcion ?? '')
  const [prioridad, setPrioridad] = useState<TaskPriority>(task?.prioridad ?? 'mid')
  const [categoria, setCategoria] = useState<TaskCategoria>(task?.categoria ?? 'trabajo')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'backlog')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [dueTime, setDueTime] = useState(task?.due_time ?? '')
  const [tags, setTags] = useState(task?.tags.join(', ') ?? '')
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks ?? [])
  const [newSub, setNewSub] = useState('')
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const lbl: React.CSSProperties = {
    fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'var(--t3)', marginBottom: 6, display: 'block',
  }

  async function handleSave() {
    if (!titulo.trim()) { setErr('El titulo es requerido'); return }
    setPending(true); setErr(null)
    const form = new FormData()
    form.set('titulo', titulo.trim())
    form.set('descripcion', descripcion)
    form.set('prioridad', prioridad)
    form.set('categoria', categoria)
    form.set('status', status)
    form.set('due_date', dueDate)
    form.set('due_time', dueTime)
    form.set('tags', tags)
    form.set('subtasks', JSON.stringify(subtasks))

    const res = task
      ? await updateWorkTask(task.id, form)
      : await createWorkTask(form)

    if (!res.ok) { setErr(res.error); setPending(false); return }
    onSaved()
  }

  function addSubtask() {
    if (!newSub.trim()) return
    setSubtasks(s => [...s, { text: newSub.trim(), done: false }])
    setNewSub('')
  }

  return (
    <BottomSheet open onClose={onClose} title={task ? 'Editar actividad' : 'Nueva actividad'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Titulo */}
        <div>
          <span style={lbl}>Titulo</span>
          <input className="zinput" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre de la actividad" />
        </div>

        {/* Categoria + Prioridad */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={lbl}>Categoria</span>
            <select className="zinput" value={categoria} onChange={e => setCategoria(e.target.value as TaskCategoria)}>
              <option value="trabajo">Trabajo</option>
              <option value="proyecto">Proyecto</option>
              <option value="hogar">Hogar</option>
            </select>
          </div>
          <div>
            <span style={lbl}>Prioridad</span>
            <select className="zinput" value={prioridad} onChange={e => setPrioridad(e.target.value as TaskPriority)}>
              <option value="low">Baja (50 pts)</option>
              <option value="mid">Media (100 pts)</option>
              <option value="high">Alta (150 pts)</option>
              <option value="urgent">Urgente (300 pts)</option>
            </select>
          </div>
        </div>

        {/* Status */}
        {task && (
          <div>
            <span style={lbl}>Estado</span>
            <select className="zinput" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {/* Fecha + Hora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={lbl}>Fecha</span>
            <input className="zinput" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <span style={lbl}>Hora</span>
            <input className="zinput" type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} />
          </div>
        </div>

        {/* Tags */}
        <div>
          <span style={lbl}>Tags (separados por coma)</span>
          <input className="zinput" value={tags} onChange={e => setTags(e.target.value)} placeholder="UI, UX, Backend..." />
        </div>

        {/* Descripcion */}
        <div>
          <span style={lbl}>Descripcion</span>
          <textarea className="zinput" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} placeholder="Detalles opcionales..." style={{ resize: 'none' }} />
        </div>

        {/* Subtasks */}
        <div>
          <span style={lbl}>Subtareas ({subtasks.filter(s => s.done).length}/{subtasks.length})</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
            {subtasks.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--s2)', borderRadius: 'var(--rs)', border: '1px solid var(--b1)' }}>
                <input type="checkbox" checked={s.done} onChange={() => setSubtasks(prev => prev.map((x, j) => j === i ? { ...x, done: !x.done } : x))} style={{ accentColor: 'var(--y)', width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '.85em', color: s.done ? 'var(--t3)' : 'var(--t1)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
                <button onClick={() => setSubtasks(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 2 }}>
                  <Trash2 size={11} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="zinput" value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Nueva subtarea..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
            <button className="zbtn" onClick={addSubtask} style={{ padding: '8px 14px', flexShrink: 0 }}>+</button>
          </div>
        </div>

        {/* Google Calendar link (if has date) */}
        {(task && task.due_date) && (
          <a
            href={gcalUrl(task)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8em', color: 'var(--t3)', fontWeight: 700 }}
          >
            <CalendarPlus size={14} strokeWidth={2} /> Agregar a Google Calendar
          </a>
        )}

        {err && <p style={{ fontSize: '.8em', color: 'var(--r)', fontWeight: 700 }}>{err}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          {onDelete && (
            <button className="zbtn" onClick={onDelete} style={{ padding: '10px 16px', color: 'var(--r)', borderColor: 'var(--r)' }}>
              Eliminar
            </button>
          )}
          <button className="zbtn primary" onClick={handleSave} disabled={pending} style={{ flex: 1, padding: '10px 0', opacity: pending ? .6 : 1 }}>
            {pending ? 'Guardando...' : task ? 'Guardar' : 'Crear actividad'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
