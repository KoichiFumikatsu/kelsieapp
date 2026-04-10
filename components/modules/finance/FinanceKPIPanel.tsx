'use client'

import { useState } from 'react'
import { formatCOP } from '@/lib/utils/format'
import { ProgressBar } from '@/components/ui/Progress'
import type { FinanceKPIs } from '@/lib/types/modules.types'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, AlertTriangle, Landmark, FolderHeart, CreditCard, BadgeDollarSign, ChevronDown, CalendarClock } from 'lucide-react'

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
]

interface FinanceKPIPanelProps {
  kpis: FinanceKPIs
  isFiltered?: boolean
  className?: string
}

export function FinanceKPIPanel({ kpis, isFiltered = false, className = '' }: FinanceKPIPanelProps) {
  const [showPresupuesto, setShowPresupuesto] = useState(false)
  const saldoColor = kpis.saldoActual >= 0 ? 'var(--income)' : 'var(--expense)'
  const totalPresupuestado = kpis.porCategoria
    .filter((c) => c.tipo === 'gasto')
    .reduce((sum, c) => sum + c.previsto, 0)
  const savingsRate = kpis.totalIngresos > 0
    ? Math.round(((kpis.totalIngresos - kpis.totalGastos - kpis.totalAhorros - kpis.totalBolsillos - kpis.totalPagoCredito) / kpis.totalIngresos) * 100)
    : 0
  const overBudget = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.porcentaje > 1)
  const gastoPct = totalPresupuestado > 0
    ? Math.round((kpis.totalGastos / totalPresupuestado) * 100)
    : 0
  const hasGastos = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.real > 0).length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cards */}
      <div className="grid grid-cols-2 gap-2">
          <KPIBox
            label={isFiltered ? "Balance personal" : "Saldo"}
            value={formatCOP(kpis.saldoActual)}
            color={saldoColor}
            icon={<Wallet size={14} />}
          />
          <KPIBox
            label="Ingresos"
            value={formatCOP(kpis.totalIngresos)}
            color="var(--income)"
            icon={<TrendingUp size={14} />}
          />
          <KPIBox
            label="Gastos"
            value={formatCOP(kpis.totalGastos)}
            color="var(--expense)"
            icon={<TrendingDown size={14} />}
          />
          <KPIBox
            label="Libre"
            value={`${savingsRate}%`}
            color={savingsRate >= 20 ? 'var(--income)' : savingsRate >= 0 ? 'var(--warn)' : 'var(--expense)'}
            icon={<PiggyBank size={14} />}
          />
          {kpis.totalAhorros > 0 && (
            <KPIBox
              label="Ahorros"
              value={formatCOP(kpis.totalAhorros)}
              color="var(--info)"
              icon={<Landmark size={14} />}
            />
          )}
          {kpis.totalBolsillos > 0 && (
            <KPIBox
              label="Bolsillos"
              value={formatCOP(kpis.totalBolsillos)}
              color="var(--mod-finance)"
              icon={<FolderHeart size={14} />}
            />
          )}
          {kpis.totalCredito > 0 && (
            <KPIBox
              label="Credito usado"
              value={formatCOP(kpis.totalCredito)}
              color="var(--credit)"
              icon={<CreditCard size={14} />}
            />
          )}
          {kpis.totalPagoCredito > 0 && (
            <KPIBox
              label="Pago credito"
              value={formatCOP(kpis.totalPagoCredito)}
              color="var(--credit)"
              icon={<BadgeDollarSign size={14} />}
            />
          )}
      </div>

      {/* Distribution stacked bar */}
      {hasGastos && (() => {
        const gastosCats = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.real > 0)
        const total = gastosCats.reduce((s, c) => s + c.real, 0)
        if (total === 0) return null
        return (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">Distribucion gastos</p>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              {gastosCats.map((c, i) => (
                <div
                  key={c.categoriaId}
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${(c.real / total) * 100}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                  title={`${c.nombre}: ${formatCOP(c.real)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {gastosCats.map((c, i) => (
                <div key={c.categoriaId} className="flex items-center gap-1 text-[10px]">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-[var(--text-2)]">{c.nombre}</span>
                  <span className="num text-[var(--text-3)]">{Math.round((c.real / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Credit balance — accumulated across all quincenas */}
      {(kpis.deudaCreditoAcumulada !== 0 || kpis.totalCredito > 0) && (() => {
        const deuda = kpis.deudaCreditoAcumulada
        const dias = kpis.diasParaCorte
        const corte = kpis.fechaCorteCredito
        const corteLabel = new Date(corte + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
        const isUrgent = deuda > 0 && dias >= 0 && dias <= 5
        const isWarning = deuda > 0 && dias > 5 && dias <= 15
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded border border-[var(--credit)]/20 bg-[color-mix(in_srgb,var(--credit)_5%,transparent)] px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-[var(--text-2)]">Deuda tarjeta (acumulada){isFiltered && <span className="text-[var(--text-3)]"> (hogar)</span>}</span>
                {kpis.totalCredito > 0 && (
                  <span className="num text-[10px] text-[var(--text-3)]">
                    Esta 15na: {formatCOP(kpis.totalCredito)} usado / {formatCOP(kpis.totalPagoCredito)} pagado
                  </span>
                )}
              </div>
              <span className={`num text-sm font-bold ${deuda > 0 ? 'text-[var(--credit)]' : 'text-[var(--income)]'}`}>
                {deuda <= 0 ? 'Pagada' : formatCOP(deuda)}
              </span>
            </div>
            {deuda > 0 && (
              <div className={`flex items-start gap-2 rounded border p-3 ${
                isUrgent
                  ? 'border-[var(--expense)]/30 bg-[color-mix(in_srgb,var(--expense)_5%,transparent)]'
                  : isWarning
                    ? 'border-[var(--warn)]/30 bg-[color-mix(in_srgb,var(--warn)_5%,transparent)]'
                    : 'border-[var(--credit)]/20 bg-[color-mix(in_srgb,var(--credit)_3%,transparent)]'
              }`}>
                <CalendarClock size={14} className={`mt-0.5 shrink-0 ${
                  isUrgent ? 'text-[var(--expense)]' : isWarning ? 'text-[var(--warn)]' : 'text-[var(--credit)]'
                }`} />
                <div className="text-xs text-[var(--text-2)]">
                  {isUrgent && (
                    <p className="font-bold text-[var(--expense)]">
                      {dias === 0 ? 'Fecha de corte HOY' : `Corte en ${dias} dia${dias > 1 ? 's' : ''}`} ({corteLabel})
                    </p>
                  )}
                  {isWarning && (
                    <p className="font-medium text-[var(--warn)]">
                      Corte en {dias} dias ({corteLabel}) — Deuda pendiente: {formatCOP(deuda)}
                    </p>
                  )}
                  {!isUrgent && !isWarning && dias > 0 && (
                    <p className="text-[var(--text-3)]">
                      Proximo corte: {corteLabel} ({dias} dias)
                    </p>
                  )}
                  {dias < 0 && (
                    <p className="font-medium text-[var(--expense)]">
                      Corte fue el {corteLabel} — Deuda sin pagar: {formatCOP(deuda)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Budget usage bar */}
      {totalPresupuestado > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[var(--text-2)]">Presupuesto total usado</span>
            <span className="num text-[var(--text-3)]">{gastoPct}%</span>
          </div>
          <ProgressBar
            value={gastoPct / 100}
            projected={1}
            color={gastoPct > 100 ? 'var(--expense)' : gastoPct > 80 ? 'var(--warn)' : 'var(--mod-finance)'}
            height={6}
          />
        </div>
      )}

      {/* Suggestions */}
      {overBudget.length > 0 && (
        <div className="flex items-start gap-2 rounded border border-[var(--expense)]/30 bg-[color-mix(in_srgb,var(--expense)_5%,transparent)] p-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[var(--expense)]" />
          <div className="text-xs text-[var(--text-2)]">
            <p className="font-medium text-[var(--expense)]">Categorias excedidas:</p>
            {overBudget.map((c) => (
              <p key={c.categoriaId}>
                {c.nombre}: {formatCOP(c.real)} / {formatCOP(c.previsto)} ({Math.round(c.porcentaje * 100)}%)
              </p>
            ))}
          </div>
        </div>
      )}
      {savingsRate < 0 && (
        <p className="text-xs text-[var(--expense)]">Estas gastando mas de lo que ingresas esta quincena.</p>
      )}
      {savingsRate >= 0 && savingsRate < 20 && kpis.totalIngresos > 0 && (
        <p className="text-xs text-[var(--text-3)]">Tu tasa de ahorro es {savingsRate}%. Idealmente deberia ser al menos 20%.</p>
      )}
      {savingsRate >= 20 && kpis.totalIngresos > 0 && overBudget.length === 0 && (
        <p className="text-xs text-[var(--income)]">Buen manejo financiero. Ahorro del {savingsRate}% esta quincena.</p>
      )}

      {/* Presupuesto vs real — compact bars */}
      {kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.previsto > 0).length > 0 && (() => {
        const cats = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.previsto > 0)
        const maxVal = Math.max(...cats.map((c) => Math.max(c.real, c.previsto)), 1)
        return (
          <div className="space-y-1.5">
            <button
              onClick={() => setShowPresupuesto(!showPresupuesto)}
              className="section-bar flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]"
              style={{ '--accent': 'var(--mod-finance)' } as React.CSSProperties}
            >
              Presupuesto vs real
              <ChevronDown size={12} className={`transition-transform ${showPresupuesto ? 'rotate-180' : ''}`} />
            </button>
            {showPresupuesto && cats.map((c, i) => {
              const pctReal = (c.real / maxVal) * 100
              const pctPrev = (c.previsto / maxVal) * 100
              const over = c.porcentaje > 1
              const barColor = over ? 'var(--expense)' : c.porcentaje > 0.8 ? 'var(--warn)' : CHART_COLORS[i % CHART_COLORS.length]
              return (
                <div key={c.categoriaId} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[10px] font-medium text-[var(--text-2)]">{c.nombre}</span>
                  <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    {pctPrev < 100 && (
                      <div className="absolute top-0 h-full w-px bg-[var(--text-3)] opacity-40" style={{ left: `${Math.min(pctPrev, 100)}%` }} />
                    )}
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pctReal, 100)}%`, backgroundColor: barColor }} />
                  </div>
                  <span className={`num w-20 shrink-0 text-right text-[10px] ${over ? 'font-bold text-[var(--expense)]' : 'text-[var(--text-3)]'}`}>
                    {formatCOP(c.real)}/{formatCOP(c.previsto)}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

function KPIBox({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: string
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="num mt-1 text-sm font-bold" style={{ color, textAlign: 'left' }}>
        {value}
      </p>
    </div>
  )
}
