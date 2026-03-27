import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-semibold tracking-wide transition-all disabled:pointer-events-none disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary:
    'bg-[var(--text-1)] text-[var(--bg)] hover:opacity-90 active:scale-[0.97]',
  secondary:
    'border border-[var(--border-strong)] bg-transparent text-[var(--text-1)] hover:bg-[var(--surface-2)] active:scale-[0.97]',
  danger:
    'bg-[var(--expense)] text-white hover:opacity-90 active:scale-[0.97]',
  ghost:
    'bg-transparent text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
