'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

import { getActiveQuincena, getQuincenas, ensureQuincena, updateQuincena } from '@/app/actions/finance/quincenas'
import { getCategorias, createCategoria, deleteCategoria, updateCategoria } from '@/app/actions/finance/categorias'
import { getTransacciones, createTransaccion, updateTransaccion, deleteTransaccion } from '@/app/actions/finance/transacciones'
import { getFinanceKPIs } from '@/app/actions/finance/dashboard'
import { getBudgetItems, markBudgetItemPaid, createBudgetItem, updateBudgetItem, deleteBudgetItem } from '@/app/actions/finance/budget_items'
import type { BudgetItem } from '@/app/actions/finance/budget_items'
import { resetFinanceData } from '@/app/actions/finance/reset'
import { AddTransaccionSheet } from '@/components/modules/finance/AddTransaccionSheet'
import { BottomSheet } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useHousehold } from '@/hooks/useHousehold'
import { formatCOP, formatPeriod, formatDateShort } from '@/lib/utils/format'
import type {
  Quincena, Categoria, TransaccionConCategoria, FinanceKPIs,
} from '@/lib/types/modules.types'

type Tab = 'resumen' | 'presupuesto' | 'transacciones'

/* ─ colour/icon maps for transaction types ─ */
const TX_COLOR: Record<string, string> = {
  gasto: 'var(--r)', ingreso: 'var(--g)',
  ahorro: 'var(--y)', retiro_ahorro: 'var(--y)',
  bolsillo: 'var(--bl)', uso_bolsillo: 'var(--bl)',
  credito: 'var(--pu)', pago_credito: 'var(--pu)',
}
const TX_ICON: Record<string, string> = {
  gasto: '▽', ingreso: '△',
  ahorro: '⊙→', retiro_ahorro: '←⊙',
  bolsillo: '◧→', uso_bolsillo: '←◧',
  credito: '▣', pago_credito: '↕▣',
}
const TX_SIGN: Record<string, string> = {
  gasto: '−', ingreso: '+',
  ahorro: '−', retiro_ahorro: '+',
  bolsillo: '−', uso_bolsillo: '+',
  credito: '+', pago_credito: '−',
}
const TX_CLASS: Record<string, string> = {
  gasto: 'exp', ingreso: 'inc',
  ahorro: 'sav', retiro_ahorro: 'sav',
  bolsillo: 'xfr', uso_bolsillo: 'xfr',
  credito: 'crd', pago_credito: 'crd',
}

const FREQ_LABEL: Record<string, string> = {
  all: 'Siempre', first: '1ra 15na', second: '2da 15na', once: 'Unica vez',
}
const FREQ_TAG_CLASS: Record<string, string> = {
  all: 'all', first: 'first', second: 'second', once: 'once',
}

export function FinanceClient() {
  const { members, profile } = useHousehold()

  const [quincenas, setQuincenas]       = useState<Quincena[]>([])
  const [active, setActive]             = useState<Quincena | null>(null)
  const [categorias, setCategorias]     = useState<Categoria[]>([])
  const [transacciones, setTransacciones] = useState<TransaccionConCategoria[]>([])
  const [kpis, setKPIs]                 = useState<FinanceKPIs | null>(null)
  const [budgetItems, setBudgetItems]   = useState<BudgetItem[]>([])
  const [loading, setLoading]           = useState(true)

  const [tab, setTab]                   = useState<Tab>('resumen')
  const [filterUserId, setFilterUserId] = useState<string | null>(null)

  const [txFecha, setTxFecha]                 = useState(() => new Date().toISOString().split('T')[0])
  const [showAddTx, setShowAddTx]             = useState(false)
  const [editingTx, setEditingTx]             = useState<TransaccionConCategoria | null>(null)
  const [editingQuincena, setEditingQuincena] = useState<Quincena | null>(null)
  const [showNewBudget, setShowNewBudget]     = useState(false)
  const [showNewCat, setShowNewCat]           = useState(false)
  const [editingCat, setEditingCat]           = useState<Categoria | null>(null)
  const [editingBudget, setEditingBudget]     = useState<BudgetItem | null>(null)
  const [payingBudget, setPayingBudget]       = useState<{ item: BudgetItem; categoriaId?: string } | null>(null)
  const [showReset, setShowReset]             = useState(false)

  /* ── load all data ── */
  const loadData = useCallback(async (quincenaId?: string) => {
    const [qRes, catRes, biRes] = await Promise.all([
      getQuincenas(),
      getCategorias(),
      getBudgetItems(),
    ])
    if (qRes.ok) setQuincenas(qRes.data)
    if (catRes.ok) setCategorias(catRes.data)
    if (biRes.ok) setBudgetItems(biRes.data)

    let q: Quincena | null = null
    if (quincenaId && qRes.ok) q = qRes.data.find((x) => x.id === quincenaId) ?? null
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

  /* ── navigate quincena ── */
  const navigateToPeriod = useCallback(async (year: number, month: number, half: 1 | 2) => {
    const res = await ensureQuincena(year, month, half)
    if (!res.ok || !res.data) return
    const refreshed = await getQuincenas()
    if (refreshed.ok) setQuincenas(refreshed.data)
    setActive(res.data)
    const [txRes, kpiRes] = await Promise.all([
      getTransacciones(res.data.id),
      getFinanceKPIs(res.data.id),
    ])
    if (txRes.ok) setTransacciones(txRes.data)
    if (kpiRes.ok) setKPIs(kpiRes.data)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  /* ── realtime ── */
  useEffect(() => {
    if (!active) return
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const ch = supabase
      .channel('finance-tx')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacciones', filter: `quincena_id=eq.${active.id}` },
        () => loadData(active.id))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [active, loadData])

  /* ── skeleton ── */
  if (loading) {
    return (
      <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[120, 80, 160, 80].map((h, i) => (
          <div key={i} className="animate-pulse" style={{ height: h, background: 'var(--s2)', borderRadius: 'var(--rm)' }} />
        ))}
      </div>
    )
  }

  if (!active) {
    return <p style={{ padding: 'var(--pad)', color: 'var(--t3)', fontSize: '.87em' }}>Cargando quincena...</p>
  }

  const activeHalf: 1 | 2 = new Date(active.fecha_inicio + 'T12:00:00').getDate() === 1 ? 1 : 2

  const filteredTx = filterUserId
    ? transacciones.filter((t) => t.user_id === filterUserId)
    : transacciones

  const filteredKpis: FinanceKPIs | null = filterUserId && kpis
    ? computeFilteredKPIs(filteredTx, categorias, kpis, filterUserId)
    : kpis

  const filteredCats = categorias

  // Budget items that have a linked category — their "Pagar" is handled from the category row
  const linkedBudgetItemIds = new Set(categorias.filter(c => c.budget_item_id).map(c => c.budget_item_id!))

  const saldo    = filteredKpis?.saldoActual ?? 0
  const ingresos = filteredKpis?.totalIngresos ?? 0
  const gastos   = filteredKpis?.totalGastos ?? 0
  const ahorro   = filteredKpis?.totalAhorros ?? 0
  const credito  = filteredKpis?.deudaCreditoAcumulada ?? 0
  const bolsillos = filteredKpis?.saldoBolsillosAcumulado ?? 0
  const pct      = ingresos > 0 ? Math.min(gastos / ingresos, 1) : 0
  const circ     = 2 * Math.PI * 40
  const dashOff  = circ * (1 - pct)

  /* ── date parse for navigator ── */
  const [y, m, d] = active.fecha_inicio.split('-').map(Number)
  const half: 1 | 2 = d === 1 ? 1 : 2

  function goPrev() {
    if (half === 1) navigateToPeriod(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1, 2)
    else navigateToPeriod(y, m, 1)
  }
  function goNext() {
    if (half === 2) navigateToPeriod(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1)
    else navigateToPeriod(y, m, 2)
  }

  /* ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Module tabs ── */}
      <div style={{ background: 'var(--s1)', borderBottom: '1px solid var(--b1)', padding: '0 var(--pad)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', height: 44, alignItems: 'flex-end' }}>
          {(['resumen', 'presupuesto', 'transacciones'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                position: 'relative', padding: '0 16px', height: '100%',
                display: 'flex', alignItems: 'center',
                fontSize: '.78em', fontWeight: 800, cursor: 'pointer',
                whiteSpace: 'nowrap', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '.06em',
                color: tab === t ? 'var(--y)' : 'var(--t3)',
                borderBottom: `2.5px solid ${tab === t ? 'var(--y)' : 'transparent'}`,
                transition: 'color .13s, border-color .13s',
                background: 'none',
              }}
            >
              { { resumen: 'Resumen', presupuesto: 'Presupuesto', transacciones: 'Transacc.' }[t] }
            </button>
          ))}
        </div>
      </div>

      {/* ── Qbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px var(--pad)', background: 'var(--s1)', borderBottom: '1px solid var(--b1)' }}>
        <span style={{ fontSize: '.65em', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.10em', flexShrink: 0 }}>Quincena</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
          <button onClick={goPrev} style={{ width: 26, height: 26, borderRadius: 'var(--rs)', background: 'var(--s2)', border: '1px solid var(--b1)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9em', fontWeight: 700, flexShrink: 0, cursor: 'pointer' }}>‹</button>
          <button onClick={() => setEditingQuincena(active)} style={{ fontSize: '.82em', fontWeight: 800, color: 'var(--t1)', flex: 1, textAlign: 'center', cursor: 'pointer', background: 'none' }}>
            {formatPeriod(active.fecha_inicio, active.fecha_fin)}
          </button>
          <button onClick={goNext} style={{ width: 26, height: 26, borderRadius: 'var(--rs)', background: 'var(--s2)', border: '1px solid var(--b1)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9em', fontWeight: 700, flexShrink: 0, cursor: 'pointer' }}>›</button>
        </div>
        {active.is_active && (
          <span style={{ fontSize: '.65em', fontWeight: 900, background: 'var(--y)', color: 'var(--yt)', padding: '2px 8px', borderRadius: 'var(--rs)', textTransform: 'uppercase', letterSpacing: '.04em', flexShrink: 0 }}>
            Activa
          </span>
        )}
        {/* Member pills */}
        {members.length > 1 && (
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {[{ id: null, label: 'Todos' }, ...members.map((m) => ({ id: m.id, label: m.display_name.charAt(0) }))].map((item) => (
              <button
                key={item.id ?? 'all'}
                onClick={() => setFilterUserId(item.id)}
                style={{
                  padding: '4px 10px', borderRadius: 'var(--rs)',
                  fontSize: '.7em', fontWeight: 800,
                  background: filterUserId === item.id ? 'var(--y)' : 'var(--s2)',
                  border: `1px solid ${filterUserId === item.id ? 'var(--y)' : 'var(--b1)'}`,
                  color: filterUserId === item.id ? 'var(--yt)' : 'var(--t3)',
                  cursor: 'pointer', transition: 'all .12s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab content ── */}
      <div style={{ padding: 'var(--pad)', display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 96 }}>

        {/* ════════ RESUMEN ════════ */}
        {tab === 'resumen' && (
          <>
            {/* KPI row: gauge + cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 12, alignItems: 'start' }}>
              {/* Gauge */}
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rl)', padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', width: 90, height: 90 }}>
                  <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="45" cy="45" r="40" fill="none" stroke="var(--s3)" strokeWidth="8" />
                    <circle cx="45" cy="45" r="40" fill="none"
                      stroke={pct > 0.9 ? 'var(--r)' : 'var(--y)'}
                      strokeWidth="8" strokeLinecap="square"
                      strokeDasharray={circ} strokeDashoffset={dashOff}
                      style={{ filter: 'drop-shadow(0 0 5px rgba(236,199,0,.4))' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="num" style={{ fontSize: '1.2em', fontWeight: 900, color: pct > 0.9 ? 'var(--r)' : 'var(--y)', lineHeight: 1 }}>{Math.round(pct * 100)}%</span>
                    <span style={{ fontSize: '.58em', fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>ejec.</span>
                  </div>
                </div>
                <span style={{ fontSize: '.65em', fontWeight: 900, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.10em' }}>Presupuesto</span>
              </div>

              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                <KPICard cls="g" label="Saldo" value={formatCOP(saldo)} delta={`de ${formatCOP(ingresos)}`} />
                <KPICard cls="y" label="Ahorro" value={formatCOP(ahorro)} delta="colchon" />
                <KPICard cls="pu" label="Credito" value={formatCOP(credito)} delta={`+${formatCOP(filteredKpis?.totalCredito ?? 0)}`} />
              </div>
            </div>

            {/* Container cards */}
            <div>
              <div className="zdivider"><span className="zdivider-star">◆</span><span className="zdivider-label">Contenedores</span><span className="zdivider-line" /></div>
              <div className="cstrip-wrap">
                <div className="cstrip">
                  <ContainerCard type="cuenta"   icon="$" label="Cuenta"   amount={saldo}    sub="disponible" delta={formatCOP(-gastos)} />
                  <ContainerCard type="ahorro"   icon="⊙" label="Ahorro"   amount={ahorro}   sub="colchon"    delta={`+${formatCOP(filteredKpis?.totalAhorros ?? 0)}`} />
                  <ContainerCard type="credito"  icon="▣" label="Credito"  amount={credito}  sub="deuda"      delta={`+${formatCOP(filteredKpis?.totalCredito ?? 0)}`} />
                  <ContainerCard type="bolsillo" icon="◧" label="Bolsillos" amount={bolsillos} sub={`${categorias.filter(c=>c.tipo==='bolsillo').length} activos`} delta="acum." />
                </div>
              </div>
            </div>

            {/* Presupuesto + Recientes — dos columnas en desktop */}
            <div className="fin-two-col">
              {/* Presupuesto */}
              <div>
                <div className="zdivider">
                  <span className="zdivider-star">◆</span>
                  <span className="zdivider-label">Presupuesto</span>
                  <span className="zdivider-line" />
                  <button onClick={() => setTab('presupuesto')} style={{ fontSize: '.7em', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver todo</button>
                </div>
                {budgetItems.length === 0 ? (
                  <p style={{ fontSize: '.8em', color: 'var(--t3)', padding: '12px 0' }}>Sin items de presupuesto</p>
                ) : (
                  <BudgetList
                    items={budgetItems.slice(0, 6)}
                    linkedBudgetItemIds={linkedBudgetItemIds}
                    members={members}
                    filterUserId={filterUserId}
                    onToggle={(item) => setPayingBudget({ item })}
                    onEdit={(item) => setEditingBudget(item)}
                    onDelete={async (id) => {
                      if (!confirm('Eliminar este item?')) return
                      await deleteBudgetItem(id)
                      loadData(active!.id)
                    }}
                  />
                )}
              </div>

              {/* Recientes */}
              <div>
                <div className="zdivider">
                  <span className="zdivider-star">◆</span>
                  <span className="zdivider-label">Recientes</span>
                  <span className="zdivider-line" />
                  <button onClick={() => setTab('transacciones')} style={{ fontSize: '.7em', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.06em', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Ver todas</button>
                </div>
                <TxList txs={filteredTx.slice(0, 6)} members={members} onEdit={setEditingTx} />
              </div>
            </div>

            {/* Zona de peligro */}
            <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--b1)' }}>
              <button
                onClick={() => setShowReset(true)}
                style={{
                  fontSize: '.7em', fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase',
                  letterSpacing: '.08em', background: 'none', cursor: 'pointer', border: 'none',
                  padding: 0, transition: 'color .13s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--r)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
              >
                ⚠ Vaciar datos de finanzas
              </button>
            </div>
          </>
        )}

        {/* ════════ PRESUPUESTO ════════ */}
        {tab === 'presupuesto' && (
          <div className="fin-two-col">
            {/* Budget items */}
            <div>
              <div className="zdivider">
                <span className="zdivider-star">◆</span>
                <span className="zdivider-label">Presupuesto</span>
                <span className="zdivider-line" />
                <button onClick={() => setShowNewBudget(true)} className="zbtn" style={{ padding: '4px 10px', fontSize: '.7em' }}>+ Item</button>
              </div>
              <BudgetList items={budgetItems} linkedBudgetItemIds={linkedBudgetItemIds} members={members} filterUserId={filterUserId} onToggle={(item) => setPayingBudget({ item })} onEdit={(item) => setEditingBudget(item)} onDelete={async (id) => {
                if (!confirm('Eliminar este item?')) return
                await deleteBudgetItem(id)
                loadData(active.id)
              }} />
              {budgetItems.length === 0 && (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: '.82em', color: 'var(--t3)', marginBottom: 12 }}>Sin items de presupuesto. Crea el primero:</p>
                  <button className="zbtn primary" onClick={() => setShowNewBudget(true)} style={{ padding: '8px 20px' }}>+ Agregar item</button>
                </div>
              )}
            </div>

            {/* Categories management */}
            <div>
              <div className="zdivider">
                <span className="zdivider-star">◆</span>
                <span className="zdivider-label">Categorias</span>
                <span className="zdivider-line" />
                <button onClick={() => setShowNewCat(true)} className="zbtn" style={{ padding: '4px 10px', fontSize: '.7em' }}>+ Cat.</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {categorias.map((cat) => {
                  const linkedItem = cat.budget_item_id ? budgetItems.find(b => b.id === cat.budget_item_id) : null
                  return (
                    <div key={cat.id} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: TX_COLOR[cat.tipo] ?? 'var(--t3)' }} />
                      <span style={{ fontSize: '.87em', fontWeight: 700, color: 'var(--t1)', flex: 1 }}>{cat.nombre}</span>
                      {cat.presupuesto_default > 0 && (
                        <span className="num" style={{ fontSize: '.75em', color: 'var(--t3)' }}>{formatCOP(cat.presupuesto_default)}</span>
                      )}
                      {cat.quincena_half && (
                        <span className={`ztag ${cat.quincena_half === 1 ? 'first' : 'second'}`}>{cat.quincena_half === 1 ? '1ra 15na' : '2da 15na'}</span>
                      )}
                      {cat.is_salary && <span className="ztag all">Salario</span>}
                      {linkedItem && (
                        <button
                          className={`zbtn-go ${linkedItem.status === 'paid' ? 'done' : ''}`}
                          onClick={() => linkedItem.status !== 'paid' && setPayingBudget({ item: linkedItem, categoriaId: cat.id })}
                        >
                          {linkedItem.status === 'paid' ? 'Pagado' : 'Pagar'}
                        </button>
                      )}
                      <button onClick={() => setEditingCat(cat)} style={{ background: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 4 }}><Pencil size={12} /></button>
                      <button onClick={async () => {
                        if (!confirm(`Eliminar "${cat.nombre}"?`)) return
                        await deleteCategoria(cat.id)
                        loadData(active.id)
                      }} style={{ background: 'none', color: 'var(--t3)', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════ TRANSACCIONES ════════ */}
        {tab === 'transacciones' && (
          <div>
            <div className="zdivider">
              <span className="zdivider-star">◆</span>
              <span className="zdivider-label">Transacciones ({filteredTx.length})</span>
              <span className="zdivider-line" />
            </div>
            <TxList txs={filteredTx} members={members} onEdit={setEditingTx} />
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setShowAddTx(true)}
        style={{
          position: 'fixed', bottom: 80,
          right: 16, zIndex: 20,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '11px 20px', borderRadius: 'var(--rm)',
          background: 'var(--y)', color: 'var(--yt)',
          fontSize: '.85em', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.06em',
          boxShadow: '0 4px 22px rgba(236,199,0,.45)',
          transition: 'opacity .13s, transform .13s',
          cursor: 'pointer',
        }}
        className="sm:bottom-6! sm:right-6!"
        aria-label="Nueva transaccion"
      >
        <Plus size={16} strokeWidth={2.5} />
        Nueva
      </button>

      {/* ── Sheets ── */}
      <AddTransaccionSheet
        open={showAddTx}
        onClose={() => { setShowAddTx(false); loadData(active.id) }}
        quincenaId={active.id}
        categorias={filteredCats}
        members={members}
        currentUserId={profile?.id}
        fecha={txFecha}
        onFechaChange={setTxFecha}
      />

      {editingTx && (
        <EditTxSheet
          tx={editingTx}
          categorias={filteredCats}
          members={members}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); loadData(active.id) }}
          onDeleted={() => { setEditingTx(null); loadData(active.id) }}
        />
      )}

      <EditQuincenaSheet
        open={!!editingQuincena}
        quincena={editingQuincena}
        members={members}
        onClose={() => setEditingQuincena(null)}
        onSaved={() => { setEditingQuincena(null); loadData(editingQuincena?.id) }}
      />

      <NewBudgetItemSheet
        open={showNewBudget}
        onClose={() => setShowNewBudget(false)}
        onCreated={() => { setShowNewBudget(false); loadData(active.id) }}
        activeHalf={activeHalf}
        quincenaId={active.id}
        members={members}
      />

      <NewCategoriaSheet
        open={showNewCat}
        onClose={() => setShowNewCat(false)}
        onCreated={() => loadData(active.id)}
        members={members}
        activeHalf={activeHalf}
      />

      {editingCat && (
        <EditCategoriaSheet
          categoria={editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => { setEditingCat(null); loadData(active.id) }}
          members={members}
          budgetItems={budgetItems}
          activeHalf={activeHalf}
        />
      )}

      {editingBudget && (
        <EditBudgetItemSheet
          item={editingBudget}
          members={members}
          onClose={() => setEditingBudget(null)}
          onSaved={() => { setEditingBudget(null); loadData(active.id) }}
        />
      )}

      {payingBudget && active && (
        <PayBudgetSheet
          item={payingBudget.item}
          categoriaId={payingBudget.categoriaId}
          quincenaId={active.id}
          members={members}
          currentUserId={profile?.id}
          onClose={() => setPayingBudget(null)}
          onPaid={() => { setPayingBudget(null); loadData(active.id) }}
        />
      )}

      <ResetFinanceSheet
        open={showReset}
        onClose={() => setShowReset(false)}
        onReset={() => { setShowReset(false); loadData() }}
      />
    </>
  )
}

/* ══ SUB-COMPONENTS ═══════════════════════════════════════ */

function KPICard({ cls, label, value, delta }: { cls: 'g' | 'y' | 'pu'; label: string; value: string; delta: string }) {
  const colors: Record<string, string> = { g: 'var(--g)', y: 'var(--y)', pu: 'var(--pu)' }
  const c = colors[cls]
  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)', padding: 12, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c }} />
      <span style={{ fontSize: '.62em', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.10em', color: 'var(--t3)' }}>{label}</span>
      <span className="num" style={{ fontSize: '1.05em', fontWeight: 900, letterSpacing: '-.04em', lineHeight: 1.1, color: c }}>{value}</span>
      <span style={{ fontSize: '.66em', fontWeight: 600, color: 'var(--t3)' }}>{delta}</span>
    </div>
  )
}

function ContainerCard({ type, icon, label, amount, sub, delta }: {
  type: 'cuenta' | 'ahorro' | 'credito' | 'bolsillo'
  icon: string; label: string; amount: number; sub: string; delta: string
}) {
  const colors: Record<string, string> = { cuenta: 'var(--g)', ahorro: 'var(--y)', credito: 'var(--pu)', bolsillo: 'var(--bl)' }
  const bgs: Record<string, string>    = { cuenta: 'var(--g0)', ahorro: 'var(--y0)', credito: 'var(--p0)', bolsillo: 'var(--b0c)' }
  const c = colors[type]
  return (
    <div style={{ flexShrink: 0, minWidth: 148, background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rl)', padding: 14, position: 'relative', overflow: 'hidden', transition: 'border-color .15s, background .15s', cursor: 'pointer' }}>
      <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: c, borderRadius: 'var(--rl) var(--rl) 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 'var(--rs)', background: bgs[type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05em', color: c }}>
          {icon}
        </div>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
      </div>
      <div style={{ fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4, color: c }}>{label}</div>
      <div className="num" style={{ fontSize: '1.05em', fontWeight: 900, letterSpacing: '-.04em', color: 'var(--t1)' }}>
        <span style={{ fontSize: '.65em', fontWeight: 700, color: 'var(--t3)', fontStyle: 'normal', marginRight: 1 }}>$</span>
        {Math.abs(amount).toLocaleString('es-CO')}
      </div>
      <div style={{ fontSize: '.7em', color: 'var(--t3)', fontWeight: 600, marginTop: 3 }}>{sub}</div>
      <div style={{ display: 'inline-block', marginTop: 10, padding: '2px 8px', borderRadius: 'var(--rs)', fontSize: '.66em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', background: bgs[type], color: c }}>{delta}</div>
    </div>
  )
}

function TxList({ txs, members, onEdit }: { txs: TransaccionConCategoria[]; members: { id: string; display_name: string; color_hex: string }[]; onEdit: (t: TransaccionConCategoria) => void }) {
  if (txs.length === 0) return <p style={{ padding: '24px 0', textAlign: 'center', fontSize: '.82em', color: 'var(--t3)' }}>Sin transacciones</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {txs.map((t) => {
        const cls = TX_CLASS[t.tipo] ?? 'exp'
        const c   = TX_COLOR[t.tipo] ?? 'var(--r)'
        const icon = TX_ICON[t.tipo] ?? '▽'
        const sign = TX_SIGN[t.tipo] ?? '−'
        const member = members.find((m) => m.id === t.user_id)
        return (
          <button
            key={t.id}
            onClick={() => onEdit(t)}
            style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 11, cursor: 'pointer', transition: 'background .12s, border-color .12s', textAlign: 'left', width: '100%' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.borderColor = 'var(--b2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--s1)'; e.currentTarget.style.borderColor = 'var(--b1)' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 'var(--rs)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05em', flexShrink: 0, background: `color-mix(in srgb, ${c} 12%, transparent)`, color: c }}>
              {icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.87em', fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.descripcion || t.categorias?.nombre || 'Transaccion'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '.7em', fontWeight: 600, color: 'var(--t3)', marginTop: 2 }}>
                {member && <span style={{ width: 5, height: 5, borderRadius: '50%', background: member.color_hex, flexShrink: 0 }} />}
                <span>{member?.display_name} · {formatDateShort(t.fecha)}</span>
                {t.categorias?.nombre && <span>· {t.categorias.nombre}</span>}
              </div>
            </div>
            <span className="num" style={{ fontSize: '.9em', fontWeight: 900, letterSpacing: '-.02em', flexShrink: 0, color: c }}>
              {sign}{formatCOP(t.importe)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function BudgetList({ items, linkedBudgetItemIds, members, filterUserId, onToggle, onEdit, onDelete }: {
  items: BudgetItem[]
  linkedBudgetItemIds: Set<string>
  members: { id: string; display_name: string; color_hex: string }[]
  filterUserId: string | null
  onToggle: (item: BudgetItem) => void
  onEdit: (item: BudgetItem) => void
  onDelete: (id: string) => void
}) {
  const visibleItems = filterUserId
    ? items.filter(i => !i.assigned_to || i.assigned_to === filterUserId)
    : items

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {visibleItems.map((item) => {
        const hasLinkedCat = linkedBudgetItemIds.has(item.id)
        const assignedMember = item.assigned_to ? members.find(m => m.id === item.assigned_to) : null
        return (
        <div key={item.id} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)', overflow: 'hidden', transition: 'border-color .12s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
            {/* Status checkbox */}
            <div
              onClick={() => item.status !== 'paid' && !hasLinkedCat && onToggle(item)}
              style={{
                width: 20, height: 20, borderRadius: 'var(--rs)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '.72em', fontWeight: 900, cursor: hasLinkedCat ? 'default' : 'pointer',
                ...(item.status === 'paid'
                  ? { background: 'var(--g1)', border: '1px solid var(--g)', color: 'var(--g)' }
                  : { border: '1px solid var(--b1)' }),
              }}
            >
              {item.status === 'paid' ? '✓' : ''}
            </div>

            {/* Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <span className={`ztag ${FREQ_TAG_CLASS[item.frequency]}`}>{FREQ_LABEL[item.frequency]}</span>
                {assignedMember && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: assignedMember.color_hex, flexShrink: 0 }} title={assignedMember.display_name} />
                )}
                <span style={{ fontSize: '.87em', fontWeight: 800, color: 'var(--t1)' }}>{item.name}</span>
              </div>
              {item.due_day && (
                <span style={{ fontSize: '.7em', color: 'var(--t3)', fontWeight: 600 }}>Dia {item.due_day}</span>
              )}
            </div>

            {/* Amount + actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div className="num" style={{ fontSize: '.88em', fontWeight: 900, color: 'var(--t1)' }}>
                {formatCOP(item.amount_planned)}
              </div>
              <button
                className="icon-btn"
                onClick={() => onEdit(item)}
                title="Editar"
              >
                <Pencil size={12} strokeWidth={2} />
              </button>
              <button
                className="icon-btn"
                onClick={() => onDelete(item.id)}
                title="Eliminar"
                style={{ color: 'var(--r)' }}
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
        )
      })}
    </div>
  )
}

/* ══ INLINE SHEETS ════════════════════════════════════════ */

function NewBudgetItemSheet({ open, onClose, onCreated, activeHalf, quincenaId, members }: { open: boolean; onClose: () => void; onCreated: () => void; activeHalf: 1 | 2; quincenaId: string; members: { id: string; display_name: string }[] }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const fd = new FormData(e.currentTarget)
    const freq = fd.get('frequency') as string
    if (freq === 'once') fd.set('quincena_id', quincenaId)
    const res = await createBudgetItem(fd)
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onCreated()
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo item de presupuesto">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <p style={{ fontSize: '.82em', color: 'var(--r)' }}>{error}</p>}
        <FieldLabel label="Nombre"><input name="name" required className="zinput" placeholder="Ej: Arriendo" /></FieldLabel>
        <FieldLabel label="Frecuencia">
          <select name="frequency" defaultValue="all" className="zinput">
            <option value="all">Siempre (ambas quincenas)</option>
            <option value="first">Solo 1ra quincena</option>
            <option value="second">Solo 2da quincena</option>
            <option value="once">Unica vez</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Monto previsto">
          <input name="amount_planned" type="number" min="0" defaultValue="0" className="zinput num" />
        </FieldLabel>
        <FieldLabel label="Dia de vencimiento (opcional)">
          <input name="due_day" type="number" min="1" max="31" className="zinput" placeholder="Ej: 5" />
        </FieldLabel>
        {members.length > 1 && (
          <FieldLabel label="Asignar a">
            <select name="assigned_to" className="zinput">
              <option value="">Compartido</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </FieldLabel>
        )}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creando...' : 'Agregar'}</Button>
      </form>
    </BottomSheet>
  )
}

function NewCategoriaSheet({ open, onClose, onCreated, members, activeHalf }: { open: boolean; onClose: () => void; onCreated: () => void; members: { id: string; display_name: string }[]; activeHalf: 1 | 2 }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const res = await createCategoria(new FormData(e.currentTarget))
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onCreated();
    (e.currentTarget as HTMLFormElement).reset()
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva categoria">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <p style={{ fontSize: '.82em', color: 'var(--r)' }}>{error}</p>}
        <FieldLabel label="Nombre"><input name="nombre" required className="zinput" placeholder="Ej: Mercado" /></FieldLabel>
        <FieldLabel label="Tipo">
          <select name="tipo" required className="zinput">
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
            <option value="ahorro">Ahorro</option>
            <option value="bolsillo">Bolsillo</option>
            <option value="credito">Credito</option>
            <option value="pago_credito">Pago credito</option>
            <option value="uso_bolsillo">Uso bolsillo</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Presupuesto">
          <input name="presupuesto_default" type="number" min="0" defaultValue="0" className="zinput num" />
        </FieldLabel>
        <FieldLabel label="Asignar a">
          <select name="assigned_to" className="zinput">
            <option value="">Compartida</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel label="Quincena">
          <select name="quincena_half" defaultValue={String(activeHalf)} className="zinput">
            <option value="">Ambas</option>
            <option value="1">Solo 1ra</option>
            <option value="2">Solo 2da</option>
          </select>
        </FieldLabel>
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Creando...' : 'Agregar'}</Button>
      </form>
    </BottomSheet>
  )
}

function EditCategoriaSheet({ categoria, onClose, onSaved, members, budgetItems, activeHalf }: {
  categoria: Categoria; onClose: () => void; onSaved: () => void
  members: { id: string; display_name: string }[]
  budgetItems: BudgetItem[]
  activeHalf: 1 | 2
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const fd = new FormData(e.currentTarget)
    // is_salary checkbox — FormData omits unchecked checkboxes
    if (!fd.has('is_salary')) fd.set('is_salary', 'false')
    const res = await updateCategoria(categoria.id, fd)
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onSaved()
  }
  return (
    <BottomSheet open onClose={onClose} title="Editar categoria">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <p style={{ fontSize: '.82em', color: 'var(--r)' }}>{error}</p>}
        <FieldLabel label="Nombre"><input name="nombre" required defaultValue={categoria.nombre} className="zinput" /></FieldLabel>
        <FieldLabel label="Presupuesto">
          <input name="presupuesto_default" type="number" min="0" defaultValue={categoria.presupuesto_default} className="zinput num" />
        </FieldLabel>
        <FieldLabel label="Asignar a">
          <select name="assigned_to" defaultValue={categoria.assigned_to ?? ''} className="zinput">
            <option value="">Compartida</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel label="Quincena">
          <select name="quincena_half" defaultValue={categoria.quincena_half != null ? String(categoria.quincena_half) : ''} className="zinput">
            <option value="">Ambas</option>
            <option value="1">Solo 1ra</option>
            <option value="2">Solo 2da</option>
          </select>
        </FieldLabel>

        {/* Ingreso: marcar como salario */}
        {categoria.tipo === 'ingreso' && (
          <FieldLabel label="Es salario">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="is_salary"
                value="true"
                defaultChecked={categoria.is_salary}
                style={{ width: 16, height: 16, accentColor: 'var(--y)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '.82em', fontWeight: 700, color: 'var(--t2)' }}>
                Al registrar activa recargas automáticas de bolsillos
              </span>
            </label>
          </FieldLabel>
        )}

        {/* Gasto: vincular a budget item */}
        {(categoria.tipo === 'gasto' || categoria.tipo === 'pago_credito') && (
          <FieldLabel label="Vincular a presupuesto">
            <select name="budget_item_id" defaultValue={categoria.budget_item_id ?? ''} className="zinput">
              <option value="">Sin vincular</option>
              {budgetItems.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FieldLabel>
        )}

        {/* Bolsillo: recarga automática */}
        {categoria.tipo === 'bolsillo' && (
          <>
            <FieldLabel label="Recarga automática al salario de">
              <select name="auto_recharge_user_id" defaultValue={categoria.auto_recharge_user_id ?? ''} className="zinput">
                <option value="">Desactivada</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
              </select>
            </FieldLabel>
            <FieldLabel label="Monto a recargar">
              <input
                name="auto_recharge_amount"
                type="number" min="0"
                defaultValue={categoria.auto_recharge_amount ?? ''}
                placeholder="0"
                className="zinput num"
              />
            </FieldLabel>
          </>
        )}

        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Guardando...' : 'Guardar'}</Button>
      </form>
    </BottomSheet>
  )
}

function EditTxSheet({ tx, categorias, members, onClose, onSaved, onDeleted }: {
  tx: TransaccionConCategoria; categorias: Categoria[]; members: { id: string; display_name: string }[];
  onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const res = await updateTransaccion(tx.id, new FormData(e.currentTarget))
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onSaved()
  }
  const TIPOS = ['gasto','ingreso','ahorro','bolsillo','credito','pago_credito','uso_bolsillo'] as const
  const TIPO_LABELS: Record<string, string> = { gasto:'Gasto', ingreso:'Ingreso', ahorro:'Ahorro', bolsillo:'Bolsillo', credito:'Credito', pago_credito:'Pago TC', uso_bolsillo:'Uso Bols.' }
  return (
    <BottomSheet open onClose={onClose} title="Editar transaccion">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <p style={{ fontSize: '.82em', color: 'var(--r)' }}>{error}</p>}
        <FieldLabel label="Tipo">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
            {TIPOS.map((tipo) => (
              <label key={tipo} style={{ cursor: 'pointer' }}>
                <input type="radio" name="tipo" value={tipo} defaultChecked={tx.tipo === tipo} className="sr-only" />
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px 4px', borderRadius: 'var(--rm)',
                  fontSize: '.7em', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em',
                  background: 'var(--s2)', border: '1.5px solid var(--b1)', color: 'var(--t3)',
                  cursor: 'pointer',
                }}>
                  {TIPO_LABELS[tipo]}
                </span>
              </label>
            ))}
          </div>
        </FieldLabel>
        <FieldLabel label="Importe">
          <input name="importe" type="number" min="1" required defaultValue={tx.importe} className="zinput num" />
        </FieldLabel>
        {members.length > 1 && (
          <FieldLabel label="Miembro">
            <select name="user_id" defaultValue={tx.user_id} className="zinput">
              {members.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </FieldLabel>
        )}
        <FieldLabel label="Categoria">
          <select name="categoria_id" required defaultValue={tx.categoria_id} className="zinput">
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel label="Descripcion">
          <input name="descripcion" type="text" defaultValue={tx.descripcion ?? ''} placeholder="Opcional" className="zinput" />
        </FieldLabel>
        <FieldLabel label="Fecha">
          <input name="fecha" type="date" defaultValue={tx.fecha} className="zinput" />
        </FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button type="submit" disabled={pending} style={{ flex: 1 }}>{pending ? 'Guardando...' : 'Guardar'}</Button>
          <button type="button" onClick={async () => { if (!confirm('Eliminar?')) return; await deleteTransaccion(tx.id); onDeleted() }}
            style={{ padding: '8px 16px', borderRadius: 'var(--rm)', border: '1px solid var(--r)', color: 'var(--r)', background: 'none', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

function EditQuincenaSheet({ open, quincena, members, onClose, onSaved }: {
  open: boolean
  quincena: Quincena | null
  members: { id: string; display_name: string; color_hex: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, setPending] = useState(false)
  if (!quincena) return null
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const res = await updateQuincena(quincena!.id, new FormData(e.currentTarget))
    setPending(false)
    if (res.ok) onSaved()
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Editar quincena">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Nombre"><input name="nombre" required defaultValue={quincena.nombre} className="zinput" /></FieldLabel>
        <p style={{ fontSize: '.78em', color: 'var(--t3)' }}>Periodo: {formatPeriod(quincena.fecha_inicio, quincena.fecha_fin)}</p>
        {members.length > 1 ? (
          <>
            <p style={{ fontSize: '.7em', fontWeight: 700, color: 'var(--t3)' }}>Saldo inicial por miembro</p>
            {members.map((m) => (
              <FieldLabel key={m.id} label={m.display_name}>
                <input
                  name={`saldo_uid_${m.id}`}
                  type="number" step="any"
                  defaultValue={quincena.saldo_por_miembro?.[m.id] ?? 0}
                  className="zinput num"
                />
              </FieldLabel>
            ))}
          </>
        ) : (
          <FieldLabel label="Saldo inicial">
            <input name="saldo_inicial" type="number" step="any" defaultValue={quincena.saldo_inicial} className="zinput num" />
          </FieldLabel>
        )}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Guardando...' : 'Guardar'}</Button>
      </form>
    </BottomSheet>
  )
}

function PayBudgetSheet({ item, categoriaId, quincenaId, members, currentUserId, onClose, onPaid }: {
  item: BudgetItem
  categoriaId?: string
  quincenaId: string
  members: { id: string; display_name: string; color_hex: string }[]
  currentUserId?: string
  onClose: () => void
  onPaid: () => void
}) {
  const [userId, setUserId] = useState(currentUserId ?? members[0]?.id ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lbl: React.CSSProperties = {
    fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
    letterSpacing: '.12em', color: 'var(--t3)', marginBottom: 8, display: 'block',
  }

  async function handlePay() {
    setPending(true)
    setError(null)

    // Create gasto transaction
    const form = new FormData()
    form.set('quincena_id', quincenaId)
    form.set('tipo', 'gasto')
    form.set('importe', String(item.amount_planned))
    form.set('user_id', userId)
    form.set('fecha', new Date().toISOString().split('T')[0])
    form.set('descripcion', item.name)
    if (categoriaId) form.set('categoria_id', categoriaId)

    const txRes = await createTransaccion(form)
    if (!txRes.ok) { setError(txRes.error); setPending(false); return }

    // If no linked category, mark paid explicitly (otherwise server already did it)
    if (!categoriaId) await markBudgetItemPaid(item.id, true)
    setPending(false)
    onPaid()
  }

  return (
    <BottomSheet open onClose={onClose} title="Registrar pago">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Item info */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--b1)', borderRadius: 'var(--rm)', padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className={`ztag ${FREQ_TAG_CLASS[item.frequency]}`}>{FREQ_LABEL[item.frequency]}</span>
            <span style={{ fontSize: '.88em', fontWeight: 800, color: 'var(--t1)' }}>{item.name}</span>
          </div>
          <span className="num" style={{ fontSize: '1.2em', fontWeight: 900, color: 'var(--g)' }}>{formatCOP(item.amount_planned)}</span>
        </div>

        {/* Quién paga */}
        {members.length > 1 && (
          <div>
            <span style={lbl}>¿Quién paga?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {members.map(m => {
                const sel = userId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setUserId(m.id)}
                    style={{
                      flex: 1, background: sel ? 'var(--y0)' : 'var(--s2)',
                      border: `1.5px solid ${sel ? 'var(--y)' : 'var(--b1)'}`,
                      borderRadius: 'var(--rm)', padding: '10px 12px',
                      display: 'flex', alignItems: 'center', gap: 9,
                      transition: 'all .13s', cursor: 'pointer',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 'var(--rs)',
                      background: `color-mix(in srgb, ${m.color_hex} 22%, transparent)`,
                      color: m.color_hex, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '.88em', fontWeight: 900, flexShrink: 0,
                    }}>
                      {m.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '.85em', fontWeight: 800, color: 'var(--t1)' }}>
                      {m.display_name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '.75em', fontWeight: 700, color: 'var(--r)', background: 'var(--r0)', border: '1px solid var(--r)', borderRadius: 'var(--rs)', padding: '8px 12px' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handlePay}
          disabled={pending}
          style={{
            width: '100%', padding: 13, background: pending ? 'var(--s3)' : 'var(--y)',
            borderRadius: 'var(--rm)', border: 'none', fontSize: '.9em', fontWeight: 900,
            color: pending ? 'var(--t3)' : 'var(--yt)', textTransform: 'uppercase',
            letterSpacing: '.06em', cursor: pending ? 'default' : 'pointer',
            transition: 'background .15s, color .15s',
          }}
        >
          {pending ? 'Registrando...' : 'Confirmar pago'}
        </button>
      </div>
    </BottomSheet>
  )
}

function ResetFinanceSheet({ open, onClose, onReset }: { open: boolean; onClose: () => void; onReset: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [pending, setPending]   = useState(false)

  function handleClose() {
    setPassword('')
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!password) { setError('Ingresa tu contraseña'); return }
    setPending(true)
    setError(null)
    const res = await resetFinanceData(password)
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    setPassword('')
    onReset()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Vaciar datos de finanzas">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          background: 'var(--r0)', border: '1px solid var(--r)',
          borderRadius: 'var(--rm)', padding: '12px 14px',
        }}>
          <p style={{ fontSize: '.82em', fontWeight: 700, color: 'var(--r)', marginBottom: 6 }}>
            Accion irreversible
          </p>
          <p style={{ fontSize: '.78em', color: 'var(--t2)', lineHeight: 1.5 }}>
            Se eliminaran todas las transacciones, quincenas e items de presupuesto del hogar.
            Las categorias y configuracion se mantienen.
          </p>
        </div>

        <div>
          <span style={{
            fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '.12em', color: 'var(--t3)', marginBottom: 8, display: 'block',
          }}>
            Confirma tu contraseña
          </span>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            className="zinput"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p style={{
            fontSize: '.75em', fontWeight: 700, color: 'var(--r)',
            background: 'var(--r0)', border: '1px solid var(--r)',
            borderRadius: 'var(--rs)', padding: '8px 12px',
          }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending || !password}
          style={{
            width: '100%', padding: 13,
            background: pending || !password ? 'var(--s3)' : 'var(--r)',
            borderRadius: 'var(--rm)', border: 'none',
            fontSize: '.9em', fontWeight: 900,
            color: pending || !password ? 'var(--t3)' : '#fff',
            textTransform: 'uppercase', letterSpacing: '.06em',
            cursor: pending || !password ? 'default' : 'pointer',
            transition: 'background .15s, color .15s',
          }}
        >
          {pending ? 'Vaciando...' : 'Vaciar datos'}
        </button>
      </div>
    </BottomSheet>
  )
}

function EditBudgetItemSheet({ item, members, onClose, onSaved }: { item: BudgetItem; members: { id: string; display_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    const res = await updateBudgetItem(item.id, new FormData(e.currentTarget))
    setPending(false)
    if (!res.ok) { setError(res.error); return }
    onSaved()
  }
  return (
    <BottomSheet open onClose={onClose} title="Editar item">
      <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <p style={{ fontSize: '.82em', color: 'var(--r)' }}>{error}</p>}
        <FieldLabel label="Nombre">
          <input name="name" required defaultValue={item.name} className="zinput" />
        </FieldLabel>
        <FieldLabel label="Frecuencia">
          <select name="frequency" defaultValue={item.frequency} className="zinput">
            <option value="all">Siempre (ambas quincenas)</option>
            <option value="first">Solo 1ra quincena</option>
            <option value="second">Solo 2da quincena</option>
            <option value="once">Unica vez</option>
          </select>
        </FieldLabel>
        <FieldLabel label="Monto previsto">
          <input name="amount_planned" type="number" min="0" defaultValue={item.amount_planned} className="zinput num" />
        </FieldLabel>
        <FieldLabel label="Dia de vencimiento (opcional)">
          <input name="due_day" type="number" min="1" max="31" defaultValue={item.due_day ?? ''} className="zinput" placeholder="Ej: 5" />
        </FieldLabel>
        {members.length > 1 && (
          <FieldLabel label="Asignar a">
            <select name="assigned_to" defaultValue={item.assigned_to ?? ''} className="zinput">
              <option value="">Compartido</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </FieldLabel>
        )}
        <Button type="submit" disabled={pending} className="w-full">{pending ? 'Guardando...' : 'Guardar'}</Button>
      </form>
    </BottomSheet>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: '.65em', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--t3)' }}>{label}</span>
      {children}
    </div>
  )
}

/* ══ KPI FILTER (client-side) ═══════════════════════════ */
function computeFilteredKPIs(txs: TransaccionConCategoria[], cats: Categoria[], orig: FinanceKPIs, userId: string): FinanceKPIs {
  const sum = (tipo: string) => txs.filter((t) => t.tipo === tipo).reduce((s, t) => s + Number(t.importe), 0)
  const totalIngresos    = sum('ingreso')
  const totalGastos      = sum('gasto')
  const totalAhorros     = sum('ahorro')
  const totalBolsillos   = sum('bolsillo')
  const totalCredito     = sum('credito')
  const totalPagoCredito = sum('pago_credito')
  const totalUsoBolsillo = sum('uso_bolsillo')
  const real: Record<string, number> = {}
  for (const t of txs) real[t.categoria_id] = (real[t.categoria_id] ?? 0) + Number(t.importe)
  const porCategoria = cats.map((c) => {
    const rv = real[c.id] ?? 0
    const pv = Number(c.presupuesto_default)
    return { categoriaId: c.id, nombre: c.nombre, icono: c.icono ?? 'circle', tipo: c.tipo, previsto: pv, real: rv, porcentaje: pv > 0 ? rv / pv : 0 }
  })
  const memberSaldoInicial = orig.saldoPorMiembro[userId] ?? 0
  const mb = orig.acumuladoPorMiembro[userId]
  return {
    saldoInicial: memberSaldoInicial,
    totalIngresos, totalGastos, totalAhorros, totalBolsillos, totalUsoBolsillo, totalCredito, totalPagoCredito,
    saldoActual: memberSaldoInicial + totalIngresos - totalGastos - totalAhorros - totalBolsillos - totalPagoCredito,
    deudaCreditoAcumulada: mb?.deudaCredito ?? 0,
    saldoBolsillosAcumulado: mb?.saldoBolsillos ?? 0,
    fechaCorteCredito: orig.fechaCorteCredito,
    diasParaCorte: orig.diasParaCorte,
    porCategoria,
    saldoPorMiembro: orig.saldoPorMiembro,
    acumuladoPorMiembro: orig.acumuladoPorMiembro,
  }
}
