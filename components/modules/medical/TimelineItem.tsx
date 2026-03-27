import type { ReactNode } from 'react'

interface TimelineItemProps {
  /** Accent color for the dot */
  color?: string
  /** Top-right tag label */
  date?: string
  children: ReactNode
  className?: string
}

export function TimelineItem({ color = 'var(--mod-medical)', date, children, className = '' }: TimelineItemProps) {
  return (
    <div className={`relative flex gap-3 pb-6 last:pb-0 ${className}`}>
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="w-px flex-1 bg-[var(--border-strong)]" />
      </div>

      {/* Content */}
      <div className="flex-1 -mt-0.5">
        {date && (
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-[var(--text-3)]">
            {date}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}
