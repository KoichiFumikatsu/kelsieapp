'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChevronDown, ChevronLeft, ChevronRight, Tag, Pencil, Trash2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getActiveQuincena, getQuincenas, updateQuincena, ensureQuincena } from '@/app/actions/finance/quincenas'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '@/app/actions/finance/categorias'
import { getTransacciones, updateTransaccion, deleteTransaccion } from '@/app/actions/finance/transacciones'
import { getFinanceKPIs } from '@/app/actions/finance/dashboard'
import { FinanceKPIPanel } from '@/components/modules/finance/FinanceKPIPanel'
import { TransaccionList } from '@/components/modules/finance/TransaccionList'
import { AddTransaccionSheet } from '@/components/modules/finance/AddTransaccionSheet'
import { useHousehold } from '@/hooks/useHousehold'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Modal'
import { formatPeriod } from '@/lib/utils/format'
import type {
  Quincena,
  Categoria,
  TransaccionConCategoria,
  FinanceKPIs,
} from '@/lib/types/modules.types'

export function FinanceClient() {
  const { members, profile } = useHousehold()

  const [quincenas, setQuincenas] = useState<Quincena[]>([])
  const [active, setActive] = useState<Quincena | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [transacciones, setTransacciones] = useState<TransaccionConCategoria[]>([])
  const [kpis, setKPIs] = useState<FinanceKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const [showAddTx, setShowAddTx] = useState(false)
  const [showNewCategoria, setShowNewCategoria] = useState(false)
  const [showCategorias, setShowCategorias] = useState(false)
  const [showTransacciones, setShowTransacciones] = useState(true)
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [editingQuincena, setEditingQuincena] = useState<Quincena | null>(null)
  const [editingTx, setEditingTx] = useState<TransaccionConCategoria | null>(null)
  const [filterUserId, setFilterUserId] = useState<string | null>(null)

  const loadData = useCallback(async (quincenaId?: string) => {
    const [qRes, catRes] = await Promise.all([
      getQuincenas(),
      getCategorias(),
    ])

    if (qRes.ok) setQuincenas(qRes.data)
    if (catRes.ok) setCategorias(catRes.data)

    let q: Quincena | null = null
    if (quincenaId && qRes.ok) {
      q = qRes.data.find((x) => x.id === quincenaId) ?? null
    }
    if (!q) {
      const activeRes = await getActiveQuincena()
      if (activeRes.ok) {
        q = activeRes.data
        if (q && qRes.ok && !qRes.data.find((x) => x.id === q!.id)) {
          const refreshed = await getQuincenas()
          if (refreshed.ok) setQuincenas(refreshed.data)
        }
      }
    }

    setActive(q)

    if (q) {
      const [txRes, kpiRes] = await Promise.all([
        getTransacciones(q.id),
        getFinanceKPIs(q.id),
      ])
      if (txRes.ok) setTransacciones(txRes.data)
      if (kpiRes.ok) setKPIs(kpiRes.data)
    }

    setLoading(false)
  }, [])

  /** Navigate to a specific period (auto-creates if needed) */
  const navigateToPeriod = useCallback(async (year: number, month: number, half: 1 | 2) => {
    const res = await ensureQuincena(year, month, half)
    if (res.ok && res.data) {
      // Refresh list and load the target period
      const refreshed = await getQuincenas()
      if (refreshed.ok) setQuincenas(refreshed.data)
      setActive(res.data)
      const [txRes, kpiRes] = await Promise.all([
        getTransacciones(res.data.id),
        getFinanceKPIs(res.data.id),
      ])
      if (txRes.ok) setTransacciones(txRes.data)
      if (kpiRes.ok) setKPIs(kpiRes.data)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime subscription for transacciones
  useEffect(() => {
    if (!active) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const channel = supabase
      .channel('finance-tx')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transacciones', filter: `quincena_id=eq.${active.id}` },
        () => { loadData(active.id) },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [active, loadData])

  if (loading) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-[var(--surface-2)]" />
          ))}
        </div>
        <div className="h-32 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    )
  }

  // No quincena yet — show message (should not happen with auto-create)
  if (!active) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-sm text-[var(--text-2)]">Cargando quincena...</p>
      </div>
    )
  }

  // Determine active half from fecha_inicio
  const activeHalf: 1 | 2 = new Date(active.fecha_inicio + 'T12:00:00').getDate() === 1 ? 1 : 2

  // Filter categories to those matching the active half (or null = both)
  const filteredCategorias = categorias.filter(
    (c) => c.quincena_half === null || c.quincena_half === activeHalf
  )

  // Per-member filtering
  const filteredTransacciones = filterUserId
    ? transacciones.filter((t) => t.user_id === filterUserId)
    : transacciones

  const filteredKPIs = filterUserId && kpis
    ? computeFilteredKPIs(filteredTransacciones, filteredCategorias, kpis)
    : kpis

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Quincena period navigator */}
      <QuincenaNavigator
        active={active}
        onNavigate={navigateToPeriod}
        onEdit={() => setEditingQuincena(active)}
      />

      {/* Per-member filter */}
      {members.length > 1 && (
        <MemberFilter
          members={members}
          selected={filterUserId}
          onChange={setFilterUserId}
        />
      )}

      {/* KPIs */}
      {filteredKPIs && <FinanceKPIPanel kpis={filteredKPIs} isFiltered={!!filterUserId} />}

      {/* Transactions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setShowTransacciones(!showTransacciones)}
            className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]"
            style={{ '--accent': 'var(--mod-finance)' } as React.CSSProperties}
          >
            <span className="flex items-center gap-1.5">
              Transacciones ({filteredTransacciones.length})
              <ChevronDown size={12} className={`transition-transform ${showTransacciones ? 'rotate-180' : ''}`} />
            </span>
          </button>
        </div>
        {showTransacciones && (
          <TransaccionList transacciones={filteredTransacciones} onEdit={(t) => setEditingTx(t)} pageSize={10} />
        )}
      </div>

      {/* Categories section */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={() => setShowCategorias(!showCategorias)}
            className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]"
            style={{ '--accent': 'var(--mod-finance)' } as React.CSSProperties}
          >
            <span className="flex items-center gap-1.5">
              <Tag size={12} />
              Categorías
              <ChevronDown size={12} className={`transition-transform ${showCategorias ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <button
            onClick={() => setShowNewCategoria(true)}
            className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] hover:text-[var(--text-1)]"
          >
            + Nueva
          </button>
        </div>
        {showCategorias && (
          <div className="space-y-1">
            {filteredCategorias.length === 0 && (
              <p className="py-3 text-center text-xs text-[var(--text-3)]">Sin categorías para esta quincena.</p>
            )}
            {filteredCategorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${cat.tipo === 'gasto' ? 'bg-[var(--expense)]' : cat.tipo === 'ingreso' ? 'bg-[var(--income)]' : cat.tipo === 'ahorro' ? 'bg-[var(--info)]' : cat.tipo === 'credito' || cat.tipo === 'pago_credito' ? 'bg-[var(--credit)]' : 'bg-[var(--mod-finance)]'}`} />
                  <span className="text-sm font-medium text-[var(--text-1)]">{cat.nombre}</span>
                  {cat.presupuesto_default > 0 && (
                    <span className="num text-[10px] text-[var(--text-3)]">
                      ${cat.presupuesto_default.toLocaleString()}
                    </span>
                  )}
                  {cat.assigned_to && members.length > 0 && (
                    <span className="text-[10px] text-[var(--text-3)]">
                      {members.find((m) => m.id === cat.assigned_to)?.display_name ?? ''}
                    </span>
                  )}
                  {cat.quincena_half && (
                    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--text-3)]">
                      Q{cat.quincena_half}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingCat(cat)}
                    className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm(`Eliminar categoría "${cat.nombre}"?`)) return
                      await deleteCategoria(cat.id)
                      loadData(active?.id)
                    }}
                    className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--expense)]"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddTx(true)}
        className="fixed bottom-20 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mod-finance)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
        aria-label="Nueva transacción"
      >
        <Plus size={22} strokeWidth={2.2} />
      </button>

      {/* Sheets */}
      <AddTransaccionSheet
        open={showAddTx}
        onClose={() => { setShowAddTx(false); loadData(active.id) }}
        quincenaId={active.id}
        categorias={filteredCategorias}
        members={members}
        currentUserId={profile?.id}
      />

      <EditTransaccionSheet
        open={!!editingTx}
        transaccion={editingTx}
        categorias={filteredCategorias}
        members={members}
        onClose={() => setEditingTx(null)}
        onSaved={() => { setEditingTx(null); loadData(active.id) }}
        onDeleted={() => { setEditingTx(null); loadData(active.id) }}
      />

      <NewCategoriaSheet
        open={showNewCategoria}
        onClose={() => setShowNewCategoria(false)}
        onCreated={() => loadData(active?.id)}
        members={members}
        activeHalf={activeHalf}
      />
      <EditCategoriaSheet
        open={!!editingCat}
        categoria={editingCat}
        onClose={() => setEditingCat(null)}
        onSaved={() => { setEditingCat(null); loadData(active?.id) }}
        members={members}
        activeHalf={activeHalf}
      />
      <EditQuincenaSheet
        open={!!editingQuincena}
        quincena={editingQuincena}
        onClose={() => setEditingQuincena(null)}
        onSaved={() => { setEditingQuincena(null); loadData(editingQuincena?.id) }}
      />
    </div>
  )
}

/* ── New Categoría Sheet ── */
function NewCategoriaSheet({ open, onClose, onCreated, members, activeHalf }: { open: boolean; onClose: () => void; onCreated: () => void; members: { id: string; display_name: string }[]; activeHalf: 1 | 2 }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const result = await createCategoria(new FormData(e.currentTarget))
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    onCreated()
    // Don't close — let user add multiple categories
    ;(e.currentTarget as HTMLFormElement).reset()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva categoría">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input name="nombre" required placeholder="Ej: Arriendo" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-[var(--text-1)]" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Tipo</label>
          <select name="tipo" required className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
            <option value="ahorro">Ahorro</option>
            <option value="bolsillo">Bolsillo</option>
            <option value="credito">Credito</option>
            <option value="pago_credito">Pago credito</option>
            <option value="uso_bolsillo">Uso bolsillo</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Presupuesto</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="presupuesto_default" type="number" min="0" defaultValue="0" className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Asignar a</label>
          <select name="assigned_to" className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            <option value="">Compartida</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Quincena</label>
          <select name="quincena_half" defaultValue={String(activeHalf)} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            <option value="">Ambas</option>
            <option value="1">Solo 1ra quincena</option>
            <option value="2">Solo 2da quincena</option>
          </select>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Agregar categoría'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── Edit Categoría Sheet ── */
function EditCategoriaSheet({ open, categoria, onClose, onSaved, members, activeHalf }: {
  open: boolean; categoria: Categoria | null; onClose: () => void; onSaved: () => void; members: { id: string; display_name: string }[]; activeHalf: 1 | 2
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!categoria) return
    setPending(true)
    setError(null)

    const result = await updateCategoria(categoria.id, new FormData(e.currentTarget))
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  if (!categoria) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar categoría">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input name="nombre" required defaultValue={categoria.nombre} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Presupuesto</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="presupuesto_default" type="number" min="0" defaultValue={categoria.presupuesto_default} className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Asignar a</label>
          <select name="assigned_to" defaultValue={categoria.assigned_to ?? ''} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            <option value="">Compartida</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.display_name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Quincena</label>
          <select name="quincena_half" defaultValue={categoria.quincena_half != null ? String(categoria.quincena_half) : ''} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            <option value="">Ambas</option>
            <option value="1">Solo 1ra quincena</option>
            <option value="2">Solo 2da quincena</option>
          </select>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── Edit Quincena Sheet ── */
function EditQuincenaSheet({ open, quincena, onClose, onSaved }: {
  open: boolean; quincena: Quincena | null; onClose: () => void; onSaved: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!quincena) return
    setPending(true)
    setError(null)

    const result = await updateQuincena(quincena.id, new FormData(e.currentTarget))
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  if (!quincena) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar quincena">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input name="nombre" required defaultValue={quincena.nombre} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>
        <p className="text-xs text-[var(--text-3)]">
          Periodo: {formatPeriod(quincena.fecha_inicio, quincena.fecha_fin)}
        </p>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Saldo inicial</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="saldo_inicial" type="number" step="any" required defaultValue={quincena.saldo_inicial} className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── Quincena Period Navigator ── */
function QuincenaNavigator({ active, onNavigate, onEdit }: {
  active: Quincena
  onNavigate: (year: number, month: number, half: 1 | 2) => void
  onEdit: () => void
}) {
  // Parse current period from fecha_inicio
  const [y, m, d] = active.fecha_inicio.split('-').map(Number)
  const half: 1 | 2 = d === 1 ? 1 : 2

  function goPrev() {
    if (half === 1) {
      // Go to previous month 2da
      const pm = m === 1 ? 12 : m - 1
      const py = m === 1 ? y - 1 : y
      onNavigate(py, pm, 2)
    } else {
      onNavigate(y, m, 1)
    }
  }

  function goNext() {
    if (half === 2) {
      // Go to next month 1ra
      const nm = m === 12 ? 1 : m + 1
      const ny = m === 12 ? y + 1 : y
      onNavigate(ny, nm, 1)
    } else {
      onNavigate(y, m, 2)
    }
  }

  const monthName = new Date(y, m - 1, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goPrev}
        className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
        aria-label="Quincena anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex-1 text-center">
        <p className="text-sm font-bold text-[var(--text-1)]">
          {half === 1 ? '1ra' : '2da'} quincena
        </p>
        <p className="text-[10px] capitalize text-[var(--text-3)]">
          {monthName} · {formatPeriod(active.fecha_inicio, active.fecha_fin)}
        </p>
      </div>
      <button
        onClick={goNext}
        className="rounded p-1 text-[var(--text-3)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]"
        aria-label="Quincena siguiente"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={onEdit}
        className="rounded p-1 text-[var(--text-3)] hover:text-[var(--text-1)]"
        title="Editar saldo inicial"
      >
        <Pencil size={12} />
      </button>
    </div>
  )
}

/* ── Edit Transaccion Sheet ── */
function EditTransaccionSheet({ open, transaccion, categorias, members, onClose, onSaved, onDeleted }: {
  open: boolean
  transaccion: TransaccionConCategoria | null
  categorias: Categoria[]
  members: { id: string; display_name: string }[]
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!transaccion) return
    setPending(true)
    setError(null)

    const result = await updateTransaccion(transaccion.id, new FormData(e.currentTarget))
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    onSaved()
  }

  async function handleDelete() {
    if (!transaccion) return
    if (!confirm('Eliminar esta transaccion?')) return
    await deleteTransaccion(transaccion.id)
    onDeleted()
  }

  if (!transaccion) return null

  const gastos = categorias.filter((c) => c.tipo === 'gasto')
  const ingresos = categorias.filter((c) => c.tipo === 'ingreso')
  const ahorros = categorias.filter((c) => c.tipo === 'ahorro')
  const bolsillos = categorias.filter((c) => c.tipo === 'bolsillo')
  const creditos = categorias.filter((c) => c.tipo === 'credito')
  const pagosCredito = categorias.filter((c) => c.tipo === 'pago_credito')
  const usosBolsillo = categorias.filter((c) => c.tipo === 'uso_bolsillo')

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar transaccion">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}

        {/* Tipo */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Tipo</label>
          <div className="grid grid-cols-3 gap-2">
            {(['gasto', 'ingreso', 'ahorro', 'bolsillo', 'credito', 'pago_credito', 'uso_bolsillo'] as const).map((tipo) => {
              const colorVar: Record<string, string> = { gasto: '--expense', ingreso: '--income', ahorro: '--info', bolsillo: '--mod-finance', credito: '--credit', pago_credito: '--credit', uso_bolsillo: '--mod-finance' }
              const labels: Record<string, string> = { gasto: 'Gasto', ingreso: 'Ingreso', ahorro: 'Ahorro', bolsillo: 'Bolsillo', credito: 'Credito', pago_credito: 'Pago TC', uso_bolsillo: 'Uso Bols.' }
              return (
                <label key={tipo} className={`flex cursor-pointer items-center justify-center rounded border border-[var(--border-strong)] px-3 py-2 text-[11px] font-medium has-[:checked]:border-[var(${colorVar[tipo]})] has-[:checked]:bg-[color-mix(in_srgb,var(${colorVar[tipo]})_8%,transparent)] has-[:checked]:text-[var(${colorVar[tipo]})]`}>
                  <input type="radio" name="tipo" value={tipo} defaultChecked={transaccion.tipo === tipo} className="sr-only" />
                  {labels[tipo]}
                </label>
              )
            })}
          </div>
        </div>

        {/* Importe */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Importe</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="importe" type="number" min="1" required defaultValue={transaccion.importe} className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>

        {/* Miembro */}
        {members.length > 1 && (
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Miembro</label>
            <select name="user_id" defaultValue={transaccion.user_id} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.display_name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Categoria */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Categoria</label>
          <select name="categoria_id" required defaultValue={transaccion.categoria_id} className="w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]">
            {gastos.length > 0 && <optgroup label="Gastos">{gastos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {ingresos.length > 0 && <optgroup label="Ingresos">{ingresos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {ahorros.length > 0 && <optgroup label="Ahorros">{ahorros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {bolsillos.length > 0 && <optgroup label="Bolsillos">{bolsillos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {creditos.length > 0 && <optgroup label="Credito">{creditos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {pagosCredito.length > 0 && <optgroup label="Pago credito">{pagosCredito.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
            {usosBolsillo.length > 0 && <optgroup label="Uso bolsillo">{usosBolsillo.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</optgroup>}
          </select>
        </div>

        {/* Descripcion */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Descripcion</label>
          <input name="descripcion" type="text" defaultValue={transaccion.descripcion ?? ''} placeholder="Opcional" className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none placeholder:text-[var(--text-3)] focus:border-[var(--text-1)]" />
        </div>

        {/* Fecha */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fecha</label>
          <input name="fecha" type="date" defaultValue={transaccion.fecha} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="flex-1">
            {pending ? 'Guardando...' : 'Guardar'}
          </Button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded border border-[var(--expense)] px-4 py-2 text-sm font-medium text-[var(--expense)] hover:bg-[color-mix(in_srgb,var(--expense)_8%,transparent)]"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

/* ── Compute KPIs from filtered transactions (client-side) ── */
function computeFilteredKPIs(
  txs: TransaccionConCategoria[],
  categorias: Categoria[],
  originalKPIs: FinanceKPIs,
): FinanceKPIs {
  const totalIngresos = txs
    .filter((t) => t.tipo === 'ingreso')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalGastos = txs
    .filter((t) => t.tipo === 'gasto')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalAhorros = txs
    .filter((t) => t.tipo === 'ahorro')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalBolsillos = txs
    .filter((t) => t.tipo === 'bolsillo')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalCredito = txs
    .filter((t) => t.tipo === 'credito')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalPagoCredito = txs
    .filter((t) => t.tipo === 'pago_credito')
    .reduce((s, t) => s + Number(t.importe), 0)
  const totalUsoBolsillo = txs
    .filter((t) => t.tipo === 'uso_bolsillo')
    .reduce((s, t) => s + Number(t.importe), 0)

  const realByCategoria: Record<string, number> = {}
  for (const t of txs) {
    realByCategoria[t.categoria_id] = (realByCategoria[t.categoria_id] ?? 0) + Number(t.importe)
  }

  const porCategoria = categorias.map((c) => {
    const real = realByCategoria[c.id] ?? 0
    const previsto = Number(c.presupuesto_default)
    return {
      categoriaId: c.id,
      nombre: c.nombre,
      icono: c.icono ?? 'circle',
      tipo: c.tipo,
      previsto,
      real,
      porcentaje: previsto > 0 ? real / previsto : 0,
    }
  })

  return {
    saldoInicial: 0,
    totalIngresos,
    totalGastos,
    totalAhorros,
    totalBolsillos,
    totalUsoBolsillo,
    totalCredito,
    totalPagoCredito,
    saldoActual: totalIngresos - totalGastos - totalAhorros - totalBolsillos - totalPagoCredito,
    deudaCreditoAcumulada: originalKPIs.deudaCreditoAcumulada,
    saldoBolsillosAcumulado: originalKPIs.saldoBolsillosAcumulado,
    fechaCorteCredito: originalKPIs.fechaCorteCredito,
    diasParaCorte: originalKPIs.diasParaCorte,
    porCategoria,
  }
}

/* ── Member Filter Chips ── */
function MemberFilter({ members, selected, onChange }: {
  members: { id: string; display_name: string; color_hex: string }[]
  selected: string | null
  onChange: (userId: string | null) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-2)] p-1">
      <button
        onClick={() => onChange(null)}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
          selected === null
            ? 'bg-[var(--surface)] text-[var(--text-1)] shadow-sm'
            : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
        }`}
      >
        Todos
      </button>
      {members.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
            selected === m.id
              ? 'bg-[var(--surface)] shadow-sm'
              : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
          }`}
          style={selected === m.id ? { color: m.color_hex } : undefined}
        >
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: m.color_hex }}
          />
          {m.display_name}
        </button>
      ))}
    </div>
  )
}
