'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronDown } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getActiveQuincena, getQuincenas, createQuincena } from '@/app/actions/finance/quincenas'
import { getCategorias, createCategoria } from '@/app/actions/finance/categorias'
import { getTransacciones } from '@/app/actions/finance/transacciones'
import { getFinanceKPIs } from '@/app/actions/finance/dashboard'
import { FinanceKPIPanel } from '@/components/modules/finance/FinanceKPIPanel'
import { TransaccionList } from '@/components/modules/finance/TransaccionList'
import { AddTransaccionSheet } from '@/components/modules/finance/AddTransaccionSheet'
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

  const [quincenas, setQuincenas] = useState<Quincena[]>([])
  const [active, setActive] = useState<Quincena | null>(null)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [transacciones, setTransacciones] = useState<TransaccionConCategoria[]>([])
  const [kpis, setKPIs] = useState<FinanceKPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const [showAddTx, setShowAddTx] = useState(false)
  const [showNewQuincena, setShowNewQuincena] = useState(false)
  const [showNewCategoria, setShowNewCategoria] = useState(false)
  const [showQuincenaSelector, setShowQuincenaSelector] = useState(false)

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
      if (activeRes.ok) q = activeRes.data
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

  // No quincena yet — onboarding
  if (!active) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="text-sm text-[var(--text-2)]">No hay quincenas creadas aún.</p>
        <Button onClick={() => setShowNewQuincena(true)}>Nueva quincena</Button>
        {categorias.length === 0 && (
          <Button variant="secondary" onClick={() => setShowNewCategoria(true)}>
            Crear categorías
          </Button>
        )}
        <NewQuincenaSheet
          open={showNewQuincena}
          onClose={() => setShowNewQuincena(false)}
          onCreated={() => loadData()}
        />
        <NewCategoriaSheet
          open={showNewCategoria}
          onClose={() => setShowNewCategoria(false)}
          onCreated={() => loadData()}
        />
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewCategoria(true)}
              className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              + Categoría
            </button>
          </div>
        </div>
        <TransaccionList transacciones={transacciones} />
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
      />

      <BottomSheet open={showQuincenaSelector} onClose={() => setShowQuincenaSelector(false)} title="Seleccionar quincena">
        <div className="space-y-1">
          {quincenas.map((q) => (
            <button
              key={q.id}
              onClick={() => { setShowQuincenaSelector(false); loadData(q.id) }}
              className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-2)] ${q.id === active.id ? 'bg-[var(--surface-2)] font-bold' : ''}`}
            >
              <span>{q.nombre}</span>
              <span className="text-[10px] text-[var(--text-3)]">
                {formatPeriod(q.fecha_inicio, q.fecha_fin)}
              </span>
            </button>
          ))}
          <button
            onClick={() => { setShowQuincenaSelector(false); setShowNewQuincena(true) }}
            className="mt-2 flex w-full items-center gap-2 rounded px-3 py-2.5 text-sm text-[var(--mod-finance)] hover:bg-[var(--surface-2)]"
          >
            <Plus size={14} /> Nueva quincena
          </button>
        </div>
      </BottomSheet>

      <NewQuincenaSheet
        open={showNewQuincena}
        onClose={() => setShowNewQuincena(false)}
        onCreated={() => loadData()}
      />
      <NewCategoriaSheet
        open={showNewCategoria}
        onClose={() => setShowNewCategoria(false)}
        onCreated={() => loadData()}
      />
    </div>
  )
}

/* ── New Quincena Sheet ── */
function NewQuincenaSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)

    const result = await createQuincena(new FormData(e.currentTarget))
    setPending(false)

    if (!result.ok) { setError(result.error); return }
    onCreated()
    onClose()
  }

  // Compute default dates (1-15 or 16-end of month)
  const today = new Date()
  const day = today.getDate()
  const y = today.getFullYear()
  const m = today.getMonth()
  const defaultStart = day <= 15
    ? new Date(y, m, 1).toISOString().split('T')[0]
    : new Date(y, m, 16).toISOString().split('T')[0]
  const defaultEnd = day <= 15
    ? new Date(y, m, 15).toISOString().split('T')[0]
    : new Date(y, m + 1, 0).toISOString().split('T')[0]

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva quincena">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Nombre</label>
          <input name="nombre" required defaultValue={`Quincena ${day <= 15 ? '1ra' : '2da'}`} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Inicio</label>
            <input name="fecha_inicio" type="date" required defaultValue={defaultStart} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Fin</label>
            <input name="fecha_fin" type="date" required defaultValue={defaultEnd} className="w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Saldo inicial</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="saldo_inicial" type="number" min="0" required className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Crear quincena'}
        </Button>
      </form>
    </BottomSheet>
  )
}

/* ── New Categoría Sheet ── */
function NewCategoriaSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
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
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">Presupuesto default</label>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-[var(--text-3)]">$</span>
            <input name="presupuesto_default" type="number" min="0" defaultValue="0" className="num w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--text-1)]" />
          </div>
        </div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creando...' : 'Agregar categoría'}
        </Button>
      </form>
    </BottomSheet>
  )
}
