'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Stethoscope, Pill, Calendar, Building2, UserRound, Trash2, Users, Clock, Bell, Pencil } from 'lucide-react'

import { getMedicalRecords, createMedicalRecord, deleteMedicalRecord } from '@/app/actions/medical/records'
import { getMedicamentos, createMedicamento, toggleMedicamento, deleteMedicamento, updateMedicamento } from '@/app/actions/medical/medicamentos'
import { getUpcomingReminders } from '@/app/actions/medical/reminders'
import { TimelineItem } from '@/components/modules/medical/TimelineItem'
import { useHousehold } from '@/hooks/useHousehold'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/Modal'
import type { MedicalRecord, Medicamento } from '@/lib/types/modules.types'
import { formatDateShort } from '@/lib/utils/format'

type Tab = 'timeline' | 'meds'

const TIPO_CONFIG: Record<string, { label: string; color: string }> = {
  consulta: { label: 'Consulta', color: 'var(--info)' },
  examen: { label: 'Examen', color: 'var(--warn)' },
  vacuna: { label: 'Vacuna', color: 'var(--income)' },
  control: { label: 'Control', color: 'var(--mod-medical)' },
}

export function MedicalClient() {
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [meds, setMeds] = useState<Medicamento[]>([])
  const [reminders, setReminders] = useState<MedicalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('timeline')
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [showAddMed, setShowAddMed] = useState(false)
  const [editingMed, setEditingMed] = useState<Medicamento | null>(null)
  const { members, profile } = useHousehold()

  const loadData = useCallback(async () => {
    const [recRes, medRes, remRes] = await Promise.all([
      getMedicalRecords(),
      getMedicamentos(false),
      getUpcomingReminders(),
    ])
    if (recRes.ok) setRecords(recRes.data)
    if (medRes.ok) setMeds(medRes.data)
    if (remRes.ok) setReminders(remRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDeleteRecord(id: string) {
    await deleteMedicalRecord(id)
    loadData()
  }

  async function handleToggleMed(id: string, activo: boolean) {
    await toggleMedicamento(id, activo)
    loadData()
  }

  async function handleDeleteMed(id: string) {
    await deleteMedicamento(id)
    loadData()
  }

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
      {/* Shared indicator */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-3)]">
        <Users size={12} />
        <span>Vista compartida del hogar</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Registros</p>
          <p className="num mt-1 text-sm font-bold text-[var(--mod-medical)]">{records.length}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Medicamentos</p>
          <p className="num mt-1 text-sm font-bold text-[var(--info)]">{meds.filter((m) => m.activo).length}</p>
        </div>
        <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Citas prox.</p>
          <p className={`num mt-1 text-sm font-bold ${reminders.length > 0 ? 'text-[var(--warn)]' : 'text-[var(--text-3)]'}`}>{reminders.length}</p>
        </div>
      </div>

      {/* Suggestions */}
      {reminders.length === 0 && records.length > 0 && (
        <p className="text-xs text-[var(--text-3)]">No tienes citas proximamente. Considera agendar un control de rutina.</p>
      )}
      {meds.filter((m) => m.activo).length > 0 && (
        <p className="text-xs text-[var(--text-3)]">Tienes {meds.filter((m) => m.activo).length} medicamento{meds.filter((m) => m.activo).length !== 1 ? 's' : ''} activo{meds.filter((m) => m.activo).length !== 1 ? 's' : ''}.</p>
      )}

      {/* Upcoming reminders */}
      {reminders.length > 0 && (
        <div className="rounded-md border border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_5%,transparent)] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--warn)]">
            Proximas citas
          </p>
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-1 text-xs">
              <span className="text-[var(--text-1)]">
                {r.especialidad ?? r.tipo} {r.doctor && `- ${r.doctor}`}
              </span>
              <span className="num text-[var(--warn)]">{formatDateShort(r.proxima_cita!)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-md bg-[var(--surface-2)] p-1">
        <button
          onClick={() => setTab('timeline')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'timeline' ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          <Stethoscope size={12} />
          Historial
        </button>
        <button
          onClick={() => setTab('meds')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            tab === 'meds' ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
        >
          <Pill size={12} />
          Medicamentos
        </button>
      </div>

      {/* Timeline tab */}
      {tab === 'timeline' && (
        <>
          {records.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Stethoscope size={40} className="text-[var(--mod-medical)]" />
              <p className="text-sm text-[var(--text-2)]">No hay registros medicos.</p>
              <Button onClick={() => setShowAddRecord(true)}>Agregar registro</Button>
            </div>
          ) : (
            <div className="space-y-0">
              {records.map((rec, idx) => {
                const cfg = TIPO_CONFIG[rec.tipo] ?? TIPO_CONFIG.consulta
                return (
                  <TimelineItem
                    key={rec.id}
                    color={cfg.color}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge color={cfg.color}>{cfg.label}</Badge>
                          {(rec as any).profiles?.display_name && (
                            <span className="text-[10px] font-medium" style={{ color: (rec as any).profiles.color_hex }}>
                              {(rec as any).profiles.display_name}
                            </span>
                          )}
                          <span className="num text-xs text-[var(--text-3)]">{formatDateShort(rec.fecha)}</span>
                        </div>
                        {rec.especialidad && (
                          <p className="mt-1 text-sm font-medium text-[var(--text-1)]">{rec.especialidad}</p>
                        )}
                        <div className="mt-1 space-y-0.5 text-xs text-[var(--text-3)]">
                          {rec.doctor && (
                            <p className="flex items-center gap-1"><UserRound size={10} />{rec.doctor}</p>
                          )}
                          {rec.clinica && (
                            <p className="flex items-center gap-1"><Building2 size={10} />{rec.clinica}</p>
                          )}
                          {rec.proxima_cita && (
                            <p className="flex items-center gap-1">
                              <Calendar size={10} />
                              Proxima: {formatDateShort(rec.proxima_cita)}
                            </p>
                          )}
                        </div>
                        {rec.notas && (
                          <p className="mt-1 text-xs text-[var(--text-2)] line-clamp-2">{rec.notas}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteRecord(rec.id)}
                        className="ml-2 rounded p-1 text-[var(--text-3)] hover:text-[var(--expense)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TimelineItem>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Meds tab */}
      {tab === 'meds' && (
        <>
          {meds.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Pill size={40} className="text-[var(--mod-medical)]" />
              <p className="text-sm text-[var(--text-2)]">No hay medicamentos registrados.</p>
              <Button onClick={() => setShowAddMed(true)}>Agregar medicamento</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {meds.map((med) => (
                <div
                  key={med.id}
                  className={`rounded-md border bg-[var(--surface)] p-3 ${
                    med.activo ? 'border-[var(--border)]' : 'border-[var(--text-3)]/20 opacity-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Pill size={14} className={med.activo ? 'text-[var(--mod-medical)]' : 'text-[var(--text-3)]'} />
                        <span className="text-sm font-medium text-[var(--text-1)]">{med.nombre}</span>
                        {(med as any).profiles?.display_name && (
                          <span className="text-[10px] font-medium" style={{ color: (med as any).profiles.color_hex }}>
                            {(med as any).profiles.display_name}
                          </span>
                        )}
                        {!med.activo && <Badge color="var(--text-3)">Inactivo</Badge>}
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-[var(--text-3)]">
                        {med.dosis && <p>Dosis: {med.dosis}</p>}
                        {med.frecuencia_horas && <p className="flex items-center gap-1"><Clock size={10} />Cada {med.frecuencia_horas}h</p>}
                        {med.hora_inicio && <p className="flex items-center gap-1"><Clock size={10} />Inicio: {med.hora_inicio.slice(0, 5)}</p>}
                        {med.duracion_dias && <p>Duracion: {med.duracion_dias} dias</p>}
                        {med.proxima_toma && (
                          <p className="flex items-center gap-1 text-[var(--info)]">
                            <Bell size={10} />
                            Proxima toma: {new Date(med.proxima_toma).toLocaleString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {!med.frecuencia_horas && med.frecuencia && <p>Frecuencia: {med.frecuencia}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMed(med)}
                        className="rounded p-1 text-[var(--text-3)] hover:text-[var(--mod-medical)]"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleMed(med.id, !med.activo)}
                        className={`rounded px-2 py-1 text-[10px] font-medium ${
                          med.activo
                            ? 'bg-[var(--surface-2)] text-[var(--text-2)]'
                            : 'bg-[color-mix(in_srgb,var(--income)_10%,transparent)] text-[var(--income)]'
                        }`}
                      >
                        {med.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => handleDeleteMed(med.id)}
                        className="rounded p-1 text-[var(--text-3)] hover:text-[var(--expense)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => tab === 'timeline' ? setShowAddRecord(true) : setShowAddMed(true)}
        className="fixed bottom-20 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mod-medical)] text-white shadow-lg transition-transform active:scale-90 md:bottom-6"
      >
        <Plus size={24} />
      </button>

      {/* Add Record Sheet */}
      <AddRecordSheet open={showAddRecord} onClose={() => { setShowAddRecord(false); loadData() }} members={members} currentUserId={profile?.id} />

      {/* Add Med Sheet */}
      <AddMedSheet open={showAddMed} onClose={() => { setShowAddMed(false); loadData() }} members={members} currentUserId={profile?.id} />

      {/* Edit Med Sheet */}
      <EditMedSheet
        open={!!editingMed}
        med={editingMed}
        onClose={() => setEditingMed(null)}
        onSaved={() => { setEditingMed(null); loadData() }}
        members={members}
        currentUserId={profile?.id}
      />
    </div>
  )
}

/* ── AddRecordSheet ── */
interface MemberProps { members: { id: string; display_name: string; color_hex: string }[]; currentUserId?: string }

function AddRecordSheet({ open, onClose, members, currentUserId }: { open: boolean; onClose: () => void } & MemberProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await createMedicalRecord(form)
    setPending(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo registro medico">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">{error}</p>
        )}

        {members.length > 1 && (
          <div className="space-y-1">
            <label htmlFor="user_id" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Miembro</label>
            <select id="user_id" name="user_id" defaultValue={currentUserId} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="tipo" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Tipo</label>
            <select id="tipo" name="tipo" required className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              <option value="consulta">Consulta</option>
              <option value="examen">Examen</option>
              <option value="vacuna">Vacuna</option>
              <option value="control">Control</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="fecha" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha</label>
            <input id="fecha" name="fecha" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="especialidad" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Especialidad</label>
          <input id="especialidad" name="especialidad" type="text" placeholder="Cardiologia, dermatologia..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="doctor" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Doctor</label>
            <input id="doctor" name="doctor" type="text" placeholder="Dr. ..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="clinica" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Clinica</label>
            <input id="clinica" name="clinica" type="text" placeholder="Nombre clinica..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="proxima_cita" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Proxima cita (opcional)</label>
          <input id="proxima_cita" name="proxima_cita" type="date" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="notas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Notas</label>
          <textarea id="notas" name="notas" rows={2} placeholder="Observaciones..." className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar registro'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── AddMedSheet ── */
function AddMedSheet({ open, onClose, members, currentUserId }: { open: boolean; onClose: () => void } & MemberProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await createMedicamento(form)
    setPending(false)
    if (!result.ok) { setError(result.error); return }
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo medicamento">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">{error}</p>
        )}

        {members.length > 1 && (
          <div className="space-y-1">
            <label htmlFor="med_user_id" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Miembro</label>
            <select id="med_user_id" name="user_id" defaultValue={currentUserId} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="nombre" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input id="nombre" name="nombre" type="text" required placeholder="Nombre del medicamento" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="dosis" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Dosis</label>
            <input id="dosis" name="dosis" type="text" placeholder="500mg, 1 pastilla..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="duracion_dias" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Dias recetados</label>
            <input id="duracion_dias" name="duracion_dias" type="number" min="1" placeholder="7, 14, 30..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="hora_inicio" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Hora inicio</label>
            <input id="hora_inicio" name="hora_inicio" type="time" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="frecuencia_horas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Cada (horas)</label>
            <input id="frecuencia_horas" name="frecuencia_horas" type="number" min="1" max="72" placeholder="8, 12, 24..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="fecha_inicio" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha inicio</label>
          <input id="fecha_inicio" name="fecha_inicio" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="notas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Notas</label>
          <textarea id="notas" name="notas" rows={2} placeholder="Instrucciones especiales..." className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar medicamento'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── EditMedSheet ── */
function EditMedSheet({
  open,
  med,
  onClose,
  onSaved,
  members,
  currentUserId,
}: {
  open: boolean
  med: Medicamento | null
  onClose: () => void
  onSaved: () => void
} & MemberProps) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!med) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const result = await updateMedicamento(med!.id, form)
    setPending(false)
    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar medicamento">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded border border-[var(--expense)] bg-[color-mix(in_srgb,var(--expense)_8%,transparent)] px-3 py-2 text-xs text-[var(--expense)]">{error}</p>
        )}

        {members.length > 1 && (
          <div className="space-y-1">
            <label htmlFor="edit_med_user_id" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Miembro</label>
            <select id="edit_med_user_id" name="user_id" defaultValue={med.user_id} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1">
          <label htmlFor="edit_nombre" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input id="edit_nombre" name="nombre" type="text" required defaultValue={med.nombre} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit_dosis" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Dosis</label>
            <input id="edit_dosis" name="dosis" type="text" defaultValue={med.dosis ?? ''} placeholder="500mg, 1 pastilla..." className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit_duracion_dias" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Dias recetados</label>
            <input id="edit_duracion_dias" name="duracion_dias" type="number" min="1" defaultValue={med.duracion_dias ?? ''} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="edit_hora_inicio" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Hora inicio</label>
            <input id="edit_hora_inicio" name="hora_inicio" type="time" defaultValue={med.hora_inicio?.slice(0, 5) ?? ''} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label htmlFor="edit_frecuencia_horas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Cada (horas)</label>
            <input id="edit_frecuencia_horas" name="frecuencia_horas" type="number" min="1" max="72" defaultValue={med.frecuencia_horas ?? ''} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="edit_fecha_inicio" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha inicio</label>
          <input id="edit_fecha_inicio" name="fecha_inicio" type="date" defaultValue={med.fecha_inicio ?? ''} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="space-y-1">
          <label htmlFor="edit_notas" className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Notas</label>
          <textarea id="edit_notas" name="notas" rows={2} defaultValue={med.notas ?? ''} placeholder="Instrucciones especiales..." className="w-full resize-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </BottomSheet>
  )
}
