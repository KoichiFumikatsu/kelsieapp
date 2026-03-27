import type { ReactNode, CSSProperties } from 'react'

type Priority = 'low' | 'mid' | 'high' | 'urgent'

const PRIORITY_COLORS: Record<Priority, string> = {
  low:    'var(--text-3)',
  mid:    'var(--info)',
  high:   'var(--warn)',
  urgent: 'var(--expense)',
}

interface KanbanCardProps {
  priority: Priority
  children: ReactNode
  className?: string
}

export function KanbanCard({ priority, children, className = '' }: KanbanCardProps) {
  const color = PRIORITY_COLORS[priority]
  return (
    <div
      className={`relative rounded border border-[var(--border)] bg-[var(--surface)] p-3 transition-shadow hover:shadow-sm ${className}`}
      style={{ borderLeftWidth: 3, borderLeftColor: color } as CSSProperties}
    >
      {children}
    </div>
  )
}
