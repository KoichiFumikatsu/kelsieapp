import type { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`${className}`}
      style={{
        background: 'var(--s1)',
        border: '1px solid var(--b1)',
        borderRadius: 'var(--rl)',
        padding: '1rem',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

interface ModuleCardProps {
  accent: string
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export function ModuleCard({ accent, children, className = '', style }: ModuleCardProps) {
  return (
    <div
      className={`mod-card ${className}`}
      style={{ '--accent': accent, ...style } as CSSProperties}
    >
      {children}
    </div>
  )
}
