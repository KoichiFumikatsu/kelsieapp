import { Flame } from 'lucide-react'

interface StreakCounterProps {
  days: number
  className?: string
}

export function StreakCounter({ days, className = '' }: StreakCounterProps) {
  const isActive = days > 0
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 ${className}`}
      style={{
        backgroundColor: isActive ? 'color-mix(in srgb, var(--warn) 12%, transparent)' : 'var(--surface-2)',
        color: isActive ? 'var(--warn)' : 'var(--text-3)',
      }}
    >
      <Flame size={14} strokeWidth={isActive ? 2 : 1.5} />
      <span className="num text-sm font-bold">{days}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest">
        {days === 1 ? 'día' : 'días'}
      </span>
    </div>
  )
}
