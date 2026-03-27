import { formatCOP } from '@/lib/utils/format'
import { ProgressBar } from '@/components/ui/Progress'
import type { FinanceKPIs } from '@/lib/types/modules.types'
import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'

interface FinanceKPIPanelProps {
  kpis: FinanceKPIs
  className?: string
}

export function FinanceKPIPanel({ kpis, className = '' }: FinanceKPIPanelProps) {
  const saldoColor = kpis.saldoActual >= 0 ? 'var(--income)' : 'var(--expense)'

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Top KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <KPIBox
          label="Saldo"
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
      </div>

      {/* Per-category bars */}
      {kpis.porCategoria.length > 0 && (
        <div className="space-y-3">
          <p className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Por categoría
          </p>
          {kpis.porCategoria
            .filter((c) => c.tipo === 'gasto')
            .map((c) => (
              <div key={c.categoriaId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[var(--text-1)]">{c.nombre}</span>
                  <span className="num text-[var(--text-3)]">
                    {formatCOP(c.real)} / {formatCOP(c.previsto)}
                  </span>
                </div>
                <ProgressBar
                  value={c.porcentaje}
                  projected={1}
                  color={c.porcentaje > 1 ? 'var(--expense)' : 'var(--mod-finance)'}
                  height={5}
                />
              </div>
            ))}
        </div>
      )}
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
