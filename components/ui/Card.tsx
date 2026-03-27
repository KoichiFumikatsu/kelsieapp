import type { ReactNode, CSSProperties } from 'react'

/* ── Generic Card ── */
interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}>
      {children}
    </div>
  )
}

/* ── ModuleCard — Arknights operator-card style with accent bar ── */
interface ModuleCardProps {
  accent: string
  children: ReactNode
  className?: string
}

export function ModuleCard({ accent, children, className = '' }: ModuleCardProps) {
  return (
    <div
      className={`mod-card p-4 ${className}`}
      style={{ '--accent': accent } as CSSProperties}
    >
      {children}
    </div>
  )
}
