import type { CSSProperties } from 'react'

/* ── Badge — minimal tag ── */
interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color = 'var(--text-2)', className = '' }: BadgeProps) {
  return (
    <span
      className={`tag ${className}`}
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

/* ── StatusBadge — semantic states ── */
type Status = 'pending' | 'done' | 'overdue' | 'active' | 'cancelled'

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',  color: 'var(--warn)' },
  done:      { label: 'Hecho',      color: 'var(--income)' },
  overdue:   { label: 'Vencido',    color: 'var(--expense)' },
  active:    { label: 'Activo',     color: 'var(--info)' },
  cancelled: { label: 'Cancelado',  color: 'var(--text-3)' },
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
        backgroundColor: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
      } as CSSProperties}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}
