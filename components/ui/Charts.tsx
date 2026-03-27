'use client'

/**
 * Lightweight SVG chart components — no external dependencies.
 */

/* ── DonutChart ── */
interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  className?: string
}

export function DonutChart({ segments, size = 140, strokeWidth = 22, className = '' }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments
          .filter((s) => s.value > 0)
          .map((seg) => {
            const pct = seg.value / total
            const dashLen = pct * circumference
            const el = (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )
            offset += dashLen
            return el
          })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {segments
          .filter((s) => s.value > 0)
          .map((seg) => (
            <div key={seg.label} className="flex items-center gap-1 text-[10px]">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[var(--text-2)]">{seg.label}</span>
              <span className="num font-medium text-[var(--text-3)]">{Math.round((seg.value / total) * 100)}%</span>
            </div>
          ))}
      </div>
    </div>
  )
}

/* ── BarChart (horizontal) ── */
interface BarItem {
  label: string
  value: number
  max: number
  color: string
}

interface HBarChartProps {
  bars: BarItem[]
  formatValue?: (v: number) => string
  className?: string
}

export function HBarChart({ bars, formatValue = String, className = '' }: HBarChartProps) {
  if (bars.length === 0) return null
  const globalMax = Math.max(...bars.map((b) => Math.max(b.value, b.max)), 1)

  return (
    <div className={`space-y-2 ${className}`}>
      {bars.map((bar) => {
        const pctValue = (bar.value / globalMax) * 100
        const pctMax = (bar.max / globalMax) * 100
        const over = bar.max > 0 && bar.value > bar.max
        return (
          <div key={bar.label} className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-medium text-[var(--text-2)]">{bar.label}</span>
              <span className={`num ${over ? 'font-bold text-[var(--expense)]' : 'text-[var(--text-3)]'}`}>
                {formatValue(bar.value)}{bar.max > 0 ? ` / ${formatValue(bar.max)}` : ''}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
              {/* Budget line */}
              {bar.max > 0 && pctMax < 100 && (
                <div
                  className="absolute top-0 h-full w-px bg-[var(--text-3)] opacity-40"
                  style={{ left: `${Math.min(pctMax, 100)}%` }}
                />
              )}
              {/* Actual bar */}
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(pctValue, 100)}%`,
                  backgroundColor: bar.color,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
