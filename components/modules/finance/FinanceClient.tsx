'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown, Tag, Pencil, Trash2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getActiveQuincena, getQuincenas, updateQuincena } from '@/app/actions/finance/quincenas'
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '@/app/actions/finance/categorias'
import { getTransacciones } from '@/app/actions/finance/transacciones'
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
  const router = useRouter()
  const { members, profile } = useHousehold()

  const [quincenas, setQuincenas] = useState<Quincena[]>([])
  const [active, setActive] = useState<Quincena | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [transacciones, setTransacciones] = useState<TransaccionConCategoria[]>([])
  const [kpis, setKPIs] = useState<FinanceKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const [showAddTx, setShowAddTx] = useState(false)
  const [showNewCategoria, setShowNewCategoria] = useState(false)
  const [showQuincenaSelector, setShowQuincenaSelector] = useState(false)
  const [showCategorias, setShowCategorias] = useState(false)
  const [editingCat, setEditingCat] = useState<Categoria | null>(null)
  const [editingQuincena, setEditingQuincena] = useState<Quincena | null>(null)

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
      // Auto-create current period if needed
      const activeRes = await getActiveQuincena()
      if (activeRes.ok) {
        q = activeRes.data
        // Refresh quincenas list if a new one was auto-created
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Quincena selector */}
      <button
        onClick={() => setShowQuincenaSelector(true)}
        className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-1)]"
      >
        {active.nombre}
        <span className="text-[10px] text-[var(--text-3)]">
          {formatPeriod(active.fecha_inicio, active.fecha_fin)}
        </span>
        <ChevronDown size={14} className="text-[var(--text-3)]" />
      </button>

      {/* KPIs */}
      {kpis && <FinanceKPIPanel kpis={kpis} />}

      {/* Transactions */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]" style={{ '--accent': 'var(--mod-finance)' } as React.CSSProperties}>
            Transacciones
          </p>
        </div>
        <TransaccionList transacciones={transacciones} />
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
            {categorias.length === 0 && (
              <p className="py-3 text-center text-xs text-[var(--text-3)]">Sin categorías. Crea una para empezar.</p>
            )}
            {categorias.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${cat.tipo === 'gasto' ? 'bg-[var(--expense)]' : cat.tipo === 'ingreso' ? 'bg-[var(--income)]' : cat.tipo === 'ahorro' ? 'bg-[var(--info)]' : 'bg-[var(--mod-finance)]'}`} />
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
        categorias={categorias}
        members={members}
        currentUserId={profile?.id}
      />

      <BottomSheet open={showQuincenaSelector} onClose={() => setShowQuincenaSelector(false)} title="Seleccionar quincena">
        <div className="space-y-1">
          {quincenas.map((q) => (
            <div
              key={q.id}
              className={`flex items-center justify-between rounded px-3 py-2.5 transition-colors hover:bg-[var(--surface-2)] ${q.id === active.id ? 'bg-[var(--surface-2)] font-bold' : ''}`}
            >
              <button
                onClick={() => { setShowQuincenaSelector(false); loadData(q.id) }}
                className="flex-1 text-left text-sm"
              >
                <span>{q.nombre}</span>
                <span className="ml-2 text-[10px] text-[var(--text-3)]">
                  {formatPeriod(q.fecha_inicio, q.fecha_fin)}
                </span>
              </button>
              <button
                onClick={() => { setShowQuincenaSelector(false); setEditingQuincena(q) }}
                className="rounded p-1 text-[var(--text-3)] hover:text-[var(--text-1)]"
                title="Editar saldo inicial"
              >
                <Pencil size={12} />
              </button>
            </div>
          ))}
        </div>
      </BottomSheet>

      <NewCategoriaSheet
        open={showNewCategoria}
        onClose={() => setShowNewCategoria(false)}
        onCreated={() => loadData(active?.id)}
        members={members}
      />
      <EditCategoriaSheet
        open={!!editingCat}
        categoria={editingCat}
        onClose={() => setEditingCat(null)}
        onSaved={() => { setEditingCat(null); loadData(active?.id) }}
        members={members}
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
function NewCategoriaSheet({ open, onClose, onCreated, members }: { open: boolean; onClose: () => void; onCreated: () => void; members: { id: string; display_name: string }[] }) {
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
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Agregar categoría'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── Edit Categoría Sheet ── */
function EditCategoriaSheet({ open, categoria, onClose, onSaved, members }: {
  open: boolean; categoria: Categoria | null; onClose: () => void; onSaved: () => void; members: { id: string; display_name: string }[]
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
