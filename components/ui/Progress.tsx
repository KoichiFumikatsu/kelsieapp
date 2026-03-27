import type { CSSProperties } from 'react'

/* ── ProgressBar — double bar (previsto vs real), Arknights gauge style ── */
interface ProgressBarProps {
  /** 0..1 — ratio real */
  value: number
  /** 0..1 — ratio previsto (optional second bar) */
  projected?: number
  color?: string
  height?: number
  label?: string
  className?: string
}

export function ProgressBar({
  value,
  projected,
  color = 'var(--text-1)',
  height = 6,
  label,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100
  const projPct = projected != null ? Math.min(Math.max(projected, 0), 1) * 100 : null

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-[var(--text-2)]">{label}</span>
          <span className="num text-[var(--text-3)]">{Math.round(pct)}%</span>
        </div>
      )}
      <div
        className="relative w-full overflow-hidden rounded-sm bg-[var(--surface-2)]"
        style={{ height }}
      >
        {/* Projected bar (dimmed) */}
        {projPct != null && (
          <div
            className="absolute inset-y-0 left-0 rounded-sm opacity-20 transition-all duration-600 ease-out"
            style={{
              width: `${projPct}%`,
              backgroundColor: color,
            } as CSSProperties}
          />
        )}
        {/* Actual bar */}
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-600 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          } as CSSProperties}
        />
      </div>
    </div>
  )
}

/* ── CircularProgress — ring gauge for studies ── */
interface CircularProgressProps {
  /** 0..1 */
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
  className?: string
}

export function CircularProgress({
  value,
  size = 64,
  strokeWidth = 5,
  color = 'var(--mod-studies)',
  children,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 1))

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-600 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
