import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--y)',
    borderColor: 'var(--y)',
    color: 'var(--yt)',
    boxShadow: '0 3px 16px rgba(236,199,0,.30)',
  },
  secondary: {
    background: 'var(--s2)',
    borderColor: 'var(--b1)',
    color: 'var(--t2)',
  },
  danger: {
    background: 'var(--r)',
    borderColor: 'var(--r)',
    color: '#fff',
  },
  ghost: {
    background: 'transparent',
    borderColor: 'transparent',
    color: 'var(--t2)',
  },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', style, children, ...props }, ref) => (
    <button
      ref={ref}
      className={`zbtn ${className}`}
      style={{ ...VARIANT_STYLE[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  ),
)
Button.displayName = 'Button'
