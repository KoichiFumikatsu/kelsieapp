import { formatCOP } from '@/lib/utils/format'
import { ProgressBar } from '@/components/ui/Progress'
import { DonutChart, HBarChart } from '@/components/ui/Charts'
import type { FinanceKPIs } from '@/lib/types/modules.types'
import { TrendingDown, TrendingUp, Wallet, PiggyBank, AlertTriangle, Landmark, FolderHeart } from 'lucide-react'

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
]

interface FinanceKPIPanelProps {
  kpis: FinanceKPIs
  className?: string
}

export function FinanceKPIPanel({ kpis, className = '' }: FinanceKPIPanelProps) {
  const saldoColor = kpis.saldoActual >= 0 ? 'var(--income)' : 'var(--expense)'
  const totalPresupuestado = kpis.porCategoria
    .filter((c) => c.tipo === 'gasto')
    .reduce((sum, c) => sum + c.previsto, 0)
  const savingsRate = kpis.totalIngresos > 0
    ? Math.round(((kpis.totalIngresos - kpis.totalGastos - kpis.totalAhorros - kpis.totalBolsillos) / kpis.totalIngresos) * 100)
    : 0
  const overBudget = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.porcentaje > 1)
  const gastoPct = totalPresupuestado > 0
    ? Math.round((kpis.totalGastos / totalPresupuestado) * 100)
    : 0
  const hasGastos = kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.real > 0).length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Cards + Donut side by side on md+ */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left: KPI cards */}
        <div className="grid flex-1 grid-cols-2 gap-2 self-start">
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
        </div>

        {/* Right: Donut chart */}
        {hasGastos && (
          <div className="flex w-full flex-col items-center justify-center md:w-52">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
              Distribucion
            </p>
            <DonutChart
              segments={kpis.porCategoria
                .filter((c) => c.tipo === 'gasto' && c.real > 0)
                .map((c, i) => ({
                  label: c.nombre,
                  value: c.real,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                }))}
            />
          </div>
        )}
      </div>

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

      {/* Presupuesto vs real bar chart */}
      {kpis.porCategoria.filter((c) => c.tipo === 'gasto' && c.previsto > 0).length > 0 && (
        <div className="space-y-2">
          <p className="section-bar text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            Presupuesto vs real
          </p>
          <HBarChart
            bars={kpis.porCategoria
              .filter((c) => c.tipo === 'gasto' && c.previsto > 0)
              .map((c, i) => ({
                label: c.nombre,
                value: c.real,
                max: c.previsto,
                color: c.porcentaje > 1 ? 'var(--expense)' : c.porcentaje > 0.8 ? 'var(--warn)' : CHART_COLORS[i % CHART_COLORS.length],
              }))}
            formatValue={formatCOP}
          />
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
