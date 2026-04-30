import type { CSSProperties } from 'react'

interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color = 'var(--t2)', className = '' }: BadgeProps) {
  return (
    <span
      className={`tag ${className}`}
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

type Status = 'pending' | 'done' | 'overdue' | 'active' | 'cancelled' | 'skipped'

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'var(--y)' },
  done:      { label: 'Hecho',      color: 'var(--g)' },
  overdue:   { label: 'Vencido',    color: 'var(--r)' },
  active:    { label: 'Activo',     color: 'var(--bl)' },
  cancelled: { label: 'Cancelado',  color: 'var(--t3)' },
  skipped:   { label: 'Saltado',    color: 'var(--t3)' },
}

interface StatusBadgeProps {
  status: Status
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`tag ${className}`}
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${cfg.color} 25%, transparent)`,
      } as CSSProperties}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}
